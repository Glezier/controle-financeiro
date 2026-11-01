import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createDatabase } from '../../src/lib/database.js';

export const A = '11111111-1111-4111-8111-111111111111';
export const B = '22222222-2222-4222-8222-222222222222';
export const INCOME = '33333333-3333-4333-8333-333333333333';
export const EXPENSE = '44444444-4444-4444-8444-444444444444';
export const FOREIGN = '55555555-5555-4555-8555-555555555555';

export async function testDatabase() {
  const db = await PGlite.create();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${A}'), ('${B}');`);
  for (const name of ['20261029000100_init_finance', '20261030000100_api_hardening_reports', '20261101000100_configurable_period', '20261101000200_default_categories_icons']) {
    await db.exec(await readFile(new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
  }
  const reserve = createServer();
  reserve.listen(0, '127.0.0.1');
  await once(reserve, 'listening');
  const address = reserve.address();
  if (!address || typeof address === 'string') throw new Error('Porta de teste indisponível.');
  const port = address.port;
  await new Promise<void>((resolve) => reserve.close(() => resolve()));
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
  await server.start();
  const database = createDatabase(`postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`, 1);
  return {
    db, database,
    async reset() {
      await db.exec(`reset role; truncate public.transactions, public.categories;
        insert into public.categories(id,user_id,name,type) values
        ('${INCOME}','${A}','Salário','income'), ('${EXPENSE}','${A}','Alimentação','expense'),
        ('${FOREIGN}','${B}','Privada','expense');`);
    },
    async close() { await database.close(); await server.stop(); await db.close(); },
  };
}
