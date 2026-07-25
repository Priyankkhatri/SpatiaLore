/**
  * Pure spatial geometry and geofence evaluation functions for SpatiaLore.
  * Kept free of side effects and external storage/network dependencies for isolated testing.
  */

/**
 * Calculates the great-circle distance in meters between two lat/lng coordinates using the Haversine formula.
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates current user coordinates against cached POIs to detect newly entered geofences.
 *
 * @param {Object} params
 * @param {number} params.currentLat - Current user latitude
 * @param {number} params.currentLng - Current user longitude
 * @param {Array} params.pois - List of cached POIs with lat, lng, trigger_radius_m
 * @param {Array<string>} params.alreadyTriggeredPoiIds - Array of POI IDs already triggered in this session
 * @returns {{ newlyTriggered: Array }} List of POI objects that just entered trigger radius
 */
export function checkPoiTriggers({
  currentLat,
  currentLng,
  pois = [],
  alreadyTriggeredPoiIds = [],
}) {
  const triggeredSet = new Set(alreadyTriggeredPoiIds);
  const newlyTriggered = [];

  for (const poi of pois) {
    if (!poi || !poi.id || triggeredSet.has(poi.id)) {
      continue;
    }

    const distanceMeters = haversineDistanceMeters(
      currentLat,
      currentLng,
      poi.lat,
      poi.lng
    );

    if (distanceMeters <= poi.trigger_radius_m) {
      newlyTriggered.push({
        ...poi,
        distanceMeters,
      });
    }
  }

  return { newlyTriggered };
}
