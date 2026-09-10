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

  // 1. Khởi tạo Platform Adapter và DOM Observer ngay lập tức (không chặn)
  const adapter = resolvePlatformAdapter(hostname);
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

  // 2. Kiểm tra cài đặt bất đồng bộ trong nền — nếu người dùng tắt domain này thì dừng
  MessageClient.send<CheckSiteResult>({
    type: 'SITE:CHECK_ENABLED',
    payload: { hostname },
  })
    .then((res) => {
      if (res && res.enabled === false) {
        observer.stop();
        const btn = document.getElementById('pi-btn-host');
        if (btn) btn.remove();
        console.log('[Prompt Improver] Extension đã bị tắt trên trang:', hostname);
      }
    })
    .catch(() => {
      // Background chưa sẵn sàng, giữ nguyên trạng thái chạy
    });

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
