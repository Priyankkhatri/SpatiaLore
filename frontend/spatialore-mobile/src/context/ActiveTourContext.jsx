import React, { createContext, useContext, useState } from 'react';
import { fetchActivePoisForTour } from '../lib/poisApi';
import { fetchCurrentScriptsForPois } from '../lib/scriptsApi';
import { saveTourToCache, loadCachedTour } from '../lib/storage/tourCacheApi';

const ActiveTourContext = createContext(null);

export function ActiveTourProvider({ children }) {
  const [selectedTour, setSelectedTour] = useState(null);
  const [pois, setPois] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle' | 'downloading' | 'ready' | 'error'
  const [downloadError, setDownloadError] = useState(null);

  /**
   * Fetches POIs and current scripts for the selected tour from Supabase,
   * then durably persists them to local SQLite storage before setting status to 'ready'.
   */
  const downloadTour = async (tour) => {
    if (!tour) return;

    setSelectedTour(tour);
    setDownloadStatus('downloading');
    setDownloadError(null);

    try {
      // 1. Fetch active POIs for this tour from Supabase
      const { data: poiData, error: poiError } = await fetchActivePoisForTour(tour.id);

      if (poiError) {
        throw new Error(poiError.message || 'Failed to download points of interest.');
      }

      const activePois = poiData || [];
      setPois(activePois);

      // 2. Fetch current active scripts if POIs exist
      let loadedScripts = [];
      if (activePois.length > 0) {
        const poiIds = activePois.map((p) => p.id);
        const { data: scriptData, error: scriptError } = await fetchCurrentScriptsForPois(poiIds);

        if (scriptError) {
          throw new Error(scriptError.message || 'Failed to download narration scripts.');
        }

        loadedScripts = scriptData || [];
      }

      setScripts(loadedScripts);

      // 3. Durably persist tour data to local SQLite cache
      const { error: cacheError } = await saveTourToCache({
        tour,
        pois: activePois,
        scripts: loadedScripts,
      });

      if (cacheError) {
        throw new Error('Failed to save downloaded tour to local offline storage.');
      }

      setDownloadStatus('ready');
    } catch (err) {
      console.error('Error downloading tour in ActiveTourContext:', err);
      setDownloadError(err.message || 'Network or storage error downloading tour data.');
      setDownloadStatus('error');
    }
  };

  /**
   * Hydrates active working state directly from local SQLite storage with zero network requests.
   */
  const resumeCachedTour = async (tourId) => {
    setDownloadStatus('downloading');
    setDownloadError(null);

    try {
      const { data, error } = await loadCachedTour(tourId);

      if (error || !data) {
        throw new Error(error?.message || 'Cached tour data not found in local storage.');
      }

      setSelectedTour(data.tour);
      setPois(data.pois || []);
      setScripts(data.scripts || []);
      setDownloadStatus('ready');
    } catch (err) {
      console.error('Error resuming cached tour:', err);
      setDownloadError(err.message || 'Could not load tour from offline cache.');
      setDownloadStatus('error');
    }
  };

  /**
   * Resets in-memory working tour state back to initial defaults.
   * Note: This does NOT wipe the SQLite local cache table — persistent offline downloads remain saved.
   */
  const resetActiveTour = () => {
    setSelectedTour(null);
    setPois([]);
    setScripts([]);
    setDownloadStatus('idle');
    setDownloadError(null);
  };

  return (
    <ActiveTourContext.Provider
      value={{
        selectedTour,
        pois,
        scripts,
        downloadStatus,
        downloadError,
        downloadTour,
        resumeCachedTour,
        resetActiveTour,
      }}
    >
      {children}
    </ActiveTourContext.Provider>
  );
}

export function useActiveTour() {
  const context = useContext(ActiveTourContext);
  if (!context) {
    throw new Error('useActiveTour must be used within an ActiveTourProvider');
  }
  return context;
}
