import React, { useState, useRef, useEffect } from 'react';
import { Globe, User, LogOut, ChevronDown, Check, Droplets, Bell, ShieldCheck, AlertTriangle, Radio } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import { useAuth, DEMO_OFFICERS } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Header({ isWsConnected = true }) {
  const { lang, setLang, t, currentLanguageObj } = useLanguage();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const notifRef = useRef(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="top-tricolor-line" />
        <div className="header-inner">
          
          {/* Logo & Clean Gov Title */}
          <div className="brand-section">
            <div className="brand-logo-badge">
              <Droplets size={22} color="#FFFFFF" />
            </div>
            <div className="brand-titles">
              <div className="brand-title-main">
                <span>ASTTRA Jal-Jeevan</span>
                <span style={{ 
                  fontSize: '0.68rem', 
                  background: 'var(--bg-subtle)', 
                  color: 'var(--text-secondary)', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 700 
                }}>
                  SIH26040
                </span>
              </div>
              <div className="brand-title-sub">
                Drinking Water & Sanitation Dept • Govt. of Jharkhand
              </div>
            </div>
          </div>

          {/* Right Controls: Notification Bell, Live Status, Language, Role */}
          <div className="header-controls">
            
            {/* Live IoT Status Dot */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isWsConnected ? 'var(--safe-bg)' : 'var(--danger-bg)',
              color: isWsConnected ? 'var(--safe-text)' : 'var(--danger-text)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: `1px solid ${isWsConnected ? 'var(--safe-border)' : 'var(--danger-border)'}`
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isWsConnected ? 'var(--safe-green)' : 'var(--danger-red)',
                display: 'inline-block'
              }} />
              <span>{isWsConnected ? 'IoT Live' : 'Offline'}</span>
            </div>

            {/* 🔔 Notification Bell Icon Dropdown */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifMenu(prev => !prev);
                  if (!showNotifMenu && unreadCount > 0) {
                    markAllAsRead();
                  }
                }}
                className="btn-clean btn-clean-outline"
                style={{ padding: '6px 10px', fontSize: '0.8rem', position: 'relative' }}
                title="Notifications / सूचनाएं"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FFFFFF'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Card */}
              {showNotifMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  border: '1px solid var(--border-subtle)',
                  zIndex: 2000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease'
                }}>
                  {/* Dropdown Header */}
                  <div style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-subtle)'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--brand-navy)' }}>
                      {lang === 'hi' ? 'सूचनाएं (Notifications)' : 'Notifications'}
                    </span>
                    <button
                      onClick={clearAll}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {lang === 'hi' ? 'साफ़ करें' : 'Clear all'}
                    </button>
                  </div>

                  {/* Dropdown List */}
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-subtle)',
                            background: n.read ? '#FFFFFF' : 'var(--bg-subtle)',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start'
                          }}
                        >
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: n.type === 'UNSAFE_ALERT' ? '#EF4444' : '#10B981',
                            marginTop: 5,
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              {n.time || 'Just now'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Picker Dropdown Button */}
            <button
              onClick={() => setShowLangModal(true)}
              className="btn-clean btn-clean-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Globe size={14} />
              <span>{currentLanguageObj.nativeName}</span>
              <ChevronDown size={12} />
            </button>

            {/* User / RBAC Role Button */}
            <button
              onClick={() => setShowRoleModal(true)}
              className="btn-clean btn-clean-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <User size={14} className={user && user.role !== 'PUBLIC' ? 'text-emerald-600' : ''} />
              <span>
                {user && user.role !== 'PUBLIC' 
                  ? `${user.full_name?.split(' ')[1] || user.full_name} (${user.id_card_no || user.role})` 
                  : (t('login') || 'Official Login')}
              </span>
              <ChevronDown size={12} />
            </button>

          </div>

        </div>
      </header>

      {/* Language Modal */}
      {showLangModal && (
        <div className="modal-overlay" onClick={() => setShowLangModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontSize: '1.1rem', color: 'var(--brand-navy)' }}>Select Language / भाषा चुनें</strong>
              <button 
                onClick={() => setShowLangModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setShowLangModal(false);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${lang === l.code ? 'var(--brand-navy)' : 'var(--border-subtle)'}`,
                    background: lang === l.code ? 'var(--bg-subtle)' : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-navy)' }}>
                    {l.nativeName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {l.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Profile / Login State Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontSize: '1.1rem', color: 'var(--brand-navy)' }}>
                {user && user.role !== 'PUBLIC' ? 'Officer Profile' : 'PHED Official Access'}
              </strong>
              <button 
                onClick={() => setShowRoleModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {user && user.role !== 'PUBLIC' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ 
                  background: 'var(--bg-subtle)', 
                  padding: '14px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-subtle)' 
                }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--brand-navy)' }}>
                    {user.full_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--safe-text)', fontWeight: 700, marginTop: 2 }}>
                    {user.designation || user.role}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {user.department || 'Department of Drinking Water & Sanitation'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                      🆔 {user.id_card_no || 'JH-PHED-8842'}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                      📱 {user.phone || '+91-9431123456'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setShowRoleModal(false);
                  }}
                  className="btn-danger"
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout / लॉगआउट</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  You are currently browsing as a Public Citizen. To access telemetry management and water plant controls, please switch to the PHED tab and verify using OTP.
                </p>
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: '#065F46', fontWeight: 600 }}>
                  🔒 Secure Phone & ID Card OTP verification enabled on PHED Portal.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
