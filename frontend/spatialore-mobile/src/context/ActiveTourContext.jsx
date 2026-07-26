import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { fetchActivePoisForTour } from '../lib/poisApi';
import { fetchCurrentScriptsForPois } from '../lib/scriptsApi';
import { saveTourToCache, loadCachedTour } from '../lib/storage/tourCacheApi';
import {
  subscribePrefetchEvents,
  subscribeTriggerEvents,
} from '../lib/geolocation/triggerEventBus';
import {
  playNarrationForPoi,
  stopNarration,
  pauseCurrentNarration as pauseNarrationImpl,
  resumeCurrentNarration as resumeNarrationImpl,
  skipCurrentNarration as skipNarrationImpl,
} from '../lib/audio/narrationPlayer';
import { initTts } from '../lib/audio/ttsEngine';
import {
  setupMediaSession,
  updateNowPlayingMetadata,
  teardownMediaSession,
} from '../lib/audio/mediaSessionService';
import {
  recordTourStarted,
  recordTourCompleted,
  recordPoiTriggered,
  recordPoiSkipped,
  recordScreenOffDuration,
} from '../lib/analytics/analyticsEvents';
import { syncAnalyticsQueue } from '../lib/analytics/analyticsSync';
import {
  recordBatteryLevelAtTourStart,
  getBatteryDrainSinceTourStart,
} from '../lib/diagnostics/batteryMonitor';
import { logTourPerformanceSummary } from '../lib/diagnostics/performanceLog';

const ActiveTourContext = createContext(null);

