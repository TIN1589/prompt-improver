/**
 * history.repository.ts — Quản lý lịch sử cải thiện Prompt (Tối đa 50 mục)
 */

import { BaseStorage } from './base-storage';
import type { PromptHistoryItem } from '../../core/models/prompt.entity';

export class HistoryRepository {
  private static readonly STORAGE_KEY = 'cco_history';
  private static readonly MAX_HISTORY = 50;

  static async getHistory(): Promise<PromptHistoryItem[]> {
    const data = await BaseStorage.get<PromptHistoryItem[]>(this.STORAGE_KEY);
    const list = data[this.STORAGE_KEY];
    return Array.isArray(list) ? list : [];
  }

  static async saveItem(item: PromptHistoryItem): Promise<void> {
    const history = await this.getHistory();
    history.unshift(item);

    const trimmed = history.slice(0, this.MAX_HISTORY);
    await BaseStorage.set({ [this.STORAGE_KEY]: trimmed });
  }

  static async clear(): Promise<void> {
    await BaseStorage.remove(this.STORAGE_KEY);
  }
}
