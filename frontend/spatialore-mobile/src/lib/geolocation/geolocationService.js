import * as Location from 'expo-location';
import { LOCATION_TASK_NAME } from './locationTask';

/**
 * Starts background location tracking with battery-conscious settings:
 * - Accuracy.Balanced (avoids battery drain of .Highest, optimal for 20-50m geofences)
 * - distanceInterval: 15 meters (prevents thrashing for micro-movement)
 * - timeInterval: 5000ms (max update frequency)
 * - foregroundService (Android 14+ mandate: persistent notification during active tracking)
 */
export async function startBackgroundTracking() {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      console.log('Background location tracking is already active.');
      return { success: true, error: null };
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: 'SpatiaLore Audio Tour Active 🎧',
        notificationBody: 'Listening for nearby points of interest in background...',
      },
    });

    console.log('✅ Started background location updates');
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to start background location tracking:', err);
    return { success: false, error: err };
  }
}

/**
 * Stops background location tracking and dismisses Android foreground service notification.
 */
export async function stopBackgroundTracking() {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isRunning) {
      return { success: true, error: null };
    }

    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('🛑 Stopped background location updates');
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to stop background location tracking:', err);
    return { success: false, error: err };
  }
}

/**
 * Checks if background location updates are currently running.
 */
export async function isTrackingActive() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (err) {
    return false;
  }
}
