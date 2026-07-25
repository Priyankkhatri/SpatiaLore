import React, { createContext, useContext, useState } from 'react';
import { fetchActivePoisForTour } from '../lib/poisApi';
import { fetchCurrentScriptsForPois } from '../lib/scriptsApi';

const ActiveTourContext = createContext(null);

export function ActiveTourProvider({ children }) {
  const [selectedTour, setSelectedTour] = useState(null);
  const [pois, setPois] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle' | 'downloading' | 'ready' | 'error'
  const [downloadError, setDownloadError] = useState(null);

  /**
   * Fetches POIs and current scripts for the selected tour and stores in Context state.
   */
  const downloadTour = async (tour) => {
    if (!tour) return;

    setSelectedTour(tour);
    setDownloadStatus('downloading');
    setDownloadError(null);

    try {
      // 1. Fetch active POIs for this tour
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
      setDownloadStatus('ready');
    } catch (err) {
      console.error('Error downloading tour in ActiveTourContext:', err);
      setDownloadError(err.message || 'Network error downloading tour data.');
      setDownloadStatus('error');
    }
  };

  /**
   * Resets all working tour data back to initial defaults.
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
