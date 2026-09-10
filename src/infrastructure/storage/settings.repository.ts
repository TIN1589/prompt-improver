/**
 * settings.repository.ts — Quản lý cấu hình Extension & Site Settings
 */

import { BaseStorage } from './base-storage';
import type { ExtensionSettings } from '../../shared/types/settings';
import { DEFAULT_SETTINGS } from '../../shared/types/settings';
import { isDomainMatch } from '../../shared/utils/domain-matcher';

export class SettingsRepository {
  /**
   * Khởi tạo cấu hình mặc định khi cài đặt lần đầu
   */
  static async initializeDefaults(): Promise<void> {
    const current = await BaseStorage.get(Object.keys(DEFAULT_SETTINGS));
    const toSet: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      if (current[key] === undefined) {
        toSet[key] = val;
      }
    }

    if (Object.keys(toSet).length > 0) {
      await BaseStorage.set(toSet);
    }
  }

  /**
   * Lấy toàn bộ cấu hình extension
   */
  static async getSettings(): Promise<ExtensionSettings> {
    const data = await BaseStorage.get<unknown>(null);
    return {
      backendUrl: (data.backendUrl as string) ?? DEFAULT_SETTINGS.backendUrl,
      enableCache: (data.enableCache as boolean) ?? DEFAULT_SETTINGS.enableCache,
      cacheTtlMs: (data.cacheTtlMs as number) ?? DEFAULT_SETTINGS.cacheTtlMs,
      maxCacheEntries: (data.maxCacheEntries as number) ?? DEFAULT_SETTINGS.maxCacheEntries,
      defaultPersona: (data.defaultPersona as ExtensionSettings['defaultPersona']) ?? DEFAULT_SETTINGS.defaultPersona,
      siteSettings: (data.siteSettings as ExtensionSettings['siteSettings']) ?? DEFAULT_SETTINGS.siteSettings,
      enableContextMenu: (data.enableContextMenu as boolean) ?? DEFAULT_SETTINGS.enableContextMenu,
      encryptedApiKey: data.encryptedApiKey as string | undefined,
      defaultMode: data.defaultMode as string | undefined,
      customTemplates: data.customTemplates as ExtensionSettings['customTemplates'],
    };
  }

  /**
   * Lưu một phần hoặc toàn bộ cấu hình
   */
  static async updateSettings(partial: Partial<ExtensionSettings>): Promise<void> {
    await BaseStorage.set(partial);
  }

  /**
   * Kiểm tra xem extension có đang được bật cho domain hiện tại hay không
   */
  static async isSiteEnabled(hostname: string): Promise<boolean> {
    const settings = await this.getSettings();
    const sites = settings.siteSettings || DEFAULT_SETTINGS.siteSettings;

    const matchedKey = Object.keys(sites).find((domain) => isDomainMatch(hostname, domain));
    return matchedKey ? sites[matchedKey] !== false : true;
  }
}
