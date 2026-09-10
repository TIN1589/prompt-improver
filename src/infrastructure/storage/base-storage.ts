/**
 * base-storage.ts — Trừu tượng hóa Chrome Storage API
 */

export class BaseStorage {
  static isAvailable(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  static async get<T = unknown>(keys: string | string[] | null): Promise<Record<string, T>> {
    if (!this.isAvailable()) {
      return {};
    }
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (items) => {
        resolve((items || {}) as Record<string, T>);
      });
    });
  }

  static async set(items: Record<string, unknown>): Promise<void> {
    if (!this.isAvailable()) return;
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    });
  }

  static async remove(keys: string | string[]): Promise<void> {
    if (!this.isAvailable()) return;
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    });
  }

  static async clear(): Promise<void> {
    if (!this.isAvailable()) return;
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
}
