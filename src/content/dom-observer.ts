/**
 * dom-observer.ts — Quản lý MutationObserver và Quét / Chèn Button vào Web Chat SPA
 */

import type { PlatformAdapter } from './platforms/platform-adapter';
import { createToolbarButton } from './components/toolbar-button';

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

    const anchorEl = this.adapter.findToolbarAnchor(inputEl);
    if (!anchorEl || !anchorEl.parentElement) return;

    const btnHost = createToolbarButton(() => {
      if (this.activeInput) {
        this.onButtonClick(this.activeInput);
      }
    });

    // Chèn nút vào vị trí anchor
    if (anchorEl.nextElementSibling) {
      anchorEl.parentElement.insertBefore(btnHost, anchorEl.nextElementSibling);
    } else {
      anchorEl.parentElement.appendChild(btnHost);
    }
  }
}
