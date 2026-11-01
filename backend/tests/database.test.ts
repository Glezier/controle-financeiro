import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const INCOME = '33333333-3333-4333-8333-333333333333';
const EXPENSE = '44444444-4444-4444-8444-444444444444';
const FOREIGN = '55555555-5555-4555-8555-555555555555';
let db: PGlite;

async function asUser(user = A) {
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${user}';`);
}
async function insert(category: string, type: string, amount: number, status = 'paid', date = '2026-10-29', description = 'Teste') {
  return db.query(`insert into public.transactions(user_id,category_id,type,amount,date,description,status)
    values ($1,$2,$3,$4,$5,$6,$7) returning id`, [A, category, type, amount, date, description, status]);
}
interface Report {
  paid_income: string; paid_expense: string; pending_income: string; pending_expense: string;
  available_balance: string; transaction_count: number;
  expenses_by_category: { category_id: string; paid: string; pending: string }[];
}
async function report(args: unknown[] = [null, null, null, null, null, null]) {
  return (await db.query<{ report: Report }>('select public.financial_report($1,$2,$3,$4,$5,$6) as report', args)).rows[0]!.report;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${A}'), ('${B}');`);
  for (const name of ['20261029000100_init_finance', '20261030000100_api_hardening_reports', '20261101000100_configurable_period', '20261101000200_default_categories_icons']) {
    const migration = await readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8');
    await db.exec(migration);
  }
});
beforeEach(async () => {
  await db.exec(`reset role; truncate public.transactions, public.categories;
    insert into public.categories(id,user_id,name,type) values
    ('${INCOME}','${A}','Salário','income'), ('${EXPENSE}','${A}','Alimentação','expense'),
    ('${FOREIGN}','${B}','Privada','expense');`);
  await asUser();
});
afterAll(async () => { await db?.close(); });

describe('Migração PostgreSQL, RLS e constraints', () => {
  it('proprietário só lê as próprias categorias', async () => {
    const result = await db.query('select id from public.categories');
    expect(result.rows).toHaveLength(2);
    await asUser(B);
    expect((await db.query('select id from public.categories')).rows).toEqual([{ id: FOREIGN }]);
  });
  it('RLS impede inserir categoria como outro usuário', async () => {
    await expect(db.query('insert into public.categories(user_id,name,type) values ($1,$2,$3)', [B, 'Invasão', 'income']))
      .rejects.toMatchObject({ code: '42501' });
  });
  it('não atualiza nem exclui categorias alheias', async () => {
    expect((await db.query('update public.categories set name=$1 where id=$2 returning id', ['Invadida', FOREIGN])).rows).toEqual([]);
    expect((await db.query('delete from public.categories where id=$1 returning id', [FOREIGN])).rows).toEqual([]);
  });
  it('bloqueia duplicata de nome ignorando caixa', async () => {
    await expect(db.query('insert into public.categories(user_id,name,type) values ($1,$2,$3)', [A, 'SALÁRIO', 'income']))
      .rejects.toMatchObject({ code: '23505' });
    await db.query('insert into public.categories(user_id,name,type) values ($1,$2,$3)', [A, 'Salário', 'expense']);
  });
  it('rejeita tipo, status, data e valores inválidos no banco', async () => {
    await expect(insert(EXPENSE, 'expense', 0)).rejects.toMatchObject({ code: '23514' });
    await expect(insert(EXPENSE, 'expense', -1)).rejects.toMatchObject({ code: '23514' });
    await expect(db.query(`insert into public.transactions(user_id,category_id,type,amount,date,description,status)
      values ($1,$2,'expense','NaN'::numeric,'2026-10-29','Inválido','paid')`, [A, EXPENSE]))
      .rejects.toMatchObject({ code: '23514' });
    await expect(insert(EXPENSE, 'expense', 1, 'invalid')).rejects.toMatchObject({ code: '22P02' });
    await expect(insert(EXPENSE, 'transfer', 1)).rejects.toBeDefined();
    await expect(insert(EXPENSE, 'expense', 1, 'paid', '2026-02-30')).rejects.toMatchObject({ code: '22008' });
    await expect(insert(EXPENSE, 'expense', 1, 'paid', 'infinity')).rejects.toMatchObject({ code: '23514' });
  });
  it('FK composta rejeita categoria de outro usuário e tipo incompatível', async () => {
    await expect(insert(FOREIGN, 'expense', 10)).rejects.toMatchObject({ code: '23503' });
    await expect(insert(INCOME, 'expense', 10)).rejects.toMatchObject({ code: '23503' });
  });
  it('RLS impede criar transação para outro proprietário', async () => {
    await expect(db.query(`insert into public.transactions(user_id,category_id,type,amount,date,description,status)
      values ($1,$2,'expense',10,'2026-10-29','Invasão','paid')`, [B, FOREIGN]))
      .rejects.toMatchObject({ code: '42501' });
  });
  it('bloqueia exclusão e mudança de tipo de categoria em uso', async () => {
    await insert(EXPENSE, 'expense', 10);
    await expect(db.query('delete from public.categories where id=$1', [EXPENSE])).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
    await expect(db.query("update public.categories set type='income' where id=$1", [EXPENSE])).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
  });
  it('revalida vínculo também no UPDATE da transação', async () => {
    await insert(EXPENSE, 'expense', 10);
    await expect(db.query('update public.transactions set category_id=$1', [FOREIGN])).rejects.toMatchObject({ code: '23503' });
    await expect(db.query("update public.transactions set type='income'")).rejects.toMatchObject({ code: '23503' });
  });
  it('CRUD respeita isolamento das transações', async () => {
    await insert(EXPENSE, 'expense', 10);
    await asUser(B);
    expect((await db.query('select * from public.transactions')).rows).toEqual([]);
    expect((await db.query('update public.transactions set amount=1 returning id')).rows).toEqual([]);
    expect((await db.query('delete from public.transactions returning id')).rows).toEqual([]);
    await asUser();
    await db.exec("update public.transactions set amount=20, status='pending'");
    expect((await report()).pending_expense).toBe('20.00');
    await db.exec('delete from public.transactions');
    expect((await report()).transaction_count).toBe(0);
    await db.query('delete from public.categories where id=$1', [EXPENSE]);
  });
  it('usuário não pode mudar proprietário, id ou created_at', async () => {
    await insert(EXPENSE, 'expense', 10);
    await expect(db.query('update public.transactions set user_id=$1', [B])).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec('update public.categories set created_at=now()')).rejects.toMatchObject({ code: '42501' });
  });
  it('anon não consegue ler tabelas ou executar relatórios', async () => {
    await db.exec('reset role; set role anon');
    await expect(db.exec('select * from public.categories')).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec('select * from public.transactions')).rejects.toMatchObject({ code: '42501' });
    await expect(report()).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec('select public.monthly_evolution(2026)')).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec("select public.monthly_evolution_range('2024-01-01','2024-04-01')")).rejects.toMatchObject({ code: '42501' });
  });
});

