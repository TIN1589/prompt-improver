/**
 * popup.js — Logic điều khiển Popup giao diện Prompt Improver v2.0
 */

import { escapeHtml } from './utils.js';
import { iconSvg } from './icons.js';

const SITE_LABELS = {
  'chatgpt.com': 'ChatGPT (chatgpt.com)',
  'chat.openai.com': 'ChatGPT Legacy (chat.openai.com)',
  'claude.ai': 'Claude.ai (Anthropic)',
  'deepseek.com': 'DeepSeek (chat.deepseek.com)',
  'gemini.google.com': 'Google Gemini (gemini.google.com)',
  'aistudio.google.com': 'Google AI Studio',
  'copilot.microsoft.com': 'Microsoft Copilot',
  'perplexity.ai': 'Perplexity AI',
  'phind.com': 'Phind Code AI',
  'poe.com': 'Poe (Quora)',
};

// DOM Elements
const txtVersion = document.getElementById('txtVersion');
const serverStatusBadge = document.getElementById('serverStatusBadge');
const serverStatusText = document.getElementById('serverStatusText');

const tabButtons = document.querySelectorAll('.pi-tab-btn');
const tabPanes = document.querySelectorAll('.pi-tab-pane');

// Settings Tab
const inputBackendUrl = document.getElementById('inputBackendUrl');
const btnPingBackend = document.getElementById('btnPingBackend');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const pingResult = document.getElementById('pingResult');
const siteTogglesList = document.getElementById('siteTogglesList');
const chkEnableCache = document.getElementById('chkEnableCache');
const txtCacheCount = document.getElementById('txtCacheCount');
const btnClearCache = document.getElementById('btnClearCache');

// Quick Test Tab
const testPromptInput = document.getElementById('testPromptInput');
const btnRunTest = document.getElementById('btnRunTest');
const testAlert = document.getElementById('testAlert');
const testResultBox = document.getElementById('testResultBox');
const testMinText = document.getElementById('testMinText');
const testDetText = document.getElementById('testDetText');
const btnCopyTestMin = document.getElementById('btnCopyTestMin');
const btnCopyTestDet = document.getElementById('btnCopyTestDet');
const testAssumptionsBox = document.getElementById('testAssumptionsBox');
const testAssumptionsList = document.getElementById('testAssumptionsList');

// History Tab
const historyListContainer = document.getElementById('historyListContainer');
const btnClearHistory = document.getElementById('btnClearHistory');

// ─── KHỞI CHẠY (INITIALIZATION) ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Hiển thị phiên bản
  chrome.runtime.sendMessage({ action: 'GET_VERSION' }, (res) => {
    if (res?.version) txtVersion.textContent = `v${res.version}`;
  });

  // 2. Tải cấu hình hiện tại
  await loadSettings();
  await loadCacheStats();
  await loadHistory();

  // 3. Khởi tạo Tabs
  initTabs();

  // 4. Gắn các sự kiện tương tác
  btnPingBackend.addEventListener('click', handlePingBackend);
  btnSaveSettings.addEventListener('click', handleSaveSettings);
  btnClearCache.addEventListener('click', handleClearCache);
  btnRunTest.addEventListener('click', handleRunQuickTest);
  btnCopyTestMin.addEventListener('click', () => copyText(testMinText.textContent, btnCopyTestMin));
  btnCopyTestDet.addEventListener('click', () => copyText(testDetText.textContent, btnCopyTestDet));
  btnClearHistory.addEventListener('click', handleClearHistory);
});

// ─── TAB NAVIGATION ─────────────────────────────────────────────────────────
function initTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add('active');

      if (btn.dataset.tab === 'history') {
        loadHistory();
      }
    });
  });
}

// ─── LOAD & SAVE SETTINGS ───────────────────────────────────────────────────
async function loadSettings() {
  const data = await chrome.storage.local.get(['backendUrl', 'enableCache', 'siteSettings']);
  
  if (data.backendUrl) {
    inputBackendUrl.value = data.backendUrl;
    checkServerStatus(data.backendUrl);
  }

  chkEnableCache.checked = data.enableCache !== false;

  // Render danh sách site toggles
  const siteSettings = data.siteSettings || {};
  siteTogglesList.innerHTML = '';

  for (const [domain, label] of Object.entries(SITE_LABELS)) {
    const isChecked = siteSettings[domain] !== false;
    const item = document.createElement('div');
    item.className = 'pi-toggle-item';
    item.innerHTML = `
      <span>${label}</span>
      <label class="pi-checkbox-label">
        <input type="checkbox" data-site="${domain}" ${isChecked ? 'checked' : ''}>
      </label>
    `;

    item.querySelector('input').addEventListener('change', async (e) => {
      const updatedSites = (await chrome.storage.local.get(['siteSettings'])).siteSettings || {};
      updatedSites[domain] = e.target.checked;
      await chrome.storage.local.set({ siteSettings: updatedSites });
    });

    siteTogglesList.appendChild(item);
  }
}

