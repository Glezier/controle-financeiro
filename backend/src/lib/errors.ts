import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logDiagnostic } from './diagnostic.js';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function databaseError(error: unknown): void {
  if (!error) return;
  logDiagnostic('[database] Erro original', error);
  if (error instanceof AppError) throw error;
  const value = error as { code?: string; meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } } };
  const code = value.meta?.driverAdapterError?.cause?.originalCode ?? value.meta?.code ?? value.code;
  if (code === '23505' || code === 'P2002') throw new AppError(409, 'DUPLICATE_CATEGORY', 'Já existe uma categoria com esse nome e tipo.');
  if (code === '23503' || code === '23001' || code === 'P2003') throw new AppError(409, 'CATEGORY_CONFLICT', 'Categoria inexistente, incompatível ou vinculada a lançamentos.');
  if (code === '23514' || code === '22003' || code === '22007' || code === '22008' || code === '22P02' || code === 'P2004') {
    throw new AppError(400, 'INVALID_DATA', 'Os dados não atendem às restrições do banco.');
  }
  if (code === '42501') throw new AppError(403, 'FORBIDDEN', 'Operação não permitida.');
  throw new AppError(502, 'DATABASE_UNAVAILABLE', 'Não foi possível concluir a operação no banco de dados.');
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  logDiagnostic(`[api] ${_req.method} ${_req.path}`, error);
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Verifique os dados informados.',
      issues: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) } });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido.' } }); return;
    }
    if (error.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Corpo da requisição muito grande.' } }); return;
    }
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno.' } });
};