describe('Saldo e relatórios calculados no PostgreSQL', () => {
  it('saldo considera somente efetivadas, com precisão decimal', async () => {
    await insert(INCOME, 'income', 1000);
    await insert(EXPENSE, 'expense', 100.10);
    await insert(EXPENSE, 'expense', 0.20);
    await insert(INCOME, 'income', 500, 'pending');
    await insert(EXPENSE, 'expense', 40, 'pending');
    const result = await report();
    expect(result).toMatchObject({ paid_income: '1000.00', paid_expense: '100.30',
      available_balance: '899.70', pending_income: '500.00', pending_expense: '40.00', transaction_count: 5 });
    expect(result.expenses_by_category[0]).toMatchObject({ paid: '100.30', pending: '40.00' });
  });
  it('relatórios não vazam dados de outro usuário', async () => {
    await insert(INCOME, 'income', 999);
    await asUser(B);
    expect(await report()).toMatchObject({ available_balance: '0.00', transaction_count: 0 });
  });
  it('aplica limites de mês, categoria, tipo, status e busca literal', async () => {
    await insert(EXPENSE, 'expense', 10, 'paid', '2026-10-01', 'Compra 10%_ especial');
    await insert(EXPENSE, 'expense', 20, 'pending', '2026-10-31', 'Outra compra');
    await insert(EXPENSE, 'expense', 30, 'paid', '2026-11-01', 'Compra 10%_ especial');
    await insert(INCOME, 'income', 100, 'paid', '2026-10-29', 'Salário');
    expect((await report(['2026-10-01', '2026-11-01', null, null, null, null])).transaction_count).toBe(3);
    expect(await report(['2026-10-01', '2026-11-01', EXPENSE, 'expense', 'paid', '10%_']))
      .toMatchObject({ paid_expense: '10.00', transaction_count: 1 });
    expect((await report([null, null, null, null, 'pending', null])).available_balance).toBe('0.00');
  });
  it('retorna os 12 meses e exclui anos vizinhos', async () => {
    await insert(INCOME, 'income', 123.45, 'paid', '2026-12-31');
    await insert(INCOME, 'income', 500, 'paid', '2027-01-01');
    await insert(EXPENSE, 'expense', 30, 'pending', '2026-12-01');
    const { rows } = await db.query<{ report: { months: Record<string, unknown>[] } }>('select public.monthly_evolution(2026) as report');
    const months = rows[0]!.report.months;
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ month: 1, net: '0.00' });
    expect(months[11]).toMatchObject({ month: 12, net: '123.45', paid_income: '123.45', pending_expense: '30.00' });
    await expect(db.exec('select public.monthly_evolution(99999)')).rejects.toMatchObject({ code: '22003' });
  });
});