async function handleSaveSettings() {
  const url = inputBackendUrl.value.trim().replace(/\/+$/, '');
  const enableCache = chkEnableCache.checked;

  await chrome.storage.local.set({
    backendUrl: url,
    enableCache,
  });

  showAlert(pingResult, `${iconSvg('i-check-circle', 'pi-icon-ok')} Đã lưu cấu hình thành công!`, 'success');
  if (url) {
    checkServerStatus(url);
  }
}

// ─── PING & STATUS CHECK ────────────────────────────────────────────────────
async function handlePingBackend() {
  const url = inputBackendUrl.value.trim();
  if (!url) {
    showAlert(pingResult, `${iconSvg('i-warn', 'pi-icon-warn')} Vui lòng nhập URL Backend Cloudflare Worker.`, 'error');
    return;
  }

  btnPingBackend.disabled = true;
  btnPingBackend.innerHTML = `${iconSvg('i-refresh', 'pi-icon-spin')} Đang kiểm tra...`;

  try {
    const res = await chrome.runtime.sendMessage({
      action: 'PING_BACKEND',
      url,
    });

    if (res && res.online) {
      const keyNotice = res.hasApiKey ? '• Có API Key' : `• ${iconSvg('i-warn', 'pi-icon-warn')} Chưa có API Key`;
      const msg = `${iconSvg('i-dot', 'pi-icon-ok')} Kết nối thành công (${res.latencyMs}ms)! ${escapeHtml(res.info || '')} ${keyNotice}`;
      showAlert(pingResult, msg, 'success');
      updateStatusBadge(true, `${res.latencyMs}ms`);
    } else {
      showAlert(pingResult, `${iconSvg('i-x-circle', 'pi-icon-danger')} Không thể kết nối: ${escapeHtml(res?.error || 'Lỗi mạng')}`, 'error');
      updateStatusBadge(false, 'Offline');
    }
  } catch (err) {
    showAlert(pingResult, `${iconSvg('i-x-circle', 'pi-icon-danger')} Lỗi: ${escapeHtml(err.message)}`, 'error');
    updateStatusBadge(false, 'Lỗi');
  } finally {
    btnPingBackend.disabled = false;
    btnPingBackend.innerHTML = `${iconSvg('i-wifi')} Kiểm tra kết nối`;
  }
}

async function checkServerStatus(url) {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'PING_BACKEND', url });
    if (res && res.online) {
      updateStatusBadge(true, `${res.latencyMs}ms`);
    } else {
      updateStatusBadge(false, 'Offline');
    }
  } catch {
    updateStatusBadge(false, 'Offline');
  }
}

function updateStatusBadge(isOnline, text) {
  serverStatusBadge.className = `pi-status-indicator ${isOnline ? 'status-online' : 'status-offline'}`;
  serverStatusText.textContent = text;
}

// ─── CACHE STATS & CLEAR ────────────────────────────────────────────────────
async function loadCacheStats() {
  chrome.runtime.sendMessage({ action: 'GET_CACHE_STATS' }, (res) => {
    if (res?.cacheCount !== undefined) {
      txtCacheCount.textContent = `${res.cacheCount} mục`;
    }
  });
}

async function handleClearCache() {
  chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, () => {
    txtCacheCount.textContent = '0 mục';
    showAlert(pingResult, `${iconSvg('i-check-circle', 'pi-icon-ok')} Đã xóa sạch cache prompt!`, 'success');
  });
}

