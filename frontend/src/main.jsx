import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);
