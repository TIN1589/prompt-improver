/**
 * context-menu.handler.ts — Xử lý Menu Chuột Phải (Context Menu)
 */

import { SettingsRepository } from '../../infrastructure/storage/settings.repository';

const MENU_ID = 'prompt-improver-selection';

export class ContextMenuHandler {
  /**
   * Cập nhật trạng thái hiển thị của Context Menu dựa trên cài đặt
   */
  static async update(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

    const settings = await SettingsRepository.getSettings();
    const enabled = settings.enableContextMenu !== false;

    chrome.contextMenus.removeAll(() => {
      if (enabled) {
        chrome.contextMenus.create({
          id: MENU_ID,
          title: '✨ Cải thiện đoạn văn bản với Prompt Improver',
          contexts: ['selection'],
        });
      }
    });
  }

  /**
   * Xử lý sự kiện click trên context menu
   */
  static handleClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): void {
    if (!tab?.id || !info.selectionText) return;
    if (info.menuItemId === MENU_ID) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TAB:TRIGGER_IMPROVE',
        payload: {
          text: info.selectionText.trim(),
        },
      }).catch(() => {
        // Tab có thể chưa inject content script
      });
    }
  }

  /**
   * Lắng nghe thay đổi cài đặt để cập nhật menu
   */
  static watchChanges(): void {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.enableContextMenu) {
        this.update();
      }
    });
  }
}