export function ActiveTourProvider({ children }) {
  const [selectedTour, setSelectedTour] = useState(null);
  const [pois, setPois] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle' | 'downloading' | 'ready' | 'error'
  const [downloadError, setDownloadError] = useState(null);

  // Phase 4.4: In-memory "hot" cache of upcoming scripts primed by prefetch zone events
  const [hotScripts, setHotScripts] = useState({});

  // Phase 5.1 & 5.3 & 5.4: Narration playback state, queue, media session, and retry toast
  const [narrationQueue, setNarrationQueue] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playbackHistory, setPlaybackHistory] = useState([]);
  const [isTtsAvailable, setIsTtsAvailable] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [retryToast, setRetryToast] = useState(null); // { poi, message, retryCount }

  // Control Callbacks
  const pauseCurrentNarration = useCallback(() => {
    pauseNarrationImpl();
    setIsPaused(true);
  }, []);

  const resumeCurrentNarration = useCallback(() => {
    setIsPaused(false);
    resumeNarrationImpl();
  }, []);

  const skipCurrentNarration = useCallback(() => {
    setIsPaused(false);
    skipNarrationImpl();

    if (currentlyPlaying && selectedTour?.id) {
      recordPoiSkipped(selectedTour.id, currentlyPlaying.id);
      setPlaybackHistory((prev) => [
        {
          poi: currentlyPlaying,
          status: 'skipped',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setCurrentlyPlaying(null);
    setRetryToast(null);
  }, [currentlyPlaying, selectedTour?.id]);

  const stopCurrentNarration = useCallback(() => {
    stopNarration();
    setIsPaused(false);
    setCurrentlyPlaying(null);
    setRetryToast(null);
  }, []);

  /**
   * Re-attempts playback for a POI that failed with a TTS engine error.
   */
  const retryFailedNarration = useCallback(async () => {
    if (!retryToast || !retryToast.poi) return;

    const currentRetryCount = (retryToast.retryCount || 1) + 1;
    const targetPoi = retryToast.poi;

    console.log(
      `🔄 [Retry Handler] Retrying narration playback for POI "${targetPoi.name}" (Attempt ${currentRetryCount})`
    );

    const result = await playNarrationForPoi({
      poi: targetPoi,
      hotScripts,
      scripts,
    });

    if (result.status === 'played') {
      console.log(`✅ [Retry Handler] Playback succeeded on retry for "${targetPoi.name}"`);
      if (selectedTour?.id) {
        recordPoiTriggered(selectedTour.id, targetPoi.id);
      }
      setPlaybackHistory((prev) => [
        {
          poi: targetPoi,
          status: 'played',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      setRetryToast(null);
      setCurrentlyPlaying(null);
    } else {
      console.warn(`❌ [Retry Handler] Retry failed again for "${targetPoi.name}"`);
      setRetryToast({
        poi: targetPoi,
        retryCount: currentRetryCount,
        message:
          currentRetryCount >= 2
            ? `Narration failed again for "${targetPoi.name}". Please check device volume & TTS settings.`
            : `Narration failed to play for "${targetPoi.name}".`,
      });
    }
  }, [retryToast, hotScripts, scripts, selectedTour?.id]);

  /**
   * Dismisses the active retry toast and skips the failed POI to resume queue.
   */
  const dismissRetryToast = useCallback(() => {
    if (retryToast?.poi && selectedTour?.id) {
      recordPoiSkipped(selectedTour.id, retryToast.poi.id);
      setPlaybackHistory((prev) => [
        {
          poi: retryToast.poi,
          status: 'skipped',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setRetryToast(null);
    setCurrentlyPlaying(null);
  }, [retryToast, selectedTour?.id]);

  // Initialize TTS Engine & OS Media Session on mount
  useEffect(() => {
    initTts().then((available) => {
      setIsTtsAvailable(available);
    });

    setupMediaSession({
      onPlay: resumeCurrentNarration,
      onPause: pauseCurrentNarration,
      onSkip: skipCurrentNarration,
    });

    return () => {
      teardownMediaSession();
    };
  }, [resumeCurrentNarration, pauseCurrentNarration, skipCurrentNarration]);

  // Update Lock-Screen "Now Playing" metadata whenever currentlyPlaying changes
  useEffect(() => {
    if (currentlyPlaying) {
      updateNowPlayingMetadata({
        title: currentlyPlaying.name,
        artist: selectedTour?.name || 'SpatiaLore Tour',
      });
    }
  }, [currentlyPlaying, selectedTour?.name]);

  // 1. Subscribe to Prefetch Events (Phase 4.4)
  useEffect(() => {
    const unsubscribePrefetch = subscribePrefetchEvents((prefetchedPoi) => {
      if (!prefetchedPoi || !prefetchedPoi.id) return;

      const matchingScript = scripts.find((s) => s.poi_id === prefetchedPoi.id);

      if (matchingScript && matchingScript.content) {
        setHotScripts((prev) => {
          if (prev[prefetchedPoi.id]) return prev;
          console.log(
            `🚀 [Prefetch Hot-Cache Primed] Script loaded into hot memory for POI "${prefetchedPoi.name}"`
          );
          return {
            ...prev,
            [prefetchedPoi.id]: matchingScript.content,
          };
        });
      }
    });

    return () => {
      unsubscribePrefetch();
    };
  }, [scripts]);

  // 2. Subscribe to Trigger Events (Phase 5.1): Enqueue triggered POIs for sequential narration
  useEffect(() => {
    const unsubscribeTriggers = subscribeTriggerEvents((triggeredPoi) => {
      if (!triggeredPoi || !triggeredPoi.id) return;

      console.log(`📥 [Narration Queue] Enqueuing POI "${triggeredPoi.name}" for playback`);
      setNarrationQueue((prev) => [...prev, triggeredPoi]);
    });

    return () => {
      unsubscribeTriggers();
    };
  }, []);

  // 4. AppState Listener: Track Screen-Off / Background listening duration during active tour
  const backgroundStartTimeRef = useRef(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundStartTimeRef.current = Date.now();
      } else if (nextAppState === 'active' && backgroundStartTimeRef.current) {
        const elapsedMs = Date.now() - backgroundStartTimeRef.current;
        const elapsedSeconds = elapsedMs / 1000;
        backgroundStartTimeRef.current = null;

        if (selectedTour?.id && elapsedSeconds >= 1) {
          console.log(`📱 [AppState] App returned to active. Background duration: ${elapsedSeconds.toFixed(1)}s`);
          recordScreenOffDuration(selectedTour.id, elapsedSeconds);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [selectedTour?.id]);

  // 3. Sequential Narration Queue Processor
  useEffect(() => {
    let isProcessing = false;

    async function processNextInQueue() {
      if (
        isProcessing ||
        currentlyPlaying ||
        isPaused ||
        retryToast ||
        narrationQueue.length === 0
      ) {
        return;
      }

      isProcessing = true;

      // Dequeue next POI
      const nextPoi = narrationQueue[0];
      setNarrationQueue((prev) => prev.slice(1));
      setCurrentlyPlaying(nextPoi);
      setIsPaused(false);

      // Execute narration playback via narrationPlayer
      const result = await playNarrationForPoi({
        poi: nextPoi,
        hotScripts,
        scripts,
      });

      if (result.status === 'error') {
        // Pause queue and display retry toast for traveler
        setRetryToast({
          poi: nextPoi,
          retryCount: 1,
          message: `Narration failed to play for "${nextPoi.name}".`,
        });
      } else {
        if (result.status === 'played' && selectedTour?.id) {
          recordPoiTriggered(selectedTour.id, nextPoi.id);
        }

        // Append result to playback history & clear currentlyPlaying
        setPlaybackHistory((prev) => [
          {
            poi: nextPoi,
            status: result.status,
            error: result.error ? result.error.message : null,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
        setCurrentlyPlaying(null);
      }

      isProcessing = false;
    }

    processNextInQueue();
  }, [narrationQueue, currentlyPlaying, isPaused, retryToast, hotScripts, scripts, selectedTour?.id]);

  /**
   * Manual stop control to immediately interrupt current narration playback.
   */
  const stopCurrentNarration = () => {
    stopNarration();
    setCurrentlyPlaying(null);
  };

  // Diagnostics tracking
  const tourStartedAtRef = useRef(null);

  const [selectedLanguageCode, setSelectedLanguageCode] = useState('en');

  /**
   * Fetches POIs and current scripts for the selected tour in target language from Supabase,
   * then durably persists them to local SQLite storage before setting status to 'ready'.
   */
  const downloadTour = async (tour, languageCode = 'en') => {
    if (!tour) return;

    setSelectedTour(tour);
    setSelectedLanguageCode(languageCode);
    setDownloadStatus('downloading');
    setDownloadError(null);
    setHotScripts({});
    setNarrationQueue([]);
    setCurrentlyPlaying(null);
    setPlaybackHistory([]);

    try {
      // Configure TTS Engine language on tour start
      await setTtsLanguage(languageCode);

      // 1. Fetch active POIs for this tour from Supabase
      const { data: poiData, error: poiError } = await fetchActivePoisForTour(tour.id);

      if (poiError) {
        throw new Error(poiError.message || 'Failed to download points of interest.');
      }

      const activePois = poiData || [];
      setPois(activePois);

      // 2. Fetch current active scripts in target languageCode if POIs exist
      let loadedScripts = [];
      if (activePois.length > 0) {
        const poiIds = activePois.map((p) => p.id);
        const { data: scriptData, error: scriptError } = await fetchCurrentScriptsForPois(poiIds, languageCode);

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
      tourStartedAtRef.current = Date.now();
      recordBatteryLevelAtTourStart();
      recordTourStarted(tour.id);
    } catch (err) {
      console.error('Error downloading tour in ActiveTourContext:', err);
      setDownloadError(err.message || 'Network or storage error downloading tour data.');
      setDownloadStatus('error');
    }
  };

  /**
   * Hydrates active working state directly from local SQLite storage with zero network requests.
   */
  const resumeCachedTour = async (tourId, languageCode = 'en') => {
    setSelectedLanguageCode(languageCode);
    setDownloadStatus('downloading');
    setDownloadError(null);
    setHotScripts({});
    setNarrationQueue([]);
    setCurrentlyPlaying(null);
    setPlaybackHistory([]);

    try {
      await setTtsLanguage(languageCode);

      const { data, error } = await loadCachedTour(tourId, languageCode);

      if (error || !data) {
        throw new Error(error?.message || 'Cached tour data not found in local storage.');
      }

      setSelectedTour(data.tour);
      setPois(data.pois || []);
      setScripts(data.scripts || []);
      setDownloadStatus('ready');
      tourStartedAtRef.current = Date.now();
      recordBatteryLevelAtTourStart();
      recordTourStarted(data.tour.id);
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
  const resetActiveTour = async () => {
    stopNarration();
    if (selectedTour?.id) {
      recordTourCompleted(selectedTour.id);

      // Log dev-only battery & performance diagnostics
      if (tourStartedAtRef.current) {
        const durationMinutes = (Date.now() - tourStartedAtRef.current) / 60000;
        const { drainPercent } = await getBatteryDrainSinceTourStart();
        const playedPoiCount = playbackHistory.filter((h) => h.status === 'played').length;

        logTourPerformanceSummary({
          tourId: selectedTour.id,
          tourName: selectedTour.name,
          durationMinutes,
          batteryDrainPercent: drainPercent,
          triggeredPoiCount: playedPoiCount,
        });
      }

      // Opportunistically attempt to flush analytics queue on tour conclusion
      syncAnalyticsQueue();
    }

    tourStartedAtRef.current = null;
    setSelectedTour(null);
    setPois([]);
    setScripts([]);
    setHotScripts({});
    setNarrationQueue([]);
    setCurrentlyPlaying(null);
    setPlaybackHistory([]);
    setDownloadStatus('idle');
    setDownloadError(null);
  };

  return (
    <ActiveTourContext.Provider
      value={{
        selectedTour,
        selectedLanguageCode,
        pois,
        scripts,
        hotScripts,
        narrationQueue,
        currentlyPlaying,
        playbackHistory,
        isTtsAvailable,
        isPaused,
        retryToast,
        retryFailedNarration,
        dismissRetryToast,
        pauseCurrentNarration,
        resumeCurrentNarration,
        skipCurrentNarration,
        stopCurrentNarration,
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


