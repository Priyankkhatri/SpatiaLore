/**
 * GPS Signal Quality & Degradation Monitoring for SpatiaLore.
 * Determines when the app should transition between real GPS fixes and PDR dead-reckoning.
 */

// 15 seconds without a GPS fix (given ~5s location update interval) indicates GPS signal loss
export const GPS_STALE_TIMEOUT_MS = 15000;

// Accuracy worse than 50 meters (common near thick stone walls) is considered degraded/unacceptable
export const GPS_MIN_ACCEPTABLE_ACCURACY_M = 50;

// Maximum continuous duration (5 minutes) allowed for PDR dead-reckoning before stopping trigger checks to prevent runaway compound drift
export const PDR_MAX_DURATION_MS = 300000;

/**
 * Evaluates whether a GPS fix is stale or degraded.
 *
 * @param {Object} params
 * @param {number|null} params.lastFixTimestamp - Unix timestamp (ms) of last good GPS fix
 * @param {number|null} params.lastFixAccuracy - Accuracy in meters from location.coords.accuracy
 * @param {number} [params.now=Date.now()] - Current timestamp for comparison
 * @returns {boolean} True if GPS fix is missing, >15s old, or accuracy >50m
 */
export function isGpsFixStale({
  lastFixTimestamp,
  lastFixAccuracy,
  now = Date.now(),
}) {
  if (!lastFixTimestamp || typeof lastFixAccuracy !== 'number') {
    return true;
  }

  const ageMs = now - lastFixTimestamp;

  if (ageMs > GPS_STALE_TIMEOUT_MS) {
    return true;
  }

  if (lastFixAccuracy > GPS_MIN_ACCEPTABLE_ACCURACY_M) {
    return true;
  }

  return false;
}
