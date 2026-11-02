import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/create-app.js';
import { loadEnv } from '../src/config/env.js';
import { testDatabase, A, B, INCOME, EXPENSE, FOREIGN } from './helpers/database.js';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: A, exp: 4_000_000_000 })).toString('base64url') + '.fake-signature';
let env: Awaited<ReturnType<typeof testDatabase>>;
let app: ReturnType<typeof createApp>;
let authFailure = false;
let authUser = A;
let calls: { url: URL; body: any; headers: Headers }[];
const user = () => ({ id: authUser, email: 'teste@example.com', aud: 'authenticated',
  user_metadata: { full_name: 'Lucas Mendes' }, created_at: '2026-10-29T00:00:00Z' });
const session = () => ({ access_token: jwt, refresh_token: 'refresh-token', expires_in: 3600, token_type: 'bearer', user: user() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const auth = { Authorization: 'Bearer ' + jwt };
const input = () => ({ category_id: INCOME, type: 'income', amount: 12.34, date: '2026-10-30', description: 'Receita de teste', status: 'paid' });

beforeAll(async () => { env = await testDatabase(); });
beforeEach(async () => {
  await env.reset(); authFailure = false; authUser = A; calls = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: new Headers(init?.headers) });
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (authFailure) return json({ message: 'Invalid credentials', code: 'invalid_credentials' }, 401);
    if (url.pathname === '/auth/v1/user') return json(user());
    if (url.pathname === '/auth/v1/token') return json(session());
    if (url.pathname === '/auth/v1/signup') return json({ user: user(), session: null });
    throw new Error('Acesso inesperado: somente Supabase Auth é simulado.');
  });
  app = createApp({ database: env.database, corsOrigins: ['http://localhost:5173'], createClient: (token) =>
    createClient('https://project.supabase.co', 'sb_publishable_test', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: fetchMock, headers: token ? { Authorization: 'Bearer ' + token } : {} },
    }),
  });
});
afterAll(async () => { await env?.close(); });

