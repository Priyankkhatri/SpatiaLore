import { supabase } from './supabaseClient';

/**
 * Fetches current active scripts for a list of POI IDs in the specified target language.
 *
 * @param {Array<string>} poiIds - List of POI IDs
 * @param {string} [languageCode='en'] - Target ISO 639-1 language code (e.g. 'en', 'hi', 'fr')
 * @returns {Promise<{ data: Array, error: Error|null }>}
 */
export async function fetchCurrentScriptsForPois(poiIds = [], languageCode = 'en') {
  if (!poiIds || poiIds.length === 0) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .in('poi_id', poiIds)
      .eq('is_current', true)
      .eq('language_code', languageCode);

    if (error) {
      console.error(`Error fetching scripts for language '${languageCode}':`, error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error(`Unexpected error fetching scripts for language '${languageCode}':`, err);
    return { data: [], error: err };
  }
}
