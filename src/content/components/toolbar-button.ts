/**
 * toolbar-button.ts — Nút ✨ Cải Thiện nhúng vào ô nhập liệu
 */

import { setupShadowAssets } from '../ui-mount';
import { iconSvg } from '../../shared/utils/svg-icons';

export function createToolbarButton(onClick: (e: MouseEvent) => void): HTMLElement {
  const hostEl = document.createElement('div');
  hostEl.id = 'pi-btn-host';
  hostEl.style.display = 'inline-flex';
  hostEl.style.alignItems = 'center';
  hostEl.style.verticalAlign = 'middle';
  hostEl.style.pointerEvents = 'auto';

  const shadow = hostEl.attachShadow({ mode: 'open' });
  setupShadowAssets(shadow);

  const btn = document.createElement('button');
  btn.className = 'pi-inject-btn';
  btn.type = 'button';
  btn.title = 'Cải thiện prompt với AI Prompt Optimizer (Prompt Improver)';
  btn.innerHTML = `${iconSvg('i-spark', 'pi-sparkle')} <span>Cải thiện</span>`;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  });

  shadow.appendChild(btn);
  return hostEl;
}