describe('API HTTP com Prisma e PostgreSQL reais; somente Auth simulado', () => {
  it('health é público e mantém cabeçalhos seguros', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(calls).toHaveLength(0);
    await request(app).get('/health/db').expect(200);
  });
  it('bloqueia rotas privadas sem JWT e credenciais inválidas', async () => {
    await request(app).get('/api/v1/transactions').expect(401);
    authFailure = true;
    await request(app).get('/api/v1/categories').set(auth).expect(401);
    const response = await request(app).post('/api/v1/auth/login').send({ email: 'teste@example.com', password: 'incorreta' }).expect(401);
    expect(response.body.error.code).toBe('AUTH_FAILED');
    expect(JSON.stringify(response.body)).not.toContain('invalid_credentials');
  });
  it('login retorna nome, usuário e tokens', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: 'TESTE@example.com', password: 'senha-segura' }).expect(200);
    expect(response.body.data.user).toEqual({ id: A, email: 'teste@example.com', full_name: 'Lucas Mendes' });
    expect(response.body.data.session.access_token).toBe(jwt);
  });
  it('cadastro envia nome completo como metadado de exibição', async () => {
    const response = await request(app).post('/api/v1/auth/register')
      .send({ email: 'teste@example.com', password: 'senha-segura', full_name: 'Lucas Mendes' }).expect(201);
    expect(response.body.data.session).toBeNull();
    expect(calls[0]!.body.data).toEqual({ full_name: 'Lucas Mendes' });
  });
  it('renova sessão sem access token', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').send({ refresh_token: 'refresh-token' }).expect(200);
    expect(response.body.data.session.refresh_token).toBe('refresh-token');
    expect(calls[0]!.url.searchParams.get('grant_type')).toBe('refresh_token');
  });
  it('logout revoga somente a sessão atual com seu JWT', async () => {
    await request(app).post('/api/v1/auth/logout').set(auth).expect(204);
    const logout = calls.find((call) => call.url.pathname === '/auth/v1/logout')!;
    expect(logout.url.searchParams.get('scope')).toBe('local');
    expect(logout.headers.get('Authorization')).toBe('Bearer ' + jwt);
  });
  it('me devolve nome para o cabeçalho do protótipo', async () => {
    const response = await request(app).get('/api/v1/auth/me').set(auth).expect(200);
    expect(response.body.data.full_name).toBe('Lucas Mendes');
  });
  it('rejeita proprietário forjado, UUID inválido e PATCH vazio', async () => {
    await request(app).post('/api/v1/categories').set(auth).send({ name: 'A', type: 'income', user_id: B }).expect(400);
    await request(app).patch('/api/v1/categories/' + INCOME).set(auth).send({}).expect(400);
    await request(app).get('/api/v1/transactions/invalid').set(auth).expect(400);
  });
  it('CRUD completo de categoria e contagem inicial zero', async () => {
    const created = await request(app).post('/api/v1/categories').set(auth).send({ name: 'Nova', type: 'expense' }).expect(201);
    const id = created.body.data.id;
    expect(created.body.data.user_id).toBe(A);
    await request(app).patch('/api/v1/categories/' + id).set(auth).send({ name: 'Renomeada' }).expect(200);
    const list = await request(app).get('/api/v1/categories?type=expense').set(auth).expect(200);
    expect(list.body.data.find((row: any) => row.id === id)).toMatchObject({ name: 'Renomeada', transaction_count: 0 });
    await request(app).delete('/api/v1/categories/' + id).set(auth).expect(204);
    await request(app).get('/api/v1/categories/' + id).set(auth).expect(404);
  });
  it('consulta o catálogo e persiste ícones válidos na criação e edição', async () => {
    const icons = await request(app).get('/api/v1/categories/icons').set(auth).expect(200);
    expect(icons.body.data.some((row: { id: string }) => row.id === 'restaurant')).toBe(true);
    for (const option of icons.body.data as { id: string }[]) {
      const created = await request(app).post('/api/v1/categories').set(auth)
        .send({ name: 'Ícone ' + option.id, type: 'expense', icon: option.id }).expect(201);
      expect(created.body.data.icon).toBe(option.id);
    }
    const changed = await request(app).patch('/api/v1/categories/' + EXPENSE).set(auth)
      .send({ icon: 'shopping_cart' }).expect(200);
    expect(changed.body.data.icon).toBe('shopping_cart');
    await request(app).post('/api/v1/categories').set(auth)
      .send({ name: 'Ícone inválido', type: 'expense', icon: 'https://example.com/image.svg' }).expect(400);
    await request(app).patch('/api/v1/categories/' + EXPENSE).set(auth).send({ icon: 'inexistente' }).expect(400);
  });
  it('normalização de nomes bloqueia categoria duplicada', async () => {
    const response = await request(app).post('/api/v1/categories').set(auth).send({ name: 'SALÁRIO', type: 'income' }).expect(409);
    expect(response.body.error.code).toBe('DUPLICATE_CATEGORY');
  });
  it('CRUD completo de transação preserva centavos e data financeira', async () => {
    const created = await request(app).post('/api/v1/transactions').set(auth).send(input()).expect(201);
    const id = created.body.data.id;
    expect(created.body.data).toMatchObject({ amount: 12.34, date: '2026-10-30', user_id: A });
    const updated = await request(app).patch('/api/v1/transactions/' + id).set(auth).send({ amount: 0.29, status: 'pending' }).expect(200);
    expect(updated.body.data).toMatchObject({ amount: 0.29, status: 'pending' });
    await request(app).get('/api/v1/transactions/' + id).set(auth).expect(200);
    await request(app).delete('/api/v1/transactions/' + id).set(auth).expect(204);
    await request(app).get('/api/v1/transactions/' + id).set(auth).expect(404);
  });
  it('rejeita categoria incompatível, alheia e valor com fração de centavo', async () => {
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), category_id: EXPENSE }).expect(400);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), category_id: FOREIGN }).expect(400);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), amount: 1.001 }).expect(400);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), date: '2026-02-30' }).expect(400);
  });
  it('PATCH revalida a combinação final de categoria e tipo', async () => {
    const created = await request(app).post('/api/v1/transactions').set(auth).send(input()).expect(201);
    await request(app).patch('/api/v1/transactions/' + created.body.data.id).set(auth).send({ type: 'expense' }).expect(400);
  });
  it('categoria em uso não pode ser excluída nem mudar de tipo', async () => {
    await request(app).post('/api/v1/transactions').set(auth).send(input()).expect(201);
    const deleted = await request(app).delete('/api/v1/categories/' + INCOME).set(auth).expect(409);
    expect(deleted.body.error.code).toBe('CATEGORY_CONFLICT');
    await request(app).patch('/api/v1/categories/' + INCOME).set(auth).send({ type: 'expense' }).expect(409);
    await request(app).patch('/api/v1/categories/' + INCOME).set(auth).send({ name: 'Renda' }).expect(200);
  });
  it('aplica filtros e paginação reais com busca literal', async () => {
    for (const amount of [10,20,30]) await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), amount, description: 'Compra 10%_ literal' }).expect(201);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), amount: 99, date: '2026-11-01' }).expect(201);
    const response = await request(app).get('/api/v1/transactions').set(auth)
      .query({ year: 2026, month: 10, category_id: INCOME, type: 'income', status: 'paid', search: '10%_', page: 2, limit: 2 }).expect(200);
    expect(response.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.summary).toMatchObject({ paid_income: '60.00', available_balance: '60.00', paid_income_count: 3 });
    expect(response.body.metadata).toEqual({ total_records: 4, available_periods: ['2026-11', '2026-10'] });
    const lastPage = await request(app).get('/api/v1/transactions').set(auth).query({ page: 999, limit: 2 }).expect(200);
    expect(lastPage.body.pagination).toEqual({ page: 2, limit: 2, total: 4, pages: 2 });
  });
  it('calcula indicadores antes da paginação e isola metadados de outros usuários', async () => {
    await request(app).post('/api/v1/transactions').set(auth).send(input()).expect(201);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), category_id: EXPENSE,
      type: 'expense', amount: 3.25, status: 'pending', date: '2026-10-01' }).expect(201);
    const result = await request(app).get('/api/v1/transactions').set(auth).query({ limit: 1 }).expect(200);
    expect(result.body.data).toHaveLength(1);
    expect(result.body.summary).toMatchObject({ paid_income: '12.34', paid_expense: '0.00',
      available_balance: '12.34', pending_expense: '3.25', pending_expense_count: 1, next_pending_date: '2026-10-01' });
    authUser = B;
    const other = await request(app).get('/api/v1/transactions').set(auth).expect(200);
    expect(other.body.metadata).toEqual({ total_records: 0, available_periods: [] });
    expect(other.body.summary).toMatchObject({ available_balance: '0.00', transaction_count: 0, next_pending_date: null });
  });
  it.each([
    ['income', 'paid'], ['income', 'pending'], ['expense', 'paid'], ['expense', 'pending'],
  ] as const)('lista apenas %s com status %s em um histórico misto', async (type, status) => {
    for (const [entryType, entryStatus] of [
      ['income', 'paid'], ['income', 'pending'], ['expense', 'paid'], ['expense', 'pending'],
    ] as const) {
      await request(app).post('/api/v1/transactions').set(auth).send({ ...input(),
        category_id: entryType === 'income' ? INCOME : EXPENSE, type: entryType, status: entryStatus }).expect(201);
    }
    const byType = await request(app).get('/api/v1/transactions').set(auth).query({ type }).expect(200);
    expect(byType.body.pagination.total).toBe(2);
    expect(byType.body.data.every((entry: { type: string }) => entry.type === type)).toBe(true);
    const byStatus = await request(app).get('/api/v1/transactions').set(auth).query({ type, status }).expect(200);
    expect(byStatus.body.pagination.total).toBe(1);
    expect(byStatus.body.data[0]).toMatchObject({ type, status });
  });
  it('isola dois usuários em GET, UPDATE, DELETE e relatórios via HTTP', async () => {
    const created = await request(app).post('/api/v1/transactions').set(auth).send(input()).expect(201);
    const id = created.body.data.id;
    authUser = B;
    const list = await request(app).get('/api/v1/transactions').set(auth).expect(200);
    expect(list.body.data).toEqual([]);
    await request(app).get('/api/v1/transactions/' + id).set(auth).expect(404);
    await request(app).patch('/api/v1/transactions/' + id).set(auth).send({ amount: 1 }).expect(404);
    await request(app).delete('/api/v1/transactions/' + id).set(auth).expect(404);
    const report = await request(app).get('/api/v1/dashboard').set(auth).expect(200);
    expect(report.body.data.available_balance).toBe('0.00');
  });
  it('totais e contagens refletem todas as linhas e excluem pendências do saldo', async () => {
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), amount: 100 }).expect(201);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), category_id: EXPENSE, type: 'expense', amount: 40 }).expect(201);
    await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), category_id: EXPENSE, type: 'expense', amount: 350, status: 'pending' }).expect(201);
    const report = await request(app).get('/api/v1/dashboard?year=2026&month=10').set(auth).expect(200);
    expect(report.body.data).toMatchObject({ available_balance: '60.00', pending_expense: '350.00', transaction_count: 3,
      paid_income_count: 1, paid_expense_count: 1, pending_expense_count: 1 });
    const monthly = await request(app).get('/api/v1/reports/monthly?year=2026').set(auth).expect(200);
    expect(monthly.body.data.months).toHaveLength(12);
    expect(monthly.body.data.months[9].net).toBe('60.00');
  });
  it('CORS rejeita origem não configurada e valida o corpo JSON', async () => {
    await request(app).get('/health').set('Origin', 'https://outro.example.com').expect(403);
    await request(app).options('/api/v1/transactions').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method','POST').expect(204);
    await request(app).post('/api/v1/auth/login').type('json').send('{invalid').expect(400);
    await request(app).post('/api/v1/auth/login').send({ password: 'x'.repeat(20000) }).expect(413);
  });
  it('reproduz os totais do protótipo sem incluir a despesa pendente', async () => {
    for (const [type, amount, status] of [
      ['income', 5000, 'paid'], ['income', 800, 'paid'],
      ['expense', 1450, 'paid'], ['expense', 420.30, 'paid'], ['expense', 159.20, 'paid'],
      ['expense', 200, 'paid'], ['expense', 150, 'paid'], ['expense', 350, 'pending'],
    ] as const) {
      await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), type, amount, status,
        category_id: type === 'income' ? INCOME : EXPENSE, date: '2024-10-24', description: 'Prototipo' }).expect(201);
    }
    const report = await request(app).get('/api/v1/dashboard?year=2024&month=10&search=Prototipo').set(auth).expect(200);
    expect(report.body.data).toMatchObject({ paid_income: '5800.00', paid_expense: '2379.50',
      available_balance: '3420.50', pending_expense: '350.00', transaction_count: 8,
      paid_income_count: 2, paid_expense_count: 5, pending_expense_count: 1 });
  });
  it('aplica intervalo inclusivo no histórico, dashboard e evolução mensal', async () => {
    for (const [date, type, amount, status] of [
      ['2023-12-31', 'expense', 999, 'paid'], ['2024-01-01', 'income', 1000, 'paid'],
      ['2024-01-15', 'expense', 0.10, 'paid'], ['2024-02-29', 'expense', 0.20, 'paid'],
      ['2024-03-31', 'expense', 9.70, 'paid'], ['2024-03-31', 'expense', 50, 'pending'],
      ['2024-04-01', 'income', 999, 'paid'],
    ] as const) {
      await request(app).post('/api/v1/transactions').set(auth).send({ ...input(), date, type, amount, status,
        category_id: type === 'income' ? INCOME : EXPENSE, description: 'Intervalo de teste' }).expect(201);
    }
    const query = { start_date: '2024-01-01', end_date: '2024-03-31' };
    const list = await request(app).get('/api/v1/transactions').set(auth).query(query).expect(200);
    expect(list.body.pagination.total).toBe(5);
    expect(list.body.data.every((row: { date: string }) => row.date >= query.start_date && row.date <= query.end_date)).toBe(true);
    const report = await request(app).get('/api/v1/dashboard').set(auth).query(query).expect(200);
    expect(report.body.data).toMatchObject({ paid_income: '1000.00', paid_expense: '10.00',
      pending_expense: '50.00', available_balance: '990.00', transaction_count: 5 });
    const monthly = await request(app).get('/api/v1/reports/monthly').set(auth).query(query).expect(200);
    expect(monthly.body.data.months).toHaveLength(3);
    expect(monthly.body.data.months[0]).toMatchObject({ year: 2024, month: 1, net: '999.90' });
    expect(monthly.body.data.months[1]).toMatchObject({ year: 2024, month: 2, net: '-0.20' });
    expect(monthly.body.data.months[2]).toMatchObject({ year: 2024, month: 3, net: '-9.70', pending_expense: '50.00' });
    const expenseQuery = { ...query, category_id: EXPENSE, type: 'expense', status: 'paid', search: 'intervalo' };
    const filtered = await request(app).get('/api/v1/reports/monthly').set(auth).query(expenseQuery).expect(200);
    expect(filtered.body.data.months.map((row: { paid_income: string }) => row.paid_income)).toEqual(['0.00', '0.00', '0.00']);
    const oneDay = await request(app).get('/api/v1/reports/monthly').set(auth)
      .query({ start_date: '2024-02-29', end_date: '2024-02-29' }).expect(200);
    expect(oneDay.body.data.months).toHaveLength(1);
    expect(oneDay.body.data.months[0].paid_expense).toBe('0.20');
    const crossYear = await request(app).get('/api/v1/reports/monthly').set(auth)
      .query({ start_date: '2023-12-31', end_date: '2024-01-01' }).expect(200);
    expect(crossYear.body.data.year).toBeNull();
    expect(crossYear.body.data.months.map((row: { year: number; month: number }) => [row.year, row.month])).toEqual([[2023, 12], [2024, 1]]);
    authUser = B;
    const other = await request(app).get('/api/v1/reports/monthly').set(auth).query(query).expect(200);
    expect(other.body.data.months.every((row: { net: string }) => row.net === '0.00')).toBe(true);
  });
  it('retorna meses vazios e rejeita filtros de período inválidos pela API', async () => {
    const response = await request(app).get('/api/v1/reports/monthly').set(auth)
      .query({ start_date: '2024-01-10', end_date: '2024-03-05' }).expect(200);
    expect(response.body.data.months).toHaveLength(3);
    expect(response.body.data.months.every((row: { net: string }) => row.net === '0.00')).toBe(true);
    await request(app).get('/api/v1/dashboard').set(auth).query({ start_date: '2024-01-01' }).expect(400);
    await request(app).get('/api/v1/transactions').set(auth)
      .query({ start_date: '2024-01-01', end_date: '2024-03-31', month: 3, year: 2024 }).expect(400);
    await request(app).get('/api/v1/reports/monthly').set(auth).expect(400);
  });
  it('limita tentativas de autenticação', async () => {
    for (let i=0;i<20;i++) await request(app).post('/api/v1/auth/login').send({}).expect(400);
    await request(app).post('/api/v1/auth/login').send({}).expect(429);
  });
});

describe('Configuração', () => {
  it('exige URL PostgreSQL e rejeita chave administrativa ou origem aberta', () => {
    const base = { DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/postgres',
      SUPABASE_URL:'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test' };
    expect(loadEnv(base).PORT).toBe(3001);
    expect(() => loadEnv({ ...base, DATABASE_URL: 'https://example.com' })).toThrow();
    expect(() => loadEnv({ ...base, SUPABASE_PUBLISHABLE_KEY:'sb_secret_test' })).toThrow();
    expect(() => loadEnv({ ...base, CORS_ORIGINS:'*' })).toThrow();
  });
});
