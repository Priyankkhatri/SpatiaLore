import { supabase } from './supabaseClient';

/**
 * Fetches active POIs for a specific tour.
 */
export async function fetchActivePoisForTour(tourId) {
  if (!tourId) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('pois')
      .select('*')
      .eq('tour_id', tourId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching active POIs:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error fetching active POIs:', err);
    return { data: [], error: err };
  }
}

/**
 * Converts a POI's PostGIS geography column (returned by PostgREST as GeoJSON:
 * { type: 'Point', coordinates: [lng, lat] } — longitude first) into a flat
 * { lat, lng } shape. Centralized here so callers (e.g. tourCacheApi.js) never
 * have to remember the lng/lat ordering gotcha independently.
 */
export function poiToLatLng(poi) {
  if (!poi) return { lat: 0, lng: 0 };
  if (typeof poi.lat === 'number' && typeof poi.lng === 'number') {
    return { lat: poi.lat, lng: poi.lng };
  }
  if (poi.location && Array.isArray(poi.location.coordinates)) {
    return {
      lat: poi.location.coordinates[1],
      lng: poi.location.coordinates[0],
    };
  }
  return { lat: 0, lng: 0 };
}
