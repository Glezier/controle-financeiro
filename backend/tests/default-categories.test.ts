import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let db: PGlite;
const A = randomUUID();
const B = randomUUID();
const salary = randomUUID();

async function asUser(id: string) {
  await db.exec('reset role; set role authenticated;');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  await db.query('insert into auth.users(id) values ($1),($2)', [A, B]);
  for (const name of ['20261029000100_init_finance', '20261030000100_api_hardening_reports', '20261101000100_configurable_period']) {
    await db.exec(await readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
  }
  await db.query(`insert into public.categories(id,user_id,name,type) values ($1,$2,'SALÁRIO','income')`, [salary, A]);
  await db.query(`insert into public.categories(user_id,name,type) values ($1,'Minha categoria','expense')`, [A]);
  await db.query(`insert into public.transactions(user_id,category_id,type,amount,date,description,status)
    values ($1,$2,'income',100,'2026-11-01','Histórico existente','paid')`, [A, salary]);
  await db.exec(await readFile(new URL('../prisma/migrations/20261101000200_default_categories_icons/migration.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => { await db.exec('reset role;'); });
afterAll(async () => { await db?.close(); });

describe('Categorias iniciais e ícones no PostgreSQL', () => {
  it('complementa usuários existentes sem duplicar nomes, trocar IDs ou perder lançamentos', async () => {
    const existing = await db.query<{ id: string; icon: string }>('select id,icon from public.categories where user_id=$1 and type=$2', [A, 'income']);
    expect(existing.rows).toEqual([{ id: salary, icon: 'account_balance_wallet' }]);
    const count = await db.query<{ count: number }>('select count(*)::int as count from public.categories where user_id=$1', [A]);
    expect(count.rows[0]?.count).toBe(7);
    const transaction = await db.query<{ category_id: string; amount: string }>('select category_id,amount::text as amount from public.transactions where user_id=$1', [A]);
    expect(transaction.rows).toEqual([{ category_id: salary, amount: '100.00' }]);
  });
  it('cria as seis categorias para novo usuário com IDs próprios e RLS aplicado', async () => {
    const id = randomUUID();
    await db.query('insert into auth.users(id) values ($1)', [id]);
    await asUser(id);
    const rows = (await db.query<{ user_id: string; name: string; icon: string }>('select user_id,name,icon from public.categories order by name')).rows;
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.user_id === id)).toBe(true);
    expect(rows.find((row) => row.name === 'Alimentação')?.icon).toBe('restaurant');
    expect(rows.find((row) => row.name === 'Salário')?.icon).toBe('account_balance_wallet');
  });
  it('permite renomear e excluir categorias iniciais sem recriá-las na consulta', async () => {
    const id = randomUUID();
    await db.query('insert into auth.users(id) values ($1)', [id]);
    await asUser(id);
    await db.exec("update public.categories set name='Minha casa', icon='home' where name='Moradia'");
    await db.exec("delete from public.categories where name='Lazer'");
    const rows = (await db.query<{ name: string }>('select name from public.categories')).rows;
    expect(rows).toHaveLength(5);
    expect(rows.some((row) => row.name === 'Minha casa')).toBe(true);
    expect(rows.some((row) => row.name === 'Moradia' || row.name === 'Lazer')).toBe(false);
  });
  it('rejeita identificador de ícone inválido também no banco', async () => {
    await asUser(B);
    await expect(db.query("insert into public.categories(user_id,name,type,icon) values ($1,'Inválida','expense','inexistente')", [B]))
      .rejects.toMatchObject({ code: '23514' });
  });
  it('não permite ao usuário executar as funções internas de provisionamento', async () => {
    await asUser(B);
    await expect(db.exec('select * from public.finance_category_templates()')).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec('select public.seed_finance_categories_for_new_user()')).rejects.toMatchObject({ code: '42501' });
  });
});
