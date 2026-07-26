/**
 * Offline-first persistent SQLite queue API for SpatiaLore analytics events.
 * Handles local event buffering, metadata serialization, and sync state tracking.
 */

import * as Crypto from 'expo-crypto';
import { getDb } from './db';

/**
 * Generates a RFC4122 v4 UUID string.
 * @returns {string}
 */
export function generateUuid() {
  if (Crypto && typeof Crypto.randomUUID === 'function') {
    return Crypto.randomUUID();
  }
  // Fallback RFC4122 v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Enqueues an anonymous analytics event into local SQLite storage.
 *
 * @param {Object} event
 * @param {string} event.eventType - Event type name (e.g. 'tour_started', 'poi_triggered')
 * @param {string} [event.tourId] - Target tour UUID
 * @param {string} [event.poiId] - Target POI UUID
 * @param {string} event.sessionId - Ephemeral client-generated session UUID
 * @param {number} [event.valueNumeric] - Numeric payload value (e.g. screen off seconds, rating)
 * @param {Object} [event.metadata] - Optional metadata object (JSON stringified)
 * @param {string} [event.createdAtClient] - ISO timestamp
 * @returns {Promise<{ data: boolean|null, error: Error|null }>}
 */
export async function enqueueAnalyticsEvent({
  eventType,
  tourId = null,
  poiId = null,
  sessionId,
  valueNumeric = null,
  metadata = null,
  createdAtClient = new Date().toISOString(),
}) {
  try {
    const db = await getDb();
    const eventId = generateUuid();
    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    await db.runAsync(
      `INSERT INTO analytics_queue (
        id, event_type, tour_id, poi_id, session_id, value_numeric, metadata, created_at_client, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        eventId,
        eventType,
        tourId,
        poiId,
        sessionId,
        valueNumeric,
        metadataStr,
        createdAtClient,
      ]
    );

    console.log(`📊 [Analytics Queue] Enqueued event "${eventType}" (ID: ${eventId.substring(0, 8)})`);
    return { data: true, error: null };
  } catch (err) {
    console.error('Error enqueuing analytics event:', err);
    return { data: null, error: err };
  }
}

/**
 * Retrieves pending unsynced analytics events capped at limit (default 100 batch limit).
 *
 * @param {number} [limit=100] - Batch size limit
 * @returns {Promise<{ data: Array|null, error: Error|null }>}
 */
export async function getUnsyncedEvents(limit = 100) {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT id, event_type, tour_id, poi_id, session_id, value_numeric, metadata, created_at_client
       FROM analytics_queue WHERE synced = 0 ORDER BY created_at_client ASC LIMIT ?;`,
      [limit]
    );

    const formattedEvents = (rows || []).map((row) => ({
      id: row.id,
      event_type: row.event_type,
      tour_id: row.tour_id,
      poi_id: row.poi_id,
      session_id: row.session_id,
      value_numeric: row.value_numeric,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      created_at_client: row.created_at_client,
    }));

    return { data: formattedEvents, error: null };
  } catch (err) {
    console.error('Error fetching unsynced analytics events:', err);
    return { data: null, error: err };
  }
}

/**
 * Marks an array of local analytics event IDs as synced (synced = 1).
 *
 * @param {Array<string>} eventIds - Array of event UUIDs to mark synced
 * @returns {Promise<{ data: boolean|null, error: Error|null }>}
 */
export async function markEventsSynced(eventIds = []) {
  if (!eventIds || eventIds.length === 0) {
    return { data: true, error: null };
  }

  try {
    const db = await getDb();
    const placeholders = eventIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE analytics_queue SET synced = 1 WHERE id IN (${placeholders});`,
      eventIds
    );

    console.log(`✅ [Analytics Queue] Marked ${eventIds.length} events as synced`);
    return { data: true, error: null };
  } catch (err) {
    console.error('Error marking analytics events as synced:', err);
    return { data: null, error: err };
  }
}

/**
 * Removes synced events from SQLite to prevent database bloat.
 *
 * @returns {Promise<{ data: boolean|null, error: Error|null }>}
 */
export async function clearSyncedEvents() {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM analytics_queue WHERE synced = 1;`);
    console.log('🧹 [Analytics Queue] Cleared synced events from local storage');
    return { data: true, error: null };
  } catch (err) {
    console.error('Error clearing synced analytics events:', err);
    return { data: null, error: err };
  }
}
