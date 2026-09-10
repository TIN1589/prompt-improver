/**
 * chatgpt.adapter.ts — Adapter cho OpenAI ChatGPT (chatgpt.com & chat.openai.com)
 */

import {
  PlatformAdapter,
  isElementVisible,
  defaultExtractText,
  defaultInsertText,
} from './platform-adapter';
import { isDomainMatch } from '../../shared/utils/domain-matcher';

export class ChatGPTAdapter implements PlatformAdapter {
  readonly id = 'chatgpt';
  readonly name = 'ChatGPT';

  private readonly selectors = [
    '#prompt-textarea',
    'div#prompt-textarea',
    'textarea#prompt-textarea',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
    'div[role="textbox"]',
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="chat" i]',
    'textarea',
  ];

  matches(hostname: string): boolean {
    return isDomainMatch(hostname, 'chatgpt.com') || isDomainMatch(hostname, 'chat.openai.com');
  }

  findChatInput(): HTMLElement | null {
    for (const sel of this.selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && isElementVisible(el)) return el;
    }
    return null;
  }

  findToolbarAnchor(inputEl: HTMLElement): HTMLElement | null {
    // 1. Tìm nút đính kèm (+) hoặc Add content
    const attachBtn = document.querySelector<HTMLElement>(
      'button[data-testid="composer-plus-button"], button[data-testid="attachment-button"], button[aria-label*="Add" i], button[aria-label*="attach" i], button[aria-label*="Upload" i], button[aria-label*="Đính kèm" i]'
    );
    if (attachBtn && isElementVisible(attachBtn)) {
      const group = attachBtn.closest('div.flex') || attachBtn.parentElement;
      if (group && group.parentElement) {
        return group as HTMLElement;
      }
    }

    // 2. Tìm nút gửi (khi có văn bản)
    const sendBtn = document.querySelector<HTMLElement>(
      'button[data-testid="send-button"], button[data-testid="composer-send-button"], button[aria-label*="Send" i]'
    );
    if (sendBtn && isElementVisible(sendBtn)) {
      return (sendBtn.closest('div.flex') || sendBtn.parentElement) as HTMLElement;
    }

    // 3. Để DOMObserver xử lý các Tier dự phòng tiếp theo
    return null;
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
