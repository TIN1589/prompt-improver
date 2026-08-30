/**
 * background.js (Service Worker MV3) — Prompt Improver
 * 
 * Chức năng:
 * 1. Định tuyến yêu cầu cải thiện prompt (IMPROVE_PROMPT).
 * 2. Cache kết quả theo SHA-256 hash của prompt (tránh gọi API trùng lặp, tiết kiệm quota).
 * 3. Gọi Cloudflare Worker Backend trung gian với Retry Exponential Backoff (1s, 2s, 4s).
 * 4. Kiểm tra trạng thái Backend (PING_BACKEND) và đo latency.
 * 5. Quản lý lịch sử (History) và danh sách cấu hình bật/tắt theo Site.
 * 6. Context menu tích hợp.
 */

import { hashPrompt, detectTaskType } from './utils.js';

// ─── CẤU HÌNH MẶC ĐỊNH ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  backendUrl: '',
  enableCache: true,
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 giờ
  siteSettings: {
    'chatgpt.com': true,
    'chat.openai.com': true,
    'claude.ai': true,
    'deepseek.com': true,
    'gemini.google.com': true,
    'aistudio.google.com': true,
    'copilot.microsoft.com': true,
    'perplexity.ai': true,
    'phind.com': true,
    'poe.com': true,
  },
  enableContextMenu: true,
};

// Khởi tạo thiết lập mặc định khi cài đặt
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const toSet = {};
  for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      toSet[key] = val;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
  updateContextMenus();
});

// ─── CONTEXT MENU ───────────────────────────────────────────────────────────
function updateContextMenus() {
  chrome.storage.local.get(['enableContextMenu'], (data) => {
    const enabled = data.enableContextMenu !== false;
    chrome.contextMenus.removeAll(() => {
      if (enabled) {
        chrome.contextMenus.create({
          id: 'prompt-improver-selection',
          title: '✨ Cải thiện đoạn văn bản với Prompt Improver',
          contexts: ['selection'],
        });
      }
    });
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enableContextMenu) {
    updateContextMenus();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.selectionText) return;
  if (info.menuItemId === 'prompt-improver-selection') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRIGGER_IMPROVE_FROM_SELECTION',
      text: info.selectionText.trim(),
    }).catch(() => {});
  }
});

// ─── MESSAGE ROUTER ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {

    // ── 1. Cải thiện Prompt (gọi Backend Worker) ────────────────────────────
    case 'IMPROVE_PROMPT': {
      handleImprovePrompt(request.payload || {})
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Async response
    }

    // ── 2. Ping kiểm tra Backend URL ────────────────────────────────────────
    case 'PING_BACKEND': {
      handlePingBackend(request.url)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // ── 3. Quản lý Cache ────────────────────────────────────────────────────
    case 'CLEAR_CACHE': {
      handleClearCache()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'GET_CACHE_STATS': {
      handleGetCacheStats()
        .then(stats => sendResponse({ success: true, ...stats }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // ── 4. Lịch sử ──────────────────────────────────────────────────────────
    case 'CLEAR_HISTORY': {
      chrome.storage.local.remove('cco_history', () => sendResponse({ success: true }));
      return true;
    }

    // ── 5. Kiểm tra site có được bật không ──────────────────────────────────
    case 'CHECK_SITE_ENABLED': {
      const hostname = request.hostname || '';
      chrome.storage.local.get(['siteSettings'], (data) => {
        const sites = data.siteSettings || DEFAULT_SETTINGS.siteSettings;
        const matchedKey = Object.keys(sites).find(domain => hostname.includes(domain));
        const isEnabled = matchedKey ? sites[matchedKey] !== false : true;
        sendResponse({ enabled: isEnabled });
      });
      return true;
    }

    // ── 6. Lấy phiên bản Manifest ────────────────────────────────────────────
    case 'GET_VERSION': {
      sendResponse({ version: chrome.runtime.getManifest().version });
      return false;
    }
  }
});

// ─── LOGIC CẢI THIỆN PROMPT (VỚI CACHE & RETRY) ─────────────────────────────
async function handleImprovePrompt({ prompt, taskType, bypassCache = false }) {
  const cleanPrompt = prompt?.trim();
  if (!cleanPrompt) {
    throw new Error('Prompt không được để trống.');
  }

  const detectedType = taskType || detectTaskType(cleanPrompt);
  const hash = await hashPrompt(cleanPrompt);
  const settings = await chrome.storage.local.get(['backendUrl', 'enableCache', 'cacheTtlMs']);
  const enableCache = settings.enableCache !== false;
  const cacheTtlMs = settings.cacheTtlMs || DEFAULT_SETTINGS.cacheTtlMs;

  // 1. Kiểm tra Cache local
  if (enableCache && !bypassCache) {
    const cacheKey = `cache_${hash}`;
    const cachedData = await chrome.storage.local.get([cacheKey]);
    if (cachedData[cacheKey]) {
      const entry = cachedData[cacheKey];
      if (Date.now() - entry.timestamp < cacheTtlMs) {
        console.log('[PromptImprover] Cache hit cho hash:', hash);
        return {
          success: true,
          isCached: true,
          ...entry.data,
        };
      }
    }
  }

  // 2. Kiểm tra Backend URL
  const backendUrl = (settings.backendUrl || '').trim().replace(/\/+$/, '');
  if (!backendUrl) {
    throw new Error(
      'Chưa cấu hình Backend URL! Vui lòng bấm vào icon extension trên thanh công cụ để nhập URL Cloudflare Worker.'
    );
  }

  // 3. Gọi Backend với Retry Exponential Backoff
  const endpoint = backendUrl.endsWith('/improve') ? backendUrl : `${backendUrl}/improve`;
  const responseData = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cleanPrompt, taskType: detectedType }),
  }, 3);

  // 4. Lưu Cache nếu thành công
  if (enableCache && responseData && responseData.success) {
    const cacheKey = `cache_${hash}`;
    await chrome.storage.local.set({
      [cacheKey]: {
        timestamp: Date.now(),
        data: responseData,
      },
    });
  }

  // 5. Lưu vào Lịch sử (tối đa 50 mục)
  await saveToHistory({
    id: 'hist_' + Date.now(),
    prompt: cleanPrompt,
    minimal: responseData.minimal,
    detailed: responseData.detailed,
    assumptions: responseData.assumptions || [],
    taskType: responseData.taskType || detectedType,
    timestamp: Date.now(),
  });

  return {
    success: true,
    isCached: false,
    ...responseData,
  };
}

