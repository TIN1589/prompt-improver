/**
 * content.js — Universal Prompt Improver Content Script (MV3)
 * 
 * Tương thích 100% với Chrome Extension Manifest V3 (Classic Content Script - Không dùng import ES Module).
 * 
 * Hỗ trợ tự động:
 * 1. Claude.ai (Toolbar / Next to Attach button)
 * 2. ChatGPT (chatgpt.com & chat.openai.com)
 * 3. Google Gemini & AI Studio (gemini.google.com, aistudio.google.com)
 * 4. DeepSeek (chat.deepseek.com)
 * 5. Microsoft Copilot (copilot.microsoft.com)
 * 6. Perplexity AI, Phind, Poe, và mọi web chat khác.
 */

// ─── UTILITIES TỰ CHỨA (SELF-CONTAINED FOR MV3 CONTENT SCRIPT) ───────────────
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  const vietnameseAccentsRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (vietnameseAccentsRegex.test(trimmed)) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    const punctuationCount = (trimmed.match(/[,.;:?!(){}[\]<>"/\\|=+*#@$%^&~`_-]/g) || []).length;
    return Math.ceil(words.length * 1.25 + punctuationCount * 0.4);
  } else {
    const charEstimate = Math.ceil(trimmed.length / 3.8);
    const wordEstimate = Math.ceil(trimmed.split(/\s+/).filter(Boolean).length * 1.3);
    return Math.max(Math.ceil((charEstimate + wordEstimate) / 2), 1);
  }
}

function escapeHtml(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isDomainMatch(currentHostname, targetDomain) {
  if (!currentHostname || !targetDomain) return false;
  const host = currentHostname.toLowerCase();
  const target = targetDomain.toLowerCase();
  return host === target || host.endsWith('.' + target);
}

// ─── SVG SPRITE & ICON HELPER (LUCIDE GEOMETRY 24x24) ─────────────────────────
const SVG_SPRITE = `<svg width="0" height="0" style="position:absolute;display:none" aria-hidden="true">
<defs>
<symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 2.5c.6 3.4 1.4 5.4 2.7 6.7 1.3 1.3 3.3 2.1 6.8 2.8-3.5.7-5.5 1.5-6.8 2.8-1.3 1.3-2.1 3.3-2.7 6.7-.6-3.4-1.4-5.4-2.7-6.7-1.3-1.3-3.3-2.1-6.8-2.8 3.5-.7 5.5-1.5 6.8-2.8 1.3-1.3 2.1-3.3 2.7-6.7z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4.5 13.6h5.6L9.2 22 19.5 9.8H13.8L13 2z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5"/></symbol>
<symbol id="i-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3z"/><path d="M3.5 12 12 16.5l8.5-4.5"/><path d="M3.5 16.5 12 21l8.5-4.5"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 5.5 5.8v5.6c0 4.6 2.9 7.5 6.5 9 3.6-1.5 6.5-4.4 6.5-9V5.8L12 3.2z"/><path d="m9 12 2 2 4-4.2"/></symbol>
<symbol id="i-bug" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="8" height="9" rx="4"/><path d="M12 8V5.5M9.5 6.2 8 4.5M14.5 6.2 16 4.5M4.5 11H7M17 11h2.5M5 16l2-1.5M19 16l-2-1.5M8 13h8"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 4.7 16.6 15.4 5.9a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L8.5 20.3 4 20z"/><path d="m13.8 7.5 2.7 2.7"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="M3.7 12h16.6M12 3.7c2.3 2.3 3.5 5.2 3.5 8.3s-1.2 6-3.5 8.3c-2.3-2.3-3.5-5.2-3.5-8.3S9.7 6 12 3.7z"/></symbol>
<symbol id="i-wrench-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a3.7 3.7 0 0 0-4.9 4.3l-6 6a1.7 1.7 0 0 0 2.4 2.4l6-6a3.7 3.7 0 0 0 4.3-4.9l-2.4 2.4-2-.5-.5-2 2.4-2.4z"/><path d="M18.5 4v3.5M20.3 5.8h-3.6"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8a8 8 0 0 0-14.6-3.2M4 4v4.5H8.5"/><path d="M4 16a8 8 0 0 0 14.6 3.2M20 20v-4.5H15.5"/></symbol>
<symbol id="i-flask" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5h5M10 3.5v6.3L5.3 18a1.8 1.8 0 0 0 1.6 2.7h10.2a1.8 1.8 0 0 0 1.6-2.7L14 9.8V3.5"/><path d="M7.5 15h9"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.4-1-3.6-1.5-6-1.5v13c2.4 0 4.6.5 6 1.5 1.4-1 3.6-1.5 6-1.5V5c-2.4 0-4.6.5-6 1.5z"/><path d="M12 6.5v13"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8.3v7.4l6-3.7-6-3.7z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-undo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8H4V4"/><path d="M4.5 8A8 8 0 1 1 6 17.5"/></symbol>
<symbol id="i-save" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></symbol>
<symbol id="i-wifi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 9.2a11 11 0 0 1 15 0"/><path d="M7.5 12.7a6.7 6.7 0 0 1 9 0"/><path d="M10.6 16.2a2.6 2.6 0 0 1 2.8 0"/><circle cx="12" cy="19" r=".3" fill="currentColor"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15M9.5 6.5V4.3h5v2.2M6.5 6.5 7.4 20h9.2l.9-13.5"/><path d="M10 10.5v6M14 10.5v6"/></symbol>
<symbol id="i-retry" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 1 2.6 5.7"/><path d="M4 17.5V13h4.5"/></symbol>
<symbol id="i-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></symbol>
<symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.5V4M8 8l4-4 4 4"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11.5M8 12l4 4 4-4"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></symbol>
<symbol id="i-dot" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="M12 7.5V12l3 2"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21 19.5H3L12 4z"/><path d="M12 10v4M12 16.7v.1"/></symbol>
<symbol id="i-x-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="8.3"/><path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4"/></symbol>
<symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="m8.3 12.3 2.6 2.6 5-5.4"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.5 14.5 9.3 20.8 9.9 16 14 17.4 20.2 12 16.9 6.6 20.2 8 14 3.2 9.9 9.5 9.3 12 3.5z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-bulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M9.5 21h5"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3.5z"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5V8h4M9 12.5h6M9 15.8h6"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".8" fill="currentColor"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></symbol>
<symbol id="i-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 12.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.2 6.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H8.8a1.7 1.7 0 0 0 1-1.6V.3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.2a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18v-11.5z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15.5M14 6l6 6-6 6"/></symbol>
</defs>
</svg>`;

function iconSvg(iconId, extraClass = '', extraAttrs = '') {
  const cls = extraClass ? 'pi-icon ' + extraClass : 'pi-icon';
  return '<svg class="' + cls + '" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"' + (extraAttrs ? ' ' + extraAttrs : '') + '><use href="#' + iconId + '"/></svg>';
}

// ─── CẤU HÌNH DOM SELECTORS TOÀN DIỆN CHO CÁC NỀN TẢNG AI CHAT ────────────────
const SITE_SELECTORS = {
  'claude.ai': [
    'div[contenteditable="true"][data-testid="chat-input"]',
    'div[contenteditable="true"].ProseMirror',
    'div.tiptap.ProseMirror',
    'div[contenteditable="true"]',
  ],
  'chatgpt.com': [
    '#prompt-textarea',
    'div#prompt-textarea',
    'textarea#prompt-textarea',
    'div[contenteditable="true"]',
    'div[role="textbox"]',
    'textarea',
  ],
  'chat.openai.com': [
    '#prompt-textarea',
    'div#prompt-textarea',
    'textarea',
  ],
  'deepseek.com': [
    'textarea#chat-input',
    'textarea[placeholder*="DeepSeek" i]',
    'textarea',
    'div[contenteditable="true"]',
  ],
  'gemini.google.com': [
    'div.ql-editor',
    'rich-textarea div[contenteditable]',
    'div[contenteditable="true"]',
  ],
  'aistudio.google.com': [
    'textarea[placeholder]',
    'div[contenteditable="true"]',
  ],
  'copilot.microsoft.com': [
    'textarea#userInput',
    'textarea[placeholder*="Ask" i]',
    'div[role="textbox"]',
    'textarea',
  ],
  'perplexity.ai': [
    'textarea[placeholder*="Ask" i]',
    'textarea',
  ],
  'phind.com': ['textarea', 'div[contenteditable="true"]'],
  'poe.com': ['textarea[placeholder*="Talk" i]', 'textarea'],
};

const GENERIC_INPUT_SELECTORS = [
  '#prompt-textarea',
  'div[contenteditable="true"].ProseMirror',
  'div.ProseMirror',
  'div[role="textbox"][contenteditable="true"]',
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="chat" i]',
  'textarea[placeholder*="prompt" i]',
  'textarea[placeholder*="ask" i]',
  'textarea[placeholder*="hỏi" i]',
  'textarea[placeholder*="nhập" i]',
  'textarea',
];

const ATTACH_BTN_SELECTORS = [
  'button[data-testid="chat-input-attach"]',       // Claude
  'button[data-testid="attachment-button"]',      // ChatGPT
  'button[aria-label*="Attach" i]',               // Generic
  'button[aria-label*="Đính kèm" i]',             // VN
  'button[aria-label*="Add files" i]',            // Generic
  'button[aria-label*="Tải tệp" i]',              // VN
  'button[aria-label*="Upload" i]',               // Gemini
  'button[aria-label*="Thêm hình ảnh" i]',        // Gemini VN
  'button[data-testid*="attach"]',
  'button[class*="attach"]',
];

const SEND_BTN_SELECTORS = [
  'button[data-testid="chat-input-send"]',        // Claude
  'button[data-testid="send-button"]',            // ChatGPT
  'button[data-testid="composer-send-button"]',   // ChatGPT Modern
  'button[aria-label="Send message"]',
  'button[aria-label="Send prompt"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Gửi" i]',
  'button[type="submit"]',
];

const TASK_TYPE_MAP = {
  code: { label: 'Lập trình (Code)', iconId: 'i-wrench-plus' },
  writing: { label: 'Soạn thảo (Writing)', iconId: 'i-pen' },
  analysis: { label: 'Phân tích (Analysis)', iconId: 'i-chart' },
  translation: { label: 'Dịch thuật (Translation)', iconId: 'i-globe' },
  general: { label: 'Tổng quát (General)', iconId: 'i-bolt' },
};

const TASK_TYPE_LABELS = {
  code: 'Lập trình (Code)',
  writing: 'Soạn thảo (Writing)',
  analysis: 'Phân tích (Analysis)',
  translation: 'Dịch thuật (Translation)',
  general: 'Tổng quát (General)',
};

const PERSONA_LIST = [
  { id: 'developer', label: 'Fullstack Dev', iconId: 'i-code' },
  { id: 'architect', label: 'Architect', iconId: 'i-layers' },
  { id: 'security',  label: 'AppSec', iconId: 'i-shield' },
  { id: 'debugger',  label: 'Bug Hunter', iconId: 'i-bug' },
  { id: 'copywriter',label: 'Copywriter', iconId: 'i-pen' },
];

// ─── TRẠNG THÁI TOÀN CỤC ────────────────────────────────────────────────────
let activeInputElement = null;
let lastOriginalPrompt = '';
let isExtensionEnabledForSite = true;
let modalShadowRoot = null;
let hasInitialized = false;
let currentEscListener = null;
let currentActivePersona = 'developer';

// ─── KHỞI CHẠY (INITIALIZE) ─────────────────────────────────────────────────
async function init() {
  if (hasInitialized) return;
  hasInitialized = true;

  const hostname = window.location.hostname;
  try {
    const res = await chrome.runtime.sendMessage({
      action: 'CHECK_SITE_ENABLED',
      hostname,
    });
    if (res && res.enabled === false) {
      isExtensionEnabledForSite = false;
      return;
    }
  } catch (_) {}

  // 1. Tạo Host cho Modal và Toast
  createModalShadowHost();

  // 2. Quét và chèn nút ngay lập tức
  scanAndInjectToolbarButton();

  // 3. Theo dõi DOM thay đổi (SPA route navigation)
  const observer = new MutationObserver(debounce(() => {
    if (isExtensionEnabledForSite) {
      scanAndInjectToolbarButton();
    }
  }, 200));

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 4. Polling nhẹ định kỳ mỗi 800ms để đảm bảo luôn chèn nút khi chuyển chat SPA
  setInterval(() => {
    if (isExtensionEnabledForSite) {
      const existing = document.getElementById('pi-btn-host');
      if (!existing || !document.body.contains(existing)) {
        scanAndInjectToolbarButton();
      }
    }
  }, 800);

  // 5. Lắng nghe context menu click
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'TRIGGER_IMPROVE_FROM_SELECTION' && msg.text) {
      openImproveModal(msg.text);
    }
  });

  console.log('[PromptImprover] Content script đã kích hoạt thành công trên:', hostname);
}

