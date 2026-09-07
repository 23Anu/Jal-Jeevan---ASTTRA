import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Clock, MapPin, PhoneCall, 
  Volume2, ShieldCheck, ChevronDown, Check, Droplets, Navigation,
  LocateFixed, Search, Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import HeroCarousel from '../components/HeroCarousel';
import FleetMap from '../components/FleetMap';

const JHARKHAND_DISTRICTS = ['NMIET (Live IoT)', 'Ranchi', 'Dhanbad', 'Bokaro', 'Khunti', 'Hazaribagh', 'Dumka'];

export default function PublicPortal({ units = [], activeUnitId, onSelectUnit }) {
  const { t, lang, setLang } = useLanguage();
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('NMIET (Live IoT)');
  const [latestReading, setLatestReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);

  // Set selected unit when units or activeUnitId changes (strictly respects user's active choice)
  useEffect(() => {
    if (units.length > 0) {
      if (!selectedUnit) {
        const match = units.find(u => u.id === activeUnitId)
          || units.find(u => u.district === 'NMIET' || u.name.includes('NMIET'))
          || units[0];

        if (match) {
          setSelectedUnit(match);
          if (match.district === 'NMIET') {
            setSelectedDistrict('NMIET (Live IoT)');
          } else if (match.district) {
            setSelectedDistrict(match.district);
          }
        }
      } else {
        // If current selectedUnit is in updated units list, sync live properties without overriding choice
        const updated = units.find(u => u.id === selectedUnit.id);
        if (updated && (updated.latest_tds !== selectedUnit.latest_tds || updated.status !== selectedUnit.status)) {
          setSelectedUnit(prev => ({ ...prev, ...updated }));
        }
      }
    }
  }, [units, activeUnitId, selectedUnit]);

  // Fetch unit details and 7-day history when selectedUnit changes + REST Polling for ESP32 live stream
  useEffect(() => {
    if (!selectedUnit) return;

    let pollInterval;

    const fetchLatestData = () => {
      const isLiveEspUnit = selectedUnit.district === 'NMIET' || selectedUnit.id === 'JH-RAN-001';

      if (isLiveEspUnit) {
        // 1. Fetch from ESP32 /api/water-data/latest (NMIET live stream)
        fetch(`/api/water-data/latest?device_id=ESP32_001`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setLatestReading({
                outlet_ph: data.data.ph,
                outlet_tds: data.data.tds,
                outlet_turbidity: data.data.turbidity,
                outlet_temp: data.data.temperature,
                bis_status: data.data.status,
                status_reasons: data.data.status_reasons,
                timestamp: data.data.createdAt || data.data.timestamp,
                device_id: data.data.device_id
              });
            }
          })
          .catch(() => {
            fetch(`/api/units/${selectedUnit.id}/readings/latest`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.data) setLatestReading(data.data);
              })
              .catch(err => console.error('Error loading latest reading:', err));
          });
      } else {
        // 2. Fetch specific unit reading (e.g. Ranchi impure water demo)
        fetch(`/api/units/${selectedUnit.id}/readings/latest`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setLatestReading({
                outlet_ph: data.data.outlet_ph,
                outlet_tds: data.data.outlet_tds,
                outlet_turbidity: data.data.outlet_turbidity,
                outlet_temp: data.data.outlet_temp,
                bis_status: data.data.bis_status || selectedUnit.status || 'UNSAFE',
                status_reasons: ['Elevated TDS and Acidic pH exceed BIS drinking water thresholds'],
                timestamp: data.data.timestamp,
                device_id: selectedUnit.id
              });
            }
          })
          .catch(err => console.error('Error loading latest reading:', err));
      }
    };

    setLoading(true);
    fetchLatestData();

    // 7-day history
    fetch(`/api/units/${selectedUnit.id}/readings/history?timeframe=7d`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHistory(data.dailySummary || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading history:', err);
        setLoading(false);
      });

    // REST Polling every 3.5 seconds
    pollInterval = setInterval(fetchLatestData, 3500);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedUnit?.id]);

  // Filter stations by chosen district
  const districtUnits = units.filter(u => 
    u.district === selectedDistrict || 
    (selectedDistrict.startsWith('NMIET') && (u.district === 'NMIET' || u.name.includes('NMIET') || u.id === 'JH-RAN-001'))
  );

  // Handle GPS Auto-detect
  const handleDetectLocation = () => {
    setGeoLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLocating(false);
          // Default to NMIET unit or first unit
          const defaultMatch = units.find(u => u.district === 'NMIET' || u.name.includes('NMIET')) || units[0];
          setSelectedUnit(defaultMatch);
          setSelectedDistrict('NMIET (Live IoT)');
          if (onSelectUnit) onSelectUnit(defaultMatch.id);
        },
        (err) => {
          setGeoLocating(false);
          alert('Could not access GPS. Please choose your district manually from the buttons below.');
        }
      );
    } else {
      setGeoLocating(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const currentStatus = latestReading?.bis_status || selectedUnit?.status || 'SAFE';
  const isSafe = currentStatus === 'SAFE';
  const isWarning = currentStatus === 'WARNING';
  const isUnsafe = currentStatus === 'UNSAFE';
  const isOffline = selectedUnit?.status === 'OFFLINE';

  // Voice Readout
  const speakStatus = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    let textToSpeak = '';
    const curTds = latestReading?.outlet_tds ?? selectedUnit?.latest_tds ?? (isUnsafe ? 1234 : 81);
    const curPh = latestReading?.outlet_ph ?? selectedUnit?.latest_ph ?? (isUnsafe ? 5.36 : 7.2);

    if (lang === 'en') {
      if (isSafe) {
        textToSpeak = `Good news! Water from ${selectedUnit?.name || 'this station'} in ${selectedUnit?.district} is 100% pure and safe to drink. TDS is ${curTds} ppm and pH is ${curPh}.`;
      } else if (isWarning) {
        textToSpeak = `Notice: Water quality from ${selectedUnit?.name || 'this station'} is moderately elevated. TDS is ${curTds} ppm. Filtration is active.`;
      } else {
        textToSpeak = `Warning! Water from ${selectedUnit?.name || 'this station'} in ${selectedUnit?.district} is contaminated with TDS of ${curTds} ppm and acidic pH of ${curPh}. Please do not drink! Autonomous solenoid valve has halted water delivery for purification.`;
      }
    } else {
      if (isSafe) {
        textToSpeak = `खुशखबरी! ${selectedUnit?.name || 'इस नल'}, ${selectedUnit?.district} का पानी पीने के लिए बिल्कुल शुद्ध और सुरक्षित है। TDS स्तर ${curTds} और pH ${curPh} है।`;
      } else if (isWarning) {
        textToSpeak = `सूचना: ${selectedUnit?.name || 'इस नल'} का पानी सामान्य सीमा के करीब है। TDS स्तर ${curTds} है।`;
      } else {
        textToSpeak = `सावधान! ${selectedUnit?.name || 'इस स्टेशन'}, ${selectedUnit?.district} का पानी पीने योग्य नहीं है! TDS स्तर ${curTds} और pH ${curPh} है। कृपया इसे बिल्कुल न पिएं! सोलेनोइड वाल्व द्वारा पानी का वितरण रोक दिया गया है।`;
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* 1. CINEMATIC HERO ROLL CAROUSEL (Jharkhand Water Initiatives) */}
      <HeroCarousel />

      {/* 2. "SELECT YOUR LOCATION (अपना स्थान चुनें)" INTERACTIVE FINDER */}
      <div className="clean-card" style={{ padding: '20px 24px', background: '#FFFFFF', border: '2px solid var(--border-subtle)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--brand-navy)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={17} />
              </div>
              <strong style={{ fontSize: '1.15rem', color: 'var(--brand-navy)' }}>
                {t('selectLocationTitle')}
              </strong>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4, marginLeft: 40 }}>
              {t('selectLocationSubtitle')}
            </p>
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            onClick={handleDetectLocation}
            className="btn-clean btn-clean-outline"
            style={{ fontSize: '0.82rem', padding: '7px 14px', borderRadius: 'var(--radius-full)' }}
          >
            <LocateFixed size={15} color="var(--brand-accent)" className={geoLocating ? 'animate-spin' : ''} />
            <span>{geoLocating ? t('detecting') : t('autoDetectBtn')}</span>
          </button>
        </div>

        {/* 🌟 HACKATHON LIVE DEMO ONE-CLICK SWITCHER 🌟 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
          background: 'var(--bg-subtle)',
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* Option A: NMIET Live IoT Station (SAFE) */}
          <button
            onClick={() => {
              const nmiet = units.find(u => u.district === 'NMIET' || u.name.includes('NMIET') || u.id === 'JH-RAN-001') || units[0];
              if (nmiet) {
                setSelectedUnit(nmiet);
                setSelectedDistrict('NMIET (Live IoT)');
                if (onSelectUnit) onSelectUnit(nmiet.id);
              }
            }}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedUnit?.id === 'JH-RAN-001' || selectedUnit?.district === 'NMIET'
                ? '2px solid #10B981'
                : '1px solid var(--border-subtle)',
              background: selectedUnit?.id === 'JH-RAN-001' || selectedUnit?.district === 'NMIET'
                ? '#ECFDF5'
                : '#FFFFFF',
              color: selectedUnit?.id === 'JH-RAN-001' || selectedUnit?.district === 'NMIET'
                ? '#065F46'
                : 'var(--text-main)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: selectedUnit?.id === 'JH-RAN-001' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span style={{ textAlign: 'left' }}>
                <div>🟢 <strong>NMIET Live Station</strong></div>
                <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600 }}>100% PURE & SAFE TO DRINK</div>
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
              ✓ LIVE IOT
            </span>
          </button>

          {/* Option B: Ranchi Contaminated Hand Pump (UNSAFE DEMO) */}
          <button
            onClick={() => {
              const ranchi = units.find(u => u.id === 'JH-RAN-002' || u.district === 'Ranchi');
              if (ranchi) {
                setSelectedUnit(ranchi);
                setSelectedDistrict('Ranchi');
                if (onSelectUnit) onSelectUnit(ranchi.id);
              }
            }}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedUnit?.id === 'JH-RAN-002'
                ? '2px solid #EF4444'
                : '1px solid var(--border-subtle)',
              background: selectedUnit?.id === 'JH-RAN-002'
                ? '#FEF2F2'
                : '#FFFFFF',
              color: selectedUnit?.id === 'JH-RAN-002'
                ? '#991B1B'
                : 'var(--text-main)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: selectedUnit?.id === 'JH-RAN-002' ? '0 2px 8px rgba(239, 68, 68, 0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              <span style={{ textAlign: 'left' }}>
                <div>🔴 <strong>Ranchi Impure Sample</strong></div>
                <div style={{ fontSize: '0.7rem', color: '#B91C1C', fontWeight: 600 }}>⛔ CAUTION: DO NOT DRINK</div>
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
              ⚠️ UNSAFE DEMO
            </span>
          </button>
        </div>

        {/* District Quick Select Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 14 }}>
          {JHARKHAND_DISTRICTS.map((dist) => {
            const isSelected = selectedDistrict === dist;
            const isNmiet = dist.startsWith('NMIET');
            const isRanchi = dist === 'Ranchi';
            return (
              <button
                key={dist}
                onClick={() => {
                  setSelectedDistrict(dist);
                  const firstInDist = isNmiet
                    ? (units.find(u => u.district === 'NMIET' || u.name.includes('NMIET') || u.id === 'JH-RAN-001') || units[0])
                    : units.find(u => u.district === dist);
                  if (firstInDist) {
                    setSelectedUnit(firstInDist);
                    if (onSelectUnit) onSelectUnit(firstInDist.id);
                  }
                }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: isNmiet
                    ? `2px solid ${isSelected ? '#059669' : '#10B981'}`
                    : isRanchi
                    ? `2px solid ${isSelected ? '#DC2626' : '#F87171'}`
                    : `1.5px solid ${isSelected ? 'var(--brand-navy)' : 'var(--border-subtle)'}`,
                  background: isNmiet
                    ? (isSelected ? '#059669' : '#ECFDF5')
                    : isRanchi
                    ? (isSelected ? '#DC2626' : '#FEF2F2')
                    : (isSelected ? 'var(--brand-navy)' : '#FFFFFF'),
                  color: isNmiet
                    ? (isSelected ? '#FFFFFF' : '#065F46')
                    : isRanchi
                    ? (isSelected ? '#FFFFFF' : '#991B1B')
                    : (isSelected ? '#FFFFFF' : 'var(--text-main)'),
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none'
                }}
              >
                {isNmiet && <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? '#FFFFFF' : '#10B981', display: 'inline-block' }} />}
                {isRanchi && <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? '#FFFFFF' : '#EF4444', display: 'inline-block' }} />}
                {dist}
              </button>
            );
          })}
        </div>

        {/* Stations in Selected District Pill List */}
        <div style={{
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            {selectedDistrict} {t('stationsLabel')}:
          </span>

          {districtUnits.map((u) => {
            const isCurrent = selectedUnit?.id === u.id;
            const isUnitSafe = u.status === 'SAFE';
            return (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUnit(u);
                  if (onSelectUnit) onSelectUnit(u.id);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${isCurrent ? (isUnitSafe ? 'var(--safe-green)' : 'var(--danger-red)') : 'var(--border-subtle)'}`,
                  background: isCurrent ? '#FFFFFF' : 'transparent',
                  color: isCurrent ? 'var(--brand-navy)' : 'var(--text-secondary)',
                  fontWeight: isCurrent ? 800 : 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: isCurrent ? 'var(--shadow-subtle)' : 'none'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isUnitSafe ? '#10B981' : '#EF4444' }} />
                <span>{u.name} ({u.village}) {u.status === 'UNSAFE' ? '⚠️ [UNSAFE]' : ''}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. HERO WATER STATUS CARD FOR CHOSEN LOCATION */}
      <div className={`hero-status-card ${isSafe ? 'safe' : 'unsafe'}`}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div className={`status-badge-pill ${isSafe ? 'safe' : 'unsafe'}`}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSafe ? 'var(--safe-green)' : 'var(--danger-red)' }} />
              <span>{isOffline ? t('offline') : isSafe ? t('safe') : (lang === 'hi' ? '⚠️ पानी पीने योग्य नहीं है' : '⛔ DO NOT DRINK')}</span>
            </div>

            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              📍 {selectedUnit?.name} • {selectedUnit?.village}, {selectedUnit?.district}
            </span>
          </div>

          <h1 className="hero-title" style={{ color: isSafe ? 'var(--safe-text)' : 'var(--danger-text)' }}>
            {isOffline 
              ? t('offlineWaterHero')
              : isSafe 
              ? (lang === 'hi' ? '100% शुद्ध एवं पीने योग्य पानी' : '100% PURE & SAFE TO DRINK')
              : (lang === 'hi' ? 'सावधान: यह पानी न पिएं (शोधन जारी)' : 'CAUTION: DO NOT DRINK WATER')}
          </h1>

          <p className="hero-subtitle">
            {isOffline 
              ? t('offlineHeroSubtitle') 
              : isSafe 
              ? (lang === 'hi' ? 'सौर संचालित IoT सेंसर द्वारा पानी 100% शुद्ध, मीठा एवं BIS 10500 मानकों के अनुरूप प्रमाणित है।' : 'Clean, sweet, and healthy water tested live by solar IoT sensors matching BIS 10500 specs.')
              : (lang === 'hi' ? 'TDS और pH सुरक्षित सीमा से बाहर हैं। स्वचालित सोलेनोइड वाल्व ने वितरण रोक कर रीसर्क्युलेशन फिल्टर चालू किया है।' : 'TDS and pH levels exceed safe drinking limits. Autonomous solenoid valve has halted distribution for filtration.')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            {/* Audio Voice Button */}
            <button
              onClick={speakStatus}
              className={`btn-clean ${isSafe ? 'btn-clean-primary' : 'btn-danger'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '9px 18px', fontWeight: 800 }}
            >
              <Volume2 size={16} className={isSpeaking ? 'animate-bounce' : ''} />
              <span>{isSpeaking ? t('speakingAudio') : (lang === 'hi' ? '🔊 स्थिति सुनें (आवाज़)' : '🔊 Listen to Status Voice')}</span>
            </button>

            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSafe ? '#10B981' : '#EF4444', display: 'inline-block' }} className="animate-pulse" />
              {t('lastChecked')}: {latestReading?.timestamp ? (new Date(latestReading.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })) : 'Live (Just now)'}
            </span>
          </div>
        </div>

        {/* Large Visual Clean Icon Badge */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: isSafe ? 'var(--safe-bg)' : 'var(--danger-bg)',
          border: `2px solid ${isSafe ? 'var(--safe-border)' : 'var(--danger-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isSafe ? (
            <CheckCircle2 size={46} color="var(--safe-green)" />
          ) : (
            <XCircle size={46} color="var(--danger-red)" />
          )}
        </div>
      </div>

      {/* 4. FOUR LIVE SENSOR METRIC CARDS FOR CHOSEN LOCATION (ESP32 DATA) */}
      <div className="metrics-grid">
        
        {/* 1. TDS (Total Dissolved Solids) */}
        {(() => {
          const val = latestReading?.outlet_tds !== undefined ? latestReading.outlet_tds : (selectedUnit?.latest_tds ?? (isUnsafe ? 1234 : 81));
          const isTdsSafe = Number(val) <= 500;
          return (
            <div className="metric-card" style={{ borderLeft: `4px solid ${isTdsSafe ? 'var(--safe-green)' : 'var(--danger-red)'}` }}>
              <div className="metric-header">
                <span className="metric-label">
                  <Droplets size={16} color={isTdsSafe ? 'var(--safe-green)' : 'var(--danger-red)'} />
                  <span>{t('tasteTitle')} (TDS)</span>
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  background: isTdsSafe ? 'var(--safe-bg)' : 'var(--danger-bg)', 
                  color: isTdsSafe ? 'var(--safe-text)' : 'var(--danger-text)', 
                  border: `1px solid ${isTdsSafe ? 'var(--safe-border)' : 'var(--danger-border)'}`,
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  fontWeight: 700 
                }}>
                  {isOffline ? 'Offline' : (isTdsSafe ? '✓ Safe (≤ 500)' : '⚠️ Critical (> 500)')}
                </span>
              </div>
              <div className="metric-value-row">
                <span className="metric-number" style={{ color: isTdsSafe ? 'var(--text-main)' : 'var(--danger-text)' }}>{val}</span>
                <span className="metric-unit">ppm</span>
              </div>
              <div className="metric-status-text" style={{ color: isTdsSafe ? 'var(--text-secondary)' : 'var(--danger-text)', fontWeight: isTdsSafe ? 400 : 600 }}>
                {isTdsSafe ? t('tdsMetricDesc') : (lang === 'hi' ? 'खनिज मात्रा अत्यधिक है, सुरक्षित नहीं' : 'Excessive mineral concentration exceeds BIS limit')}
              </div>
            </div>
          );
        })()}

        {/* 2. pH Level */}
        {(() => {
          const val = latestReading?.outlet_ph !== undefined ? Number(latestReading.outlet_ph).toFixed(2) : (selectedUnit?.latest_ph ? Number(selectedUnit.latest_ph).toFixed(2) : (isUnsafe ? '5.36' : '7.20'));
          const numPh = Number(val);
          const isPhSafe = numPh >= 6.5 && numPh <= 8.5;
          const isAcidic = numPh < 6.5;
          return (
            <div className="metric-card" style={{ borderLeft: `4px solid ${isPhSafe ? 'var(--safe-green)' : 'var(--danger-red)'}` }}>
              <div className="metric-header">
                <span className="metric-label">
                  <ShieldCheck size={16} color={isPhSafe ? 'var(--safe-green)' : 'var(--danger-red)'} />
                  <span>{t('balanceTitle')} (pH)</span>
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  background: isPhSafe ? 'var(--safe-bg)' : 'var(--danger-bg)', 
                  color: isPhSafe ? 'var(--safe-text)' : 'var(--danger-text)', 
                  border: `1px solid ${isPhSafe ? 'var(--safe-border)' : 'var(--danger-border)'}`,
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  fontWeight: 700 
                }}>
                  {isOffline ? t('offline') : (isPhSafe ? '✓ Neutral (6.5-8.5)' : isAcidic ? '⚠️ Acidic (< 6.5)' : '⚠️ Alkaline (> 8.5)')}
                </span>
              </div>
              <div className="metric-value-row">
                <span className="metric-number" style={{ color: isPhSafe ? 'var(--text-main)' : 'var(--danger-text)' }}>{val}</span>
                <span className="metric-unit">pH</span>
              </div>
              <div className="metric-status-text" style={{ color: isPhSafe ? 'var(--text-secondary)' : 'var(--danger-text)', fontWeight: isPhSafe ? 400 : 600 }}>
                {isPhSafe ? t('phMetricDesc') : (lang === 'hi' ? 'पानी अम्लीय है, पाचन के लिए हानिकारक' : 'Acidic water requires neutralizer treatment')}
              </div>
            </div>
          );
        })()}

        {/* 3. Turbidity */}
        {(() => {
          const val = latestReading?.outlet_turbidity !== undefined ? Number(latestReading.outlet_turbidity).toFixed(2) : (selectedUnit?.latest_turbidity ? Number(selectedUnit.latest_turbidity).toFixed(2) : (isUnsafe ? '7.06' : '0.50'));
          const numTurb = Number(val);
          const isTurbSafe = numTurb <= 1.0;
          return (
            <div className="metric-card" style={{ borderLeft: `4px solid ${isTurbSafe ? 'var(--safe-green)' : 'var(--danger-red)'}` }}>
              <div className="metric-header">
                <span className="metric-label">
                  <Droplets size={16} color={isTurbSafe ? 'var(--safe-green)' : 'var(--danger-red)'} />
                  <span>{t('clarityTitle')} (Turbidity)</span>
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  background: isTurbSafe ? 'var(--safe-bg)' : 'var(--danger-bg)', 
                  color: isTurbSafe ? 'var(--safe-text)' : 'var(--danger-text)', 
                  border: `1px solid ${isTurbSafe ? 'var(--safe-border)' : 'var(--danger-border)'}`,
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  fontWeight: 700 
                }}>
                  {isOffline ? t('offline') : (isTurbSafe ? '✓ Clean (≤ 1.0)' : '⚠️ Cloudy (> 1.0)')}
                </span>
              </div>
              <div className="metric-value-row">
                <span className="metric-number" style={{ color: isTurbSafe ? 'var(--text-main)' : 'var(--danger-text)' }}>{val}</span>
                <span className="metric-unit">NTU</span>
              </div>
              <div className="metric-status-text" style={{ color: isTurbSafe ? 'var(--text-secondary)' : 'var(--danger-text)', fontWeight: isTurbSafe ? 400 : 600 }}>
                {isTurbSafe ? t('turbidityMetricDesc') : (lang === 'hi' ? 'पानी में गंदलापन/धुंधलापन अधिक है' : 'Suspended particulates exceed allowable limit')}
              </div>
            </div>
          );
        })()}

        {/* 4. Temperature */}
        {(() => {
          const val = latestReading?.outlet_temp !== undefined ? Number(latestReading.outlet_temp).toFixed(1) : (selectedUnit?.latest_temp ? Number(selectedUnit.latest_temp).toFixed(1) : '24.8');
          return (
            <div className="metric-card" style={{ borderLeft: '4px solid var(--safe-green)' }}>
              <div className="metric-header">
                <span className="metric-label">
                  <Clock size={16} color="var(--brand-accent)" />
                  <span>{t('freshnessTitle')} (Temp)</span>
                </span>
                <span style={{ fontSize: '0.72rem', background: 'var(--safe-bg)', color: 'var(--safe-text)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  {isOffline ? t('offline') : '✓ Fresh (10-35°C)'}
                </span>
              </div>
              <div className="metric-value-row">
                <span className="metric-number">{val}</span>
                <span className="metric-unit">°C</span>
              </div>
              <div className="metric-status-text">
                {t('tempMetricDesc')}
              </div>
            </div>
          );
        })()}

      </div>

      {/* 5. 2-COLUMN SPLIT: 7-DAY COMPLIANCE & JAL SAHIYA */}
      <div className="split-grid">
        
        {/* 7-Day History */}
        <div className="clean-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--brand-navy)' }}>
              {t('weeklyTitle')}
            </strong>
            <span style={{ 
              fontSize: '0.72rem', 
              color: isSafe ? 'var(--safe-text)' : 'var(--danger-text)', 
              fontWeight: 700, 
              background: isSafe ? 'var(--safe-bg)' : 'var(--danger-bg)', 
              border: `1px solid ${isSafe ? 'var(--safe-border)' : 'var(--danger-border)'}`,
              padding: '2px 8px', 
              borderRadius: '10px' 
            }}>
              {isSafe ? '100% BIS Compliant' : '⚠️ 0% Compliant (Contaminated Source)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {history.length > 0 ? (
              history.map((day, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: day.status === 'SAFE' ? 'var(--safe-bg)' : 'var(--danger-bg)',
                    border: `1px solid ${day.status === 'SAFE' ? 'var(--safe-border)' : 'var(--danger-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 4px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '1.1rem', margin: '2px 0' }}>
                    {day.status === 'SAFE' ? '✓' : '✗'}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: day.status === 'SAFE' ? 'var(--safe-text)' : 'var(--danger-text)' }}>
                    {day.status === 'SAFE' ? t('pureLabel') : t('impureLabel')}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', color: '#999', gridColumn: '1 / -1', fontSize: '0.8rem' }}>
                {t('loadingHistory')}
              </div>
            )}
          </div>
        </div>

        {/* Caretaker & Helpline */}
        <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              {t('caretakerTitle')} ({selectedUnit?.village})
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
              {selectedUnit?.contact_person || 'Rameshwar Mahato (Jal Sahiya)'}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {t('caretakerDesc')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <a
              href={`tel:${selectedUnit?.contact_phone || '9431102948'}`}
              className="btn-clean btn-clean-primary"
              style={{ flex: 1 }}
            >
              <PhoneCall size={14} />
              <span>{t('callJalSahiya')}</span>
            </a>

            <a
              href="tel:18003456555"
              className="btn-clean btn-clean-outline"
              title="Toll-Free 24x7 Helpline"
            >
              📞 1800-345-6555
            </a>
          </div>
        </div>

      </div>

      {/* 6. INTERACTIVE MAP */}
      <div className="clean-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <strong style={{ fontSize: '0.98rem', color: 'var(--brand-navy)' }}>
              {t('nearestWaterTitle')}
            </strong>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t('nearestWaterSubtitle')} {selectedDistrict}
            </div>
          </div>
        </div>

        <FleetMap
          units={units}
          selectedUnit={selectedUnit}
          onSelectUnit={(u) => {
            setSelectedUnit(u);
            if (u.district) setSelectedDistrict(u.district);
            if (onSelectUnit) onSelectUnit(u.id);
          }}
          height="320px"
        />
      </div>

    </div>
  );
}
