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
    'div[contenteditable="true"]',
    'div[role="textbox"]',
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
    // 1. Tìm nút đính kèm (+)
    const attachBtn = document.querySelector<HTMLElement>(
      'button[aria-label*="attach" i], button[data-testid*="attachment" i], button[aria-label*="Upload" i]'
    );
    if (attachBtn && isElementVisible(attachBtn)) {
      const group = attachBtn.closest('div.flex') || attachBtn.parentElement;
      if (group && group.parentElement) {
        return group as HTMLElement;
      }
    }

    // 2. Tìm nút gửi
    const sendBtn = document.querySelector<HTMLElement>(
      'button[data-testid="send-button"], button[aria-label*="Send" i]'
    );
    if (sendBtn && isElementVisible(sendBtn)) {
      return (sendBtn.closest('div.flex') || sendBtn.parentElement) as HTMLElement;
    }

    // 3. Fallback
    return inputEl.closest('form') || inputEl.parentElement;
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