// ─── QUICK TEST ─────────────────────────────────────────────────────────────
async function handleRunQuickTest() {
  const prompt = testPromptInput.value.trim();
  if (!prompt) {
    showAlert(testAlert, `${iconSvg('i-warn', 'pi-icon-warn')} Vui lòng nhập prompt cần thử nghiệm!`, 'error');
    return;
  }

  btnRunTest.disabled = true;
  btnRunTest.innerHTML = `${iconSvg('i-refresh', 'pi-icon-spin')} Đang tối ưu hóa...`;
  testResultBox.style.display = 'none';
  testAlert.style.display = 'none';

  try {
    const res = await chrome.runtime.sendMessage({
      action: 'IMPROVE_PROMPT',
      payload: { prompt },
    });

    if (!res || !res.success) {
      if (res?.isRateLimit || res?.error?.includes('429') || res?.error?.includes('RATE_LIMIT') || res?.error?.includes('Quota')) {
        const waitTime = res?.retryAfterSeconds || 15;
        throw new Error(`Quá giới hạn Gemini API (Rate limit 429). Vui lòng đợi ~${waitTime}s trước khi thử lại.`);
      }
      throw new Error(res?.error || 'Không nhận được kết quả từ backend.');
    }

    testMinText.textContent = res.minimal || '';
    testDetText.textContent = res.detailed || '';

    if (res.assumptions && res.assumptions.length > 0) {
      testAssumptionsList.innerHTML = res.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join('');
      testAssumptionsBox.style.display = 'block';
    } else {
      testAssumptionsBox.style.display = 'none';
    }

    testResultBox.style.display = 'block';
    loadCacheStats();
  } catch (err) {
    showAlert(testAlert, `${iconSvg('i-x-circle', 'pi-icon-danger')} ${escapeHtml(err.message)}`, 'error');
  } finally {
    btnRunTest.disabled = false;
    btnRunTest.innerHTML = `${iconSvg('i-spark')} Cải thiện ngay`;
  }
}

// ─── HISTORY ────────────────────────────────────────────────────────────────
async function loadHistory() {
  const data = await chrome.storage.local.get(['cco_history']);
  const history = Array.isArray(data.cco_history) ? data.cco_history : [];

  if (history.length === 0) {
    historyListContainer.innerHTML = '<div class="empty-state">Chưa có lịch sử cải thiện prompt nào.</div>';
    return;
  }

  historyListContainer.innerHTML = '';
  history.forEach(item => {
    const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
    const div = document.createElement('div');
    div.className = 'pi-history-item';
    div.innerHTML = `
      <div class="pi-history-header">
        <span class="pi-badge-sm">${escapeHtml(item.persona || item.taskType || 'prompt')}</span>
        ${item.improvedScore ? `<span class="pi-badge-sm" style="background:#dcfce7;color:#15803d;border-color:#15803d;display:inline-flex;align-items:center;gap:3px;">${iconSvg('i-star', 'pi-icon-warn', 'style="width:12px;height:12px;"')} ${item.improvedScore}/100</span>` : ''}
        <span class="pi-history-date">${dateStr}</span>
      </div>
      <div class="pi-history-prompt" title="${escapeHtml(item.prompt)}">
        <strong>Gốc:</strong> ${escapeHtml(item.prompt)}
      </div>
      <div class="pi-btn-row" style="margin-top: 6px;">
        <button class="pi-btn-copy-sm" data-copy="min">${iconSvg('i-copy')} Chép Tối giản</button>
        <button class="pi-btn-copy-sm" data-copy="det">${iconSvg('i-copy')} Chép Chi tiết</button>
      </div>
    `;

    div.querySelector('[data-copy="min"]').addEventListener('click', (e) => {
      copyText(item.minimal, e.currentTarget);
    });
    div.querySelector('[data-copy="det"]').addEventListener('click', (e) => {
      copyText(item.detailed, e.currentTarget);
    });

    historyListContainer.appendChild(div);
  });
}

function handleClearHistory() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử?')) {
    chrome.runtime.sendMessage({ action: 'CLEAR_HISTORY' }, () => {
      loadHistory();
    });
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
async function copyText(text, btnEl) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const oldHtml = btnEl.innerHTML;
    btnEl.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} Đã chép!`;
    setTimeout(() => {
      btnEl.innerHTML = oldHtml;
    }, 1500);
  } catch (e) {
    console.warn('Lỗi chép clipboard:', e);
  }
}

function showAlert(el, msg, type = 'success') {
  el.className = `pi-alert-box ${type === 'success' ? 'pi-alert-success' : 'pi-alert-error'}`;
  el.innerHTML = msg;
  el.style.display = 'block';
}
