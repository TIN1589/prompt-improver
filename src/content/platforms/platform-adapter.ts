/**
 * platform-adapter.ts — Interface chuẩn hóa cho từng nền tảng Chat AI
 */

export interface PlatformAdapter {
  readonly id: string;
  readonly name: string;

  /**
   * Kiểm tra xem adapter này có phục vụ hostname hiện tại không
   */
  matches(hostname: string): boolean;

  /**
   * Tìm phần tử ô nhập liệu chính của trang
   */
  findChatInput(): HTMLElement | null;

  /**
   * Tìm vị trí thích hợp trong DOM để chèn nút ✨ Cải thiện
   */
  findToolbarAnchor(inputEl: HTMLElement): HTMLElement | null;

  /**
   * Trích xuất văn bản prompt từ ô nhập liệu
   */
  extractText(inputEl: HTMLElement): string;

  /**
   * Điền văn bản đã tối ưu vào ô nhập liệu
   */
  insertText(inputEl: HTMLElement, text: string): void;
}

/**
 * Helper kiểm tra phần tử hiển thị hợp lệ trên màn hình
 */
export function isElementVisible(el: HTMLElement | null): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
}

/**
 * Trích xuất text an toàn cho mọi phần tử input / textarea / contenteditable
 */
export function defaultExtractText(el: HTMLElement | null): string {
  if (!el) return '';
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value || '';
  }
  return el.innerText || el.textContent || '';
}

/**
 * Điền text an toàn hỗ trợ cả contenteditable và React/Vue synthetic events
 */
export function defaultInsertText(el: HTMLElement | null, text: string): void {
  if (!el) return;
  el.focus();

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.isContentEditable) {
    let success = false;
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(range);
      success = document.execCommand('insertText', false, text);
    } catch (_) {
      success = false;
    }

    if (!success) {
      el.innerHTML = '';
      const lines = text.split('\n');
      lines.forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line || '';
        el.appendChild(p);
      });
    }

    el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
