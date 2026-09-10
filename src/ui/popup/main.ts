/**
 * main.ts — Popup UI Controller (TypeScript, Manifest V3 Clean Architecture)
 */

import { escapeHtml } from '../../shared/utils/entity-extractor';
import { iconSvg } from '../../shared/utils/svg-icons';
import { MessageClient } from '../../infrastructure/messaging/message-client';
import { SettingsRepository } from '../../infrastructure/storage/settings.repository';
import { HistoryRepository } from '../../infrastructure/storage/history.repository';
import type {
  VersionResult,
  PingResult,
  CacheStatsResult,
  ClearCacheResult,
  PromptImproveResult,
} from '../../shared/types/messages';
import type { SiteSettings } from '../../shared/types/settings';

const SITE_LABELS: Record<string, string> = {
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
const txtVersion = document.getElementById('txtVersion') as HTMLElement;
const serverStatusBadge = document.getElementById('serverStatusBadge') as HTMLElement;
const serverStatusText = document.getElementById('serverStatusText') as HTMLElement;

const tabButtons = document.querySelectorAll<HTMLButtonElement>('.pi-tab-btn');
const tabPanes = document.querySelectorAll<HTMLElement>('.pi-tab-pane');

// Settings Tab
const inputBackendUrl = document.getElementById('inputBackendUrl') as HTMLInputElement;
const btnPingBackend = document.getElementById('btnPingBackend') as HTMLButtonElement;
const btnSaveSettings = document.getElementById('btnSaveSettings') as HTMLButtonElement;
const pingResult = document.getElementById('pingResult') as HTMLElement;
const siteTogglesList = document.getElementById('siteTogglesList') as HTMLElement;
const chkEnableCache = document.getElementById('chkEnableCache') as HTMLInputElement;
const txtCacheCount = document.getElementById('txtCacheCount') as HTMLElement;
const btnClearCache = document.getElementById('btnClearCache') as HTMLButtonElement;

// Quick Test Tab
const testPromptInput = document.getElementById('testPromptInput') as HTMLTextAreaElement;
const btnRunTest = document.getElementById('btnRunTest') as HTMLButtonElement;
const testAlert = document.getElementById('testAlert') as HTMLElement;
const testResultBox = document.getElementById('testResultBox') as HTMLElement;
const testMinText = document.getElementById('testMinText') as HTMLElement;
const testDetText = document.getElementById('testDetText') as HTMLElement;
const btnCopyTestMin = document.getElementById('btnCopyTestMin') as HTMLButtonElement;
const btnCopyTestDet = document.getElementById('btnCopyTestDet') as HTMLButtonElement;
const testAssumptionsBox = document.getElementById('testAssumptionsBox') as HTMLElement;
const testAssumptionsList = document.getElementById('testAssumptionsList') as HTMLElement;

// History Tab
const historyListContainer = document.getElementById('historyListContainer') as HTMLElement;
const btnClearHistory = document.getElementById('btnClearHistory') as HTMLButtonElement;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Hiển thị version
  try {
    const res = await MessageClient.send<VersionResult>({ type: 'SYSTEM:GET_VERSION' });
    if (res?.version && txtVersion) {
      txtVersion.textContent = `v${res.version}`;
    }
  } catch (_) {}

  // 2. Tải cấu hình & trạng thái
  await loadSettings();
  await loadCacheStats();
  await loadHistory();

  // 3. Khởi tạo tabs
  initTabs();

  // 4. Gắn sự kiện
  btnPingBackend?.addEventListener('click', handlePingBackend);
  btnSaveSettings?.addEventListener('click', handleSaveSettings);
  btnClearCache?.addEventListener('click', handleClearCache);
  btnRunTest?.addEventListener('click', handleRunQuickTest);
  btnCopyTestMin?.addEventListener('click', () => copyText(testMinText?.textContent || '', btnCopyTestMin));
  btnCopyTestDet?.addEventListener('click', () => copyText(testDetText?.textContent || '', btnCopyTestDet));
  btnClearHistory?.addEventListener('click', handleClearHistory);
});

