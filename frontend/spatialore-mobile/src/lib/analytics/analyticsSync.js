/**
 * Offline Analytics Sync Engine for SpatiaLore Mobile.
 * Flushes locally queued SQLite analytics events to spatialore-backend /api/analytics/batch.
 */

import {
  getUnsyncedEvents,
  markEventsSynced,
  clearSyncedEvents,
} from '../storage/analyticsQueueApi';
import {
  subscribeToConnectivityChanges,
  getCurrentConnectivity,
} from './networkMonitor';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Flushes unsynced analytics events in batches to spatialore-backend.
 * Loops until queue is empty (up to 10 iterations safety cap).
 *
 * @returns {Promise<{ syncedCount: number, rejectedCount: number, error: Error|null }>}
 */
export async function syncAnalyticsQueue() {
  let totalSynced = 0;
  let totalRejected = 0;
  const maxIterations = 10;

  console.log('🔄 [Analytics Sync] Initiating queue flush check...');

  try {
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const { data: unsyncedEvents, error: fetchErr } = await getUnsyncedEvents(100);

      if (fetchErr || !unsyncedEvents || unsyncedEvents.length === 0) {
        break; // Queue is empty or storage read error
      }

      console.log(
        `📦 [Analytics Sync] Processing batch ${iteration + 1} (${unsyncedEvents.length} events)`
      );

      // Transform SQLite rows into backend batch API expected payload
      const batchPayload = unsyncedEvents.map((evt) => ({
        event_type: evt.event_type,
        tour_id: evt.tour_id || null,
        poi_id: evt.poi_id || null,
        session_id: evt.session_id,
        value_numeric: typeof evt.value_numeric === 'number' ? evt.value_numeric : null,
        metadata: evt.metadata || null,
        created_at_client: evt.created_at_client,
      }));

      // Post batch to Express backend /api/analytics/batch
      const response = await fetch(`${BACKEND_URL}/api/analytics/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: batchPayload }),
      });

      if (!response.ok && response.status !== 400) {
        console.warn(
          `⚠️ [Analytics Sync] Backend HTTP error ${response.status}. Leaving queue untouched for retry.`
        );
        break; // Network or server-side HTTP failure: leave queue intact for next attempt
      }

      const resBody = await response.json();
      const rejected = resBody.rejected || [];
      const rejectedIndices = new Set(rejected.map((r) => r.index));

      // Rejection Handling Note: Permanently invalid rows are marked synced=1 & dropped
      // to avoid infinite retry loops on malformed client data.
      if (rejected.length > 0) {
        console.warn(
          `⚠️ [Analytics Sync] ${rejected.length} events rejected by backend validation:`,
          rejected
        );
        totalRejected += rejected.length;
      }

      const allBatchIds = unsyncedEvents.map((e) => e.id);
      const insertedCount = unsyncedEvents.length - rejected.length;
      totalSynced += Math.max(0, insertedCount);

      // Mark all processed events in batch (both inserted & rejected) as synced
      await markEventsSynced(allBatchIds);
      await clearSyncedEvents();

      if (unsyncedEvents.length < 100) {
        break; // Processed final batch
      }
    }

    console.log(
      `✅ [Analytics Sync] Queue sync completed (Synced: ${totalSynced}, Rejected: ${totalRejected})`
    );
    return { syncedCount: totalSynced, rejectedCount: totalRejected, error: null };
  } catch (err) {
    console.warn('Network error during analytics sync (will retry next online cycle):', err?.message || err);
    return { syncedCount: totalSynced, rejectedCount: totalRejected, error: err };
  }
}

/**
 * Initializes app-wide network monitoring and 5-minute periodic sync timer.
 *
 * @returns {Function} Cleanup function to unsubscribe listeners & clear timers
 */
export function startPeriodicSync() {
  console.log('🚀 [Analytics Sync] Initializing background network monitor & 5-minute periodic timer');

  // Trigger 1: Reconnection listener
  const unsubscribeNetwork = subscribeToConnectivityChanges((isConnected) => {
    if (isConnected) {
      syncAnalyticsQueue();
    }
  });

  // Trigger 2: 5-minute periodic timer while connected
  const intervalId = setInterval(async () => {
    const isOnline = await getCurrentConnectivity();
    if (isOnline) {
      syncAnalyticsQueue();
    }
  }, 5 * 60 * 1000);

  // Initial startup sync check if already online
  getCurrentConnectivity().then((isOnline) => {
    if (isOnline) {
      syncAnalyticsQueue();
    }
  });

  return () => {
    unsubscribeNetwork();
    clearInterval(intervalId);
  };
}
