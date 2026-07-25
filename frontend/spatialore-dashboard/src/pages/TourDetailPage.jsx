import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MapSearchBar from '../components/map/MapSearchBar';
import TourMap from '../components/map/TourMap';
import PoiActivationPanel from '../components/pois/PoiActivationPanel';
import PoiList from '../components/pois/PoiList';
import ScriptGenerationPanel from '../components/scripts/ScriptGenerationPanel';
import TourFormModal from '../components/tours/TourFormModal';
import PublishToggle from '../components/tours/PublishToggle';

import {
  fetchTourById,
  updateTour,
  setTourPublishStatus,
} from '../lib/toursApi';
import { fetchOsmPois } from '../lib/overpassClient';
import {
  fetchActivePoisForTour,
  deactivatePoi,
  reactivatePoi,
} from '../lib/poisApi';
import { fetchCurrentScriptsForPois } from '../lib/scriptsApi';

export default function TourDetailPage() {
  const { tourId } = useParams();

  // Tour metadata state
  const [tour, setTour] = useState(null);
  const [loadingTour, setLoadingTour] = useState(true);
  const [tourNotFound, setTourNotFound] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Map & candidate POIs state
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

  // Load tour metadata by ID
  const loadTourMetadata = async () => {
    setLoadingTour(true);
    setTourNotFound(false);

    const { data, error } = await fetchTourById(tourId);

    if (error || !data) {
      setTourNotFound(true);
      setLoadingTour(false);
      return;
    }

    setTour(data);
    const locationQuery = `${data.city}${data.country ? `, ${data.country}` : ''}`;
    setCityName(locationQuery);

    // Geocode tour city to set map center automatically on load
    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationQuery
      )}&limit=1&appName=SpatiaLoreAdmin`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const geoData = await res.json();
        if (geoData && geoData.length > 0) {
          setMapCenter({
            lat: parseFloat(geoData[0].lat),
            lng: parseFloat(geoData[0].lon),
          });
        }
      }
    } catch (err) {
      console.warn('Could not auto-geocode tour city:', err);
    } finally {
      setLoadingTour(false);
    }
  };

  // Load existing activated POIs for this tour from Supabase
  const loadTourPois = async () => {
    setLoadingActivePois(true);
    const { data } = await fetchActivePoisForTour(tourId);
    const pois = data || [];
    setActivatedPois(pois);
    setLoadingActivePois(false);

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
    loadTourMetadata();
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

  const handleUpdateTour = async (formValues) => {
    const { data, error } = await updateTour(tourId, formValues);
    if (error) {
      return { error };
    }
    if (data) {
      setTour(data);
      const newCityName = `${data.city}${data.country ? `, ${data.country}` : ''}`;
      setCityName(newCityName);
      setIsEditModalOpen(false);
    }
    return { data };
  };

  const handleTogglePublish = async (nextStatus) => {
    const { data, error } = await setTourPublishStatus(tourId, nextStatus);
    if (error) {
      alert(`Failed to update publish status: ${error.message}`);
    } else if (data) {
      setTour(data);
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

  if (loadingTour) {
    return (
      <div className="page-container">
        <div className="placeholder-card">
          <p>Loading tour details...</p>
        </div>
      </div>
    );
  }

  if (tourNotFound || !tour) {
    return (
      <div className="page-container">
        <div className="placeholder-card">
          <h2>Tour Not Found</h2>
          <p>The tour ID "{tourId}" does not exist or was deleted.</p>
          <Link to="/" className="btn-primary" style={{ marginTop: '16px' }}>
            Back to Tours List
          </Link>
        </div>
      </div>
    );
  }

  const activePoiCount = activatedPois.filter((p) => p.is_active).length;

  return (
    <div className="page-container tour-detail-container">
      {/* Tour Header Banner */}
      <div className="tour-banner-card">
        <div className="banner-main-info">
          <div className="banner-title-row">
            <h2>{tour.name}</h2>
            <PublishToggle
              tourId={tour.id}
              isPublished={tour.is_published}
              activePoiCount={activePoiCount}
              onTogglePublish={handleTogglePublish}
            />
          </div>

          <p className="banner-location">
            📍 {tour.city}{tour.country ? `, ${tour.country}` : ''}
          </p>

          {tour.description && (
            <p className="banner-description">{tour.description}</p>
          )}
        </div>

        <div className="banner-actions">
          <button
            className="btn-secondary"
            onClick={() => setIsEditModalOpen(true)}
          >
            ✏️ Edit Tour
          </button>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h3>POI Discovery & Map</h3>
          <p className="subtitle">Search location: {cityName}</p>
        </div>
        <div className="header-badges">
          <span className="poi-count-badge">
            {loadingOsmPois ? 'Loading Candidates...' : `${osmPois.length} Candidates`}
          </span>
          <span className="poi-count-badge badge-active-count">
            {activePoiCount} Activated POIs
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

      {/* Edit Tour Modal */}
      {isEditModalOpen && (
        <TourFormModal
          mode="edit"
          initialValues={{
            name: tour.name,
            city: tour.city,
            country: tour.country,
            description: tour.description,
          }}
          onSave={handleUpdateTour}
          onCancel={() => setIsEditModalOpen(false)}
        />
      )}

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
