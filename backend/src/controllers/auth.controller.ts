import type { Request, Response } from 'express';
import { registerSchema, loginSchema, refreshSchema } from '../domain/schemas.js';
import { context } from '../middleware/auth.js';
import { publicUser, type AuthService } from '../services/auth.service.js';

export function authController(service: AuthService) {
  return {
    register: async (req: Request, res: Response) => {
      res.status(201).json({ data: await service.register(registerSchema.parse(req.body)) });
    },
    login: async (req: Request, res: Response) => {
      res.json({ data: await service.login(loginSchema.parse(req.body)) });
    },
    refresh: async (req: Request, res: Response) => {
      res.json({ data: await service.refresh(refreshSchema.parse(req.body).refresh_token) });
    },
    logout: async (req: Request, res: Response) => {
      await service.logout(context(req).accessToken); res.status(204).end();
    },
    me: async (req: Request, res: Response) => {
      const { user } = context(req);
      res.json({ data: publicUser(user) });
    },
  };
}
