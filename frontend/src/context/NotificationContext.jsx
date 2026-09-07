import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      type: 'SAFE_PULSE',
      title: 'Telemetry Pulse: Unit JH-RAN-001',
      message: 'Kanke Block station reports optimal TDS (197 ppm) & pH (7.1).',
      time: 'Just now',
      timestamp: Date.now(),
      read: false
    },
    {
      id: 'notif-2',
      type: 'UNSAFE_ALERT',
      title: 'Alert: Unit JH-DHN-001 Recirculating',
      message: 'Jharia station detected TDS 531 ppm. Solenoid valve diverted flow.',
      time: '5m ago',
      timestamp: Date.now() - 300000,
      read: false
    },
    {
      id: 'notif-3',
      type: 'SYSTEM',
      title: 'Solar Telemetry Online',
      message: '8 rural stations actively broadcasting live BIS 10500 telemetry.',
      time: '12m ago',
      timestamp: Date.now() - 720000,
      read: true
    }
  ]);

  const [activeToast, setActiveToast] = useState(null);

  // Add new notification and trigger a brief minimal micro-toast
  const addNotification = (notif) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      read: false,
      ...notif
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]); // keep max 20

    // Show ultra-minimal toast for 3 seconds
    setActiveToast(newNotif);
  };

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      activeToast,
      addNotification,
      markAllAsRead,
      clearAll,
      dismissToast: () => setActiveToast(null)
    }}>
      {children}

      {/* Ultra-Minimal Micro Toast */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 9999,
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: '1px solid #334155',
          animation: 'slideUpToast 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: activeToast.type === 'UNSAFE_ALERT' ? '#EF4444' : '#10B981',
            display: 'inline-block'
          }} />
          <span style={{ maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeToast.title}
          </span>
          <button
            onClick={() => setActiveToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: '0.85rem',
              marginLeft: 4
            }}
          >
            ✕
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
