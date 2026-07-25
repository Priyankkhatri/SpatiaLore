import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MapSearchBar from '../components/map/MapSearchBar';
import TourMap from '../components/map/TourMap';
import { fetchOsmPois } from '../lib/overpassClient';

export default function TourDetailPage() {
  const { tourId } = useParams();

  // Map state defaults to Jaipur (matching seed data coordinates)
  const [mapCenter, setMapCenter] = useState({ lat: 26.9855, lng: 75.8513 });
  const [cityName, setCityName] = useState('Jaipur, India');
  const [osmPois, setOsmPois] = useState([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [poiError, setPoiError] = useState(null);

  // Load nearby OSM POIs whenever map center changes
  useEffect(() => {
    let isMounted = true;
    setLoadingPois(true);
    setPoiError(null);

    fetchOsmPois(mapCenter.lat, mapCenter.lng)
      .then((pois) => {
        if (isMounted) {
          setOsmPois(pois);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPoiError(err.message || 'OpenStreetMap data temporarily unavailable, please try again.');
          setOsmPois([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingPois(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mapCenter]);

  const handleCityFound = (location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    if (location.displayName) {
      setCityName(location.displayName);
    }
  };

  const handlePoiClick = (poi) => {
    // TODO(Phase 1.4): Trigger POI activation panel & save to Supabase public.pois
    console.log('Selected POI for activation (Phase 1.4):', poi);
    alert(`Selected "${poi.name}" (${poi.category}). POI activation & radius slider will be integrated in Phase 1.4!`);
  };

  return (
    <div className="page-container tour-detail-container">
      <div className="page-header">
        <div>
          <h2>Tour Detail — ID: {tourId}</h2>
          <p className="subtitle">Discover candidate POIs around: {cityName}</p>
        </div>
        <div className="poi-count-badge">
          {loadingPois ? 'Loading POIs...' : `${osmPois.length} POIs Found`}
        </div>
      </div>

      <MapSearchBar onCityFound={handleCityFound} />

      {poiError && (
        <div className="error-banner">
          <span>{poiError}</span>
        </div>
      )}

      {loadingPois && (
        <div className="loading-bar">
          Fetching OpenStreetMap POIs for {cityName}...
        </div>
      )}

      <TourMap
        center={mapCenter}
        osmPois={osmPois}
        onPoiClick={handlePoiClick}
      />
    </div>
  );
}
