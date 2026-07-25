import { supabase } from './supabaseClient';

/**
 * Fetches all tours ordered by creation date (newest first).
 * Covered by tours_admin_all RLS policy (admins see published and unpublished tours).
 */
export async function fetchAllTours() {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all tours:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error in fetchAllTours:', err);
    return { data: [], error: err };
  }
}

/**
 * Fetches a single tour by ID.
 */
export async function fetchTourById(tourId) {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('id', tourId)
      .single();

    if (error) {
      console.error('Error fetching tour by ID:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in fetchTourById:', err);
    return { data: null, error: err };
  }
}

/**
 * Creates a new tour. Starts unpublished (is_published: false) by default.
 */
export async function createTour({ name, description, city, country, adminId }) {
  try {
    const { data, error } = await supabase
      .from('tours')
      .insert([
        {
          name: name.trim(),
          description: description ? description.trim() : null,
          city: city.trim(),
          country: country ? country.trim() : null,
          admin_id: adminId || null,
          is_published: false, // New tours start unpublished
        },
      ])
      .select();

    if (error) {
      console.error('Error creating tour:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in createTour:', err);
    return { data: null, error: err };
  }
}

/**
 * Updates editable tour metadata fields (name, description, city, country).
 */
export async function updateTour(tourId, { name, description, city, country }) {
  try {
    const { data, error } = await supabase
      .from('tours')
      .update({
        name: name.trim(),
        description: description ? description.trim() : null,
        city: city.trim(),
        country: country ? country.trim() : null,
      })
      .eq('id', tourId)
      .select();

    if (error) {
      console.error('Error updating tour:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in updateTour:', err);
    return { data: null, error: err };
  }
}

/**
 * Explicitly updates the is_published boolean status for a tour.
 */
export async function setTourPublishStatus(tourId, isPublished) {
  try {
    const { data, error } = await supabase
      .from('tours')
      .update({ is_published: Boolean(isPublished) })
      .eq('id', tourId)
      .select();

    if (error) {
      console.error('Error setting tour publish status:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in setTourPublishStatus:', err);
    return { data: null, error: err };
  }
}

/**
 * Deletes a tour row.
 * CASCADE DELETION NOTE: public.pois foreign key has ON DELETE CASCADE.
 * Deleting a tour automatically deletes all associated POIs and scripts from Supabase.
 */
export async function deleteTour(tourId) {
  try {
    const { data, error } = await supabase
      .from('tours')
      .delete()
      .eq('id', tourId);

    if (error) {
      console.error('Error deleting tour:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in deleteTour:', err);
    return { data: null, error: err };
  }
}
