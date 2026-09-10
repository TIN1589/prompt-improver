/**
 * undo-toast.ts — Toast thông báo và nút Hoàn Tác (1-Click Undo)
 */

import { getOrCreateModalShadowRoot } from '../ui-mount';
import { iconSvg } from '../../shared/utils/svg-icons';
import { escapeHtml } from '../../shared/utils/entity-extractor';

export function showToast(message: string, type: 'info' | 'warning' | 'undo' = 'info'): void {
  const shadow = getOrCreateModalShadowRoot();

  const toast = document.createElement('div');
  toast.className = `pi-toast ${type === 'warning' ? 'pi-toast-warning' : ''}`;
  const icon =
    type === 'warning'
      ? iconSvg('i-warn', 'pi-icon-warn')
      : type === 'undo'
      ? iconSvg('i-undo')
      : iconSvg('i-check-circle', 'pi-icon-ok');

  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
  shadow.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function showUndoToast(previousPrompt: string, onUndo: (originalPrompt: string) => void): void {
  const shadow = getOrCreateModalShadowRoot();

  const toast = document.createElement('div');
  toast.className = 'pi-toast';
  toast.innerHTML = `
    <span>${iconSvg('i-spark', 'pi-icon-accent')} Đã áp dụng prompt mới!</span>
    <button class="pi-toast-undo-btn">${iconSvg('i-undo')} Hoàn tác</button>
  `;

  const undoBtn = toast.querySelector('.pi-toast-undo-btn');
  undoBtn?.addEventListener('click', () => {
    onUndo(previousPrompt);
    showToast('Đã khôi phục prompt gốc!', 'undo');
    toast.remove();
  });

  shadow.appendChild(toast);

  setTimeout(() => {
    if (shadow.contains(toast)) {
      toast.style.opacity = '0';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 10000);
}
