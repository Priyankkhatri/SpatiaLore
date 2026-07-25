import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateScriptRouter from './routes/generateScript.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Healthcheck Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'spatialore-backend' });
});

// API Routes
app.use('/api', generateScriptRouter);

// Error Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`SpatiaLore Express Backend running on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});
