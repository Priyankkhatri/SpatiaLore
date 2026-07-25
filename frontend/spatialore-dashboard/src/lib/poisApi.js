import { supabase } from './supabaseClient';

/**
 * Fetches all POIs (active and soft-deleted/inactive) for a given tour.
 */
export async function fetchActivePoisForTour(tourId) {
  try {
    const { data, error } = await supabase
      .from('pois')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching POIs for tour:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error in fetchActivePoisForTour:', err);
    return { data: [], error: err };
  }
}

/**
 * Activates an OSM POI by inserting a new row into public.pois.
 * CRITICAL POSTGIS NOTE: location uses geography(Point, 4326) which requires WKT 'POINT(lng lat)'.
 * Longitude MUST come first, followed by Latitude. Swapping these causes inverted coordinates!
 */
export async function activatePoi({ tourId, osmPoi, triggerRadiusM, prefetchRadiusM }) {
  try {
    const wktLocation = `POINT(${osmPoi.lng} ${osmPoi.lat})`;

    const { data, error } = await supabase
      .from('pois')
      .insert([
        {
          tour_id: tourId,
          osm_id: String(osmPoi.osmId),
          name: osmPoi.name,
          category: osmPoi.category,
          location: wktLocation, // Longitude FIRST, Latitude SECOND
          trigger_radius_m: Number(triggerRadiusM),
          prefetch_radius_m: Number(prefetchRadiusM),
          is_active: true,
        },
      ])
      .select();

    if (error) {
      console.error('Error activating POI:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in activatePoi:', err);
    return { data: null, error: err };
  }
}

/**
 * Soft-deactivates a POI by updating is_active = false.
 */
export async function deactivatePoi(poiId) {
  try {
    const { data, error } = await supabase
      .from('pois')
      .update({ is_active: false })
      .eq('id', poiId)
      .select();

    if (error) {
      console.error('Error deactivating POI:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in deactivatePoi:', err);
    return { data: null, error: err };
  }
}

/**
 * Reactivates a soft-deactivated POI by updating is_active = true.
 */
export async function reactivatePoi(poiId) {
  try {
    const { data, error } = await supabase
      .from('pois')
      .update({ is_active: true })
      .eq('id', poiId)
      .select();

    if (error) {
      console.error('Error reactivating POI:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in reactivatePoi:', err);
    return { data: null, error: err };
  }
}

/**
 * Updates trigger and prefetch radiuses for an existing POI.
 */
export async function updatePoiRadii(poiId, { triggerRadiusM, prefetchRadiusM }) {
  try {
    const { data, error } = await supabase
      .from('pois')
      .update({
        trigger_radius_m: Number(triggerRadiusM),
        prefetch_radius_m: Number(prefetchRadiusM),
      })
      .eq('id', poiId)
      .select();

    if (error) {
      console.error('Error updating POI radii:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in updatePoiRadii:', err);
    return { data: null, error: err };
  }
}
