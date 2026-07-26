import { supabase } from './supabaseClient';

export async function fetchPublishedTours() {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function fetchTourById(tourId) {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('id', tourId)
      .eq('is_published', true)
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