// ─── FETCH WITH RETRY & EXPONENTIAL BACKOFF ─────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // 429 = Rate limit (Gemini hoặc Cloudflare) -> Retry
      if (res.status === 429) {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson.message || 'Quá giới hạn lượt gọi API (Rate limit 429)');
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * (2 ** attempt), 6000);
          console.warn(`[PromptImprover] Rate limit (429), retry ${attempt + 1}/${maxRetries} sau ${backoff}ms...`);
          await delay(backoff);
          continue;
        }
        throw lastError;
      }

      // 502/503/504 = Cloudflare server temporarily down -> Retry
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson.message || `Server tạm thời không phản hồi (HTTP ${res.status})`);
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * (2 ** attempt), 6000);
          console.warn(`[PromptImprover] Server error (${res.status}), retry ${attempt + 1}/${maxRetries} sau ${backoff}ms...`);
          await delay(backoff);
          continue;
        }
        throw lastError;
      }

      // Nếu trả về lỗi (400, 401, 403, 404, 500) -> Đọc ngay message cụ thể từ backend
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Backend báo lỗi HTTP ${res.status}`);
      }

      const json = await res.json();
      return json;
    } catch (err) {
      lastError = err;
      // Nếu là lỗi logic (thiếu API key, key sai, tham số lỗi) thì ném ngay, không chờ retry
      if (
        err.message?.includes('GEMINI_API_KEY') ||
        err.message?.includes('MISSING_API_KEY') ||
        err.message?.includes('API key not valid') ||
        err.message?.includes('API key') ||
        err.message?.includes('HTTP 4')
      ) {
        throw err;
      }

      if (attempt < maxRetries - 1) {
        const backoff = Math.min(1000 * (2 ** attempt), 6000);
        console.warn(`[PromptImprover] Network retry ${attempt + 1}/${maxRetries} sau ${backoff}ms:`, err.message);
        await delay(backoff);
      }
    }
  }

  throw lastError || new Error('Không thể kết nối đến Backend sau nhiều lần thử lại.');
}

// ─── PING BACKEND ───────────────────────────────────────────────────────────
async function handlePingBackend(rawUrl) {
  const url = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error('Vui lòng nhập Backend URL.');
  }

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`Server trả về mã lỗi HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      online: true,
      latencyMs,
      hasApiKey: data.hasApiKey !== false,
      info: data.service || 'Prompt Improver Worker',
    };
  } catch (err) {
    return {
      success: false,
      online: false,
      error: err.message,
    };
  }
}

// ─── CACHE HELPERS ──────────────────────────────────────────────────────────
async function handleClearCache() {
  const allData = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(allData).filter(k => k.startsWith('cache_'));
  if (cacheKeys.length > 0) {
    await chrome.storage.local.remove(cacheKeys);
  }
  return { clearedCount: cacheKeys.length };
}

async function handleGetCacheStats() {
  const allData = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(allData).filter(k => k.startsWith('cache_'));
  return { cacheCount: cacheKeys.length };
}

// ─── HISTORY HELPERS ────────────────────────────────────────────────────────
async function saveToHistory(entry) {
  try {
    const data = await chrome.storage.local.get(['cco_history']);
    let history = Array.isArray(data.cco_history) ? data.cco_history : [];
    history.unshift(entry);
    if (history.length > 50) {
      history = history.slice(0, 50); // Giữ tối đa 50 mục
    }
    await chrome.storage.local.set({ cco_history: history });
  } catch (err) {
    console.error('[PromptImprover] Lỗi khi lưu lịch sử:', err);
  }
}
