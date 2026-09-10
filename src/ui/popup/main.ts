/**
 * main.ts — Popup UI Controller (TypeScript, Manifest V3 Clean Architecture)
 */

import { escapeHtml } from '../../shared/utils/entity-extractor';
import { iconSvg } from '../../shared/utils/svg-icons';
import { MessageClient } from '../../infrastructure/messaging/message-client';
import { SettingsRepository } from '../../infrastructure/storage/settings.repository';
import { HistoryRepository } from '../../infrastructure/storage/history.repository';
import { PingClient } from '../../infrastructure/api/ping-client';
import { normalizeBackendUrl, isPlaceholderUrl } from '../../shared/utils/url';
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

interface PopupElements {
  txtVersion: HTMLElement | null;
  serverStatusBadge: HTMLElement | null;
  serverStatusText: HTMLElement | null;

  tabButtons: NodeListOf<HTMLButtonElement>;
  tabPanes: NodeListOf<HTMLElement>;

  // Settings Tab
  inputBackendUrl: HTMLInputElement | null;
  btnPingBackend: HTMLButtonElement | null;
  btnSaveSettings: HTMLButtonElement | null;
  pingResult: HTMLElement | null;
  siteTogglesList: HTMLElement | null;
  chkEnableCache: HTMLInputElement | null;
  txtCacheCount: HTMLElement | null;
  btnClearCache: HTMLButtonElement | null;

  // Quick Test Tab
  testPromptInput: HTMLTextAreaElement | null;
  btnRunTest: HTMLButtonElement | null;
  testAlert: HTMLElement | null;
  testResultBox: HTMLElement | null;
  testMinText: HTMLElement | null;
  testDetText: HTMLElement | null;
  btnCopyTestMin: HTMLButtonElement | null;
  btnCopyTestDet: HTMLButtonElement | null;
  testAssumptionsBox: HTMLElement | null;
  testAssumptionsList: HTMLElement | null;

  // History Tab
  historyListContainer: HTMLElement | null;
  btnClearHistory: HTMLButtonElement | null;
}

function queryElements(): PopupElements {
  return {
    txtVersion: document.getElementById('txtVersion'),
    serverStatusBadge: document.getElementById('serverStatusBadge'),
    serverStatusText: document.getElementById('serverStatusText'),

    tabButtons: document.querySelectorAll<HTMLButtonElement>('.pi-tab-btn'),
    tabPanes: document.querySelectorAll<HTMLElement>('.pi-tab-pane'),

    inputBackendUrl: document.getElementById('inputBackendUrl') as HTMLInputElement | null,
    btnPingBackend: document.getElementById('btnPingBackend') as HTMLButtonElement | null,
    btnSaveSettings: document.getElementById('btnSaveSettings') as HTMLButtonElement | null,
    pingResult: document.getElementById('pingResult'),
    siteTogglesList: document.getElementById('siteTogglesList'),
    chkEnableCache: document.getElementById('chkEnableCache') as HTMLInputElement | null,
    txtCacheCount: document.getElementById('txtCacheCount'),
    btnClearCache: document.getElementById('btnClearCache') as HTMLButtonElement | null,

    testPromptInput: document.getElementById('testPromptInput') as HTMLTextAreaElement | null,
    btnRunTest: document.getElementById('btnRunTest') as HTMLButtonElement | null,
    testAlert: document.getElementById('testAlert'),
    testResultBox: document.getElementById('testResultBox'),
    testMinText: document.getElementById('testMinText'),
    testDetText: document.getElementById('testDetText'),
    btnCopyTestMin: document.getElementById('btnCopyTestMin') as HTMLButtonElement | null,
    btnCopyTestDet: document.getElementById('btnCopyTestDet') as HTMLButtonElement | null,
    testAssumptionsBox: document.getElementById('testAssumptionsBox'),
    testAssumptionsList: document.getElementById('testAssumptionsList'),

    historyListContainer: document.getElementById('historyListContainer'),
    btnClearHistory: document.getElementById('btnClearHistory') as HTMLButtonElement | null,
  };
}

