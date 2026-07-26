/**
 * Data Retention & Storage Limitation Job for SpatiaLore.
 * Purges old aggregate analytics events from Supabase to comply with GDPR storage limitation.
 */

import { supabaseAdmin } from './supabaseAdminClient.js';

/**
 * Deletes analytics_events rows with synced_at older than retentionDays (default 90 days).
 *
 * @param {number} [retentionDays=90] - Data retention period in days
 * @returns {Promise<{ deletedCount: number, error: Error|null }>}
 */
export async function purgeOldAnalyticsEvents(retentionDays = 90) {
  try {
    const validDays = Number(retentionDays) > 0 ? Number(retentionDays) : 90;
    const cutoffDate = new Date(Date.now() - validDays * 24 * 60 * 60 * 1000).toISOString();

    console.log(
      `🧹 [Data Retention Job] Purging analytics_events synced before ${cutoffDate} (${validDays}-day retention threshold)`
    );

    const { data, count, error } = await supabaseAdmin
      .from('analytics_events')
      .delete({ count: 'exact' })
      .lt('synced_at', cutoffDate);

    if (error) {
      console.error('Error purging old analytics events:', error.message);
      return { deletedCount: 0, error };
    }

    const deletedCount = count || (Array.isArray(data) ? data.length : 0);
    console.log(`✅ [Data Retention Job] Successfully purged ${deletedCount} expired analytics event rows.`);

    return { deletedCount, error: null };
  } catch (err) {
    console.error('Unexpected error in purgeOldAnalyticsEvents:', err);
    return { deletedCount: 0, error: err };
  }
}
