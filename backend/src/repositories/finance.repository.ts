import { Prisma, type Category, type Transaction } from '../generated/prisma/client.js';
import type { CategoryInput, TransactionInput, ListFilters, Filters } from '../domain/schemas.js';
import { escapeLike, period } from '../domain/schemas.js';
import type { UserDatabase } from '../lib/database.js';
import { AppError } from '../lib/errors.js';

const categoryJson = (row: Category) => ({ id: row.id, user_id: row.userId, name: row.name,
  type: row.type, icon: row.icon, created_at: row.createdAt.toISOString() });
const transactionJson = (row: Transaction) => ({ id: row.id, user_id: row.userId, category_id: row.categoryId,
  type: row.type, amount: row.amount.toNumber(), date: row.date.toISOString().slice(0, 10),
  description: row.description, status: row.status, created_at: row.createdAt.toISOString() });

function transactionData(input: Partial<TransactionInput>) {
  const { category_id, date, amount, ...rest } = input;
  return { ...rest, ...(category_id ? { categoryId: category_id } : {}),
    ...(date ? { date: new Date(date + 'T00:00:00.000Z') } : {}),
    ...(amount !== undefined ? { amount: new Prisma.Decimal(String(amount)) } : {}) };
}

export class FinanceRepository {
  constructor(private database: UserDatabase, private userId: string) {}

  async categories(type?: 'income' | 'expense') {
    return this.database.withUser(this.userId, async (tx) => {
      const rows = await tx.category.findMany({ where: { userId: this.userId, ...(type ? { type } : {}) },
        orderBy: [{ name: 'asc' }, { id: 'asc' }], include: { _count: { select: { transactions: true } } } });
      return rows.map((row) => ({ ...categoryJson(row), transaction_count: row._count.transactions }));
    });
  }

  async category(id: string) {
    return this.database.withUser(this.userId, async (tx) => {
      const row = await tx.category.findFirst({ where: { id, userId: this.userId } });
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Categoria não encontrada.');
      return categoryJson(row);
    });
  }

  async createCategory(input: CategoryInput) {
    return this.database.withUser(this.userId, async (tx) =>
      categoryJson(await tx.category.create({ data: { ...input, userId: this.userId } })));
  }

  async updateCategory(id: string, input: Partial<CategoryInput>) {
    return this.database.withUser(this.userId, async (tx) => {
      const result = await tx.category.updateMany({ where: { id, userId: this.userId }, data: input });
      if (!result.count) throw new AppError(404, 'NOT_FOUND', 'Categoria não encontrada.');
      return categoryJson(await tx.category.findUniqueOrThrow({ where: { id } }));
    });
  }

  async deleteCategory(id: string) {
    await this.database.withUser(this.userId, async (tx) => {
      const result = await tx.category.deleteMany({ where: { id, userId: this.userId } });
      if (!result.count) throw new AppError(404, 'NOT_FOUND', 'Categoria não encontrada.');
    });
  }

  async transactions(filters: ListFilters) {
    return this.database.withUser(this.userId, async (tx) => {
      const { from, until } = period(filters);
      const where: Prisma.TransactionWhereInput = { userId: this.userId,
        ...(from && until ? { date: { gte: new Date(from + 'T00:00:00Z'), lt: new Date(until + 'T00:00:00Z') } } : {}),
        ...(filters.type ? { type: filters.type } : {}), ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category_id ? { categoryId: filters.category_id } : {}),
        ...(filters.search ? { description: { contains: escapeLike(filters.search), mode: 'insensitive' } } : {}) };
      const total = await tx.transaction.count({ where });
      const pages = Math.ceil(total / filters.limit);
      const page = Math.min(filters.page, Math.max(1, pages));
      const rows = await tx.transaction.findMany({ where, skip: (page - 1) * filters.limit, take: filters.limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] });
      const reports = await tx.$queryRaw<{ report: Prisma.JsonValue }[]>`SELECT public.financial_report(
        ${from}::date, ${until}::date, ${filters.category_id ?? null}::uuid, ${filters.type ?? null}::text,
        ${filters.status ?? null}::text, ${filters.search || null}::text) AS report`;
      const metadata = await tx.$queryRaw<{ total_records: number; available_periods: string[] }[]>`
        SELECT count(*)::integer AS total_records,
          coalesce(array_agg(DISTINCT to_char(date, 'YYYY-MM') ORDER BY to_char(date, 'YYYY-MM') DESC), '{}'::text[]) AS available_periods
        FROM public.transactions WHERE user_id = ${this.userId}::uuid`;
      const nextPending = filters.status === 'paid' ? null : await tx.transaction.findFirst({
        where: { ...where, status: 'pending' },
        orderBy: [{ date: 'asc' }, { id: 'asc' }], select: { date: true },
      });
      return { data: rows.map(transactionJson), pagination: { page, limit: filters.limit, total, pages },
        summary: { ...(reports[0]!.report as Prisma.JsonObject),
          next_pending_date: filters.status === 'paid' ? null : nextPending?.date.toISOString().slice(0, 10) ?? null },
        metadata: metadata[0]! };

    });
  }

  async transaction(id: string) {
    return this.database.withUser(this.userId, async (tx) => {
      const row = await tx.transaction.findFirst({ where: { id, userId: this.userId } });
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Lançamento não encontrado.');
      return transactionJson(row);
    });
  }

  async createTransaction(input: TransactionInput) {
    return this.database.withUser(this.userId, async (tx) => transactionJson(await tx.transaction.create({
      data: { userId: this.userId, categoryId: input.category_id, type: input.type,
        amount: new Prisma.Decimal(String(input.amount)), date: new Date(input.date + 'T00:00:00Z'),
        description: input.description, status: input.status } })));
  }

  async updateTransaction(id: string, input: Partial<TransactionInput>) {
    return this.database.withUser(this.userId, async (tx) => {
      const result = await tx.transaction.updateMany({ where: { id, userId: this.userId }, data: transactionData(input) });
      if (!result.count) throw new AppError(404, 'NOT_FOUND', 'Lançamento não encontrado.');
      return transactionJson(await tx.transaction.findUniqueOrThrow({ where: { id } }));
    });
  }

  async deleteTransaction(id: string) {
    await this.database.withUser(this.userId, async (tx) => {
      const result = await tx.transaction.deleteMany({ where: { id, userId: this.userId } });
      if (!result.count) throw new AppError(404, 'NOT_FOUND', 'Lançamento não encontrado.');
    });
  }

  async report(filters: Filters) {
    const { from, until } = period(filters);
    return this.database.withUser(this.userId, async (tx) => {
      const rows = await tx.$queryRaw<{ report: Prisma.JsonValue }[]>`SELECT public.financial_report(
        ${from}::date, ${until}::date, ${filters.category_id ?? null}::uuid, ${filters.type ?? null}::text,
        ${filters.status ?? null}::text, ${filters.search || null}::text) AS report`;
      return rows[0]!.report;
    });
  }

  async monthly(filters: Filters) {
    const { from, until } = period(filters);
    return this.database.withUser(this.userId, async (tx) => {
      const rows = await tx.$queryRaw<{ report: Prisma.JsonValue }[]>`SELECT public.monthly_evolution_range(
        ${from}::date, ${until}::date, ${filters.category_id ?? null}::uuid, ${filters.type ?? null}::text,
        ${filters.status ?? null}::text, ${filters.search || null}::text) AS report`;
      return rows[0]!.report;
    });
  }
}
