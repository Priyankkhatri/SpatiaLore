import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import OsmPoiMarker from './OsmPoiMarker';
import ActivatedPoiMarker from './ActivatedPoiMarker';

// Fix Leaflet default icon asset paths breaking under Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper component to recenter map when center prop updates
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.flyTo([center.lat, center.lng], 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function TourMap({
  center,
  osmPois = [],
  activatedPois = [],
  onPoiClick,
  onToggleDeactivatePoi,
  onOpenScriptGenerator,
}) {
  const initialCenter = [center?.lat || 26.9855, center?.lng || 75.8513];

  const activatedOsmIds = new Set(
    activatedPois.map((p) => String(p.osm_id)).filter(Boolean)
  );

  const unactivatedOsmPois = osmPois.filter(
    (poi) => !activatedOsmIds.has(String(poi.osmId))
  );

  return (
    <div className="tour-map-wrapper">
      <MapContainer
        center={initialCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="tour-map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />

        {/* Render Plain OSM Candidate Markers */}
        {unactivatedOsmPois.map((poi) => (
          <OsmPoiMarker key={poi.osmId} poi={poi} onPoiClick={onPoiClick} />
        ))}

        {/* Render Activated POI Markers */}
        {activatedPois.map((poi) => (
          <ActivatedPoiMarker
            key={poi.id}
            poi={poi}
            onToggleDeactivate={onToggleDeactivatePoi}
            onOpenScriptGenerator={onOpenScriptGenerator}
          />
        ))}
      </MapContainer>
    </div>
  );
}
