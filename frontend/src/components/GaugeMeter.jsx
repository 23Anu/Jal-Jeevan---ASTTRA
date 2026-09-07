import React from 'react';

export default function GaugeMeter({ value, min = 0, max = 100, safeMin, safeMax, unit = '', label = '', isSafe = true }) {
  // Normalize value percentage for progress bar (0 - 100%)
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  // Determine bar color
  let color = '#1B8A5A'; // Green safe
  if (!isSafe) {
    color = '#D32F2F'; // Red danger
  } else if (label.toLowerCase().includes('filter') && value < 30) {
    color = '#F5A623'; // Amber warning
  }

  // Safe zone indicator positions
  const safeLeft = safeMin !== undefined ? ((safeMin - min) / (max - min)) * 100 : 0;
  const safeWidth = safeMax !== undefined && safeMin !== undefined ? ((safeMax - safeMin) / (max - min)) * 100 : 100;

  return (
    <div style={{ width: '100%', marginTop: '8px' }}>
      {/* Visual meter bar container */}
      <div style={{
        position: 'relative',
        height: '10px',
        backgroundColor: '#E2E8F0',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '6px'
      }}>
        {/* Permissible Safe Range Zone Highlight */}
        {safeMin !== undefined && safeMax !== undefined && (
          <div style={{
            position: 'absolute',
            left: `${safeLeft}%`,
            width: `${safeWidth}%`,
            height: '100%',
            backgroundColor: 'rgba(27, 138, 90, 0.18)',
            borderLeft: '1px dashed #1B8A5A',
            borderRight: '1px dashed #1B8A5A',
            zIndex: 1
          }} />
        )}

        {/* Current Active Value Fill */}
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: color,
          borderRadius: '6px',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease',
          position: 'relative',
          zIndex: 2
        }} />
      </div>

      {/* Scale labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#6B7280',
        fontWeight: 500
      }}>
        <span>{min} {unit}</span>
        {safeMin !== undefined && safeMax !== undefined && (
          <span style={{ color: '#1B8A5A', fontWeight: 600 }}>
            BIS Safe: {safeMin}–{safeMax} {unit}
          </span>
        )}
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
