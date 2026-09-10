/**
 * ui-mount.ts — Quản lý Shadow DOM Hosts và Isolated Styling
 */

import { SVG_SPRITE } from '../shared/utils/svg-icons';

let modalShadowRoot: ShadowRoot | null = null;

/**
 * Tạo Shadow DOM Host an toàn cho Modal và Toast
 */
export function getOrCreateModalShadowRoot(): ShadowRoot {
  if (modalShadowRoot) return modalShadowRoot;

  let hostEl = document.getElementById('prompt-improver-modal-host');
  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = 'prompt-improver-modal-host';
    hostEl.style.position = 'absolute';
    hostEl.style.top = '0';
    hostEl.style.left = '0';
    hostEl.style.width = '100%';
    hostEl.style.height = '0';
    hostEl.style.zIndex = '2147483647';
    hostEl.style.pointerEvents = 'none';
    (document.body || document.documentElement).appendChild(hostEl);
  }

  if (!hostEl.shadowRoot) {
    modalShadowRoot = hostEl.attachShadow({ mode: 'open' });
    setupShadowAssets(modalShadowRoot);
  } else {
    modalShadowRoot = hostEl.shadowRoot;
  }

  return modalShadowRoot;
}

/**
 * Nạp Font Faces, Stylesheet và SVG Sprite vào Shadow Root
 */
export function setupShadowAssets(shadow: ShadowRoot): void {
  // 1. Font Faces
  const fontStyle = document.createElement('style');
  fontStyle.textContent = `
    @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-Regular.woff2')}') format('woff2'); font-weight:400; font-display:swap; }
    @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-SemiBold.woff2')}') format('woff2'); font-weight:600; font-display:swap; }
    @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-Bold.woff2')}') format('woff2'); font-weight:700; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('${chrome.runtime.getURL('assets/fonts/Inter-Regular.woff2')}') format('woff2'); font-weight:400; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('${chrome.runtime.getURL('assets/fonts/Inter-SemiBold.woff2')}') format('woff2'); font-weight:600; font-display:swap; }
  `;
  shadow.appendChild(fontStyle);

  // 2. Stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/content.css');
  shadow.appendChild(link);

  // 3. SVG Sprite
  const spriteWrap = document.createElement('div');
  spriteWrap.innerHTML = SVG_SPRITE;
  if (spriteWrap.firstElementChild) {
    shadow.appendChild(spriteWrap.firstElementChild);
  }
}
