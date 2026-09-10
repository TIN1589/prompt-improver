/**
 * dom-observer.ts — Quản lý MutationObserver và Quét / Chèn Button vào Web Chat SPA
 */

import type { PlatformAdapter } from './platforms/platform-adapter';
import { isElementVisible } from './platforms/platform-adapter';
import { createToolbarButton } from './components/toolbar-button';

const ATTACH_BTN_SELECTORS = [
  'button[data-testid="chat-input-attach"]',       // Claude
  'button[data-testid="attachment-button"]',      // ChatGPT
  'button[data-testid="composer-plus-button"]',   // ChatGPT Modern Plus
  'button[aria-label*="Add content" i]',          // ChatGPT Modern Add
  'button[aria-label*="Attach" i]',               // Generic
  'button[aria-label*="Đính kèm" i]',             // VN
  'button[aria-label*="Add files" i]',            // Generic
  'button[aria-label*="Tải tệp" i]',              // VN
  'button[aria-label*="Upload" i]',               // Gemini
  'button[aria-label*="Thêm hình ảnh" i]',        // Gemini VN
  'button[aria-label*="Thêm" i]',                 // Generic VN
  'button[aria-label*="Add" i]',                  // Generic
  'button[data-testid*="attach"]',
  'button[class*="attach"]',
  'button[aria-haspopup="menu"]',                 // Menu dropdown in toolbars
];

const SEND_BTN_SELECTORS = [
  'button[data-testid="chat-input-send"]',        // Claude
  'button[data-testid="send-button"]',            // ChatGPT
  'button[data-testid="composer-send-button"]',   // ChatGPT Modern
  'button[aria-label="Send message"]',
  'button[aria-label="Send prompt"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Gửi" i]',
  'button[type="submit"]',
];

export interface DOMObserverOptions {
  adapter: PlatformAdapter;
  onButtonClick: (inputEl: HTMLElement) => void;
}

export class DOMObserver {
  private adapter: PlatformAdapter;
  private onButtonClick: (inputEl: HTMLElement) => void;
  private observer: MutationObserver | null = null;
  private intervalId: number | null = null;
  private activeInput: HTMLElement | null = null;

  constructor(options: DOMObserverOptions) {
    this.adapter = options.adapter;
    this.onButtonClick = options.onButtonClick;
  }

  start(): void {
    // 1. Quét và chèn ngay lập tức
    this.scanAndInject();

    // 2. Theo dõi thay đổi DOM bằng MutationObserver
    let timeout: number | null = null;
    this.observer = new MutationObserver(() => {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        this.scanAndInject();
      }, 200);
    });

    if (document.body) {
      this.observer.observe(document.body, { childList: true, subtree: true });
    }

    // 3. Fallback định kỳ mỗi 800ms cho các SPA không phát sinh mutation ở body
    this.intervalId = window.setInterval(() => {
      const existing = document.getElementById('pi-btn-host');
      if (!existing || !document.body.contains(existing)) {
        this.scanAndInject();
      }
    }, 800);
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getActiveInput(): HTMLElement | null {
    return this.activeInput;
  }

  scanAndInject(): void {
    const inputEl = this.adapter.findChatInput();
    if (!inputEl) return;

    this.activeInput = inputEl;

    // Nếu nút đã tồn tại và còn trong DOM thì không chèn thêm
    const existing = document.getElementById('pi-btn-host');
    if (existing && document.body.contains(existing)) {
      return;
    }

    const btnHost = createToolbarButton(() => {
      if (this.activeInput) {
        this.onButtonClick(this.activeInput);
      }
    });

    // 1. Nếu Adapter cung cấp anchor tùy biến hợp lệ
    const customAnchor = this.adapter.findToolbarAnchor(inputEl);
    if (customAnchor && isElementVisible(customAnchor)) {
      if (customAnchor.nextElementSibling) {
        customAnchor.parentElement?.insertBefore(btnHost, customAnchor.nextElementSibling);
        return;
      } else if (customAnchor.parentElement) {
        customAnchor.parentElement.appendChild(btnHost);
        return;
      }
    }

    // 2. Chiến lược 1: Tìm nút Attach / Plus (+)
    for (const sel of ATTACH_BTN_SELECTORS) {
      const attachBtn = document.querySelector<HTMLElement>(sel);
      if (attachBtn && isElementVisible(attachBtn)) {
        const attachGroup =
          attachBtn.closest('div.relative.shrink-0') ||
          attachBtn.closest('div.flex') ||
          attachBtn.parentElement;
        if (attachGroup && attachGroup.parentElement) {
          const nextSlot = attachGroup.nextElementSibling;
          if (nextSlot && (nextSlot.classList.contains('flex-row') || nextSlot.classList.contains('flex'))) {
            nextSlot.appendChild(btnHost);
          } else {
            attachGroup.parentElement.insertBefore(btnHost, attachGroup.nextSibling);
          }
          return;
        }
      }
    }

    // 3. Chiến lược 2: Tìm nút Gửi (Send)
    for (const sel of SEND_BTN_SELECTORS) {
      const sendBtn = document.querySelector<HTMLElement>(sel);
      if (sendBtn && isElementVisible(sendBtn)) {
        const sendGroup = sendBtn.closest('div.flex') || sendBtn.parentElement;
        if (sendGroup && sendGroup.parentElement) {
          sendGroup.parentElement.insertBefore(btnHost, sendGroup);
          return;
        }
      }
    }

    // 4. Chiến lược 3: Chèn vào Toolbar hoặc Composer Wrapper của Input
    const composerContainer =
      inputEl.closest('form') ||
      inputEl.closest('div[class*="composer"]') ||
      inputEl.closest('div[class*="rounded-"]') ||
      inputEl.parentElement;

    if (composerContainer) {
      const toolbar =
        composerContainer.querySelector<HTMLElement>('div[class*="flex"][class*="items-center"]') ||
        composerContainer.querySelector<HTMLElement>('div.flex') ||
        composerContainer;
      toolbar.appendChild(btnHost);
    }
  }
}
