import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import generateScriptRouter from './routes/generateScript.js';
import analyticsRouter from './routes/analytics.js';
import { scriptGenerationLimiter, analyticsLimiter } from './middleware/rateLimiters.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

// 1. Security Headers (Helmet with cross-origin policy for Dashboard/Mobile API calls)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Request Logging Middleware
app.use(requestLogger);

// 3. CORS Middleware
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 4. Body Parser with Explicit 50kb Payload Size Limit (Prevents JSON DoS)
// Dependency note: largest valid payload is /api/analytics/batch (100 events), which fits well under 50kb.
app.use(express.json({ limit: '50kb' }));

// 5. Un-rate-limited Healthcheck Endpoint for Hosting Monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'spatialore-backend' });
});

// 6. Rate-Limited API Routes
app.use('/api', scriptGenerationLimiter, generateScriptRouter);
app.use('/api/analytics', analyticsLimiter, analyticsRouter);

// 7. Global Error Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`SpatiaLore Express Backend running on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});
