/**
 * content.js — Universal Prompt Improver Content Script (MV3)
 * 
 * Hỗ trợ tự động:
 * 1. Claude.ai (Next to Attach button in toolbar)
 * 2. ChatGPT (chatgpt.com & chat.openai.com) (Next to Attach / Tools button)
 * 3. Google Gemini & AI Studio (gemini.google.com, aistudio.google.com)
 * 4. DeepSeek (chat.deepseek.com)
 * 5. Microsoft Copilot (copilot.microsoft.com)
 * 6. Perplexity AI (perplexity.ai)
 * 7. Phind, Poe, HuggingChat, Groq, và mọi web chat khác!
 */

// ─── HÀM ƯỚC TÍNH TOKEN ──────────────────────────────────────────────────────
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

// ─── CẤU HÌNH DOM SELECTORS TOÀN DIỆN CHO CÁC NỀN TẢNG AI CHAT ────────────────
const SITE_SELECTORS = {
  // Claude
  'claude.ai': [
    'div[contenteditable="true"][data-testid="chat-input"]',
    'div[contenteditable="true"].ProseMirror',
    'div.tiptap.ProseMirror',
    'div[contenteditable="true"]',
  ],
  // ChatGPT
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
  // DeepSeek
  'deepseek.com': [
    'textarea#chat-input',
    'textarea[placeholder*="DeepSeek" i]',
    'textarea',
    'div[contenteditable="true"]',
  ],
  // Gemini & Google AI Studio
  'gemini.google.com': [
    'div.ql-editor',
    'rich-textarea div[contenteditable]',
    'div[contenteditable="true"]',
  ],
  'aistudio.google.com': [
    'textarea[placeholder]',
    'div[contenteditable="true"]',
  ],
  // Microsoft Copilot
  'copilot.microsoft.com': [
    'textarea#userInput',
    'textarea[placeholder*="Ask" i]',
    'div[role="textbox"]',
    'textarea',
  ],
  // Perplexity AI
  'perplexity.ai': [
    'textarea[placeholder*="Ask" i]',
    'textarea',
  ],
  // Phind, Poe, HuggingFace
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

// Danh sách selectors nút Attach / Tools trên các nền tảng
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

// Danh sách selectors nút Gửi (Send)
const SEND_BTN_SELECTORS = [
  'button[data-testid="chat-input-send"]',        // Claude
  'button[data-testid="send-button"]',            // ChatGPT
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

// ─── TRẠNG THÁI TOÀN CỤC ────────────────────────────────────────────────────
let activeInputElement = null;
let lastOriginalPrompt = '';
let isExtensionEnabledForSite = true;
let modalShadowRoot = null;
let hasInitialized = false;

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

  // 2. Chèn nút vào Toolbar ngay lập tức
  scanAndInjectToolbarButton();

  // 3. Theo dõi DOM thay đổi (SPA navigation)
  const observer = new MutationObserver(debounce(() => {
    if (isExtensionEnabledForSite) {
      scanAndInjectToolbarButton();
    }
  }, 200));

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 4. Polling định kỳ mỗi 1s
  setInterval(() => {
    if (isExtensionEnabledForSite) {
      scanAndInjectToolbarButton();
    }
  }, 1000);

  // 5. Lắng nghe context menu click
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'TRIGGER_IMPROVE_FROM_SELECTION' && msg.text) {
      openImproveModal(msg.text);
    }
  });

  console.log('[PromptImprover] Content script đã kích hoạt trên:', hostname);
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

    // Inject self-hosted @font-face declarations (MV3 CSP-safe)
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

  // 1. Theo từng domain cụ thể
  for (const [domain, selectors] of Object.entries(SITE_SELECTORS)) {
    if (host.includes(domain)) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && isElementVisible(el)) return el;
      }
    }
  }

  // 2. Generic fallback cho mọi web
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

// ─── CHÈN NÚT "✨ CẢI THIỆN" VÀO THANH CÔNG CỤ TOOLBAR (DOM FLOW) ──────────────
function scanAndInjectButton() {
  scanAndInjectToolbarButton();
}

