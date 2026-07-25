import * as Location from 'expo-location';

/**
 * Requests location permissions in two sequential steps required by OS security guidelines:
 * 1. Foreground location permission (required to run any version of the tour).
 * 2. Background location permission (required for screen-off / hands-free mode).
 *
 * Requesting background permission before foreground is granted will be rejected by iOS/Android.
 */
export async function requestLocationPermissions() {
  try {
    // Step 1: Request Foreground Location Permission
    const fgStatus = await Location.requestForegroundPermissionsAsync();
    const foregroundGranted = fgStatus.status === 'granted';

    if (!foregroundGranted) {
      return { foregroundGranted: false, backgroundGranted: false };
    }

    // Step 2: Request Background Location Permission (only after foreground is granted)
    const bgStatus = await Location.requestBackgroundPermissionsAsync();
    const backgroundGranted = bgStatus.status === 'granted';

    return {
      foregroundGranted: true,
      backgroundGranted,
    };
  } catch (err) {
    console.error('Error requesting location permissions:', err);
    return { foregroundGranted: false, backgroundGranted: false };
  }
}
