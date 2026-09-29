import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const DEMO_OFFICERS = [
  {
    id_card_no: 'JH-PHED-8842',
    phone: '9431123456',
    full_name: 'Er. Rajesh Ranjan',
    designation: 'Sub-Divisional Officer (SDO)',
    department: 'PHED Ranchi Division',
    role: 'PHED_OFFICER',
    district: 'Ranchi',
    badge: 'SDO / Field Head'
  },
  {
    id_card_no: 'DWSD-HQ-001',
    phone: '9431000001',
    full_name: 'Er. Sanjay Swarup',
    designation: 'Chief Engineer & State Head',
    department: 'DW&SD Jharkhand State HQ',
    role: 'ADMIN',
    district: 'Statewide Access',
    badge: 'State Admin'
  },
  {
    id_card_no: 'JH-PHED-JE04',
    phone: '9431102948',
    full_name: 'Er. Sanjeev Toppo',
    designation: 'Junior Engineer (Kanke/Ratu)',
    department: 'PHED Ranchi Circle',
    role: 'PHED_OFFICER',
    district: 'Ranchi (Kanke)',
    badge: 'Junior Engineer'
  },
  {
    id_card_no: 'VWSC-RAN-102',
    phone: '9876543210',
    full_name: 'Rameshwar Mahato',
    designation: 'VWSC Jal Sahiya Head',
    department: 'Village Water & Sanitation Committee',
    role: 'GP_VWSC',
    district: 'Sukhurhutu Panchayat',
    badge: 'VWSC Sahiya'
  }
];

export const DEMO_ROLES = DEMO_OFFICERS;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('asttra_user') || localStorage.getItem('astra_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('asttra_token') || localStorage.getItem('astra_token') || null);
  const [officersList, setOfficersList] = useState(DEMO_OFFICERS);

  // Fetch live officers from backend on mount
  useEffect(() => {
    fetch('/api/auth/officers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setOfficersList(data.data);
        }
      })
      .catch(() => {
        // Fallback to DEMO_OFFICERS
      });
  }, []);

  // Send OTP
  const sendOtp = async (identifier) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      // Offline fallback
      const found = DEMO_OFFICERS.find(
        o => o.phone.includes(identifier) || o.id_card_no.toLowerCase() === identifier.toLowerCase()
      ) || DEMO_OFFICERS[0];
      
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        success: true,
        message: `[Offline Mode] OTP sent to registered mobile: +91-XXXXX${found.phone.slice(-4)}`,
        otp: mockOtp,
        phone_masked: `+91 94•••• ••${found.phone.slice(-2)}`,
        officer: found,
        expires_in_seconds: 300
      };
    }
  };

  // Verify OTP
  const verifyOtp = async (identifier, otp) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('asttra_user', JSON.stringify(data.user));
        localStorage.setItem('asttra_token', data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      // Offline fallback
      if (otp.length === 6) {
        const found = DEMO_OFFICERS.find(
          o => o.phone.includes(identifier) || o.id_card_no.toLowerCase() === identifier.toLowerCase()
        ) || DEMO_OFFICERS[0];

        const fallbackUser = {
          id: 101,
          username: found.id_card_no.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          full_name: found.full_name,
          designation: found.designation,
          id_card_no: found.id_card_no,
          department: found.department,
          role: found.role,
          district: found.district,
          block: '*',
          phone: found.phone
        };
        setUser(fallbackUser);
        localStorage.setItem('asttra_user', JSON.stringify(fallbackUser));
        return { success: true, user: fallbackUser };
      }
      return { success: false, error: 'Network error or invalid OTP' };
    }
  };

  // Password login fallback
  const login = async (username, password = 'admin123') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('asttra_user', JSON.stringify(data.user));
        localStorage.setItem('asttra_token', data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Login failed' };
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('asttra_user');
    localStorage.removeItem('asttra_token');
    localStorage.removeItem('astra_user');
    localStorage.removeItem('astra_token');
  };

  const isPhedAuthorized = Boolean(user && user.role && user.role !== 'PUBLIC');

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isPhedAuthorized,
      sendOtp, 
      verifyOtp, 
      login, 
      logout, 
      officersList 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
