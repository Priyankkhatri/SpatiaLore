import { Router } from 'express';
import { generateNarrationScript } from '../lib/llmClient.js';

const router = Router();

router.post('/generate-script', async (req, res, next) => {
  try {
    const { poiName, category, city, country } = req.body;

    if (!poiName || typeof poiName !== 'string' || !poiName.trim()) {
      return res.status(400).json({ error: 'poiName is required' });
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'category is required' });
    }
    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'city is required' });
    }
    if (!country || typeof country !== 'string' || !country.trim()) {
      return res.status(400).json({ error: 'country is required' });
    }

    const scriptResult = await generateNarrationScript({
      poiName: poiName.trim(),
      category: category.trim(),
      city: city.trim(),
      country: country.trim(),
    });

    return res.status(200).json(scriptResult);
  } catch (err) {
    if (err.type === 'both_providers_failed') {
      return res.status(503).json({
        error:
          'Script generation is temporarily unavailable — both the self-hosted model and the backup provider failed. Please try again shortly.',
        details: err,
      });
    }

    if (err.type === 'rate_limited') {
      return res.status(429).json({
        error:
          'The backup provider is rate-limited — please wait a moment and try again.',
      });
    }

    if (err.type === 'invalid_response') {
      return res.status(502).json({
        error: 'The model returned an unexpected or empty response.',
      });
    }

    if (err.type === 'groq_not_configured') {
      return res.status(503).json({
        error:
          'Backup provider is not configured (missing Groq API Key on server).',
      });
    }

    next(err);
  }
});

export default router;
