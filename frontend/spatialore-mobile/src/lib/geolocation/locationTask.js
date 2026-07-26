import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveTourId } from './activeSession';
import {
  loadCachedPoisForTour,
  getTriggeredPoiIds,
  markPoiTriggered,
  getPrefetchedPoiIds,
  markPoiPrefetched,
} from '../storage/tourCacheApi';
import { checkPoiTriggers, checkPrefetchZone } from './geofenceEngine';
import { emitTriggerEvent, emitPrefetchEvent } from './triggerEventBus';
import {
  isGpsFixStale,
  GPS_MIN_ACCEPTABLE_ACCURACY_M,
  PDR_MAX_DURATION_MS,
} from './gpsQualityMonitor';
import {
  getPdrSensorSnapshot,
  resetPdrStepCount,
} from './sensorTracker';
import { estimatePositionFromSteps } from './pdrEngine';

export const LOCATION_TASK_NAME = 'spatialore-background-location';

// Anchor point for PDR dead-reckoning calculations
let lastKnownGoodFix = null; // { lat, lng, timestamp, accuracy }
let pdrStaleStartTime = null;

/**
 * Background Task Manager Registration
 * Evaluates current user position (or PDR dead-reckoning estimate) against SQLite-cached POIs.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  const now = Date.now();
  let evalLat = null;
  let evalLng = null;
  let isUsingPdrFallback = false;

  const latestLocation =
    data && data.locations && data.locations.length > 0
      ? data.locations[data.locations.length - 1]
      : null;

  if (
    latestLocation &&
    latestLocation.coords &&
    latestLocation.coords.accuracy <= GPS_MIN_ACCEPTABLE_ACCURACY_M
  ) {
    // FRESH HIGH-ACCURACY GPS FIX: Re-anchor PDR and use real coordinates
    const { latitude, longitude, accuracy, speed } = latestLocation.coords;

    lastKnownGoodFix = {
      lat: latitude,
      lng: longitude,
      accuracy,
      timestamp: latestLocation.timestamp || now,
    };
    pdrStaleStartTime = null;
    resetPdrStepCount();

    evalLat = latitude;
    evalLng = longitude;
    isUsingPdrFallback = false;

    // Save latest coordinates to AsyncStorage for debug UI display
    try {
      await AsyncStorage.setItem(
        '@spatialore_last_location',
        JSON.stringify({
          latitude,
          longitude,
          accuracy,
          speed,
          timestamp: latestLocation.timestamp || now,
          isPdr: false,
        })
      );
    } catch (storageErr) {
      console.warn('Could not store latest location for debug display:', storageErr);
    }
  } else {
    // STALE OR MISSING GPS FIX: Check if PDR dead-reckoning fallback should activate
    const isStale = isGpsFixStale({
      lastFixTimestamp: lastKnownGoodFix?.timestamp,
      lastFixAccuracy: lastKnownGoodFix?.accuracy,
      now,
    });

    if (isStale && lastKnownGoodFix) {
      if (!pdrStaleStartTime) {
        pdrStaleStartTime = now;
      }

      // Safety Cap: Stop PDR after 5 minutes of continuous GPS outage to prevent compound drift
      if (now - pdrStaleStartTime > PDR_MAX_DURATION_MS) {
        console.warn('⚠️ PDR max duration (5m) exceeded without GPS fix. Skipping geofence evaluation.');
        return;
      }

      const { stepCount, headingDegrees } = getPdrSensorSnapshot();
      const pdrEst = estimatePositionFromSteps({
        startLat: lastKnownGoodFix.lat,
        startLng: lastKnownGoodFix.lng,
        stepCount,
        headingDegrees,
      });

      evalLat = pdrEst.estimatedLat;
      evalLng = pdrEst.estimatedLng;
      isUsingPdrFallback = true;

      console.log(
        `🧭 [PDR Fallback Active] Estimated position: Lat ${evalLat.toFixed(
          5
        )}, Lng ${evalLng.toFixed(5)} (${stepCount} steps @ ${headingDegrees.toFixed(
          0
        )}°)`
      );

      // Save PDR estimated coordinates to AsyncStorage for debug UI display
      try {
        await AsyncStorage.setItem(
          '@spatialore_last_location',
          JSON.stringify({
            latitude: evalLat,
            longitude: evalLng,
            accuracy: 25, // Rough PDR estimated accuracy
            speed: 1.2,
            timestamp: now,
            isPdr: true,
            stepCount,
            headingDegrees,
          })
        );
      } catch (storageErr) {
        console.warn('Could not store PDR location for debug display:', storageErr);
      }
    } else {
      // No good fix ever received yet
      return;
    }
  }

  // 2. Defensive check: verify if an active tour session is set
  const activeTourId = await getActiveTourId();
  if (!activeTourId || !evalLat || !evalLng) {
    return;
  }

  try {
    // 3. Load active tour's cached POIs, triggered POI IDs, and prefetched POI IDs from SQLite
    const pois = await loadCachedPoisForTour(activeTourId);
    if (!pois || pois.length === 0) {
      return;
    }

    const alreadyTriggeredPoiIds = await getTriggeredPoiIds(activeTourId);
    const alreadyPrefetchedPoiIds = await getPrefetchedPoiIds(activeTourId);

    // 4. Evaluate prefetch-zone entry (early-warning priming zone)
    const { newlyEnteredPrefetchZone } = checkPrefetchZone({
      currentLat: evalLat,
      currentLng: evalLng,
      pois,
      alreadyTriggeredPoiIds,
      alreadyPrefetchedPoiIds,
    });

    for (const poi of newlyEnteredPrefetchZone) {
      console.log(
        `🚀 [Prefetch Zone (${isUsingPdrFallback ? 'PDR' : 'GPS'})] Entered prefetch radius for POI "${
          poi.name
        }" (Dist: ${poi.distanceMeters.toFixed(1)}m, Prefetch Radius: ${poi.prefetch_radius_m}m)`
      );

      // Persist prefetch state in SQLite
      await markPoiPrefetched(activeTourId, poi.id);

      // Emit prefetch event over event bus to prime hot-script memory cache in ActiveTourContext
      emitPrefetchEvent({
        ...poi,
        isPdrPrefetch: isUsingPdrFallback,
        prefetchedAt: new Date().toISOString(),
      });
    }

    // 5. Evaluate geofence entry (trigger zone)
    const { newlyTriggered } = checkPoiTriggers({
      currentLat: evalLat,
      currentLng: evalLng,
      pois,
      alreadyTriggeredPoiIds,
    });

    // Process newly triggered POIs (persist trigger state + emit event for UI/audio)
    for (const poi of newlyTriggered) {
      console.log(
        `🎯 [Geofence Trigger (${isUsingPdrFallback ? 'PDR' : 'GPS'})] Entered POI "${
          poi.name
        }" (Dist: ${poi.distanceMeters.toFixed(1)}m, Trigger Radius: ${poi.trigger_radius_m}m)`
      );

      // Persist trigger state immediately before emitting event
      await markPoiTriggered(activeTourId, poi.id);

      // Emit event across event bus to foreground UI / audio engine
      emitTriggerEvent({
        ...poi,
        isPdrTrigger: isUsingPdrFallback,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (evalErr) {
    console.error('Error during geofence trigger/prefetch evaluation:', evalErr);
  }
});

