import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK_NAME = 'spatialore-background-location';

/**
 * Background Task Manager Registration
 * CRITICAL EXPO-TASK-MANAGER MANDATE: This task MUST be defined at module scope and
 * executed unconditionally at app startup so the OS can invoke it even if the app
 * is cold-started in the background by a location update event.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data && data.locations && data.locations.length > 0) {
    const latestLocation = data.locations[data.locations.length - 1];
    const { latitude, longitude, accuracy, speed } = latestLocation.coords;

    console.log(
      `📍 [Background Task] Location update: Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)} (±${accuracy.toFixed(1)}m)`
    );

    // Save latest coordinates to AsyncStorage for developer debug display in Phase 4.1
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

    // TODO(Phase 4.2): check location against cached_pois trigger radii here
  }
});
