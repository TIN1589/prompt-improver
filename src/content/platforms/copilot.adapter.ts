/**
 * copilot.adapter.ts — Adapter cho Microsoft Copilot
 */

import {
  PlatformAdapter,
  isElementVisible,
  defaultExtractText,
  defaultInsertText,
} from './platform-adapter';
import { isDomainMatch } from '../../shared/utils/domain-matcher';

export class CopilotAdapter implements PlatformAdapter {
  readonly id = 'copilot';
  readonly name = 'Microsoft Copilot';

  private readonly selectors = [
    '#userInput',
    'textarea[placeholder*="Ask" i]',
    'textarea',
    'div[contenteditable="true"]',
  ];

  matches(hostname: string): boolean {
    return isDomainMatch(hostname, 'copilot.microsoft.com');
  }

  findChatInput(): HTMLElement | null {
    for (const sel of this.selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && isElementVisible(el)) return el;
    }
    return null;
  }

  findToolbarAnchor(inputEl: HTMLElement): HTMLElement | null {
    const btn = document.querySelector<HTMLElement>('button[aria-label*="Add image" i]');
    if (btn && isElementVisible(btn)) {
      return (btn.closest('div') || btn.parentElement) as HTMLElement;
    }
    return inputEl.parentElement;
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
