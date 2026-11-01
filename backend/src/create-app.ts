import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import type { ClientFactory } from './domain/models.js';
import { AppError, errorHandler } from './lib/errors.js';
import { apiRoutes } from './routes/index.js';
import type { UserDatabase } from './lib/database.js';

export function createApp(options: { createClient: ClientFactory; database: UserDatabase; corsOrigins: string[]; trustProxyHops?: number }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxyHops ?? 0);
  app.set('query parser', 'simple');
  app.use(helmet());
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(cors({ origin: (origin, callback) => {
    if (!origin || options.corsOrigins.includes(origin)) callback(null, true);
    else callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origem não permitida.'));
  }, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um minuto.' } } }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/health/db', async (_req, res) => {
    try { await options.database.ping(); res.json({ status: 'ok', database: 'connected' }); }
    catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
  });
  app.use('/api/v1', apiRoutes(options.createClient, options.database));
  app.use((_req, _res) => { throw new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'); });
  app.use(errorHandler);
  return app;
}
