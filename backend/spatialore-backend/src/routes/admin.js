/**
 * Admin Governance & Maintenance Routes (/api/admin)
 */

import { Router } from 'express';
import { purgeOldAnalyticsEvents } from '../lib/dataRetentionJob.js';

const router = Router();

/**
 * Middleware enforcing x-admin-task-secret header authentication.
 */
function requireAdminTaskSecret(req, res, next) {
  const secretHeader = req.headers['x-admin-task-secret'];
  const expectedSecret = process.env.ADMIN_TASK_SECRET;

  if (!expectedSecret || !secretHeader || secretHeader !== expectedSecret) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or missing X-Admin-Task-Secret header.',
    });
  }

  next();
}

/**
 * POST /api/admin/purge-old-analytics
 * Triggers data retention purging of analytics_events older than retentionDays.
 */
router.post('/purge-old-analytics', requireAdminTaskSecret, async (req, res, next) => {
  try {
    const retentionDays =
      Number(req.body?.retentionDays || req.query?.retentionDays) || 90;

    const { deletedCount, error } = await purgeOldAnalyticsEvents(retentionDays);

    if (error) {
      return res.status(500).json({
        error: 'purge_failed',
        message: 'Failed to purge expired analytics events.',
        details: error.message,
      });
    }

    return res.status(200).json({
      status: 'success',
      deletedCount,
      retentionDays,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
