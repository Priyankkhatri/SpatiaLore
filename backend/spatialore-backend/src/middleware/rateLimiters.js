import rateLimit from 'express-rate-limit';

/**
 * Strict Rate Limiter for LLM Audio Script Generation (/api/generate-script)
 * Window: 15 minutes
 * Limit: 20 requests per IP
 *
 * RATIONALE: Script generation is computationally expensive (self-hosted GPU) or consumes
 * third-party quota (Groq free tier). 20 requests per 15 min is generous for legitimate admins
 * batch-activating POIs while protecting infrastructure against abuse.
 */
export const scriptGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many script generation requests. Please wait before trying again.',
  },
});

/**
 * Looser Rate Limiter for Mobile Analytics Ingestion (/api/analytics/*)
 * Window: 5 minutes
 * Limit: 100 requests per IP
 *
 * RATIONALE: Legitimate mobile app clients may submit bursts of events during a tour
 * (poi_triggered, screen_off_duration, feedback_submitted). 100 requests per 5 min accommodates
 * real tour sessions while guarding against flood/spam abuse.
 *
 * NAT LIMITATION NOTE: IP-based rate limiting is imperfect for mobile devices behind carrier-grade NAT
 * where multiple subscribers share an IP. A future Post-MVP enhancement could key on session_id,
 * though trusting client-supplied identifiers carries its own spoofing risk without auth tokens.
 */
export const analyticsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many analytics events submitted. Please slow down.',
  },
});