// ─── MODAL SHADOW HOST ──────────────────────────────────────────────────────
function createModalShadowHost() {
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

    // Inject self-hosted fonts
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `
      @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-Regular.woff2')}') format('woff2'); font-weight:400; font-display:swap; }
      @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-SemiBold.woff2')}') format('woff2'); font-weight:600; font-display:swap; }
      @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-Bold.woff2')}') format('woff2'); font-weight:700; font-display:swap; }
      @font-face { font-family:'Inter'; src:url('${chrome.runtime.getURL('assets/fonts/Inter-Regular.woff2')}') format('woff2'); font-weight:400; font-display:swap; }
      @font-face { font-family:'Inter'; src:url('${chrome.runtime.getURL('assets/fonts/Inter-SemiBold.woff2')}') format('woff2'); font-weight:600; font-display:swap; }
    `;
    modalShadowRoot.appendChild(fontStyle);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/content.css');
    modalShadowRoot.appendChild(link);

    const spriteWrap = document.createElement('div');
    spriteWrap.innerHTML = SVG_SPRITE;
    modalShadowRoot.appendChild(spriteWrap.firstElementChild);
  } else {
    modalShadowRoot = hostEl.shadowRoot;
  }
}

// ─── TÌM Ô NHẬP LIỆU ────────────────────────────────────────────────────────
function findTargetChatInput() {
  const host = window.location.hostname;

  // 1. Theo domain cụ thể
  for (const [domain, selectors] of Object.entries(SITE_SELECTORS)) {
    if (isDomainMatch(host, domain)) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && isElementVisible(el)) return el;
      }
    }
  }

  // 2. Generic fallback
  for (const sel of GENERIC_INPUT_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el && isElementVisible(el)) return el;
    } catch (_) {}
  }

  return null;
}

function isElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none';
}

// ─── CHÈN NÚT "✨ CẢI THIỆN" VÀO THANH CÔNG CỤ TOOLBAR ───────────────────────
function scanAndInjectButton() {
  scanAndInjectToolbarButton();
}

function scanAndInjectToolbarButton() {
  const inputEl = findTargetChatInput();
  if (!inputEl) return;

  activeInputElement = inputEl;

  // Nếu nút đã tồn tại và còn gắn trong DOM thì không chèn lại
  const existingHost = document.getElementById('pi-btn-host');
  if (existingHost && document.body.contains(existingHost)) {
    return;
  }

  const hostEl = document.createElement('div');
  hostEl.id = 'pi-btn-host';
  hostEl.style.display = 'inline-flex';
  hostEl.style.alignItems = 'center';
  hostEl.style.verticalAlign = 'middle';
  hostEl.style.pointerEvents = 'auto';

  const shadow = hostEl.attachShadow({ mode: 'open' });

  const fontStyle = document.createElement('style');
  fontStyle.textContent = `
    @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-Regular.woff2')}') format('woff2'); font-weight:400; font-display:swap; }
    @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-SemiBold.woff2')}') format('woff2'); font-weight:600; font-display:swap; }
    @font-face { font-family:'Space Grotesk'; src:url('${chrome.runtime.getURL('assets/fonts/SpaceGrotesk-Bold.woff2')}') format('woff2'); font-weight:700; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('${chrome.runtime.getURL('assets/fonts/Inter-Regular.woff2')}') format('woff2'); font-weight:400; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('${chrome.runtime.getURL('assets/fonts/Inter-SemiBold.woff2')}') format('woff2'); font-weight:600; font-display:swap; }
  `;
  shadow.appendChild(fontStyle);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/content.css');
  shadow.appendChild(link);

  const spriteWrap = document.createElement('div');
  spriteWrap.innerHTML = SVG_SPRITE;
  shadow.appendChild(spriteWrap.firstElementChild);

  const btn = document.createElement('button');
  btn.className = 'pi-inject-btn';
  btn.type = 'button';
  btn.title = 'Cải thiện prompt với AI Prompt Optimizer (Prompt Improver)';
  btn.innerHTML = `${iconSvg('i-spark', 'pi-sparkle')} <span>Cải thiện</span>`;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const promptText = getPromptFromInput(activeInputElement).trim();
    if (!promptText) {
      showToast('Vui lòng nhập nội dung prompt trước khi cải thiện!', 'warning');
      return;
    }
    openImproveModal(promptText);
  });

  shadow.appendChild(btn);

  // Chiến lược 1: Tìm nút Attach / Đính kèm
  for (const sel of ATTACH_BTN_SELECTORS) {
    const attachBtn = document.querySelector(sel);
    if (attachBtn && isElementVisible(attachBtn)) {
      const attachGroup = attachBtn.closest('div.relative.shrink-0') || attachBtn.closest('div.flex') || attachBtn.parentElement;
      if (attachGroup && attachGroup.parentElement) {
        const nextSlot = attachGroup.nextElementSibling;
        if (nextSlot && (nextSlot.classList.contains('flex-row') || nextSlot.classList.contains('flex'))) {
          nextSlot.appendChild(hostEl);
        } else {
          attachGroup.parentElement.insertBefore(hostEl, attachGroup.nextSibling);
        }
        return;
      }
    }
  }

  // Chiến lược 2: Tìm nút Gửi (Send)
  for (const sel of SEND_BTN_SELECTORS) {
    const sendBtn = document.querySelector(sel);
    if (sendBtn && isElementVisible(sendBtn)) {
      const sendGroup = sendBtn.closest('div.flex') || sendBtn.parentElement;
      if (sendGroup && sendGroup.parentElement) {
        sendGroup.parentElement.insertBefore(hostEl, sendGroup);
        return;
      }
    }
  }

  // Chiến lược 3: Chèn vào Toolbar hoặc Composer Wrapper của Input
  const composerContainer = inputEl.closest('form') ||
                           inputEl.closest('div[class*="composer"]') ||
                           inputEl.closest('div[class*="rounded-"]') ||
                           inputEl.parentElement;

  if (composerContainer) {
    const toolbar = composerContainer.querySelector('div[class*="flex"][class*="items-center"]') || composerContainer;
    toolbar.appendChild(hostEl);
  }
}

