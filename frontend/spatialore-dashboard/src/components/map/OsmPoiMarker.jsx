import React from 'react';
import { Marker, Popup } from 'react-leaflet';

export default function OsmPoiMarker({ poi, onPoiClick }) {
  return (
    <Marker position={[poi.lat, poi.lng]}>
      <Popup className="poi-popup">
        <div className="popup-content">
          <h4 className="popup-title">{poi.name}</h4>
          <div className="popup-meta">
            <span className="badge-category">{poi.category}</span>
          </div>

          <button
            className="btn-primary btn-sm btn-add-poi"
            onClick={() => {
              if (onPoiClick) onPoiClick(poi);
            }}
          >
            + Add to Tour
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
