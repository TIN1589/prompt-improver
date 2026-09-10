/**
 * index.ts — Universal Prompt Improver Content Script Entry Point (Manifest V3)
 */

import { resolvePlatformAdapter } from './platforms';
import { DOMObserver } from './dom-observer';
import { openImproveModal } from './components/improve-modal';
import { showToast, showUndoToast } from './components/undo-toast';
import { MessageClient } from '../infrastructure/messaging/message-client';
import type { CheckSiteResult, ExtensionMessage } from '../shared/types/messages';

let hasInitialized = false;

async function bootstrap(): Promise<void> {
  if (hasInitialized) return;
  hasInitialized = true;

  const hostname = window.location.hostname;

  // 1. Kiểm tra site có được bật trong cài đặt không
  try {
    const res = await MessageClient.send<CheckSiteResult>({
      type: 'SITE:CHECK_ENABLED',
      payload: { hostname },
    });

    if (res && res.enabled === false) {
      console.log('[Prompt Improver] Extension đã bị tắt trên trang:', hostname);
      return;
    }
  } catch (_) {
    // Nếu chưa khởi động xong service worker, tiếp tục chạy bình thường
  }

  // 2. Tìm Platform Adapter tương thích
  const adapter = resolvePlatformAdapter(hostname);

  // 3. Khởi tạo Observer theo dõi DOM
  const observer = new DOMObserver({
    adapter,
    onButtonClick: (inputEl) => {
      const promptText = adapter.extractText(inputEl).trim();
      if (!promptText) {
        showToast('Vui lòng nhập nội dung prompt trước khi cải thiện!', 'warning');
        return;
      }

      openImproveModal(promptText, (newPrompt) => {
        adapter.insertText(inputEl, newPrompt);
        showUndoToast(promptText, (orig) => {
          adapter.insertText(inputEl, orig);
        });
      });
    },
  });

  observer.start();

  // 4. Lắng nghe Context Menu kích hoạt từ Background
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'TAB:TRIGGER_IMPROVE' && message.payload.text) {
      const activeInput = observer.getActiveInput() || adapter.findChatInput();
      openImproveModal(message.payload.text, (newPrompt) => {
        if (activeInput) {
          adapter.insertText(activeInput, newPrompt);
          showUndoToast(message.payload.text, (orig) => {
            adapter.insertText(activeInput, orig);
          });
        }
      });
    }
  });

  console.log(`[Prompt Improver] Content Script đã kích hoạt cho ${adapter.name} (${hostname})`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
