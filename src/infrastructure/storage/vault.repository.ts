/**
 * vault.repository.ts — Quản lý lưu trữ bảo mật API Key bằng Web Crypto AES-GCM
 */

import { BaseStorage } from './base-storage';
import { encryptData, decryptData } from '../../shared/utils/crypto';

export class VaultRepository {
  private static readonly KEY = 'encryptedApiKey';

  static async hasApiKey(): Promise<boolean> {
    const data = await BaseStorage.get<string>(this.KEY);
    return Boolean(data[this.KEY]);
  }

  static async saveApiKey(apiKey: string, passphrase: string): Promise<void> {
    const encrypted = await encryptData(apiKey, passphrase);
    await BaseStorage.set({ [this.KEY]: encrypted });
  }

  static async getApiKey(passphrase: string): Promise<string> {
    const data = await BaseStorage.get<string>(this.KEY);
    const encrypted = data[this.KEY];
    if (!encrypted) {
      throw new Error('Chưa lưu API Key trong extension.');
    }
    return decryptData(encrypted, passphrase);
  }

  static async removeApiKey(): Promise<void> {
    await BaseStorage.remove(this.KEY);
  }
}
