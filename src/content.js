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

const TASK_TYPE_LABELS = {
  code: '💻 Lập trình (Code)',
  writing: '✍️ Soạn thảo (Writing)',
  analysis: '📊 Phân tích (Analysis)',
  translation: '🌐 Dịch thuật (Translation)',
  general: '⚡ Tổng quát (General)',
};

const PERSONA_LIST = [
  { id: 'developer', label: '⚡ Fullstack Dev', icon: '⚡' },
  { id: 'architect', label: '🏗️ Architect', icon: '🏗️' },
  { id: 'security',  label: '🛡️ AppSec', icon: '🛡️' },
  { id: 'debugger',  label: '🐛 Bug Hunter', icon: '🐛' },
  { id: 'copywriter',label: '✍️ Copywriter', icon: '✍️' },
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

  const btn = document.createElement('button');
  btn.className = 'pi-inject-btn';
  btn.type = 'button';
  btn.title = 'Cải thiện prompt với AI Prompt Optimizer (Prompt Improver)';
  btn.innerHTML = `<span class="pi-sparkle">✨</span> <span>Cải thiện</span>`;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const promptText = getPromptFromInput(activeInputElement).trim();
    if (!promptText) {
      showToast('⚠️ Vui lòng nhập nội dung prompt trước khi cải thiện!', 'warning');
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
        <h3 class="pi-title">✨ Prompt Improver</h3>
        <span id="piTaskBadge" class="pi-badge">Đang phân tích...</span>
        <span id="piCacheBadge" class="pi-badge pi-badge-cached" style="display: none;">⚡ Cache</span>
      </div>
      <button id="piBtnClose" class="pi-btn-close" title="Đóng (Esc)">✕</button>
    </div>

    <!-- Persona Selector Bar -->
    <div class="pi-persona-bar">
      ${PERSONA_LIST.map(p => `
        <button class="pi-persona-chip ${p.id === currentActivePersona ? 'active' : ''}" data-persona="${p.id}">
          ${p.label}
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

  const taskLabel = TASK_TYPE_LABELS[data.taskType] || '⚡ Tổng quát';
  taskBadge.textContent = taskLabel;
  if (data.isCached) {
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
        <div class="pi-score-title">📊 Điểm chất lượng Prompt</div>
        <div class="pi-score-badge-group">
          <span class="pi-score-badge ${getScoreClass(origScore)}">Gốc: ${origScore}/100</span>
          <span>➔</span>
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
      <summary>📝 Prompt gốc (${origTokens} tokens)</summary>
      <div class="pi-original-text">${escapeHtml(originalPrompt)}</div>
    </details>

    <!-- 2 Cards So Sánh -->
    <div class="pi-cards-grid">
      <!-- Card 1: Tối giản -->
      <div class="pi-card pi-card-minimal">
        <div class="pi-card-header">
          <div class="pi-card-title">⚡ Phiên bản Tối giản</div>
          <div class="pi-card-stats">~${minTokens} tokens (${calcDiff(origTokens, minTokens)})</div>
        </div>
        <div class="pi-card-text">${escapeHtml(data.minimal)}</div>
        <div class="pi-card-actions">
          <button class="pi-btn pi-btn-copy" data-text="${encodeURIComponent(data.minimal)}">
            📋 Sao chép
          </button>
          <button class="pi-btn pi-btn-apply" data-apply="${encodeURIComponent(data.minimal)}">
            🚀 Dùng bản này
          </button>
        </div>
      </div>

      <!-- Card 2: Chi tiết -->
      <div class="pi-card pi-card-detailed">
        <div class="pi-card-header">
          <div class="pi-card-title">🎯 Phiên bản Chi tiết</div>
          <div class="pi-card-stats">~${detTokens} tokens</div>
        </div>
        <div class="pi-card-text">${escapeHtml(data.detailed)}</div>
        <div class="pi-card-actions">
          <button class="pi-btn pi-btn-copy" data-text="${encodeURIComponent(data.detailed)}">
            📋 Sao chép
          </button>
          <button class="pi-btn pi-btn-apply" data-apply="${encodeURIComponent(data.detailed)}">
            🚀 Dùng bản này
          </button>
        </div>
      </div>
    </div>

    <!-- Assumptions Box -->
    ${
      data.assumptions && data.assumptions.length > 0
        ? `
      <div class="pi-assumptions-box">
        <div class="pi-assumptions-title">💡 Các giả định làm rõ từ AI:</div>
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
      btn.innerHTML = '✔ Đã chép!';
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
    taskBadge.textContent = '⏳ Giới hạn API (429)';
    body.innerHTML = `
      <div class="pi-ratelimit-box">
        <h4>⏳ Tạm thời chạm giới hạn Gemini API</h4>
        <p>Hạn mức yêu cầu miễn phí (Free Tier) đang tạm thời quá tải hoặc đang trong chu kỳ hồi phục (RPM/RPD).</p>
        <div class="pi-ratelimit-tip">
          💡 <strong>Gợi ý:</strong> Vui lòng đợi khoảng <strong>${escapeHtml(String(retrySeconds))} giây</strong> rồi bấm nút <em>"Thử lại ngay"</em> hoặc thử lại sau.
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
        ${promptText ? `<button class="pi-btn pi-btn-insert pi-btn-error-retry" id="piBtnErrorRetry">🔄 Thử lại ngay</button>` : ''}
      </div>
    `;

    if (promptText) {
      body.querySelector('#piBtnErrorRetry')?.addEventListener('click', () => {
        openImproveModal(promptText, currentActivePersona);
      });
    }
  } else {
    taskBadge.textContent = '❌ Lỗi';
    body.innerHTML = `
      <div class="pi-error-box">
        <h4>Không thể cải thiện prompt</h4>
        <p>${escapeHtml(errorMsg)}</p>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
        ${promptText ? `<button class="pi-btn pi-btn-insert pi-btn-error-retry" id="piBtnErrorRetry">🔄 Thử lại ngay</button>` : ''}
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
  toast.textContent = message;

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
    <span>✨ Đã áp dụng prompt mới!</span>
    <button class="pi-toast-undo-btn">↩️ Hoàn tác</button>
  `;

  const undoBtn = toast.querySelector('.pi-toast-undo-btn');
  undoBtn.addEventListener('click', () => {
    if (activeInputElement && previousPrompt) {
      setPromptToInput(activeInputElement, previousPrompt);
      showToast('↩️ Đã khôi phục prompt gốc!', 'info');
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
