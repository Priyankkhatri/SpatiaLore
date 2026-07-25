import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MapSearchBar from '../components/map/MapSearchBar';
import TourMap from '../components/map/TourMap';
import PoiActivationPanel from '../components/pois/PoiActivationPanel';
import PoiList from '../components/pois/PoiList';
import ScriptGenerationPanel from '../components/scripts/ScriptGenerationPanel';
import { fetchOsmPois } from '../lib/overpassClient';
import {
  fetchActivePoisForTour,
  deactivatePoi,
  reactivatePoi,
} from '../lib/poisApi';
import { fetchCurrentScriptsForPois } from '../lib/scriptsApi';

export default function TourDetailPage() {
  const { tourId } = useParams();

  // Map and candidate POIs state
  const [mapCenter, setMapCenter] = useState({ lat: 26.9855, lng: 75.8513 });
  const [cityName, setCityName] = useState('Jaipur, India');
  const [osmPois, setOsmPois] = useState([]);
  const [loadingOsmPois, setLoadingOsmPois] = useState(false);
  const [poiError, setPoiError] = useState(null);

  // Activated POIs state
  const [activatedPois, setActivatedPois] = useState([]);
  const [loadingActivePois, setLoadingActivePois] = useState(true);
  const [selectedOsmPoi, setSelectedOsmPoi] = useState(null);

  // Scripts state
  const [scriptsMap, setScriptsMap] = useState({});
  const [selectedScriptPoi, setSelectedScriptPoi] = useState(null);

  // Load existing activated POIs for this tour from Supabase
  const loadTourPois = async () => {
    setLoadingActivePois(true);
    const { data } = await fetchActivePoisForTour(tourId);
    const pois = data || [];
    setActivatedPois(pois);
    setLoadingActivePois(false);

    // Fetch scripts for loaded POIs
    if (pois.length > 0) {
      const poiIds = pois.map((p) => p.id);
      const { data: scriptsData } = await fetchCurrentScriptsForPois(poiIds);
      const map = {};
      (scriptsData || []).forEach((s) => {
        map[s.poi_id] = s;
      });
      setScriptsMap(map);
    }
  };

  useEffect(() => {
    loadTourPois();
  }, [tourId]);

  // Load nearby OSM POIs whenever map center changes
  useEffect(() => {
    let isMounted = true;
    setLoadingOsmPois(true);
    setPoiError(null);

    fetchOsmPois(mapCenter.lat, mapCenter.lng)
      .then((pois) => {
        if (isMounted) setOsmPois(pois);
      })
      .catch((err) => {
        if (isMounted) {
          setPoiError(err.message || 'OpenStreetMap data temporarily unavailable, please try again.');
          setOsmPois([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingOsmPois(false);
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

  const handleOsmPoiClick = (poi) => {
    setSelectedOsmPoi(poi);
  };

  const handlePoiActivated = (newPoi) => {
    setActivatedPois((prev) => [...prev, newPoi]);
    setSelectedOsmPoi(null);
  };

  const handleToggleDeactivatePoi = async (poiId, currentIsActive) => {
    if (currentIsActive) {
      const { data } = await deactivatePoi(poiId);
      if (data) {
        setActivatedPois((prev) =>
          prev.map((p) => (p.id === poiId ? { ...p, is_active: false } : p))
        );
      }
    } else {
      const { data } = await reactivatePoi(poiId);
      if (data) {
        setActivatedPois((prev) =>
          prev.map((p) => (p.id === poiId ? { ...p, is_active: true } : p))
        );
      }
    }
  };

  const handleOpenScriptGenerator = (poi) => {
    setSelectedScriptPoi(poi);
  };

  const handleScriptSaved = (savedScript) => {
    setScriptsMap((prev) => ({
      ...prev,
      [savedScript.poi_id]: savedScript,
    }));
    setSelectedScriptPoi(null);
  };

  return (
    <div className="page-container tour-detail-container">
      <div className="page-header">
        <div>
          <h2>Tour Detail — ID: {tourId}</h2>
          <p className="subtitle">Discover POIs & Generate Audio Scripts: {cityName}</p>
        </div>
        <div className="header-badges">
          <span className="poi-count-badge">
            {loadingOsmPois ? 'Loading Candidates...' : `${osmPois.length} Candidates`}
          </span>
          <span className="poi-count-badge badge-active-count">
            {activatedPois.filter((p) => p.is_active).length} Activated
          </span>
        </div>
      </div>

      <MapSearchBar onCityFound={handleCityFound} />

      {poiError && (
        <div className="error-banner">
          <span>{poiError}</span>
        </div>
      )}

      {loadingOsmPois && (
        <div className="loading-bar">
          Fetching OpenStreetMap candidates for {cityName}...
        </div>
      )}

      <TourMap
        center={mapCenter}
        osmPois={osmPois}
        activatedPois={activatedPois}
        onPoiClick={handleOsmPoiClick}
        onToggleDeactivatePoi={handleToggleDeactivatePoi}
        onOpenScriptGenerator={handleOpenScriptGenerator}
      />

      {/* POI List Table */}
      <PoiList
        activatedPois={activatedPois}
        scriptsMap={scriptsMap}
        onToggleDeactivate={handleToggleDeactivatePoi}
        onOpenScriptGenerator={handleOpenScriptGenerator}
        loading={loadingActivePois}
      />

      {/* POI Activation Modal */}
      {selectedOsmPoi && (
        <PoiActivationPanel
          osmPoi={selectedOsmPoi}
          tourId={tourId}
          onActivated={handlePoiActivated}
          onCancel={() => setSelectedOsmPoi(null)}
        />
      )}

      {/* Script Generation Modal */}
      {selectedScriptPoi && (
        <ScriptGenerationPanel
          poi={selectedScriptPoi}
          cityName={cityName}
          currentScript={scriptsMap[selectedScriptPoi.id]}
          onScriptSaved={handleScriptSaved}
          onClose={() => setSelectedScriptPoi(null)}
        />
      )}
    </div>
  );
}
