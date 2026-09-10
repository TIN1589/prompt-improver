/**
 * claude.adapter.ts — Adapter cho Anthropic Claude.ai
 */

import {
  PlatformAdapter,
  isElementVisible,
  defaultExtractText,
  defaultInsertText,
} from './platform-adapter';
import { isDomainMatch } from '../../shared/utils/domain-matcher';

export class ClaudeAdapter implements PlatformAdapter {
  readonly id = 'claude';
  readonly name = 'Claude.ai';

  private readonly selectors = [
    'div[contenteditable="true"][data-testid="chat-input"]',
    'div[contenteditable="true"].ProseMirror',
    'div.tiptap.ProseMirror',
    'div[contenteditable="true"]',
  ];

  matches(hostname: string): boolean {
    return isDomainMatch(hostname, 'claude.ai');
  }

  findChatInput(): HTMLElement | null {
    for (const sel of this.selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && isElementVisible(el)) return el;
    }
    return null;
  }

  findToolbarAnchor(inputEl: HTMLElement): HTMLElement | null {
    // 1. Tìm nút Attach / Upload
    const attachBtn = document.querySelector<HTMLElement>(
      'button[aria-label*="attach" i], button[aria-label*="Upload" i], button[aria-label*="File" i]'
    );
    if (attachBtn && isElementVisible(attachBtn)) {
      const group =
        attachBtn.closest('div.relative.shrink-0') ||
        attachBtn.closest('div.flex') ||
        attachBtn.parentElement;
      if (group && group.parentElement) {
        return group as HTMLElement;
      }
    }

    // 2. Fallback sang Composer Wrapper
    return inputEl.closest('fieldset') || inputEl.closest('form') || inputEl.parentElement;
  }

  extractText(inputEl: HTMLElement): string {
    return defaultExtractText(inputEl);
  }

  insertText(inputEl: HTMLElement, text: string): void {
    defaultInsertText(inputEl, text);
  }
}
