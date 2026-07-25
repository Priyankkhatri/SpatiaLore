import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Create a custom green Leaflet DivIcon for activated POIs
const createActivatedIcon = (isActive) => {
  return L.divIcon({
    className: 'custom-activated-marker-wrapper',
    html: `
      <div className="activated-marker-pin ${isActive ? 'active' : 'inactive'}">
        <span className="marker-star">★</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

export default function ActivatedPoiMarker({ poi, onToggleDeactivate }) {
  // Parse PostGIS location or fallback lat/lng
  let lat = poi.lat;
  let lng = poi.lng;

  // Handle PostGIS geography representation if location object or WKT string
  if ((!lat || !lng) && poi.location) {
    if (typeof poi.location === 'object' && poi.location.coordinates) {
      lng = poi.location.coordinates[0];
      lat = poi.location.coordinates[1];
    }
  }

  if (!lat || !lng) return null;

  const icon = createActivatedIcon(poi.is_active);

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup className="poi-popup activated-poi-popup">
        <div className="popup-content">
          <div className="popup-header-row">
            <h4 className="popup-title">{poi.name}</h4>
            <span className={`badge-status ${poi.is_active ? 'status-active' : 'status-inactive'}`}>
              {poi.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="popup-meta">
            <span className="badge-category">{poi.category || 'landmark'}</span>
          </div>

          <div className="radii-info-box">
            <div className="radii-item">
              <span className="radii-label">Trigger:</span>
              <span className="radii-val">{poi.trigger_radius_m}m</span>
            </div>
            <div className="radii-item">
              <span className="radii-label">Prefetch:</span>
              <span className="radii-val">{poi.prefetch_radius_m}m</span>
            </div>
          </div>

          <div className="popup-actions">
            {/* TODO(Phase 1.5): Wire up free-tier LLM script generation modal */}
            <button className="btn-secondary btn-sm" disabled title="Coming in Phase 1.5">
              Generate Script
            </button>

            <button
              className={`btn-sm ${poi.is_active ? 'btn-danger-outline' : 'btn-success-outline'}`}
              onClick={() => onToggleDeactivate && onToggleDeactivate(poi.id, poi.is_active)}
            >
              {poi.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
