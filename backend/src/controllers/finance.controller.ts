import type { Request, Response } from 'express';
import { categoryListSchema, categorySchema, categoryPatchSchema, transactionSchema,
  transactionPatchSchema, idSchema, listSchema, filtersSchema, monthlySchema } from '../domain/schemas.js';
import { context } from '../middleware/auth.js';
import { FinanceRepository } from '../repositories/finance.repository.js';
import { FinanceService } from '../services/finance.service.js';
import type { UserDatabase } from '../lib/database.js';

const id = (req: Request) => idSchema.parse(req.params.id);

export function financeController(database: UserDatabase) {
  const repository = (req: Request) => new FinanceRepository(database, context(req).user.id);
  return {
  categories: async (req: Request, res: Response) => {
    const filters = categoryListSchema.parse(req.query);
    res.json({ data: await repository(req).categories(filters.type) });
  },
  category: async (req: Request, res: Response) => {
    res.json({ data: await repository(req).category(id(req)) });
  },
  createCategory: async (req: Request, res: Response) => {
    res.status(201).json({ data: await repository(req).createCategory(categorySchema.parse(req.body)) });
  },
  updateCategory: async (req: Request, res: Response) => {
    res.json({ data: await repository(req).updateCategory(id(req), categoryPatchSchema.parse(req.body)) });
  },
  deleteCategory: async (req: Request, res: Response) => {
    await repository(req).deleteCategory(id(req)); res.status(204).end();
  },
  transactions: async (req: Request, res: Response) => {
    res.json(await repository(req).transactions(listSchema.parse(req.query)));
  },
  transaction: async (req: Request, res: Response) => {
    res.json({ data: await repository(req).transaction(id(req)) });
  },
  createTransaction: async (req: Request, res: Response) => {
    const service = new FinanceService(repository(req));
    res.status(201).json({ data: await service.createTransaction(transactionSchema.parse(req.body)) });
  },
  updateTransaction: async (req: Request, res: Response) => {
    const service = new FinanceService(repository(req));
    res.json({ data: await service.updateTransaction(id(req), transactionPatchSchema.parse(req.body)) });
  },
  deleteTransaction: async (req: Request, res: Response) => {
    await repository(req).deleteTransaction(id(req)); res.status(204).end();
  },
  report: async (req: Request, res: Response) => {
    res.json({ data: await repository(req).report(filtersSchema.parse(req.query)) });
  },
  monthly: async (req: Request, res: Response) => {
    res.json({ data: await repository(req).monthly(monthlySchema.parse(req.query)) });
  },
  };
}
