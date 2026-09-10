/**
 * index.ts — Background Service Worker Entry Point (Manifest V3)
 * Điều phối viên sự kiện (Stateless Event Coordinator)
 */

import { LifecycleHandler } from './handlers/lifecycle.handler';
import { ContextMenuHandler } from './handlers/context-menu.handler';
import { AlarmsHandler } from './handlers/alarms.handler';
import { MessageRouter } from './message-router';

// 1. Khởi động Bộ điều phối Message tập trung TRƯỚC TIÊN (Quan trọng nhất!)
MessageRouter.init();

// 2. Đăng ký vòng đời Extension
if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    LifecycleHandler.onInstalled();
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    LifecycleHandler.onStartup();
  });
}

// 3. Thiết lập Menu ngữ cảnh (Context Menu) an toàn
try {
  ContextMenuHandler.watchChanges();
  if (typeof chrome !== 'undefined' && chrome.contextMenus?.onClicked) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      ContextMenuHandler.handleClick(info, tab);
    });
  }
} catch (e) {
  console.warn('[ContextMenu] Khởi tạo context menu thất bại:', e);
}

// 4. Thiết lập tác vụ nền định kỳ (Alarms) an toàn
try {
  AlarmsHandler.setup();
} catch (e) {
  console.warn('[Alarms] Khởi tạo alarms thất bại:', e);
}

console.log('[Prompt Improver] Background Service Worker đã khởi chạy thành công.');
