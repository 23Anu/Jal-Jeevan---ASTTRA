import React, { useState, useEffect } from 'react';
import { useLanguage } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import { useNotifications } from './context/NotificationContext';
import Header from './components/Header';
import Footer from './components/Footer';
import PublicPortal from './views/PublicPortal';
import PhedPortal from './views/PhedPortal';
import PhedLogin from './components/PhedLogin';
import { Droplets, Landmark } from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const { user, isPhedAuthorized } = useAuth();
  const { addNotification } = useNotifications();

  // Mode: 'public' or 'phed'
  const [portalMode, setPortalMode] = useState('public');
  const [units, setUnits] = useState([]);
  const [activeUnitId, setActiveUnitId] = useState('JH-RAN-001');
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Fetch Units list
  const fetchUnits = () => {
    fetch('/api/units')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUnits(data.data);
          if (!activeUnitId && data.data.length > 0) {
            setActiveUnitId(data.data[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching units:', err));
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  // Always start in public citizen view by default

  // WebSocket Live Connection with graceful polling fallback
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;
    let isCleanedUp = false;

    const connectWs = () => {
      if (isCleanedUp) return;
      const envWs = import.meta.env.VITE_WS_URL;
      let wsUrl = envWs;
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }
      
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isCleanedUp) setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'NEW_READING') {
              const updatedReading = message.reading || message.data;
              if (updatedReading) {
                setUnits(prev => prev.map(u => {
                  if (u.id === updatedReading.unit_id || u.district === 'NMIET' || u.name?.includes('NMIET')) {
                    return {
                      ...u,
                      status: updatedReading.bis_status || updatedReading.status || 'SAFE',
                      latest_ph: updatedReading.outlet_ph ?? updatedReading.ph,
                      latest_tds: updatedReading.outlet_tds ?? updatedReading.tds,
                      latest_turbidity: updatedReading.outlet_turbidity ?? updatedReading.turbidity,
                      latest_temp: updatedReading.outlet_temp ?? updatedReading.temperature,
                      last_reading_time: updatedReading.timestamp || updatedReading.createdAt || new Date().toISOString()
                    };
                  }
                  return u;
                }));

                // Push to Notification system
                const isUnsafe = updatedReading.bis_status === 'UNSAFE';
                addNotification({
                  type: isUnsafe ? 'UNSAFE_ALERT' : 'SAFE_PULSE',
                  title: isUnsafe 
                    ? `⚠️ Alert: Unit ${updatedReading.unit_id} Recirculating`
                    : `Telemetry Pulse: Unit ${updatedReading.unit_id}`,
                  message: isUnsafe
                    ? `TDS reached ${updatedReading.outlet_tds} ppm. Solenoid valve diverted water for filtration.`
                    : `TDS: ${updatedReading.outlet_tds} ppm | pH: ${updatedReading.outlet_ph} | Status: ${updatedReading.bis_status}`
                });
              }
            } else if (message.type === 'BATCH_SYNC_COMPLETED') {
              fetchUnits();
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!isCleanedUp) {
            setIsWsConnected(false);
            reconnectTimer = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          if (!isCleanedUp) setIsWsConnected(false);
        };
      } catch (err) {
        if (!isCleanedUp) {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    // Polling fallback every 15s to guarantee fresh data even if WS drops
    const pollInterval = setInterval(() => {
      fetchUnits();
    }, 15000);

    return () => {
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [addNotification]);

  return (
    <div className="app-container">
      <Header isWsConnected={isWsConnected} />

      {/* Clean Mode Switcher Bar */}
      <div style={{ maxWidth: '1200px', width: '100%', margin: '16px auto 0', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        
        {/* Navigation Segmented Control */}
        <div className="nav-pill-group">
          <button
            className={`nav-pill ${portalMode === 'public' ? 'active' : ''}`}
            onClick={() => setPortalMode('public')}
          >
            <Droplets size={15} />
            <span>{t('publicView')}</span>
          </button>

          <button
            className={`nav-pill ${portalMode === 'phed' ? 'active' : ''}`}
            onClick={() => setPortalMode('phed')}
          >
            <Landmark size={15} />
            <span>{t('phedView')}</span>
          </button>
        </div>

        {/* User Identity Chip */}
        {user && user.role !== 'PUBLIC' && (
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--brand-navy)',
            background: 'var(--bg-subtle)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)'
          }}>
            👤 {user.full_name} ({user.role})
          </div>
        )}
      </div>

      {/* Main Content View */}
      <main className="main-content">
        {portalMode === 'public' ? (
          <PublicPortal
            units={units}
            activeUnitId={activeUnitId}
            onSelectUnit={(id) => setActiveUnitId(id)}
          />
        ) : !isPhedAuthorized ? (
          <PhedLogin
            onLoginSuccess={() => {
              setPortalMode('phed');
            }}
            onCancel={() => setPortalMode('public')}
          />
        ) : (
          <PhedPortal
            units={units}
            activeUnitId={activeUnitId}
            onSelectUnit={(id) => setActiveUnitId(id)}
            onRefreshUnits={fetchUnits}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