function bootstrapPopup(): void {
  const dom = queryElements();

  // 1. Khởi tạo tabs ngay lập tức (đồng bộ)
  initTabs(dom);

  // 2. Gắn sự kiện cho các nút ngay lập tức (đồng bộ)
  setupEventListeners(dom);

  // 3. Tải các khối dữ liệu bất đồng bộ độc lập (không chặn lẫn nhau)
  loadVersion(dom).catch(() => {});
  loadSettings(dom).catch((err) => console.error('[Popup] Tải cấu hình lỗi:', err));
  loadCacheStats(dom).catch(() => {});
  loadHistory(dom).catch(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapPopup);
} else {
  bootstrapPopup();
}

function initTabs(dom: PopupElements): void {
  dom.tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      dom.tabButtons.forEach((b) => b.classList.remove('active'));
      dom.tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = `tab-${btn.dataset.tab}`;
      const target = document.getElementById(targetId);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'history') {
        loadHistory(dom);
      }
    });
  });
}

function setupEventListeners(dom: PopupElements): void {
  dom.btnPingBackend?.addEventListener('click', () => handlePingBackend(dom));
  dom.btnSaveSettings?.addEventListener('click', () => handleSaveSettings(dom));
  dom.btnClearCache?.addEventListener('click', () => handleClearCache(dom));
  dom.btnRunTest?.addEventListener('click', () => handleRunQuickTest(dom));
  dom.btnCopyTestMin?.addEventListener('click', () => copyText(dom.testMinText?.textContent || '', dom.btnCopyTestMin));
  dom.btnCopyTestDet?.addEventListener('click', () => copyText(dom.testDetText?.textContent || '', dom.btnCopyTestDet));
  dom.btnClearHistory?.addEventListener('click', () => handleClearHistory(dom));
}

async function loadVersion(dom: PopupElements): Promise<void> {
  try {
    const res = await MessageClient.send<VersionResult>({ type: 'SYSTEM:GET_VERSION' });
    if (res?.version && dom.txtVersion) {
      dom.txtVersion.textContent = `v${res.version}`;
    }
  } catch (_) {}
}

async function loadSettings(dom: PopupElements): Promise<void> {
  const settings = await SettingsRepository.getSettings();

  if (dom.inputBackendUrl) dom.inputBackendUrl.value = settings.backendUrl || '';
  if (dom.chkEnableCache) dom.chkEnableCache.checked = settings.enableCache !== false;

  renderSiteToggles(dom, settings.siteSettings || {});

  if (settings.backendUrl) {
    handlePingBackend(dom);
  }
}

function renderSiteToggles(dom: PopupElements, siteSettings: SiteSettings): void {
  const listEl = dom.siteTogglesList;
  if (!listEl) return;
  listEl.innerHTML = '';

  Object.entries(SITE_LABELS).forEach(([domain, label]) => {
    const isEnabled = siteSettings[domain] !== false;
    const item = document.createElement('div');
    item.className = 'pi-toggle-item';
    item.innerHTML = `
      <span>${escapeHtml(label)}</span>
      <label class="pi-checkbox-label">
        <input type="checkbox" id="site_${domain.replace(/[^a-z0-9]/g, '_')}" data-domain="${domain}" ${isEnabled ? 'checked' : ''}>
      </label>
    `;

    const chk = item.querySelector<HTMLInputElement>('input');
    chk?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const current = await SettingsRepository.getSettings();
      const updated = { ...(current.siteSettings || {}) };
      updated[domain] = target.checked;
      await SettingsRepository.updateSettings({ siteSettings: updated });
    });

    listEl.appendChild(item);
  });
}

