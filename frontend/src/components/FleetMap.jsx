import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import StatusBadge from './StatusBadge';
import { Droplet, ArrowRight, Activity } from 'lucide-react';

// Custom SVG map marker generator
const createPinIcon = (status) => {
  let color = '#1B8A5A'; // Green
  if (status === 'UNSAFE') color = '#D32F2F'; // Red
  if (status === 'OFFLINE') color = '#78909C'; // Gray

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26c0-8.837-7.163-16-16-16z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="7" fill="#FFFFFF"/>
      <circle cx="16" cy="16" r="4" fill="${color}"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36]
  });
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 11);
    }
  }, [center, zoom, map]);
  return null;
}

export default function FleetMap({ units = [], selectedUnit, onSelectUnit, height = '450px' }) {
  // Default center: Jharkhand (approx Ranchi latitude/longitude: 23.6102, 85.2799)
  const defaultCenter = [23.6102, 85.3400];
  const activeCenter = selectedUnit ? [selectedUnit.latitude, selectedUnit.longitude] : defaultCenter;

  return (
    <div style={{ height, width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={8}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={activeCenter} zoom={selectedUnit ? 12 : 8} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {units.map((unit) => {
          if (!unit.latitude || !unit.longitude) return null;
          return (
            <Marker
              key={unit.id}
              position={[unit.latitude, unit.longitude]}
              icon={createPinIcon(unit.status)}
              eventHandlers={{
                click: () => {
                  if (onSelectUnit) onSelectUnit(unit);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '4px', minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{unit.name}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 8 }}>
                    {unit.location_type} • {unit.village}, {unit.block}, {unit.district}
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <StatusBadge status={unit.status} size="sm" />
                  </div>

                  {unit.latest_tds && (
                    <div style={{ fontSize: '0.78rem', background: '#F8FAFC', padding: '6px', borderRadius: '4px', marginBottom: 8 }}>
                      <div><strong>pH:</strong> {unit.latest_ph || '7.2'} | <strong>TDS:</strong> {unit.latest_tds} ppm</div>
                      <div><strong>Turbidity:</strong> {unit.latest_turbidity || '0.3'} NTU</div>
                    </div>
                  )}

                  {onSelectUnit && (
                    <button
                      onClick={() => onSelectUnit(unit)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'var(--primary)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Inspect Unit Details</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Floating Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 14px',
        borderRadius: '6px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'flex',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1B8A5A', display: 'inline-block' }} />
          <span>Safe (BIS Compliant)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D32F2F', display: 'inline-block' }} />
          <span>Unsafe / Diverted</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#78909C', display: 'inline-block' }} />
          <span>Offline</span>
        </div>
      </div>
    </div>
  );
}
