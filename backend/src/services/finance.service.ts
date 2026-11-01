import type { TransactionInput } from '../domain/schemas.js';
import { AppError } from '../lib/errors.js';
import type { FinanceRepository } from '../repositories/finance.repository.js';

export class FinanceService {
  constructor(private repository: FinanceRepository) {}

  private async validateCategory(id: string, type: string) {
    const category = await this.repository.category(id).catch((error: unknown) => {
      if (error instanceof AppError && error.status === 404) {
        throw new AppError(400, 'INVALID_CATEGORY', 'Informe uma categoria sua e do mesmo tipo do lançamento.');
      }
      throw error;
    });
    if (category.type !== type) throw new AppError(400, 'INVALID_CATEGORY', 'A categoria deve ter o mesmo tipo do lançamento.');
  }

  async createTransaction(input: TransactionInput) {
    await this.validateCategory(input.category_id, input.type);
    return this.repository.createTransaction(input);
  }

  async updateTransaction(id: string, input: Partial<TransactionInput>) {
    const current = await this.repository.transaction(id);
    await this.validateCategory(input.category_id ?? current.category_id, input.type ?? current.type);
    return this.repository.updateTransaction(id, input);
  }
}
