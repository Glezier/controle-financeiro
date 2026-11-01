import type { Request, RequestHandler } from 'express';
import type { ClientFactory } from '../domain/models.js';
import { AppError } from '../lib/errors.js';

export function requireAuth(createClient: ClientFactory): RequestHandler {
  return async (req, _res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    const token = match?.[1];
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Informe um token Bearer válido.');
    const client = createClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error) {
      if (!error.status || error.status >= 500) throw new AppError(503, 'AUTH_UNAVAILABLE', 'Autenticação indisponível.');
      throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
    }
    if (!data.user) throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
    req.context = { user: data.user, accessToken: token };
    next();
  };
}

export function context(req: Request) {
  if (!req.context) throw new AppError(401, 'UNAUTHORIZED', 'Autenticação necessária.');
  return req.context;
}
