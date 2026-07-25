import { supabase } from './supabaseClient';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Calls backend API to generate audio narration text using primary (self-hosted) or fallback (Groq) LLM.
 */
export async function generateScriptApi({ poiName, category, city, country }) {
  try {
    const res = await fetch(`${backendUrl}/api/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ poiName, category, city, country }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server responded with status ${res.status}`);
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error calling generateScriptApi:', err);
    return { data: null, error: err };
  }
}

/**
 * Persists the generated script to Supabase public.scripts.
 * Note: Inserting with is_current = true automatically triggers the database trigger
 * unset_previous_current_script() created in Phase 0.1 to demote existing scripts.
 */
export async function saveScriptToSupabase({
  poiId,
  languageCode = 'en',
  content,
  llmProvider,
  llmModel,
  generationPrompt,
}) {
  try {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    const { data, error } = await supabase
      .from('scripts')
      .insert([
        {
          poi_id: poiId,
          language_code: languageCode,
          content,
          llm_provider: llmProvider,
          llm_model: llmModel,
          generation_prompt: generationPrompt,
          word_count: wordCount,
          is_current: true,
        },
      ])
      .select();

    if (error) {
      console.error('Error saving script to Supabase:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in saveScriptToSupabase:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetches current active scripts for a list of POI IDs.
 */
export async function fetchCurrentScriptsForPois(poiIds = []) {
  if (!poiIds || poiIds.length === 0) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .in('poi_id', poiIds)
      .eq('is_current', true);

    if (error) {
      console.error('Error fetching scripts:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error fetching scripts:', err);
    return { data: [], error: err };
  }
}
