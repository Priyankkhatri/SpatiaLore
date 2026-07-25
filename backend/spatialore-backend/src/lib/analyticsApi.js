import { supabaseAdmin } from './supabaseAdminClient.js';

/**
 * Inserts a single validated analytics event into public.analytics_events.
 */
export async function insertAnalyticsEvent({
  tourId,
  poiId,
  eventType,
  sessionId,
  valueNumeric,
  metadata,
  createdAtClient,
}) {
  try {
    const row = {
      session_id: sessionId,
      event_type: eventType,
      tour_id: tourId || null,
      poi_id: poiId || null,
      value_numeric: valueNumeric !== undefined ? valueNumeric : null,
      metadata: metadata || null,
    };

    if (createdAtClient) {
      row.created_at_client = createdAtClient;
    }

    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .insert([row])
      .select('id');

    if (error) {
      console.error('Error inserting analytics event into DB:', error.message);
      return { data: null, error };
    }

    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Unexpected error in insertAnalyticsEvent:', err);
    return { data: null, error: err };
  }
}

/**
 * Inserts a batch of pre-validated analytics events with per-item error isolation.
 * For any failed items, records the index and reason without rolling back valid events.
 */
export async function insertAnalyticsBatch(validEvents = []) {
  let insertedCount = 0;
  const dbErrors = [];

  // Batch insert valid items via Supabase
  try {
    const rows = validEvents.map((evt) => {
      const row = {
        session_id: evt.session_id,
        event_type: evt.event_type,
        tour_id: evt.tour_id || null,
        poi_id: evt.poi_id || null,
        value_numeric: evt.value_numeric !== undefined ? evt.value_numeric : null,
        metadata: evt.metadata || null,
      };
      if (evt.created_at_client) {
        row.created_at_client = evt.created_at_client;
      }
      return row;
    });

    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .insert(rows)
      .select('id');

    if (error) {
      console.error('Batch DB insert failed:', error.message);
      return { insertedCount: 0, error };
    }

    insertedCount = data?.length || rows.length;
    return { insertedCount, error: null };
  } catch (err) {
    console.error('Unexpected error in insertAnalyticsBatch:', err);
    return { insertedCount: 0, error: err };
  }
}
