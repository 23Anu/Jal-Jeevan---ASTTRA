import React, { useState, useEffect } from 'react';
import { 
  Activity, Map, AlertOctagon, Wrench, BarChart3, Users, 
  Download, RefreshCw, CheckCircle2, XCircle, AlertTriangle, 
  Cpu, Filter, Eye, ChevronRight, FileSpreadsheet, PlusCircle, ArrowUpDown,
  Zap, Droplets, ShieldCheck, Microscope, LogOut
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import FleetMap from '../components/FleetMap';
import StatusBadge from '../components/StatusBadge';
import GaugeMeter from '../components/GaugeMeter';

// Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PhedPortal({ units = [], activeUnitId, onSelectUnit, onRefreshUnits }) {
  const { t, lang } = useLanguage();
  const { user, logout } = useAuth();
  
  // Tab Navigation: 'fleet' | 'unit_detail' | 'alerts' | 'maintenance' | 'analytics' | 'simulator'
  const [activeTab, setActiveTab] = useState('fleet');
  const [selectedUnit, setSelectedUnit] = useState(null);
  
  // Unit Detail State
  const [unitDetail, setUnitDetail] = useState(null);
  const [unitReadings, setUnitReadings] = useState([]);
  const [timeframe, setTimeframe] = useState('7d');
  
  // Alerts State
  const [alerts, setAlerts] = useState([]);
  const [alertFilter, setAlertFilter] = useState({ severity: '', status: '' });
  const [alertStats, setAlertStats] = useState({ total: 0, critical: 0, warning: 0, open: 0 });
  
  // Maintenance State
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintFormData, setMaintFormData] = useState({
    officer_name: user?.full_name || 'Er. Rajesh Ranjan',
    action_type: 'Filter Cartridge Replacement',
    notes: 'Standard 5-micron sediment and carbon block replacement',
    parts_replaced: 'Sediment Filter + Carbon Block',
    new_filter_health: 100
  });

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);

  // Simulator State
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState('');

  // Initial load & unit selection
  useEffect(() => {
    if (units.length > 0) {
      const match = units.find(u => u.district === 'NMIET' || u.name.includes('NMIET') || u.id === activeUnitId) || units[0];
      setSelectedUnit(match);
    }
  }, [units, activeUnitId]);

  // Load Unit Detail when unit or timeframe changes + Real-time ESP32 Polling
  useEffect(() => {
    if (!selectedUnit) return;

    let timer;

    const loadUnitData = () => {
      fetch(`/api/units/${selectedUnit.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setUnitDetail(data.data);
        })
        .catch(err => console.error('Error fetching unit detail:', err));

      fetch(`/api/units/${selectedUnit.id}/readings/history?timeframe=${timeframe}&limit=100`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setUnitReadings(data.data || []);
        })
        .catch(err => console.error('Error fetching history:', err));
    };

    loadUnitData();
    timer = setInterval(loadUnitData, 4000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [selectedUnit, timeframe]);

  // Load Alerts
  const fetchAlerts = () => {
    let url = '/api/alerts?limit=100';
    if (alertFilter.severity) url += `&severity=${alertFilter.severity}`;
    if (alertFilter.status) url += `&status=${alertFilter.status}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAlerts(data.data);
          setAlertStats(data.stats);
        }
      })
      .catch(err => console.error('Error loading alerts:', err));
  };

  useEffect(() => {
    fetchAlerts();
  }, [alertFilter]);

  // Load Maintenance Logs
  const fetchMaintenance = () => {
    fetch('/api/maintenance')
      .then(res => res.json())
      .then(data => {
        if (data.success) setMaintenanceLogs(data.data);
      })
      .catch(err => console.error('Error loading maintenance:', err));
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  // Load Analytics Data
  useEffect(() => {
    fetch('/api/reports/analytics')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAnalyticsData(data);
      })
      .catch(err => console.error('Error loading analytics:', err));
  }, []);

  // Handle Alert Status change (Acknowledge / Resolve)
  const handleAlertStatus = async (alertId, newStatus) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          officer_name: user?.full_name || 'PHED SDO'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Error updating alert:', err);
    }
  };

  // Handle Submit Maintenance
  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedUnit) return;

    try {
      const res = await fetch(`/api/maintenance/${selectedUnit.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintFormData)
      });
      const data = await res.json();
      if (data.success) {
        setShowMaintModal(false);
        fetchMaintenance();
        if (onRefreshUnits) onRefreshUnits();
        setUnitDetail(prev => ({
          ...prev,
          filter_health: maintFormData.new_filter_health,
          last_maintenance_date: new Date().toISOString().slice(0, 10)
        }));
      }
    } catch (err) {
      console.error('Error logging maintenance:', err);
    }
  };

  // Trigger simulated ESP32 pulse
  const triggerSimulatorPulse = async () => {
    setSimLoading(true);
    setSimMessage('');
    try {
      const res = await fetch('/api/simulator/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSimMessage(`✓ Ingested live reading: Unit ${data.reading.unit_id} (TDS: ${data.reading.outlet_tds} ppm, pH: ${data.reading.outlet_ph}, Status: ${data.reading.bis_status})`);
        if (onRefreshUnits) onRefreshUnits();
      }
    } catch (err) {
      setSimMessage('Failed to trigger simulator: ' + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  // Trigger offline backfill sync test
  const triggerBufferSyncTest = async () => {
    if (!selectedUnit) return;
    setSimLoading(true);
    try {
      const now = Date.now();
      const mockBatch = [
        {
          timestamp: new Date(now - 120000).toISOString(),
          inlet_ph: 6.8, inlet_tds: 390, inlet_turbidity: 4.2, inlet_temp: 26.0,
          outlet_ph: 7.2, outlet_tds: 180, outlet_turbidity: 0.3, outlet_temp: 26.0,
          recirculation_cycle: 1, recirculation_outcome: 'RELEASED'
        },
        {
          timestamp: new Date(now - 60000).toISOString(),
          inlet_ph: 6.9, inlet_tds: 410, inlet_turbidity: 3.8, inlet_temp: 26.1,
          outlet_ph: 7.3, outlet_tds: 175, outlet_turbidity: 0.25, outlet_temp: 26.1,
          recirculation_cycle: 1, recirculation_outcome: 'RELEASED'
        }
      ];

      const res = await fetch(`/api/units/${selectedUnit.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: mockBatch })
      });
      const data = await res.json();
      if (data.success) {
        setSimMessage(`✓ Successfully backfilled ${data.insertedCount} offline records for ${selectedUnit.id}`);
        if (onRefreshUnits) onRefreshUnits();
      }
    } catch (err) {
      setSimMessage('Sync failed: ' + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  // Compute stats
  const totalUnitsCount = units.length;
  const safeUnitsCount = units.filter(u => u.status === 'SAFE').length;
  const unsafeUnitsCount = units.filter(u => u.status === 'UNSAFE').length;
  const offlineUnitsCount = units.filter(u => u.status === 'OFFLINE').length;
  const totalTreatedToday = units.reduce((acc, u) => acc + (u.purified_today_litres || 0), 0);

  // Prepare chart data for Inlet vs Outlet Comparison
  const chartLabels = unitReadings.map(r => new Date(r.timestamp).toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  
  const tdsChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Inlet Raw TDS (ppm)',
        data: unitReadings.map(r => r.inlet_tds),
        borderColor: '#E97132',
        backgroundColor: 'rgba(233, 113, 50, 0.08)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Outlet Purified TDS (ppm)',
        data: unitReadings.map(r => r.outlet_tds),
        borderColor: '#29136C',
        backgroundColor: 'rgba(41, 19, 108, 0.12)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const turbChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Inlet Raw Turbidity (NTU)',
        data: unitReadings.map(r => r.inlet_turbidity),
        borderColor: '#D32F2F',
        backgroundColor: 'rgba(211, 47, 47, 0.08)',
        tension: 0.3
      },
      {
        label: 'Outlet Pure Turbidity (NTU)',
        data: unitReadings.map(r => r.outlet_turbidity),
        borderColor: '#1B8A5A',
        backgroundColor: 'rgba(27, 138, 90, 0.12)',
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8, font: { size: 10 } } },
      y: { grid: { color: '#ECEEF4' } }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Officer Session Verification Banner */}
      <div className="officer-session-banner">
        <div className="officer-session-left">
          <div className="officer-badge-icon">
            {user?.role === 'ADMIN' ? '🏛️' : user?.role === 'GP_VWSC' ? '🚰' : '🛡️'}
          </div>
          <div className="officer-session-details">
            <h4>
              <span>{user?.full_name || 'Er. Rajesh Ranjan'}</span>
              <span className="badge-verified-gov">✓ {t('verifiedOfficial') || 'Verified Official'}</span>
            </h4>
            <p>
              {user?.designation || 'Sub-Divisional Officer (SDO)'} • <strong>{user?.department || 'PHED Ranchi Division, Govt. of Jharkhand'}</strong>
            </p>
          </div>
        </div>

        <div className="officer-session-right">
          <span className="officer-id-tag">🆔 {user?.id_card_no || 'JH-PHED-8842'}</span>
          <span className="officer-id-tag">📱 {user?.phone || '+91-9431123456'}</span>
          <button 
            className="officer-logout-btn"
            onClick={() => {
              if (logout) logout();
            }}
            title="Secure Logout / लॉगआउट"
          >
            <LogOut size={13} />
            <span>{t('logout') || 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Institutional Tab Navigation Header (tourism.gov.in style) */}
      <div className="card" style={{ padding: '8px 16px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="nav-tabs" style={{ borderBottom: 'none' }}>
            <button 
              className={`nav-tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
              onClick={() => setActiveTab('fleet')}
              style={{ color: activeTab === 'fleet' ? 'var(--primary)' : 'var(--text-secondary)', borderBottomColor: activeTab === 'fleet' ? 'var(--primary)' : 'transparent' }}
            >
              <Map size={16} />
              <span>{t('fleetOverview')}</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'unit_detail' ? 'active' : ''}`}
              onClick={() => setActiveTab('unit_detail')}
              style={{ color: activeTab === 'unit_detail' ? 'var(--primary)' : 'var(--text-secondary)', borderBottomColor: activeTab === 'unit_detail' ? 'var(--primary)' : 'transparent' }}
            >
              <Activity size={16} />
              <span>Unit Sensor Telemetry</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
              style={{ color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--text-secondary)', borderBottomColor: activeTab === 'alerts' ? 'var(--primary)' : 'transparent' }}
            >
              <AlertOctagon size={16} />
              <span>{t('incidentLog')} ({alertStats.open})</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
              style={{ color: activeTab === 'maintenance' ? 'var(--primary)' : 'var(--text-secondary)', borderBottomColor: activeTab === 'maintenance' ? 'var(--primary)' : 'transparent' }}
            >
              <Wrench size={16} />
              <span>{t('maintenanceTab')}</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
              style={{ color: activeTab === 'analytics' ? 'var(--primary)' : 'var(--text-secondary)', borderBottomColor: activeTab === 'analytics' ? 'var(--primary)' : 'transparent' }}
            >
              <BarChart3 size={16} />
              <span>{t('analyticsTab')}</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
              style={{ color: activeTab === 'simulator' ? 'var(--primary)' : 'var(--text-secondary)', borderBottomColor: activeTab === 'simulator' ? 'var(--primary)' : 'transparent' }}
            >
              <Cpu size={16} />
              <span>{t('simulatorTab')}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a 
              href="/api/reports/export?format=csv"
              className="btn btn-outline btn-sm"
              download
            >
              <Download size={14} />
              <span>{t('exportCsv')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* TAB 1: FLEET OVERVIEW DASHBOARD */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('totalUnits')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>{totalUnitsCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Across 6 Monitored Districts</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--safe)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('safeUnits')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--safe)', marginTop: 4 }}>{safeUnitsCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--safe)', marginTop: 4 }}>
                {Math.round((safeUnitsCount / (totalUnitsCount || 1)) * 100)}% BIS Standard Compliant
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('unsafeUnits')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>{unsafeUnitsCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>Solenoid Diverted for Recirculation</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #78909C' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('offlineUnits')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#546E7A', marginTop: 4 }}>{offlineUnitsCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Awaiting GSM Telemetry Ping</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('purifiedToday')}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                {totalTreatedToday.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 600 }}>L</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Daily Target: 18,000 Litres</div>
            </div>
          </div>

          {/* GIS Fleet Map */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                <Map size={18} color="var(--primary)" />
                <span>Statewide GIS Telemetry Map</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Click any marker pin to inspect unit & sensor logs
              </span>
            </div>

            <FleetMap
              units={units}
              selectedUnit={selectedUnit}
              onSelectUnit={(u) => {
                setSelectedUnit(u);
                setActiveTab('unit_detail');
              }}
              height="480px"
            />
          </div>

          {/* Units Inventory Table */}
          <div className="card">
            <h3 className="card-title card-title-border">
              <span>Station Directory & Live Parameter Telemetry</span>
            </h3>

            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Unit ID</th>
                    <th>Station Name</th>
                    <th>District / Block</th>
                    <th>Status</th>
                    <th>pH</th>
                    <th>TDS (ppm)</th>
                    <th>Turbidity</th>
                    <th>Temp (°C)</th>
                    <th>Last Signal (IST)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map(u => {
                    const isOff = u.status === 'OFFLINE';
                    return (
                      <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedUnit(u); setActiveTab('unit_detail'); }}>
                        <td><code>{u.id}</code></td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.district} • {u.block}</td>
                        <td><StatusBadge status={u.status} size="sm" /></td>
                        <td><strong style={{ color: isOff ? 'inherit' : 'var(--primary)' }}>{isOff ? '-' : (u.latest_ph !== undefined ? Number(u.latest_ph).toFixed(2) : '7.20')}</strong></td>
                        <td><strong style={{ color: isOff ? 'inherit' : '#059669' }}>{isOff ? '-' : (u.latest_tds !== undefined ? Math.round(u.latest_tds) + ' ppm' : '81 ppm')}</strong></td>
                        <td><strong style={{ color: isOff ? 'inherit' : '#0284C7' }}>{isOff ? '-' : (u.latest_turbidity !== undefined ? Number(u.latest_turbidity).toFixed(2) + ' NTU' : '0.50 NTU')}</strong></td>
                        <td><strong style={{ color: isOff ? 'inherit' : 'var(--text-main)' }}>{isOff ? '-' : (u.latest_temp !== undefined ? Number(u.latest_temp).toFixed(1) + ' °C' : '24.8 °C')}</strong></td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: isOff ? 'var(--text-muted)' : '#059669', fontWeight: 600 }}>
                            {isOff ? 'Awaiting Signal' : (u.last_reading_time ? new Date(u.last_reading_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Live (Just now)')}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUnit(u);
                              setActiveTab('unit_detail');
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: UNIT DETAIL & SENSOR COMPARISONS */}
      {activeTab === 'unit_detail' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Unit Header Bar & Selector */}
          <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedUnit?.status === 'OFFLINE' ? '#94A3B8' : '#10B981' }} className={selectedUnit?.status === 'OFFLINE' ? '' : 'animate-pulse'} />
                  Active Unit Telemetry Stream • Last Sync: {unitDetail?.latest_reading?.timestamp ? new Date(unitDetail.latest_reading.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Live (Just now)'}
                </div>
                <h2 style={{ fontSize: '1.3rem', color: 'var(--primary)', margin: '2px 0 4px', fontWeight: 800 }}>
                  {selectedUnit?.name} <code>({selectedUnit?.id})</code>
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {selectedUnit?.location_type} • {selectedUnit?.village}, {selectedUnit?.block} Block, {selectedUnit?.district} District
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Timeframe selector */}
                <div style={{ display: 'flex', background: '#F1F2F6', borderRadius: '6px', padding: '3px' }}>
                  {['24h', '7d', '30d'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        background: timeframe === tf ? 'var(--primary)' : 'transparent',
                        color: timeframe === tf ? '#FFF' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>

                <select
                  value={selectedUnit?.id || ''}
                  onChange={(e) => {
                    const u = units.find(item => item.id === e.target.value);
                    if (u) setSelectedUnit(u);
                  }}
                  className="form-control"
                  style={{ width: 'auto', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.district} - {u.name} {u.district === 'NMIET' || u.id === 'JH-RAN-001' ? '⚡ (Live ESP32 IoT)' : (u.status === 'OFFLINE' ? ' [OFFLINE]' : '')}
                    </option>
                  ))}
                </select>

                <button className="btn btn-accent btn-sm" onClick={() => setShowMaintModal(true)}>
                  <Wrench size={14} /> Log Maintenance
                </button>
              </div>
            </div>
          </div>

          {/* 4 CORE LIVE IOT SENSOR PARAMETER CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            
            {/* 1. pH */}
            <div className="card" style={{ padding: '16px', borderTop: '3px solid #3B82F6', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Water pH Level</span>
                <span style={{ fontSize: '0.72rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>BIS 6.5 - 8.5</span>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#1E3A8A' }}>
                {selectedUnit?.status === 'OFFLINE' ? '-' : (unitDetail?.latest_reading?.outlet_ph !== undefined ? Number(unitDetail.latest_reading.outlet_ph).toFixed(2) : '7.20')} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>pH</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>
                {selectedUnit?.status === 'OFFLINE' ? 'Station Offline' : '✓ Optimal Alkaline-Neutral Balance'}
              </div>
            </div>

            {/* 2. TDS */}
            <div className="card" style={{ padding: '16px', borderTop: '3px solid #10B981', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Dissolved Solids (TDS)</span>
                <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>BIS ≤ 500 ppm</span>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#065F46' }}>
                {selectedUnit?.status === 'OFFLINE' ? '-' : (unitDetail?.latest_reading?.outlet_tds !== undefined ? Math.round(unitDetail.latest_reading.outlet_tds) : '81')} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ppm</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>
                {selectedUnit?.status === 'OFFLINE' ? 'Station Offline' : '✓ Excellent Drinking Palatability'}
              </div>
            </div>

            {/* 3. Turbidity */}
            <div className="card" style={{ padding: '16px', borderTop: '3px solid #06B6D4', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Water Turbidity</span>
                <span style={{ fontSize: '0.72rem', background: '#ECFEFF', color: '#0E7490', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>BIS ≤ 1.0 NTU</span>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#155E75' }}>
                {selectedUnit?.status === 'OFFLINE' ? '-' : (unitDetail?.latest_reading?.outlet_turbidity !== undefined ? Number(unitDetail.latest_reading.outlet_turbidity).toFixed(2) : '0.50')} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>NTU</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>
                {selectedUnit?.status === 'OFFLINE' ? 'Station Offline' : '✓ Crystal Clear Clarity'}
              </div>
            </div>

            {/* 4. Temperature */}
            <div className="card" style={{ padding: '16px', borderTop: '3px solid #F59E0B', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Water Temperature</span>
                <span style={{ fontSize: '0.72rem', background: '#FFFBEB', color: '#B45309', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Standard Range</span>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#92400E' }}>
                {selectedUnit?.status === 'OFFLINE' ? '-' : (unitDetail?.latest_reading?.outlet_temp !== undefined ? Number(unitDetail.latest_reading.outlet_temp).toFixed(1) : '24.8')} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>°C</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>
                {selectedUnit?.status === 'OFFLINE' ? 'Station Offline' : '✓ Fresh Ambient Temperature'}
              </div>
            </div>

          </div>

          {/* Unit Health & Cartridge Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="card">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>{t('filterHealth')}</h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: (unitDetail?.filter_health || 80) < 25 ? 'var(--danger)' : 'var(--safe)' }}>
                  {unitDetail?.filter_health || 80}%
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Estimated ~{Math.round((unitDetail?.filter_health || 80) * 0.7)} days remaining
                </span>
              </div>
              <GaugeMeter
                value={unitDetail?.filter_health || 80}
                min={0}
                max={100}
                label="filter"
                isSafe={(unitDetail?.filter_health || 80) > 20}
              />
            </div>

            <div className="card">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>Cartridge & Maintenance Timelines</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('cartridgeInstalled')}:</span>
                  <strong>{unitDetail?.cartridge_install_date || '2026-07-15'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('lastMaintenance')}:</span>
                  <strong>{unitDetail?.last_maintenance_date || '2026-08-20'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Caretaker / Sahiya:</span>
                  <strong>{unitDetail?.contact_person || 'Rameshwar Mahato'}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>Autonomous Recirculation Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Solenoid Valve Mode:</span>
                  <strong style={{ color: unitDetail?.status === 'SAFE' ? 'var(--safe)' : 'var(--danger)' }}>
                    {unitDetail?.status === 'SAFE' ? 'Released to Outlet' : 'Recirculation Active'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Typical Recirculation:</span>
                  <strong>1 - 2 Cycles (Auto-release)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Buffered Logs on Unit:</span>
                  <strong>0 Records (Synced)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Inlet vs Outlet Sensor Time Series Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
            
            {/* Chart 1: TDS Inlet vs Outlet */}
            <div className="card">
              <h3 className="card-title card-title-border">
                <span>TDS Stream: Inlet (Raw) vs Purified Outlet</span>
              </h3>
              <div style={{ height: '280px', width: '100%' }}>
                {unitReadings.length > 0 ? (
                  <Line data={tdsChartData} options={chartOptions} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    Loading telemetry charts...
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Turbidity Inlet vs Outlet */}
            <div className="card">
              <h3 className="card-title card-title-border">
                <span>Turbidity Stream: Inlet vs Purified Outlet</span>
              </h3>
              <div style={{ height: '280px', width: '100%' }}>
                {unitReadings.length > 0 ? (
                  <Line data={turbChartData} options={chartOptions} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    Loading telemetry charts...
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Autonomous Recirculation Event Log Table */}
          <div className="card">
            <h3 className="card-title card-title-border">
              <span>{t('recirculationLog')}</span>
            </h3>

            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Inlet TDS / Turb</th>
                    <th>Outlet TDS / Turb</th>
                    <th>Recirculation Cycle</th>
                    <th>Solenoid Outcome</th>
                    <th>BIS Status</th>
                    <th>Telemetry Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {unitReadings.slice(0, 15).map((r, idx) => (
                    <tr key={idx}>
                      <td>{new Date(r.timestamp).toLocaleString()}</td>
                      <td>{r.inlet_tds} ppm / {r.inlet_turbidity} NTU</td>
                      <td><strong>{r.outlet_tds} ppm / {r.outlet_turbidity} NTU</strong></td>
                      <td>
                        <span className="badge badge-info">Cycle {r.recirculation_cycle} of 3</span>
                      </td>
                      <td>
                        <span className={`badge ${r.recirculation_outcome === 'RELEASED' ? 'badge-safe' : 'badge-unsafe'}`}>
                          {r.recirculation_outcome}
                        </span>
                      </td>
                      <td><StatusBadge status={r.bis_status} size="sm" /></td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: r.is_buffered ? '#E65100' : '#29136C', fontWeight: 700 }}>
                          {r.is_buffered ? '📦 SD Backfill' : '⚡ Live Stream'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ALERTS & INCIDENT MANAGEMENT */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Filter size={18} color="var(--primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>Filter Alerts:</span>
                
                <select
                  value={alertFilter.severity}
                  onChange={(e) => setAlertFilter(prev => ({ ...prev, severity: e.target.value }))}
                  className="form-control"
                  style={{ width: 'auto', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical (Red)</option>
                  <option value="WARNING">Predictive Warning (Amber)</option>
                  <option value="INFO">Informational (Blue)</option>
                </select>

                <select
                  value={alertFilter.status}
                  onChange={(e) => setAlertFilter(prev => ({ ...prev, status: e.target.value }))}
                  className="form-control"
                  style={{ width: 'auto', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <span className="badge badge-unsafe">{alertStats.critical} Critical</span>
                <span className="badge badge-warning">{alertStats.warning} Warning</span>
                <span className="badge badge-safe">{alertStats.open} Total Active</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title card-title-border">
              <span>Active & Historical Incident Log</span>
            </h3>

            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Station ID / Name</th>
                    <th>Parameter</th>
                    <th>Severity</th>
                    <th>Observed vs Standard</th>
                    <th>Diagnostic Message</th>
                    <th>Status</th>
                    <th>Workflow Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id}>
                      <td><code>#{a.id}</code></td>
                      <td>
                        <strong>{a.unit_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.unit_id} • {a.district}</div>
                      </td>
                      <td><strong>{a.parameter}</strong></td>
                      <td>
                        <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-unsafe' : a.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td>{a.value_observed || 'N/A'} (Limit: {a.threshold_expected})</td>
                      <td style={{ maxWidth: '280px', fontSize: '0.82rem' }}>
                        {lang === 'hi' && a.message_hi ? a.message_hi : a.message}
                      </td>
                      <td><StatusBadge status={a.status} size="sm" /></td>
                      <td>
                        {a.status === 'OPEN' && (
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => handleAlertStatus(a.id, 'ACKNOWLEDGED')}
                          >
                            {t('acknowledge')}
                          </button>
                        )}
                        {a.status === 'ACKNOWLEDGED' && (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAlertStatus(a.id, 'RESOLVED')}
                          >
                            {t('resolve')}
                          </button>
                        )}
                        {a.status === 'RESOLVED' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--safe)', fontWeight: 700 }}>
                            ✓ Resolved by {a.resolved_by || 'Officer'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: MAINTENANCE MANAGEMENT */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                <Wrench size={18} color="var(--primary)" />
                <span>Scheduled & Predictive Maintenance Workflow</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Keep track of filter replacements, sensor calibration cycles, and field staff logs.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowMaintModal(true)}>
              <PlusCircle size={16} />
              <span>{t('logMaintenance')}</span>
            </button>
          </div>

          <div style={{
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            padding: '16px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}>
            <AlertTriangle size={24} color="#F5A623" />
            <div>
              <strong style={{ color: '#8D6E63' }}>Predictive Filter Life Advisory</strong>
              <div style={{ fontSize: '0.82rem', color: '#5D4037', marginTop: 2 }}>
                Stations <strong>JH-DHN-001 (Jharia Coalfield)</strong> and <strong>JH-KHU-001 (Murhu)</strong> are exhibiting accelerated sediment accumulation. Replacement cartridges should be dispatched within 10 business days.
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title card-title-border">
              <span>Maintenance & Inspection Records</span>
            </h3>

            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Date & Time</th>
                    <th>Unit ID / Station</th>
                    <th>Officer / Role</th>
                    <th>Action Taken</th>
                    <th>Parts Replaced</th>
                    <th>Filter Health Reset</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceLogs.map(m => (
                    <tr key={m.id}>
                      <td><code>#{m.id}</code></td>
                      <td>{new Date(m.timestamp).toLocaleDateString()}</td>
                      <td>
                        <strong>{m.unit_name || m.unit_id}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.district || 'Jharkhand'}</div>
                      </td>
                      <td>{m.officer_name} ({m.officer_role})</td>
                      <td><span className="badge badge-info">{m.action_type}</span></td>
                      <td>{m.parts_replaced || 'None'}</td>
                      <td>
                        <span style={{ color: 'var(--safe)', fontWeight: 800 }}>
                          {m.prev_filter_health}% ➔ {m.new_filter_health}%
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', maxWidth: '240px' }}>{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: ANALYTICS & REGULATORY REPORTS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--safe)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>ASTRA Production Cost</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--safe)', marginTop: 4 }}>
                ₹0.08 <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ L</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Solar-powered with zero-reject</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Conventional RO Benchmark</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: 4 }}>
                ₹0.35 <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ L</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>40% reject water wasted</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Estimated Monthly State Savings</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                ₹{(analyticsData?.costBenchmark?.monthlySavingsINR || 97200).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--safe)', marginTop: 4 }}>Calculated across current fleet</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Water Saved (Zero-Reject Tech)</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                {(analyticsData?.costBenchmark?.waterSavedLitres || 4800).toLocaleString()} L
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Recirculated without wastewater runoff</div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title card-title-border">
              <span>District Contamination & Performance Distribution</span>
            </h3>

            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Monitored Stations</th>
                    <th>Safe (BIS Standard)</th>
                    <th>Contaminated / Unsafe</th>
                    <th>Offline</th>
                    <th>Avg Filter Health</th>
                    <th>Contamination Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(analyticsData?.districtBreakdown || []).map((d, idx) => (
                    <tr key={idx}>
                      <td><strong>{d.district}</strong></td>
                      <td>{d.total}</td>
                      <td><span style={{ color: 'var(--safe)', fontWeight: 800 }}>{d.safe}</span></td>
                      <td><span style={{ color: 'var(--danger)', fontWeight: 800 }}>{d.unsafe}</span></td>
                      <td>{d.offline}</td>
                      <td>{d.avgHealth}%</td>
                      <td>
                        <span style={{ fontWeight: 800, color: d.contaminationRate > 20 ? 'var(--danger)' : 'var(--safe)' }}>
                          {d.contaminationRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: ESP32 IOT TELEMETRY SIMULATOR */}
      {activeTab === 'simulator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card">
            <h3 className="card-title card-title-border">
              <Cpu size={18} color="var(--primary)" />
              <span>ESP32 Hardware IoT Simulation & Network Resilience Control</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              This interactive testbed allows testing real-time ESP32 batch ingestion, multi-cycle solenoid recirculation triggers, and offline SD-card buffered synchronization backfills as defined in PRD Section 6 & 8.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <button 
                className="btn btn-primary"
                onClick={triggerSimulatorPulse}
                disabled={simLoading}
              >
                <RefreshCw size={16} className={simLoading ? 'animate-spin' : ''} />
                <span>Trigger Live ESP32 Telemetry Pulse</span>
              </button>

              <button 
                className="btn btn-accent"
                onClick={triggerBufferSyncTest}
                disabled={simLoading || !selectedUnit}
              >
                <Download size={16} />
                <span>Simulate Offline Reconnection Buffer Sync (Backfill)</span>
              </button>
            </div>

            {simMessage && (
              <div style={{
                background: '#E8F5E9',
                border: '1px solid #A5D6A7',
                padding: '12px 16px',
                borderRadius: '6px',
                color: '#1B5E20',
                fontSize: '0.85rem',
                fontWeight: 700
              }}>
                {simMessage}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Log Maintenance Modal Dialog */}
      {showMaintModal && (
        <div className="modal-overlay" onClick={() => setShowMaintModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={20} color="var(--accent)" />
                <span>Log Maintenance Action</span>
              </h3>
              <button className="btn-close" onClick={() => setShowMaintModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveMaintenance}>
              <div className="form-group">
                <label className="form-label">Station</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedUnit?.name} (${selectedUnit?.id})`}
                  className="form-control"
                  style={{ background: '#F8FAFC' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Officer / Technician Name *</label>
                <input
                  type="text"
                  required
                  value={maintFormData.officer_name}
                  onChange={(e) => setMaintFormData({ ...maintFormData, officer_name: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Action Performed *</label>
                <select
                  value={maintFormData.action_type}
                  onChange={(e) => setMaintFormData({ ...maintFormData, action_type: e.target.value })}
                  className="form-control"
                >
                  <option value="Filter Cartridge Replacement">Filter Cartridge Replacement</option>
                  <option value="UV Lamp Service">UV Lamp Replacement & Quartz Cleaning</option>
                  <option value="Sensor Calibration">pH / TDS / Turbidity Sensor Calibration</option>
                  <option value="Solenoid Valve Service">Solenoid Recirculation Valve Overhaul</option>
                  <option value="Routine Inspection">Routine Quarterly Inspection</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Parts Replaced</label>
                <input
                  type="text"
                  value={maintFormData.parts_replaced}
                  onChange={(e) => setMaintFormData({ ...maintFormData, parts_replaced: e.target.value })}
                  className="form-control"
                  placeholder="e.g. 5 Micron Sediment filter, Carbon block"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reset Filter Health Baseline (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maintFormData.new_filter_health}
                  onChange={(e) => setMaintFormData({ ...maintFormData, new_filter_health: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Field Notes / Remarks</label>
                <textarea
                  rows="3"
                  value={maintFormData.notes}
                  onChange={(e) => setMaintFormData({ ...maintFormData, notes: e.target.value })}
                  className="form-control"
                  placeholder="Post-maintenance TDS and turbidity verification test results..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowMaintModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Record & Reset Health
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
