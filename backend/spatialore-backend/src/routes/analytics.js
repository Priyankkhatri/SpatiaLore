/**
 * Analytics Ingestion Routes (/api/analytics)
 *
 * ARCHITECTURAL INDIRECTION RATIONALE:
 * While the Supabase public.analytics_events table permits direct anon inserts,
 * routing analytics ingestion through this Express backend provides:
 * 1. Application-layer validation & allowlists (easier to evolve than DB CHECK constraints).
 * 2. Strict PII / location key enforcement (latitude, longitude, device_id, email rejection).
 * 3. Offline batching support (POST /batch) for Phase 6 mobile reconnect sync.
 * 4. Single choke-point for session rate-limiting & abuse prevention (Phase 2.2).
 *
 * CLOCK SKEW NOTE: created_at_client is accepted as provided by the mobile device.
 * Server-generated synced_at is the authoritative timestamp for temporal ordering.
 */

import { Router } from 'express';
import {
  validateAnalyticsMiddleware,
  validateSingleAnalyticsPayload,
} from '../middleware/validateAnalyticsPayload.js';
import { insertAnalyticsEvent, insertAnalyticsBatch } from '../lib/analyticsApi.js';

const router = Router();

// TODO(Phase 2.2): Add rate limiting middleware here to prevent ingestion flood abuse.

/**
 * POST /api/analytics/event
 * Ingests a single anonymous analytics event from the traveler mobile app.
 */
router.post('/event', validateAnalyticsMiddleware, async (req, res, next) => {
  try {
    const {
      tour_id,
      poi_id,
      event_type,
      session_id,
      value_numeric,
      metadata,
      created_at_client,
    } = req.body;

    const { data, error } = await insertAnalyticsEvent({
      tourId: tour_id,
      poiId: poi_id,
      eventType: event_type,
      sessionId: session_id,
      valueNumeric: value_numeric,
      metadata,
      createdAtClient: created_at_client,
    });

    if (error || !data) {
      return res.status(500).json({ error: 'Failed to record event' });
    }

    // Return minimal fire-and-forget confirmation (never echo row ID)
    return res.status(201).json({ status: 'recorded' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/analytics/batch
 * Ingests a batch of up to 100 analytics events accumulated during offline tour playback.
 * Per-item validation & isolation: bad events are skipped and reported without failing valid ones.
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'validation_failed',
        details: ['Request body must contain an "events" array'],
      });
    }

    if (events.length === 0) {
      return res.status(400).json({
        error: 'validation_failed',
        details: ['events array cannot be empty'],
      });
    }

    if (events.length > 100) {
      return res.status(400).json({
        error: 'validation_failed',
        details: ['Batch size exceeds maximum limit of 100 events per request'],
      });
    }

    const validEvents = [];
    const rejected = [];

    // Validate each event in the batch individually
    events.forEach((evt, index) => {
      const { isValid, errors } = validateSingleAnalyticsPayload(evt);
      if (isValid) {
        validEvents.push(evt);
      } else {
        rejected.push({ index, reason: errors });
      }
    });

    let insertedCount = 0;
    if (validEvents.length > 0) {
      const { insertedCount: count, error } = await insertAnalyticsBatch(validEvents);
      if (error) {
        return res.status(500).json({ error: 'Failed to record analytics batch' });
      }
      insertedCount = count;
    }

    const responseStatus = rejected.length > 0 ? 'partial' : 'recorded';
    const statusCode = rejected.length === events.length ? 400 : 201;

    return res.status(statusCode).json({
      status: responseStatus,
      inserted: insertedCount,
      rejected,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
