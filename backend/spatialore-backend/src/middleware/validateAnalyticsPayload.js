const ALLOWED_EVENT_TYPES = [
  'tour_started',
  'tour_completed',
  'poi_triggered',
  'poi_skipped',
  'screen_off_duration',
  'feedback_submitted',
];

const FORBIDDEN_METADATA_KEYS = [
  'latitude',
  'longitude',
  'lat',
  'lng',
  'device_id',
  'user_email',
  'email',
  'ip_address',
];

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Pure validation function for a single analytics event payload.
 * Returns { isValid: boolean, errors: string[] }
 */
export function validateSingleAnalyticsPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, errors: ['Payload must be a plain object'] };
  }

  // 1. session_id (Required UUID)
  if (!payload.session_id || typeof payload.session_id !== 'string') {
    errors.push('session_id is required and must be a string');
  } else if (!UUID_REGEX.test(payload.session_id)) {
    errors.push('session_id must be a valid UUID string');
  }

  // 2. event_type (Required, must match allowlist)
  if (!payload.event_type || typeof payload.event_type !== 'string') {
    errors.push('event_type is required and must be a string');
  } else if (!ALLOWED_EVENT_TYPES.includes(payload.event_type)) {
    errors.push(
      `event_type '${payload.event_type}' is invalid. Allowed event types: [${ALLOWED_EVENT_TYPES.join(', ')}]`
    );
  }

  // 3. tour_id (Optional, but if present must be valid UUID)
  if (payload.tour_id !== undefined && payload.tour_id !== null) {
    if (typeof payload.tour_id !== 'string' || !UUID_REGEX.test(payload.tour_id)) {
      errors.push('tour_id must be a valid UUID string if provided');
    }
  }

  // 4. poi_id (Optional, but if present must be valid UUID)
  if (payload.poi_id !== undefined && payload.poi_id !== null) {
    if (typeof payload.poi_id !== 'string' || !UUID_REGEX.test(payload.poi_id)) {
      errors.push('poi_id must be a valid UUID string if provided');
    }
  }

  // 5. value_numeric (Optional, finite number)
  if (payload.value_numeric !== undefined && payload.value_numeric !== null) {
    if (
      typeof payload.value_numeric !== 'number' ||
      !Number.isFinite(payload.value_numeric)
    ) {
      errors.push('value_numeric must be a finite number if provided');
    }
  }

  // 6. metadata (Optional, plain object under size limit, no PII/location keys)
  if (payload.metadata !== undefined && payload.metadata !== null) {
    if (typeof payload.metadata !== 'object' || Array.isArray(payload.metadata)) {
      errors.push('metadata must be a plain JSON object if provided');
    } else {
      const jsonStr = JSON.stringify(payload.metadata);
      if (jsonStr.length > 2000) {
        errors.push('metadata payload exceeds maximum size limit of 2000 characters');
      }

      // Check for forbidden PII / Location keys
      const keys = Object.keys(payload.metadata).map((k) => k.toLowerCase());
      const hasForbiddenKey = keys.some((k) => FORBIDDEN_METADATA_KEYS.includes(k));

      if (hasForbiddenKey) {
        errors.push('metadata must not contain location or personally identifiable fields');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Express Middleware for single event ingestion.
 */
export function validateAnalyticsMiddleware(req, res, next) {
  const { isValid, errors } = validateSingleAnalyticsPayload(req.body);

  if (!isValid) {
    return res.status(400).json({
      error: 'validation_failed',
      details: errors,
    });
  }

  next();
}
