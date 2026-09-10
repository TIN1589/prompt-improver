/**
 * alarms.handler.ts — Xử lý các tác vụ nền định kỳ (chrome.alarms)
 */

import { CacheRepository } from '../../infrastructure/storage/cache.repository';
import { SettingsRepository } from '../../infrastructure/storage/settings.repository';

const CACHE_CLEANUP_ALARM = 'prompt_improver_cache_cleanup';

export class AlarmsHandler {
  static setup(): void {
    if (typeof chrome === 'undefined' || !chrome.alarms) return;

    try {
      // Lên lịch kiểm tra dọn cache mỗi 360 phút (6 giờ)
      chrome.alarms.create(CACHE_CLEANUP_ALARM, {
        periodInMinutes: 360,
      });

      chrome.alarms.onAlarm.addListener((alarm) => {
        this.handleAlarm(alarm);
      });
    } catch (e) {
      console.warn('[AlarmsHandler] Không thể khởi tạo alarms:', e);
    }
  }

  static async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    if (alarm.name === CACHE_CLEANUP_ALARM) {
      const settings = await SettingsRepository.getSettings();
      // Quét và dọn các cache entry quá TTL
      const count = await CacheRepository.count();
      if (count > settings.maxCacheEntries) {
        await CacheRepository.clear();
      }
    }
  }
}