// ─── TRÍCH XUẤT & ĐIỀN VĂN BẢN VÀO Ô CHAT ───────────────────────────────────
function getPromptFromInput(el) {
  if (!el) return '';
  if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
    return el.value || '';
  }
  return el.innerText || el.textContent || '';
}

function setPromptToInput(el, text) {
  if (!el) return;
  el.focus();

  if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.isContentEditable) {
    let success = false;
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      success = document.execCommand('insertText', false, text);
    } catch (_) {}

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

// ─── HIỂN THỊ MODAL CẢI THIỆN PROMPT (MEMORY SAFE) ─────────────────────────
function safelyCloseModal() {
  if (currentEscListener) {
    window.removeEventListener('keydown', currentEscListener);
    currentEscListener = null;
  }
  if (modalShadowRoot) {
    const backdrop = modalShadowRoot.querySelector('.pi-overlay-backdrop');
    if (backdrop) backdrop.remove();
  }
}

async function openImproveModal(promptText, selectedPersona = currentActivePersona) {
  if (!modalShadowRoot) createModalShadowHost();

  safelyCloseModal(); // Dọn dẹp modal cũ và event listener

  currentActivePersona = selectedPersona;

  const backdrop = document.createElement('div');
  backdrop.className = 'pi-overlay-backdrop';

  const modal = document.createElement('div');
  modal.className = 'pi-modal';

  modal.innerHTML = `
    <div class="pi-header">
      <div class="pi-header-left">
        <h3 class="pi-title">${iconSvg('i-spark', 'pi-icon-accent')} Prompt Improver</h3>
        <span id="piTaskBadge" class="pi-badge">Đang phân tích...</span>
        <span id="piCacheBadge" class="pi-badge pi-badge-cached" style="display: none;">${iconSvg('i-bolt', 'pi-icon-ok')} Cache</span>
      </div>
      <button id="piBtnClose" class="pi-btn-close" title="Đóng (Esc)" aria-label="Đóng">${iconSvg('i-x')}</button>
    </div>

    <!-- Persona Selector Bar -->
    <div class="pi-persona-bar">
      ${PERSONA_LIST.map(p => `
        <button class="pi-persona-chip ${p.id === currentActivePersona ? 'active' : ''}" data-persona="${p.id}">
          ${iconSvg(p.iconId)}
          <span>${escapeHtml(p.label)}</span>
        </button>
      `).join('')}
    </div>

    <div id="piModalBody" class="pi-body">
      <div class="pi-skeleton-box">
        <div class="pi-spinner"></div>
        <div class="pi-loading-text">Đang tối ưu hóa prompt với Gemini...</div>
        <div class="pi-loading-subtext">Đang phân tích bối cảnh, tính điểm chất lượng và tạo 2 phiên bản</div>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  modalShadowRoot.appendChild(backdrop);

  // Đóng Modal an toàn
  const closeBtn = modal.querySelector('#piBtnClose');
  closeBtn.addEventListener('click', safelyCloseModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) safelyCloseModal();
  });

  // Đăng ký Escape Listener có cleanup
  currentEscListener = (e) => {
    if (e.key === 'Escape') {
      safelyCloseModal();
    }
  };
  window.addEventListener('keydown', currentEscListener);

  // Gắn sự kiện chọn Persona
  modal.querySelectorAll('.pi-persona-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const pId = chip.dataset.persona;
      if (pId !== currentActivePersona) {
        openImproveModal(promptText, pId);
      }
    });
  });

  try {
    const res = await chrome.runtime.sendMessage({
      action: 'IMPROVE_PROMPT',
      payload: { prompt: promptText, persona: currentActivePersona },
    });

    if (!res || !res.success) {
      const err = new Error(res?.error || 'Không nhận được phản hồi từ backend.');
      err.isRateLimit = Boolean(res?.isRateLimit);
      err.retryAfterSeconds = res?.retryAfterSeconds;
      throw err;
    }

    renderModalContent(modal, promptText, res);
  } catch (err) {
    renderModalError(modal, err.message, err, promptText);
  }
}

// ─── RENDER NỘI DUNG KẾT QUẢ VÀO MODAL ───────────────────────────────────────
function renderModalContent(modal, originalPrompt, data) {
  const body = modal.querySelector('#piModalBody');
  const taskBadge = modal.querySelector('#piTaskBadge');
  const cacheBadge = modal.querySelector('#piCacheBadge');

  const task = TASK_TYPE_MAP[data.taskType] || TASK_TYPE_MAP.general;
  taskBadge.innerHTML = `${iconSvg(task.iconId)} <span>${escapeHtml(task.label)}</span>`;
  if (data.isCached) {
    cacheBadge.innerHTML = `${iconSvg('i-bolt', 'pi-icon-ok')} <span>Cache</span>`;
    cacheBadge.style.display = 'inline-flex';
  }

  const origTokens = estimateTokens(originalPrompt);
  const minTokens = estimateTokens(data.minimal || '');
  const detTokens = estimateTokens(data.detailed || '');

  const origScore = data.originalScore?.overallScore ?? 50;
  const impScore = data.detailedScore?.overallScore ?? 85;
  const deltaScore = impScore - origScore;

  body.innerHTML = `
    <!-- Score Dashboard -->
    <div class="pi-score-dashboard">
      <div class="pi-score-header">
        <div class="pi-score-title">${iconSvg('i-chart', 'pi-icon-accent')} Điểm chất lượng Prompt</div>
        <div class="pi-score-badge-group">
          <span class="pi-score-badge ${getScoreClass(origScore)}">Gốc: ${origScore}/100</span>
          <span>${iconSvg('i-arrow')}</span>
          <span class="pi-score-badge ${getScoreClass(impScore)}">Mới: ${impScore}/100</span>
          ${deltaScore > 0 ? `<span class="pi-score-delta">+${deltaScore} điểm</span>` : ''}
        </div>
      </div>

      <!-- Metrics Breakdown -->
      <div class="pi-metrics-grid">
        <div class="pi-metric-item">
          <div class="pi-metric-label">
            <span>Rõ ràng</span>
            <span>${data.detailedScore?.clarity ?? 80}%</span>
          </div>
          <div class="pi-metric-bar">
            <div class="pi-metric-fill" style="width: ${data.detailedScore?.clarity ?? 80}%"></div>
          </div>
        </div>

        <div class="pi-metric-item">
          <div class="pi-metric-label">
            <span>Bối cảnh</span>
            <span>${data.detailedScore?.context ?? 85}%</span>
          </div>
          <div class="pi-metric-bar">
            <div class="pi-metric-fill" style="width: ${data.detailedScore?.context ?? 85}%"></div>
          </div>
        </div>

        <div class="pi-metric-item">
          <div class="pi-metric-label">
            <span>Súc tích</span>
            <span>${data.detailedScore?.conciseness ?? 90}%</span>
          </div>
          <div class="pi-metric-bar">
            <div class="pi-metric-fill" style="width: ${data.detailedScore?.conciseness ?? 90}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Prompt Gốc Collapsible -->
    <details class="pi-original-box">
      <summary>${iconSvg('i-file')} Prompt gốc (${origTokens} tokens)</summary>
      <div class="pi-original-text">${escapeHtml(originalPrompt)}</div>
    </details>

    <!-- 2 Cards So Sánh -->
    <div class="pi-cards-grid">
      <!-- Card 1: Tối giản -->
      <div class="pi-card pi-card-minimal">
        <div class="pi-card-header">
          <div class="pi-card-title">${iconSvg('i-bolt', 'pi-icon-accent')} Phiên bản Tối giản</div>
          <div class="pi-card-stats">~${minTokens} tokens (${calcDiff(origTokens, minTokens)})</div>
        </div>
        <div class="pi-card-text">${escapeHtml(data.minimal)}</div>
        <div class="pi-card-actions">
          <button class="pi-btn pi-btn-copy" data-text="${encodeURIComponent(data.minimal)}">
            ${iconSvg('i-copy')} <span>Sao chép</span>
          </button>
          <button class="pi-btn pi-btn-apply" data-apply="${encodeURIComponent(data.minimal)}">
            ${iconSvg('i-play')} <span>Dùng bản này</span>
          </button>
        </div>
      </div>

      <!-- Card 2: Chi tiết -->
      <div class="pi-card pi-card-detailed">
        <div class="pi-card-header">
          <div class="pi-card-title">${iconSvg('i-target', 'pi-icon-warn')} Phiên bản Chi tiết</div>
          <div class="pi-card-stats">~${detTokens} tokens</div>
        </div>
        <div class="pi-card-text">${escapeHtml(data.detailed)}</div>
        <div class="pi-card-actions">
          <button class="pi-btn pi-btn-copy" data-text="${encodeURIComponent(data.detailed)}">
            ${iconSvg('i-copy')} <span>Sao chép</span>
          </button>
          <button class="pi-btn pi-btn-apply" data-apply="${encodeURIComponent(data.detailed)}">
            ${iconSvg('i-play')} <span>Dùng bản này</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Assumptions Box -->
    ${
      data.assumptions && data.assumptions.length > 0
        ? `
      <div class="pi-assumptions-box">
        <div class="pi-assumptions-title">${iconSvg('i-bulb', 'pi-icon-warn')} Các giả định làm rõ từ AI:</div>
        <ul class="pi-assumptions-list">
          ${data.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }
  `;

  // Gắn sự kiện Sao chép
  body.querySelectorAll('.pi-btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const textToCopy = decodeURIComponent(btn.dataset.text);
      await navigator.clipboard.writeText(textToCopy);
      const prevHtml = btn.innerHTML;
      btn.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} <span>Đã chép!</span>`;
      btn.style.color = '#10b981';
      setTimeout(() => {
        btn.innerHTML = prevHtml;
        btn.style.color = '';
      }, 1500);
    });
  });

  // Gắn sự kiện Dùng bản này (Apply)
  body.querySelectorAll('.pi-btn-apply').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newPrompt = decodeURIComponent(btn.dataset.apply);
      lastOriginalPrompt = originalPrompt;

      if (activeInputElement) {
        setPromptToInput(activeInputElement, newPrompt);
      }

      safelyCloseModal();
      showUndoToast(originalPrompt);
    });
  });
}

function getScoreClass(score) {
  if (score >= 75) return 'pi-score-high';
  if (score >= 50) return 'pi-score-med';
  return 'pi-score-low';
}

// ─── RENDER LỖI VÀO MODAL ───────────────────────────────────────────────────
function renderModalError(modal, errorMsg, errObj = null, promptText = '') {
  const body = modal.querySelector('#piModalBody');
  const taskBadge = modal.querySelector('#piTaskBadge');

  const isRateLimit = Boolean(
    errObj?.isRateLimit ||
    errorMsg.includes('429') ||
    errorMsg.includes('RATE_LIMIT') ||
    errorMsg.includes('Quota') ||
    errorMsg.includes('giới hạn')
  );

  const retrySeconds = errObj?.retryAfterSeconds || 15;

  if (isRateLimit) {
    taskBadge.innerHTML = `${iconSvg('i-clock', 'pi-icon-warn')} Giới hạn API (429)`;
    body.innerHTML = `
      <div class="pi-ratelimit-box">
        <h4>${iconSvg('i-clock', 'pi-icon-warn')} Tạm thời chạm giới hạn Gemini API</h4>
        <p>Hạn mức yêu cầu miễn phí (Free Tier) đang tạm thời quá tải hoặc đang trong chu kỳ hồi phục (RPM/RPD).</p>
        <div class="pi-ratelimit-tip">
          ${iconSvg('i-bulb', 'pi-icon-warn')} <strong>Gợi ý:</strong> Vui lòng đợi khoảng <strong>${escapeHtml(String(retrySeconds))} giây</strong> rồi bấm nút <em>"Thử lại ngay"</em> hoặc thử lại sau.
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
        ${promptText ? `<button class="pi-btn pi-btn-insert pi-btn-error-retry" id="piBtnErrorRetry">${iconSvg('i-retry')} Thử lại ngay</button>` : ''}
      </div>
    `;

    if (promptText) {
      body.querySelector('#piBtnErrorRetry')?.addEventListener('click', () => {
        openImproveModal(promptText, currentActivePersona);
      });
    }
  } else {
    taskBadge.innerHTML = `${iconSvg('i-x-circle', 'pi-icon-danger')} Lỗi`;
    body.innerHTML = `
      <div class="pi-error-box">
        <h4>${iconSvg('i-x-circle', 'pi-icon-danger')} Không thể cải thiện prompt</h4>
        <p>${escapeHtml(errorMsg)}</p>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
        ${promptText ? `<button class="pi-btn pi-btn-insert pi-btn-error-retry" id="piBtnErrorRetry">${iconSvg('i-retry')} Thử lại ngay</button>` : ''}
      </div>
    `;

    if (promptText) {
      body.querySelector('#piBtnErrorRetry')?.addEventListener('click', () => {
        openImproveModal(promptText, currentActivePersona);
      });
    }
  }

  body.querySelector('.pi-btn-error-close')?.addEventListener('click', safelyCloseModal);
}

// ─── TOAST THÔNG BÁO VÀ NÚT HOÀN TÁC (UNDO) ──────────────────────────────────
function showToast(message, type = 'info') {
  if (!modalShadowRoot) createModalShadowHost();

  const toast = document.createElement('div');
  toast.className = `pi-toast ${type === 'warning' ? 'pi-toast-warning' : ''}`;
  const icon = type === 'warning'
    ? iconSvg('i-warn', 'pi-icon-warn')
    : (type === 'undo' ? iconSvg('i-undo') : iconSvg('i-check-circle', 'pi-icon-ok'));
  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;

  modalShadowRoot.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showUndoToast(previousPrompt) {
  if (!modalShadowRoot) createModalShadowHost();

  const toast = document.createElement('div');
  toast.className = 'pi-toast';
  toast.innerHTML = `
    <span>${iconSvg('i-spark', 'pi-icon-accent')} Đã áp dụng prompt mới!</span>
    <button class="pi-toast-undo-btn">${iconSvg('i-undo')} Hoàn tác</button>
  `;

  const undoBtn = toast.querySelector('.pi-toast-undo-btn');
  undoBtn.addEventListener('click', () => {
    if (activeInputElement && previousPrompt) {
      setPromptToInput(activeInputElement, previousPrompt);
      showToast('Đã khôi phục prompt gốc!', 'undo');
      toast.remove();
    }
  });

  modalShadowRoot.appendChild(toast);

  setTimeout(() => {
    if (modalShadowRoot && modalShadowRoot.contains(toast)) {
      toast.style.opacity = '0';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 10000);
}

// ─── TIỆN ÍCH TRỢ GIÚP ──────────────────────────────────────────────────────
function calcDiff(orig, opt) {
  if (orig <= 0) return '';
  const diff = opt - orig;
  if (diff < 0) {
    const pct = Math.round((Math.abs(diff) / orig) * 100);
    return `-${pct}% token`;
  }
  return `+${diff} token`;
}

function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Khởi chạy khi load trang
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