function scanAndInjectToolbarButton() {
  const inputEl = findTargetChatInput();
  if (!inputEl) return;

  activeInputElement = inputEl;

  // Nếu nút đã tồn tại trong DOM và kết nối tốt, bỏ qua
  const existingHost = document.getElementById('pi-btn-host');
  if (existingHost && document.body.contains(existingHost)) {
    return;
  }

  // 1. Tạo Host Element chứa Shadow DOM cho nút (cô lập CSS hoàn toàn)
  const hostEl = document.createElement('div');
  hostEl.id = 'pi-btn-host';
  hostEl.style.display = 'inline-flex';
  hostEl.style.alignItems = 'center';
  hostEl.style.verticalAlign = 'middle';
  hostEl.style.pointerEvents = 'auto';

  const shadow = hostEl.attachShadow({ mode: 'open' });

  // Inject self-hosted @font-face declarations using absolute extension URLs (MV3 CSP-safe)
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
  btn.title = 'Cải thiện prompt với Gemini 3.6 Flash (Prompt Improver)';
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

  // 2. CHIẾN LƯỢC 1: Tìm nút Attach / Đính kèm / + trên Toolbar
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

  // 3. CHIẾN LƯỢC 2: Tìm cụm nút Gửi (Send / Submit)
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

  // 4. CHIẾN LƯỢC 3: Chèn vào Toolbar hoặc Composer Wrapper của Input
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

// ─── HIỂN THỊ MODAL CẢI THIỆN PROMPT ─────────────────────────────────────────
async function openImproveModal(promptText) {
  if (!modalShadowRoot) createModalShadowHost();

  const oldModal = modalShadowRoot.querySelector('.pi-overlay-backdrop');
  if (oldModal) oldModal.remove();

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
    <div id="piModalBody" class="pi-body">
      <div class="pi-skeleton-box">
        <div class="pi-spinner"></div>
        <div class="pi-loading-text">Đang tối ưu hóa prompt với Gemini 3.6 Flash...</div>
        <div class="pi-loading-subtext">Đang tạo 2 phiên bản (Tối giản & Chi tiết) và phân tích giả định</div>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  modalShadowRoot.appendChild(backdrop);

  const closeBtn = modal.querySelector('#piBtnClose');
  const closeModal = () => backdrop.remove();
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      window.removeEventListener('keydown', handleEsc);
    }
  };
  window.addEventListener('keydown', handleEsc);

  try {
    const res = await chrome.runtime.sendMessage({
      action: 'IMPROVE_PROMPT',
      payload: { prompt: promptText },
    });

    if (!res || !res.success) {
      throw new Error(res?.error || 'Không nhận được phản hồi từ backend.');
    }

    renderModalContent(modal, promptText, res);
  } catch (err) {
    renderModalError(modal, err.message);
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

  body.innerHTML = `
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

  // Gắn sự kiện "Dùng bản này" (Apply) & Kích hoạt Hoàn tác (Undo)
  body.querySelectorAll('.pi-btn-apply').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newPrompt = decodeURIComponent(btn.dataset.apply);
      lastOriginalPrompt = originalPrompt;

      if (activeInputElement) {
        setPromptToInput(activeInputElement, newPrompt);
      }

      const backdrop = modalShadowRoot.querySelector('.pi-overlay-backdrop');
      if (backdrop) backdrop.remove();

      showUndoToast(originalPrompt);
    });
  });
}

// ─── RENDER LỖI VÀO MODAL ───────────────────────────────────────────────────
function renderModalError(modal, errorMsg) {
  const body = modal.querySelector('#piModalBody');
  const taskBadge = modal.querySelector('#piTaskBadge');
  taskBadge.textContent = '❌ Lỗi';

  body.innerHTML = `
    <div class="pi-error-box">
      <h4>Không thể cải thiện prompt</h4>
      <p>${escapeHtml(errorMsg)}</p>
    </div>
    <div style="text-align: right; margin-top: 10px;">
      <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
    </div>
  `;

  body.querySelector('.pi-btn-error-close')?.addEventListener('click', () => {
    modal.closest('.pi-overlay-backdrop')?.remove();
  });
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
    if (modalShadowRoot.contains(toast)) {
      toast.style.opacity = '0';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 10000);
}

// ─── TIỆN ÍCH TRỢ GIÚP ──────────────────────────────────────────────────────
function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
