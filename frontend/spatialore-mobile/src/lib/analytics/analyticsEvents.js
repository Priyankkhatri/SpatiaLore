/**
 * Anonymous, Privacy-First Analytics Event Builders for SpatiaLore.
 *
 * Privacy & GDPR Compliance Guarantee:
 * - SESSION_ID is generated once per app launch (ephemeral, not persisted, zero device fingerprints).
 * - No user location (latitude/longitude), IP address, device serial, or PII is ever accepted or logged.
 * - Enforces exact schema rules aligned with backend validation (Phase 2.1).
 */

import { generateUuid, enqueueAnalyticsEvent } from '../storage/analyticsQueueApi';

// Ephemeral session ID generated fresh on every app cold start
export const SESSION_ID = generateUuid();

console.log(`🔐 [Analytics Engine] Ephemeral session initialized (ID: ${SESSION_ID.substring(0, 8)})`);

/**
 * Records tour_started event when a traveler starts an active tour session.
 */
export async function recordTourStarted(tourId) {
  if (!tourId) return;
  return enqueueAnalyticsEvent({
    eventType: 'tour_started',
    tourId,
    sessionId: SESSION_ID,
  });
}

/**
 * Records tour_completed event when a traveler finishes a tour.
 */
export async function recordTourCompleted(tourId) {
  if (!tourId) return;
  return enqueueAnalyticsEvent({
    eventType: 'tour_completed',
    tourId,
    sessionId: SESSION_ID,
  });
}

/**
 * Records poi_triggered event when a POI's narration finishes playing.
 */
export async function recordPoiTriggered(tourId, poiId) {
  if (!tourId || !poiId) return;
  return enqueueAnalyticsEvent({
    eventType: 'poi_triggered',
    tourId,
    poiId,
    sessionId: SESSION_ID,
  });
}

/**
 * Records poi_skipped event when a traveler manually skips or dismisses a POI narration.
 */
export async function recordPoiSkipped(tourId, poiId) {
  if (!tourId || !poiId) return;
  return enqueueAnalyticsEvent({
    eventType: 'poi_skipped',
    tourId,
    poiId,
    sessionId: SESSION_ID,
  });
}

/**
 * Records screen_off_duration event measuring pocket/background listening duration in seconds.
 *
 * @param {string} tourId - Tour ID
 * @param {number} durationSeconds - Elapsed background seconds
 */
export async function recordScreenOffDuration(tourId, durationSeconds) {
  if (!tourId || typeof durationSeconds !== 'number' || durationSeconds <= 0) return;
  return enqueueAnalyticsEvent({
    eventType: 'screen_off_duration',
    tourId,
    sessionId: SESSION_ID,
    valueNumeric: Math.round(durationSeconds),
  });
}

/**
 * Records feedback_submitted event with numeric rating (1-5).
 *
 * @param {string} tourId - Tour ID
 * @param {number} rating - Rating score (1-5)
 */
export async function recordFeedbackSubmitted(tourId, rating) {
  if (!tourId || typeof rating !== 'number') return;
  return enqueueAnalyticsEvent({
    eventType: 'feedback_submitted',
    tourId,
    sessionId: SESSION_ID,
    valueNumeric: rating,
  });
}
