import * as Location from 'expo-location';
import { LOCATION_TASK_NAME } from './locationTask';
import { startPdrSensors, stopPdrSensors } from './sensorTracker';

/**
 * Starts background location tracking alongside PDR accelerometer/compass sensors:
 * - Accuracy.Balanced (avoids battery drain of .Highest, optimal for 20-50m geofences)
 * - distanceInterval: 15 meters (prevents thrashing for micro-movement)
 * - timeInterval: 5000ms (max update frequency)
 * - foregroundService (Android 14+ mandate: persistent notification during active tracking)
 */
export async function startBackgroundTracking() {
  try {
    // 1. Initialize PDR sensors (pedometer & magnetometer)
    await startPdrSensors();

    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      console.log('Background location tracking is already active.');
      return { success: true, error: null };
    }

    // 2. Start Expo Location Task Updates
    // Battery Guardrail (Phase 7.1): 10000ms (10s) interval reduces GPS chip wakeups.
    // Average walking speed ~1.4 m/s covers ~14m in 10s, remaining comfortably inside
    // the minimum 20m trigger radius floor.
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: 'SpatiaLore Audio Tour Active 🎧',
        notificationBody: 'Listening for nearby points of interest (GPS + PDR active)...',
      },
    });

    console.log('✅ Started background location & PDR sensor updates');
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to start background location tracking:', err);
    return { success: false, error: err };
  }
}

/**
 * Stops background location tracking and PDR sensors.
 */
export async function stopBackgroundTracking() {
  try {
    // 1. Stop PDR sensor listeners
    stopPdrSensors();

    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isRunning) {
      return { success: true, error: null };
    }

    // 2. Stop Location updates
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
