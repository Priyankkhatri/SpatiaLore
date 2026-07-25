import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveTourId } from './activeSession';
import {
  loadCachedPoisForTour,
  getTriggeredPoiIds,
  markPoiTriggered,
} from '../storage/tourCacheApi';
import { checkPoiTriggers } from './geofenceEngine';
import { emitTriggerEvent } from './triggerEventBus';

export const LOCATION_TASK_NAME = 'spatialore-background-location';

/**
 * Background Task Manager Registration
 * Evaluates current user position against SQLite-cached POIs for the active tour session.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (!data || !data.locations || data.locations.length === 0) {
    return;
  }

  const latestLocation = data.locations[data.locations.length - 1];
  const { latitude, longitude, accuracy, speed } = latestLocation.coords;

  // 1. Save latest coordinates to AsyncStorage for debug UI display
  try {
    await AsyncStorage.setItem(
      '@spatialore_last_location',
      JSON.stringify({
        latitude,
        longitude,
        accuracy,
        speed,
        timestamp: latestLocation.timestamp,
      })
    );
  } catch (storageErr) {
    console.warn('Could not store latest location for debug display:', storageErr);
  }

  // 2. Defensive check: verify if an active tour session is set
  const activeTourId = await getActiveTourId();
  if (!activeTourId) {
    return;
  }

  try {
    // 3. Load active tour's cached POIs & existing triggered POI IDs from SQLite
    const pois = await loadCachedPoisForTour(activeTourId);
    if (!pois || pois.length === 0) {
      return;
    }

    const alreadyTriggeredPoiIds = await getTriggeredPoiIds(activeTourId);

    // 4. Evaluate geofence entry using pure Haversine distance math
    const { newlyTriggered } = checkPoiTriggers({
      currentLat: latitude,
      currentLng: longitude,
      pois,
      alreadyTriggeredPoiIds,
    });

    // 5. Process newly triggered POIs (persist trigger state + emit event for UI/audio)
    for (const poi of newlyTriggered) {
      console.log(
        `🎯 [Geofence Trigger] Entered POI "${poi.name}" (Dist: ${poi.distanceMeters.toFixed(
          1
        )}m, Radius: ${poi.trigger_radius_m}m)`
      );

      // Persist trigger state immediately before emitting event
      await markPoiTriggered(activeTourId, poi.id);

      // Emit event across event bus to foreground UI / audio engine
      emitTriggerEvent({
        ...poi,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (evalErr) {
    console.error('Error during geofence trigger evaluation:', evalErr);
  }
});
