import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, WifiOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function StatusBadge({ status, size = 'md' }) {
  const { t } = useLanguage();
  const normalized = (status || '').toUpperCase();

  let className = 'badge-info';
  let label = status;
  let Icon = Clock;

  if (normalized === 'SAFE' || normalized === 'RESOLVED') {
    className = 'badge-safe';
    label = normalized === 'SAFE' ? t('safe') : 'Resolved';
    Icon = CheckCircle2;
  } else if (normalized === 'UNSAFE' || normalized === 'CRITICAL' || normalized === 'HELD') {
    className = 'badge-unsafe';
    label = normalized === 'UNSAFE' ? t('unsafe') : normalized;
    Icon = XCircle;
  } else if (normalized === 'WARNING' || normalized === 'ACKNOWLEDGED' || normalized === 'RECIRCULATING') {
    className = 'badge-warning';
    label = normalized;
    Icon = AlertTriangle;
  } else if (normalized === 'OFFLINE') {
    className = 'badge-offline';
    label = t('offline');
    Icon = WifiOff;
  }

  const paddingStyle = size === 'sm' ? { padding: '2px 6px', fontSize: '0.7rem' } : {};

  return (
    <span className={`badge ${className}`} style={paddingStyle}>
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{label}</span>
    </span>
  );
}
