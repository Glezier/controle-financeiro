import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { testDatabase, A, B, INCOME } from './helpers/database.js';
import { FinanceRepository } from '../src/repositories/finance.repository.js';

let env: Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async () => { env = await testDatabase(); });
beforeEach(async () => { await env.reset(); });
afterAll(async () => { await env?.close(); });

describe('Prisma real: RLS e contexto local da conexão', () => {
  it('o banco aplica RLS mesmo sem WHERE do usuário', async () => {
    const a = await env.database.withUser(A, (tx) => tx.category.findMany());
    const b = await env.database.withUser(B, (tx) => tx.category.findMany());
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(1);
    expect(a.every((row) => row.userId === A)).toBe(true);
    expect(b.every((row) => row.userId === B)).toBe(true);
  });
  it('não deixa o contexto do usuário A vazar para B ao reutilizar o pool', async () => {
    for (const id of [A, B, A, B]) {
      const result = await env.database.withUser(id, (tx) => tx.$queryRaw<{ uid: string; role: string }[]>`
        SELECT auth.uid() AS uid, current_user AS role`);
      expect(result).toEqual([{ uid: id, role: 'authenticated' }]);
    }
    const context = await env.db.query<{ uid: string | null }>('select auth.uid() as uid');
    expect(context.rows[0]?.uid).toBeNull();
  });
  it('rollback desfaz escrita e restaura contexto antes da próxima operação', async () => {
    await expect(env.database.withUser(A, async (tx) => {
      await tx.category.create({ data: { userId: A, type: 'income', name: 'Desfazer' } });
      throw new Error('Falha controlada');
    })).rejects.toThrow();
    expect(await new FinanceRepository(env.database, A).categories()).toHaveLength(2);
    expect(await new FinanceRepository(env.database, B).categories()).toHaveLength(1);
  });
  it('RLS bloqueia INSERT de outro dono mesmo sem validação do repository', async () => {
    await expect(env.database.withUser(A, (tx) => tx.category.create({
      data: { userId: B, name: 'Invasão', type: 'income' },
    }))).rejects.toMatchObject({ status: 403 });
  });
  it('contagem por categoria inclui todas as transações sem paginar nem vazar dados', async () => {
    await env.db.query(`insert into public.transactions(user_id,category_id,type,amount,date,description,status)
      values ($1,$2,'income',10,'2026-10-30','Receita','paid')`, [A, INCOME]);
    const result = await new FinanceRepository(env.database, A).categories();
    expect(result.find((row) => row.id === INCOME)?.transaction_count).toBe(1);
  });
});
