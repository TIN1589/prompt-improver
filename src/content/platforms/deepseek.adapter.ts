/**
 * deepseek.adapter.ts — Adapter cho DeepSeek Chat (chat.deepseek.com)
 */

import {
  PlatformAdapter,
  isElementVisible,
  defaultExtractText,
  defaultInsertText,
} from './platform-adapter';
import { isDomainMatch } from '../../shared/utils/domain-matcher';

export class DeepSeekAdapter implements PlatformAdapter {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';

  private readonly selectors = [
    'textarea[placeholder*="DeepSeek" i]',
    '#chat-input',
    'textarea',
    'div[contenteditable="true"]',
  ];

  matches(hostname: string): boolean {
    return isDomainMatch(hostname, 'deepseek.com');
  }

  findChatInput(): HTMLElement | null {
    for (const sel of this.selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && isElementVisible(el)) return el;
    }
    return null;
  }

  findToolbarAnchor(inputEl: HTMLElement): HTMLElement | null {
    const attachBtn = document.querySelector<HTMLElement>(
      'button[aria-label*="file" i], button[aria-label*="upload" i]'
    );
    if (attachBtn && isElementVisible(attachBtn)) {
      return (attachBtn.closest('div') || attachBtn.parentElement) as HTMLElement;
    }

    return inputEl.closest('div.chat-input-container') || inputEl.parentElement;
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