async function handleSaveSettings(dom: PopupElements): Promise<void> {
  const rawUrl = dom.inputBackendUrl?.value.trim() || '';
  if (isPlaceholderUrl(rawUrl)) {
    showPingResult(
      dom,
      'URL đang chứa "xxx.workers.dev". Vui lòng thay bằng subdomain Worker thực tế của bạn trước khi lưu!',
      false
    );
    return;
  }

  const backendUrl = normalizeBackendUrl(rawUrl);
  if (dom.inputBackendUrl && rawUrl && dom.inputBackendUrl.value !== backendUrl) {
    dom.inputBackendUrl.value = backendUrl;
  }

  const enableCache = dom.chkEnableCache ? dom.chkEnableCache.checked : true;

  const siteSettings: SiteSettings = {};
  dom.siteTogglesList?.querySelectorAll<HTMLInputElement>('input[data-domain]').forEach((chk) => {
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

  if (dom.btnSaveSettings) {
    const oldHtml = dom.btnSaveSettings.innerHTML;
    dom.btnSaveSettings.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} Đã lưu!`;
    setTimeout(() => {
      if (dom.btnSaveSettings) dom.btnSaveSettings.innerHTML = oldHtml;
    }, 1500);
  }

  showPingResult(dom, 'Đã lưu cấu hình thành công!', true);

  if (backendUrl) {
    handlePingBackend(dom);
  }
}

async function handlePingBackend(dom: PopupElements): Promise<void> {
  const rawUrl = dom.inputBackendUrl?.value.trim() || '';
  if (!rawUrl) {
    showPingResult(dom, 'Vui lòng nhập Backend URL!', false);
    return;
  }

  if (isPlaceholderUrl(rawUrl)) {
    showPingResult(
      dom,
      'URL đang chứa "xxx.workers.dev". Vui lòng thay bằng subdomain Worker thực tế của bạn!',
      false
    );
    return;
  }

  const url = normalizeBackendUrl(rawUrl);
  if (dom.inputBackendUrl && dom.inputBackendUrl.value !== url) {
    dom.inputBackendUrl.value = url;
  }

  setServerBadge(dom, 'checking', 'Đang kiểm tra...');
  if (dom.btnPingBackend) {
    dom.btnPingBackend.disabled = true;
    dom.btnPingBackend.innerHTML = `${iconSvg('i-refresh', 'pi-icon-spin')} Đang kiểm tra...`;
  }

  try {
    const res = await PingClient.ping(url, 6000);

    if (res.online) {
      setServerBadge(dom, 'online', `Online (${res.latencyMs}ms)`);
      showPingResult(dom, `Kết nối thành công! Độ trễ: ${res.latencyMs}ms.`, true);
    } else {
      setServerBadge(dom, 'offline', 'Offline');
      showPingResult(dom, res.error || 'Không thể kết nối đến máy chủ.', false);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setServerBadge(dom, 'offline', 'Lỗi');
    showPingResult(dom, msg, false);
  } finally {
    if (dom.btnPingBackend) {
      dom.btnPingBackend.disabled = false;
      dom.btnPingBackend.innerHTML = `${iconSvg('i-wifi')} Kiểm tra kết nối`;
    }
  }
}

function setServerBadge(dom: PopupElements, status: 'online' | 'offline' | 'checking', text: string): void {
  if (!dom.serverStatusBadge || !dom.serverStatusText) return;
  dom.serverStatusBadge.className = 'pi-status-indicator';
  if (status === 'online') dom.serverStatusBadge.classList.add('status-online');
  else if (status === 'offline') dom.serverStatusBadge.classList.add('status-offline');
  dom.serverStatusText.textContent = text;
}

function showPingResult(dom: PopupElements, msg: string, success: boolean): void {
  if (!dom.pingResult) return;
  dom.pingResult.style.display = 'block';
  dom.pingResult.className = `pi-alert-box ${success ? 'pi-alert-success' : 'pi-alert-error'}`;
  dom.pingResult.textContent = msg;
  setTimeout(() => {
    if (dom.pingResult) dom.pingResult.style.display = 'none';
  }, 4000);
}

async function loadCacheStats(dom: PopupElements): Promise<void> {
  try {
    const res = await MessageClient.send<CacheStatsResult>({ type: 'CACHE:GET_STATS' });
    if (dom.txtCacheCount) {
      dom.txtCacheCount.textContent = `${res.cacheCount} mục`;
    }
  } catch (_) {}
}

async function handleClearCache(dom: PopupElements): Promise<void> {
  try {
    const res = await MessageClient.send<ClearCacheResult>({ type: 'CACHE:CLEAR' });
    if (dom.txtCacheCount) {
      dom.txtCacheCount.textContent = '0 mục';
    }
    if (dom.btnClearCache) {
      const oldHtml = dom.btnClearCache.innerHTML;
      dom.btnClearCache.innerHTML = `${iconSvg('i-check')} Đã xóa ${res.clearedCount} mục`;
      setTimeout(() => {
        if (dom.btnClearCache) dom.btnClearCache.innerHTML = oldHtml;
      }, 1500);
    }
  } catch (_) {}
}

async function handleRunQuickTest(dom: PopupElements): Promise<void> {
  const prompt = dom.testPromptInput?.value.trim();
  if (!prompt) {
    showTestAlert(dom, 'Vui lòng nhập prompt mẫu!', 'error');
    return;
  }

  // Kiểm tra trước URL Backend trong cấu hình
  const settings = await SettingsRepository.getSettings();
  const backendUrl = settings.backendUrl?.trim() || '';
  if (!backendUrl || isPlaceholderUrl(backendUrl)) {
    showTestAlert(
      dom,
      'Chưa cấu hình URL Cloudflare Worker hợp lệ! Vui lòng chuyển sang tab "Cấu hình" để nhập URL Worker của bạn.',
      'error'
    );
    return;
  }

  if (dom.btnRunTest) {
    dom.btnRunTest.disabled = true;
    dom.btnRunTest.innerHTML = `${iconSvg('i-refresh', 'pi-icon-spin')} Đang tối ưu...`;
  }
  if (dom.testResultBox) dom.testResultBox.style.display = 'none';

  try {
    const res = await MessageClient.send<PromptImproveResult>({
      type: 'PROMPT:IMPROVE',
      payload: { prompt, persona: 'developer' },
    });

    if (dom.testMinText) dom.testMinText.textContent = res.minimal || '';
    if (dom.testDetText) dom.testDetText.textContent = res.detailed || '';

    if (res.assumptions && res.assumptions.length > 0 && dom.testAssumptionsBox && dom.testAssumptionsList) {
      dom.testAssumptionsList.innerHTML = res.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('');
      dom.testAssumptionsBox.style.display = 'block';
    } else if (dom.testAssumptionsBox) {
      dom.testAssumptionsBox.style.display = 'none';
    }

    if (dom.testResultBox) dom.testResultBox.style.display = 'block';
    showTestAlert(dom, 'Đã tối ưu thành công!', 'success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showTestAlert(dom, msg, 'error');
  } finally {
    if (dom.btnRunTest) {
      dom.btnRunTest.disabled = false;
      dom.btnRunTest.innerHTML = `${iconSvg('i-spark')} Cải thiện ngay`;
    }
  }
}

function showTestAlert(dom: PopupElements, msg: string, type: 'success' | 'error'): void {
  if (!dom.testAlert) return;
  dom.testAlert.style.display = 'block';
  dom.testAlert.className = `pi-alert-box ${type === 'success' ? 'pi-alert-success' : 'pi-alert-error'}`;
  dom.testAlert.textContent = msg;
}

async function loadHistory(dom: PopupElements): Promise<void> {
  if (!dom.historyListContainer) return;
  const history = await HistoryRepository.getHistory();

  if (history.length === 0) {
    dom.historyListContainer.innerHTML = '<div class="empty-state">Chưa có lịch sử tối ưu prompt nào.</div>';
    return;
  }

  dom.historyListContainer.innerHTML = history
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

async function handleClearHistory(dom: PopupElements): Promise<void> {
  await MessageClient.send({ type: 'HISTORY:CLEAR' });
  await loadHistory(dom);
}

async function copyText(text: string, btn: HTMLButtonElement | null): Promise<void> {
  if (!text || !btn) return;
  await navigator.clipboard.writeText(text);
  const oldHtml = btn.innerHTML;
  btn.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} Đã chép!`;
  setTimeout(() => {
    btn.innerHTML = oldHtml;
  }, 1500);
}
