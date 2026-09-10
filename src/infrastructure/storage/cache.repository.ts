/**
 * cache.repository.ts — Quản lý SHA-256 Prompt Cache với LRU Auto-Eviction
 */

import { BaseStorage } from './base-storage';
import type { PromptCacheEntry } from '../../core/models/prompt.entity';

export class CacheRepository {
  private static readonly PREFIX = 'cache_';

  /**
   * Lấy kết quả từ Cache nếu còn hạn sử dụng (TTL)
   */
  static async get<T>(hash: string, ttlMs: number): Promise<T | null> {
    const key = `${this.PREFIX}${hash}`;
    const result = await BaseStorage.get<PromptCacheEntry<T>>(key);
    const entry = result[key];

    if (!entry || !entry.timestamp) {
      return null;
    }

    if (Date.now() - entry.timestamp > ttlMs) {
      // Hết hạn TTL, dọn dẹp key
      await BaseStorage.remove(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Lưu kết quả vào Cache kèm cơ chế tự động giải phóng dung lượng LRU
   */
  static async set<T>(hash: string, data: T, maxEntries: number = 200): Promise<void> {
    const key = `${this.PREFIX}${hash}`;
    const allData = await BaseStorage.get<PromptCacheEntry<unknown>>(null);
    const cacheKeys = Object.keys(allData).filter((k) => k.startsWith(this.PREFIX));

    // Nếu đạt ngưỡng tối đa, loại bỏ 30 entry cũ nhất
    if (cacheKeys.length >= maxEntries) {
      const sortedKeys = cacheKeys.sort((a, b) => {
        const timeA = allData[a]?.timestamp || 0;
        const timeB = allData[b]?.timestamp || 0;
        return timeA - timeB;
      });

      const keysToRemove = sortedKeys.slice(0, 30);
      await BaseStorage.remove(keysToRemove);
    }

    await BaseStorage.set({
      [key]: {
        timestamp: Date.now(),
        data,
      },
    });
  }

  /**
   * Xóa toàn bộ Cache
   */
  static async clear(): Promise<number> {
    const allData = await BaseStorage.get(null);
    const cacheKeys = Object.keys(allData).filter((k) => k.startsWith(this.PREFIX));

    if (cacheKeys.length > 0) {
      await BaseStorage.remove(cacheKeys);
    }

    return cacheKeys.length;
  }

  /**
   * Đếm số lượng entry cache hiện có
   */
  static async count(): Promise<number> {
    const allData = await BaseStorage.get(null);
    return Object.keys(allData).filter((k) => k.startsWith(this.PREFIX)).length;
  }
}
