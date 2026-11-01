import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { assertLocalDemoAllowed, createLocalDemo } from '../scripts/local/demo.js';

let local: Awaited<ReturnType<typeof createLocalDemo>>;
const loginBody = { email: 'demo@local.test', password: 'Demo12345!' };
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const prior = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://invalid:invalid@127.0.0.1:1/do_not_use';
  try { local = await createLocalDemo(); }
  finally {
    if (prior === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prior;
  }
});
afterAll(async () => { await local?.close(); });

describe('Demonstração local isolada do Supabase', () => {
  it.each([{ NODE_ENV: 'production' }, { VERCEL: '1' }, { RENDER: 'true' }])('recusa iniciar em hospedagem/produção: %j', (env) => {
    expect(() => assertLocalDemoAllowed(env)).toThrow();
  });
  it('usa PostgreSQL local mesmo com DATABASE_URL apontando para outra conexão', async () => {
    const response = await request(local.app).get('/health/db').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    expect(response.headers['x-local-demo']).toBe('true');
  });
  it('bloqueia token desconhecido e senha incorreta', async () => {
    await request(local.app).get('/api/v1/categories').set(bearer('token-desconhecido')).expect(401);
    await request(local.app).post('/api/v1/auth/login').send({ ...loginBody, password: 'incorreta' }).expect(401);
  });
  it('faz login e retorna os dados do protótipo sem usar fetch externo', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede externa desabilitada no teste.'));
    try {
      const login = await request(local.app).post('/api/v1/auth/login').send(loginBody).expect(200);
      const token = login.body.data.session.access_token;
      const report = await request(local.app).get('/api/v1/dashboard?year=2024&month=10').set(bearer(token)).expect(200);
      expect(report.body.data).toMatchObject({ paid_income: '5800.00', paid_expense: '2379.50',
        available_balance: '3420.50', pending_expense: '350.00', transaction_count: 8 });
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
  it('simula cadastro e mantém os dados financeiros isolados por usuário', async () => {
    const signup = await request(local.app).post('/api/v1/auth/register').send({
      email: 'novo@local.test', password: 'NovaSenha123!', full_name: 'Nova Conta',
    }).expect(201);
    const token = signup.body.data.session.access_token;
    const initial = await request(local.app).get('/api/v1/categories').set(bearer(token)).expect(200);
    expect(initial.body.data).toHaveLength(6);
    expect(initial.body.data.find((row: { name: string }) => row.name === 'Alimentação')).toMatchObject({ type: 'expense', icon: 'restaurant' });
    expect(initial.body.data.find((row: { name: string }) => row.name === 'Salário')).toMatchObject({ type: 'income', icon: 'account_balance_wallet' });
    const category = await request(local.app).post('/api/v1/categories').set(bearer(token))
      .send({ name: 'Renda local', type: 'income' }).expect(201);
    const created = await request(local.app).post('/api/v1/transactions').set(bearer(token))
      .send({ category_id: category.body.data.id, type: 'income', amount: 19.90,
        date: '2026-11-01', description: 'Teste isolado', status: 'paid' }).expect(201);
    const report = await request(local.app).get('/api/v1/dashboard').set(bearer(token)).expect(200);
    expect(report.body.data).toMatchObject({ available_balance: '19.90', transaction_count: 1 });
    const other = await request(local.app).post('/api/v1/auth/login').send(loginBody).expect(200);
    await request(local.app).get('/api/v1/transactions/' + created.body.data.id)
      .set(bearer(other.body.data.session.access_token)).expect(404);
  });
  it('renova a sessão local e bloqueia o refresh token após logout', async () => {
    const login = await request(local.app).post('/api/v1/auth/login').send(loginBody).expect(200);
    const first = login.body.data.session;
    const response = await request(local.app).post('/api/v1/auth/refresh')
      .send({ refresh_token: first.refresh_token }).expect(200);
    const renewed = response.body.data.session;
    expect(renewed.refresh_token).not.toBe(first.refresh_token);
    await request(local.app).post('/api/v1/auth/refresh').send({ refresh_token: first.refresh_token }).expect(401);
    await request(local.app).post('/api/v1/auth/logout').set(bearer(renewed.access_token)).expect(204);
    await request(local.app).post('/api/v1/auth/refresh').send({ refresh_token: renewed.refresh_token }).expect(401);
  });
});
