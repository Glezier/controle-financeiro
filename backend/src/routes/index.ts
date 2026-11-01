import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { ClientFactory } from '../domain/models.js';
import { authController } from '../controllers/auth.controller.js';
import { financeController } from '../controllers/finance.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';
import type { UserDatabase } from '../lib/database.js';
import { CATEGORY_ICON_OPTIONS } from '../domain/categories.js';

export function apiRoutes(createClient: ClientFactory, database: UserDatabase) {
  const router = Router();
  const finance = financeController(database);
  const auth = authController(new AuthService(createClient));
  const authenticate = requireAuth(createClient);
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em alguns minutos.' } } });
  router.post('/auth/register', authLimit, auth.register);
  router.post('/auth/login', authLimit, auth.login);
  router.post('/auth/refresh', rateLimit({ windowMs: 60 * 1000, limit: 30,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Aguarde antes de renovar a sessão novamente.' } } }), auth.refresh);
  router.use(authenticate);
  router.post('/auth/logout', auth.logout);
  router.get('/auth/me', auth.me);
  router.get('/categories', finance.categories);
  router.get('/categories/icons', (_req, res) => { res.json({ data: CATEGORY_ICON_OPTIONS }); });
  router.get('/categories/:id', finance.category);
  router.post('/categories', finance.createCategory);
  router.patch('/categories/:id', finance.updateCategory);
  router.delete('/categories/:id', finance.deleteCategory);
  router.get('/transactions', finance.transactions);
  router.get('/transactions/:id', finance.transaction);
  router.post('/transactions', finance.createTransaction);
  router.patch('/transactions/:id', finance.updateTransaction);
  router.delete('/transactions/:id', finance.deleteTransaction);
  router.get('/dashboard', finance.report);
  router.get('/reports/categories', finance.report);
  router.get('/reports/monthly', finance.monthly);
  return router;
}
