/**
 * background.js (Service Worker MV3) — Prompt Improver Architecture v2.0
 * 
 * Chức năng:
 * 1. Định tuyến yêu cầu cải thiện prompt (IMPROVE_PROMPT).
 * 2. Tích hợp Persona Strategy và Scoring Pipeline (đánh giá chất lượng prompt định lượng).
 * 3. Cache kết quả theo SHA-256 hash của prompt + persona với cơ chế LRU Auto-Eviction.
 * 4. Gọi Cloudflare Worker Backend trung gian với Retry Exponential Backoff.
 * 5. Đo lường latency, quản lý lịch sử (tối đa 50 mục) và so khớp domain an toàn.
 */

import { hashPrompt, detectTaskType, isDomainMatch } from './utils.js';
import { PromptScoringEngine } from './scoringEngine.js';

// ─── CẤU HÌNH MẶC ĐỊNH ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  backendUrl: '',
  enableCache: true,
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 giờ
  maxCacheEntries: 200,             // Giới hạn tối đa 200 items cache tránh đầy storage
  defaultPersona: 'developer',
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

    // ── 1. Cải thiện Prompt & Đánh giá chất lượng ───────────────────────────
    case 'IMPROVE_PROMPT': {
      handleImprovePrompt(request.payload || {})
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Async response
    }

    // ── 2. Chấm điểm Prompt độc lập (Scoring Engine) ────────────────────────
    case 'SCORE_PROMPT': {
      try {
        const text = request.text || '';
        const score = PromptScoringEngine.evaluate(text);
        sendResponse({ success: true, score });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return false;
    }

    // ── 3. Ping kiểm tra Backend URL ────────────────────────────────────────
    case 'PING_BACKEND': {
      handlePingBackend(request.url)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // ── 4. Quản lý Cache ────────────────────────────────────────────────────
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

    // ── 5. Lịch sử ──────────────────────────────────────────────────────────
    case 'CLEAR_HISTORY': {
      chrome.storage.local.remove('cco_history', () => sendResponse({ success: true }));
      return true;
    }

    // ── 6. Kiểm tra site có được bật không (Safe Domain Matching) ───────────
    case 'CHECK_SITE_ENABLED': {
      const hostname = request.hostname || '';
      chrome.storage.local.get(['siteSettings'], (data) => {
        const sites = data.siteSettings || DEFAULT_SETTINGS.siteSettings;
        const matchedKey = Object.keys(sites).find(domain => isDomainMatch(hostname, domain));
        const isEnabled = matchedKey ? sites[matchedKey] !== false : true;
        sendResponse({ enabled: isEnabled });
      });
      return true;
    }

    // ── 7. Lấy phiên bản Manifest ────────────────────────────────────────────
    case 'GET_VERSION': {
      sendResponse({ version: chrome.runtime.getManifest().version });
      return false;
    }
  }
});

