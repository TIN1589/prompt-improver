/**
 * lifecycle.handler.ts — Xử lý các vòng đời onInstalled & onStartup của Service Worker
 */

import { SettingsRepository } from '../../infrastructure/storage/settings.repository';
import { ContextMenuHandler } from './context-menu.handler';

export class LifecycleHandler {
  static async onInstalled(): Promise<void> {
    await SettingsRepository.initializeDefaults();
    await ContextMenuHandler.update();
  }

  static async onStartup(): Promise<void> {
    await ContextMenuHandler.update();
  }
}
