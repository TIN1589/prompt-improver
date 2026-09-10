/**
 * index.ts — Background Service Worker Entry Point (Manifest V3)
 * Điều phối viên sự kiện (Stateless Event Coordinator)
 */

import { LifecycleHandler } from './handlers/lifecycle.handler';
import { ContextMenuHandler } from './handlers/context-menu.handler';
import { AlarmsHandler } from './handlers/alarms.handler';
import { MessageRouter } from './message-router';

// 1. Đăng ký vòng đời Extension
chrome.runtime.onInstalled.addListener(() => {
  LifecycleHandler.onInstalled();
});

chrome.runtime.onStartup.addListener(() => {
  LifecycleHandler.onStartup();
});

// 2. Thiết lập Menu ngữ cảnh (Context Menu)
ContextMenuHandler.watchChanges();
chrome.contextMenus.onClicked.addListener((info, tab) => {
  ContextMenuHandler.handleClick(info, tab);
});

// 3. Thiết lập tác vụ nền định kỳ (Alarms)
AlarmsHandler.setup();
chrome.alarms.onAlarm.addListener((alarm) => {
  AlarmsHandler.handleAlarm(alarm);
});

// 4. Khởi động Bộ điều phối Message tập trung
MessageRouter.init();

console.log('[Prompt Improver] Background Service Worker đã khởi chạy thành công.');