// ─── LOGIC CẢI THIỆN PROMPT (VỚI SCORING, CACHE & RETRY) ───────────────────
async function handleImprovePrompt({ prompt, taskType, persona = 'developer', bypassCache = false }) {
  const cleanPrompt = prompt?.trim();
  if (!cleanPrompt) {
    throw new Error('Prompt không được để trống.');
  }

  const detectedType = taskType || detectTaskType(cleanPrompt);
  const hash = await hashPrompt(`${persona}:${cleanPrompt}`);
  const settings = await chrome.storage.local.get(['backendUrl', 'enableCache', 'cacheTtlMs']);
  const enableCache = settings.enableCache !== false;
  const cacheTtlMs = settings.cacheTtlMs || DEFAULT_SETTINGS.cacheTtlMs;

  // 1. Chấm điểm Prompt gốc ngay lập tức
  const originalScore = PromptScoringEngine.evaluate(cleanPrompt);

  // 2. Kiểm tra Cache local
  if (enableCache && !bypassCache) {
    const cacheKey = `cache_${hash}`;
    const cachedData = await chrome.storage.local.get([cacheKey]);
    if (cachedData[cacheKey]) {
      const entry = cachedData[cacheKey];
      if (Date.now() - entry.timestamp < cacheTtlMs) {
        return {
          success: true,
          isCached: true,
          originalScore,
          ...entry.data,
        };
      }
    }
  }

  // 3. Kiểm tra Backend URL
  const backendUrl = (settings.backendUrl || '').trim().replace(/\/+$/, '');
  if (!backendUrl) {
    throw new Error(
      'Chưa cấu hình Backend URL! Vui lòng mở Popup Extension để nhập URL Cloudflare Worker.'
    );
  }

  // 4. Gọi Backend với Retry Exponential Backoff
  const endpoint = backendUrl.endsWith('/improve') ? backendUrl : `${backendUrl}/improve`;
  const responseData = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cleanPrompt, taskType: detectedType, persona }),
  }, 3);

  // 5. Chấm điểm cho 2 bản prompt cải thiện
  const minimalScore = PromptScoringEngine.evaluate(responseData.minimal || cleanPrompt);
  const detailedScore = PromptScoringEngine.evaluate(responseData.detailed || cleanPrompt);

  const enhancedResponse = {
    ...responseData,
    persona,
    originalScore,
    minimalScore,
    detailedScore,
  };

  // 6. Lưu Cache với cơ chế Auto-Eviction
  if (enableCache && responseData && responseData.success) {
    await saveCacheWithEviction(`cache_${hash}`, enhancedResponse);
  }

  // 7. Lưu vào Lịch sử (tối đa 50 mục)
  await saveToHistory({
    id: 'hist_' + Date.now(),
    prompt: cleanPrompt,
    minimal: responseData.minimal,
    detailed: responseData.detailed,
    assumptions: responseData.assumptions || [],
    taskType: responseData.taskType || detectedType,
    persona,
    originalScore: originalScore.overallScore,
    improvedScore: detailedScore.overallScore,
    timestamp: Date.now(),
  });

  return {
    success: true,
    isCached: false,
    ...enhancedResponse,
  };
}

// ─── FETCH WITH RETRY & EXPONENTIAL BACKOFF ─────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.status === 429) {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson.message || 'Quá giới hạn lượt gọi API (Rate limit 429)');
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * (2 ** attempt), 6000);
          await delay(backoff);
          continue;
        }
        throw lastError;
      }

      if (res.status === 502 || res.status === 503 || res.status === 504) {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson.message || `Server tạm thời không phản hồi (HTTP ${res.status})`);
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * (2 ** attempt), 6000);
          await delay(backoff);
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Backend báo lỗi HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      if (
        err.message?.includes('GEMINI_API_KEY') ||
        err.message?.includes('MISSING_API_KEY') ||
        err.message?.includes('API key not valid') ||
        err.message?.includes('UNAUTHORIZED_ACCESS')
      ) {
        throw err;
      }

      if (attempt < maxRetries - 1) {
        const backoff = Math.min(1000 * (2 ** attempt), 6000);
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

// ─── CACHE MANAGEMENT VỚI AUTO LRU EVICTION ────────────────────────────────
async function saveCacheWithEviction(cacheKey, data) {
  try {
    const allData = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allData).filter(k => k.startsWith('cache_'));

    // Nếu số cache entries vượt quá 200, xóa 30 entries cũ nhất
    if (cacheKeys.length >= DEFAULT_SETTINGS.maxCacheEntries) {
      const sortedKeys = cacheKeys.sort((a, b) => {
        const timeA = allData[a]?.timestamp || 0;
        const timeB = allData[b]?.timestamp || 0;
        return timeA - timeB;
      });
      const keysToRemove = sortedKeys.slice(0, 30);
      await chrome.storage.local.remove(keysToRemove);
    }

    await chrome.storage.local.set({
      [cacheKey]: {
        timestamp: Date.now(),
        data,
      },
    });
  } catch (err) {
    console.warn('[PromptImprover] Lỗi khi lưu cache:', err);
  }
}

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

// ─── HISTORY MANAGEMENT ─────────────────────────────────────────────────────
async function saveToHistory(entry) {
  try {
    const data = await chrome.storage.local.get(['cco_history']);
    let history = Array.isArray(data.cco_history) ? data.cco_history : [];
    history.unshift(entry);
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    await chrome.storage.local.set({ cco_history: history });
  } catch (err) {
    console.error('[PromptImprover] Lỗi khi lưu lịch sử:', err);
  }
}
