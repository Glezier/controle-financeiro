import express from 'express';
import { createApp } from '../../src/create-app.js';
import { FinanceRepository } from '../../src/repositories/finance.repository.js';
import { localDatabase } from './database.js';
import { LocalAuth } from './auth.js';

export function assertLocalDemoAllowed(env = process.env) {
  if (env.NODE_ENV === 'production' || env.VERCEL === '1' || env.RENDER === 'true' || env.NETLIFY === 'true') {
    throw new Error('A demonstração local não pode ser iniciada em produção ou na hospedagem.');
  }
}

export async function createLocalDemo() {
  assertLocalDemoAllowed();
  const local = await localDatabase();
  try {
    const auth = new LocalAuth(local.db);
    const user = await auth.addAccount('demo@local.test', 'Demo12345!', 'Usuário Demo');
    await auth.addAccount('outro@local.test', 'Demo12345!', 'Outro Usuário');
    const finance = new FinanceRepository(local.database, user.id);
    const categories = new Map((await finance.categories()).map((row) => [row.name, row.id]));
    const entries = [
      ['Salário', 'income', 5000, '2024-10-05', 'Salário', 'paid'],
      ['Salário', 'income', 800, '2024-10-18', 'Freelance', 'paid'],
      ['Moradia', 'expense', 1450, '2024-10-10', 'Aluguel', 'paid'],
      ['Alimentação', 'expense', 420.30, '2024-10-14', 'Supermercado', 'paid'],
      ['Saúde', 'expense', 159.20, '2024-10-20', 'Farmácia', 'paid'],
      ['Transporte', 'expense', 200, '2024-10-22', 'Combustível', 'paid'],
      ['Lazer', 'expense', 150, '2024-10-23', 'Streaming', 'paid'],
      ['Transporte', 'expense', 350, '2024-10-29', 'Manutenção', 'pending'],
    ] as const;
    for (const [name, type, amount, date, description, status] of entries) {
      await finance.createTransaction({ category_id: categories.get(name)!, type, amount, date, description, status });
    }
    const app = express();
    app.disable('x-powered-by');
    app.use((_req, res, next) => { res.set('X-Local-Demo', 'true'); next(); });
    app.use(createApp({ database: local.database, createClient: auth.createClient,
      corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
    return { app, close: local.close };
  } catch (error) {
    await local.close();
    throw error;
  }
}
