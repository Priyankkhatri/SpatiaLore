/**
 * Pure mathematical Pedestrian Dead-Reckoning (PDR) positioning calculations.
 * Computes estimated lat/lng displacement from step counts and compass heading.
 */

/**
 * Estimates average stride length in meters based on user height in cm.
 * Heuristic approximation: Stride length ≈ Height * 0.415
 *
 * @param {number} [userHeightCm=170] - User height in centimeters (default 170cm)
 * @returns {number} Estimated stride length in meters (~0.7055m for 170cm)
 */
export function metersPerStep(userHeightCm = 170) {
  return (userHeightCm * 0.415) / 100;
}

/**
 * Estimates new coordinates given a starting lat/lng, step count, and compass heading.
 * Uses flat-Earth spherical trigonometry (valid for short-distance PDR dead-reckoning).
 *
 * @param {Object} params
 * @param {number} params.startLat - Starting anchor latitude
 * @param {number} params.startLng - Starting anchor longitude
 * @param {number} params.stepCount - Number of steps taken since anchor fix
 * @param {number} params.headingDegrees - Compass heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 * @param {number} [params.strideLengthM=metersPerStep()] - Stride length in meters
 * @returns {{ estimatedLat: number, estimatedLng: number, totalDistanceMeters: number }}
 */
export function estimatePositionFromSteps({
  startLat,
  startLng,
  stepCount = 0,
  headingDegrees = 0,
  strideLengthM = metersPerStep(),
}) {
  const totalDistanceMeters = stepCount * strideLengthM;

  if (totalDistanceMeters === 0) {
    return {
      estimatedLat: startLat,
      estimatedLng: startLng,
      totalDistanceMeters: 0,
    };
  }

  // Convert compass bearing (degrees) to radians
  const headingRad = (headingDegrees * Math.PI) / 180;

  // 1 degree latitude ≈ 111,139 meters
  const deltaLat = (totalDistanceMeters * Math.cos(headingRad)) / 111139;

  // 1 degree longitude ≈ 111,139 * cos(latitude) meters
  const cosLat = Math.cos((startLat * Math.PI) / 180);
  const deltaLng =
    (totalDistanceMeters * Math.sin(headingRad)) / (111139 * (cosLat || 1));

  return {
    estimatedLat: startLat + deltaLat,
    estimatedLng: startLng + deltaLng,
    totalDistanceMeters,
  };
}
