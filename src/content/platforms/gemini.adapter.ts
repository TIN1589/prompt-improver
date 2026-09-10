/**
 * gemini.adapter.ts — Adapter cho Google Gemini & Google AI Studio
 */

import {
  PlatformAdapter,
  isElementVisible,
  defaultExtractText,
  defaultInsertText,
} from './platform-adapter';
import { isDomainMatch } from '../../shared/utils/domain-matcher';

export class GeminiAdapter implements PlatformAdapter {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  private readonly selectors = [
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="prompt" i]',
    'div[contenteditable="true"]',
    'textarea',
  ];

  matches(hostname: string): boolean {
    return (
      isDomainMatch(hostname, 'gemini.google.com') ||
      isDomainMatch(hostname, 'aistudio.google.com') ||
      isDomainMatch(hostname, 'bard.google.com')
    );
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
      'button[aria-label*="Add image" i], button[aria-label*="Tệp" i], button[aria-label*="Upload" i]'
    );
    if (attachBtn && isElementVisible(attachBtn)) {
      return (attachBtn.closest('div') || attachBtn.parentElement) as HTMLElement;
    }

    return inputEl.closest('div.input-area-container') || inputEl.parentElement;
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
