import morgan from 'morgan';

/**
 * Baseline Request Observability Middleware
 * Uses 'combined' format in production and 'dev' format in local development.
 */
const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(format);
