/**
 * generic.adapter.ts — Generic Fallback Adapter cho Perplexity, Phind, Poe và các web chat khác
 */

import {
  PlatformAdapter,
  isElementVisible,
  defaultExtractText,
  defaultInsertText,
} from './platform-adapter';

export class GenericAdapter implements PlatformAdapter {
  readonly id = 'generic';
  readonly name = 'Generic Web Chat';

  private readonly selectors = [
    'textarea[placeholder*="Ask" i]',
    'textarea[placeholder*="chat" i]',
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="hỏi" i]',
    'textarea[placeholder*="nhập" i]',
    'textarea',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
    'input[type="text"][name*="query" i]',
    'input[type="text"][name*="prompt" i]',
  ];

  matches(_hostname: string): boolean {
    return true; // Luôn khớp như phương án dự phòng cuối cùng
  }

  findChatInput(): HTMLElement | null {
    for (const sel of this.selectors) {
      try {
        const el = document.querySelector<HTMLElement>(sel);
        if (el && isElementVisible(el)) return el;
      } catch (_) {}
    }
    return null;
  }

  findToolbarAnchor(_inputEl: HTMLElement): HTMLElement | null {
    return null; // Để DOMObserver sử dụng chiến lược 4 tầng thông minh
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