function initTabs(): void {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'history') {
        loadHistory();
      }
    });
  });
}

async function loadSettings(): Promise<void> {
  const settings = await SettingsRepository.getSettings();

  if (inputBackendUrl) inputBackendUrl.value = settings.backendUrl || '';
  if (chkEnableCache) chkEnableCache.checked = settings.enableCache !== false;

  renderSiteToggles(settings.siteSettings || {});

  if (settings.backendUrl) {
    handlePingBackend();
  }
}

function renderSiteToggles(siteSettings: SiteSettings): void {
  if (!siteTogglesList) return;
  siteTogglesList.innerHTML = '';

  Object.entries(SITE_LABELS).forEach(([domain, label]) => {
    const isEnabled = siteSettings[domain] !== false;
    const item = document.createElement('div');
    item.className = 'pi-toggle-item';
    item.innerHTML = `
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" id="site_${domain.replace(/[^a-z0-9]/g, '_')}" data-domain="${domain}" ${isEnabled ? 'checked' : ''}>
    `;
    siteTogglesList.appendChild(item);
  });
}

async function handleSaveSettings(): Promise<void> {
  const backendUrl = inputBackendUrl.value.trim();
  const enableCache = chkEnableCache.checked;

  const siteSettings: SiteSettings = {};
  siteTogglesList.querySelectorAll<HTMLInputElement>('input[data-domain]').forEach((chk) => {
    const domain = chk.dataset.domain;
    if (domain) {
      siteSettings[domain] = chk.checked;
    }
  });

  await SettingsRepository.updateSettings({
    backendUrl,
    enableCache,
    siteSettings,
  });

  if (btnSaveSettings) {
    const oldHtml = btnSaveSettings.innerHTML;
    btnSaveSettings.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} Đã lưu!`;
    setTimeout(() => {
      btnSaveSettings.innerHTML = oldHtml;
    }, 1500);
  }
}

async function handlePingBackend(): Promise<void> {
  const url = inputBackendUrl?.value.trim();
  if (!url) {
    showPingResult('Vui lòng nhập Backend URL!', false);
    return;
  }

  setServerBadge('checking', 'Đang kiểm tra...');
  if (btnPingBackend) btnPingBackend.disabled = true;

  try {
    const res = await MessageClient.send<PingResult>({
      type: 'BACKEND:PING',
      payload: { url },
    });

    if (res.online) {
      setServerBadge('online', `Online (${res.latencyMs}ms)`);
      showPingResult(`Kết nối thành công! Độ trễ: ${res.latencyMs}ms.`, true);
    } else {
      setServerBadge('offline', 'Offline');
      showPingResult('Không thể kết nối đến máy chủ.', false);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setServerBadge('offline', 'Lỗi');
    showPingResult(msg, false);
  } finally {
    if (btnPingBackend) btnPingBackend.disabled = false;
  }
}

function setServerBadge(status: 'online' | 'offline' | 'checking', text: string): void {
  if (!serverStatusBadge || !serverStatusText) return;
  serverStatusBadge.className = 'pi-status-indicator';
  if (status === 'online') serverStatusBadge.classList.add('status-online');
  else if (status === 'offline') serverStatusBadge.classList.add('status-offline');
  serverStatusText.textContent = text;
}

function showPingResult(msg: string, success: boolean): void {
  if (!pingResult) return;
  pingResult.style.display = 'block';
  pingResult.className = `pi-alert-box ${success ? 'pi-alert-success' : 'pi-alert-error'}`;
  pingResult.textContent = msg;
  setTimeout(() => {
    pingResult.style.display = 'none';
  }, 4000);
}

async function loadCacheStats(): Promise<void> {
  try {
    const res = await MessageClient.send<CacheStatsResult>({ type: 'CACHE:GET_STATS' });
    if (txtCacheCount) {
      txtCacheCount.textContent = `${res.cacheCount} mục`;
    }
  } catch (_) {}
}

async function handleClearCache(): Promise<void> {
  try {
    const res = await MessageClient.send<ClearCacheResult>({ type: 'CACHE:CLEAR' });
    if (txtCacheCount) {
      txtCacheCount.textContent = '0 mục';
    }
    if (btnClearCache) {
      const oldHtml = btnClearCache.innerHTML;
      btnClearCache.innerHTML = `${iconSvg('i-check')} Đã xóa ${res.clearedCount} mục`;
      setTimeout(() => {
        btnClearCache.innerHTML = oldHtml;
      }, 1500);
    }
  } catch (_) {}
}

async function handleRunQuickTest(): Promise<void> {
  const prompt = testPromptInput?.value.trim();
  if (!prompt) {
    showTestAlert('Vui lòng nhập prompt mẫu!', 'error');
    return;
  }

  if (btnRunTest) {
    btnRunTest.disabled = true;
    btnRunTest.innerHTML = `${iconSvg('i-refresh', 'pi-icon-spin')} Đang tối ưu...`;
  }
  if (testResultBox) testResultBox.style.display = 'none';

  try {
    const res = await MessageClient.send<PromptImproveResult>({
      type: 'PROMPT:IMPROVE',
      payload: { prompt, persona: 'developer' },
    });

    if (testMinText) testMinText.textContent = res.minimal || '';
    if (testDetText) testDetText.textContent = res.detailed || '';

    if (res.assumptions && res.assumptions.length > 0 && testAssumptionsBox && testAssumptionsList) {
      testAssumptionsList.innerHTML = res.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('');
      testAssumptionsBox.style.display = 'block';
    } else if (testAssumptionsBox) {
      testAssumptionsBox.style.display = 'none';
    }

    if (testResultBox) testResultBox.style.display = 'block';
    showTestAlert('Đã tối ưu thành công!', 'success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showTestAlert(msg, 'error');
  } finally {
    if (btnRunTest) {
      btnRunTest.disabled = false;
      btnRunTest.innerHTML = `${iconSvg('i-play')} Chạy thử`;
    }
  }
}

function showTestAlert(msg: string, type: 'success' | 'error'): void {
  if (!testAlert) return;
  testAlert.style.display = 'block';
  testAlert.className = `pi-alert-box ${type === 'success' ? 'pi-alert-success' : 'pi-alert-error'}`;
  testAlert.textContent = msg;
}

async function loadHistory(): Promise<void> {
  if (!historyListContainer) return;
  const history = await HistoryRepository.getHistory();

  if (history.length === 0) {
    historyListContainer.innerHTML = '<div class="empty-state">Chưa có lịch sử tối ưu prompt nào.</div>';
    return;
  }

  historyListContainer.innerHTML = history
    .map(
      (item) => `
      <div class="pi-history-item">
        <div class="pi-history-header">
          <span class="pi-badge-sm">${escapeHtml(item.persona || 'developer')}</span>
          <span class="pi-history-date">${new Date(item.timestamp).toLocaleString('vi-VN')}</span>
        </div>
        <div class="pi-history-prompt" title="${escapeHtml(item.prompt)}">
          <strong>Gốc:</strong> ${escapeHtml(item.prompt)}
        </div>
        ${
          item.detailed
            ? `<div class="pi-code-preview" style="max-height: 80px; margin-top: 4px;">${escapeHtml(item.detailed)}</div>`
            : ''
        }
      </div>
    `
    )
    .join('');
}

async function handleClearHistory(): Promise<void> {
  await MessageClient.send({ type: 'HISTORY:CLEAR' });
  await loadHistory();
}

async function copyText(text: string, btn: HTMLButtonElement): Promise<void> {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  const oldHtml = btn.innerHTML;
  btn.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} Đã chép!`;
  setTimeout(() => {
    btn.innerHTML = oldHtml;
  }, 1500);
}
