/**
 * Cloudflare Worker: Prompt Improver Backend (Hardened v2.0)
 * 
 * Chức năng:
 * - Bảo mật Gemini API Key qua Worker Secret (GEMINI_API_KEY).
 * - Nhận prompt gốc, phân loại tác vụ và tích hợp Persona Strategy.
 * - Gọi Google Gemini API với chuỗi Fallback Model chuẩn hóa (gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro).
 * - Trả về JSON chuẩn hoàn chỉnh, hỗ trợ CORS an toàn.
 */

// ─── CẤU HÌNH GEMINI MODELS CHÍNH THỨC ───────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
];

// ─── CORS HEADERS ───────────────────────────────────────────────────────────
function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = origin.startsWith('chrome-extension://') ||
                    origin.includes('localhost') ||
                    (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.split(',').includes(origin));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Extension-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, corsHeaders = {}, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

// ─── PHÂN LOẠI TÁC VỤ ────────────────────────────────────────────────────────
function detectTaskType(prompt = '') {
  const p = prompt.toLowerCase();
  
  if (
    p.includes('code') || p.includes('function') || p.includes('hàm') ||
    p.includes('bug') || p.includes('lập trình') || p.includes('javascript') ||
    p.includes('typescript') || p.includes('python') || p.includes('react') ||
    p.includes('api') || p.includes('sql') || p.includes('refactor') ||
    p.includes(' thuật toán') || p.includes('class ') || p.includes('html') ||
    p.includes('css') || p.includes('component') || p.includes('kỹ thuật')
  ) {
    return 'code';
  }

  if (
    p.includes('viết email') || p.includes('viết bài') || p.includes('soạn thảo') ||
    p.includes('blog') || p.includes('bài viết') || p.includes('thư ') ||
    p.includes('nội dung') || p.includes('caption') || p.includes('copywriting') ||
    p.includes('kịch bản') || p.includes('bài đăng')
  ) {
    return 'writing';
  }

  if (
    p.includes('dịch') || p.includes('translate') || p.includes('tiếng anh') ||
    p.includes('tiếng việt') || p.includes('sang tiếng')
  ) {
    return 'translation';
  }

  if (
    p.includes('phân tích') || p.includes('so sánh') || p.includes('đánh giá') ||
    p.includes('tóm tắt') || p.includes('giải thích') || p.includes('nguyên nhân') ||
    p.includes('ưu nhược điểm') || p.includes('kế hoạch') || p.includes('lộ trình')
  ) {
    return 'analysis';
  }

  return 'general';
}

// ─── TẠO SYSTEM PROMPT DỰA TRÊN TÁC VỤ VÀ PERSONA ──────────────────────────
function buildSystemInstruction(taskType, persona = 'developer') {
  const personaGuides = {
    architect: 'Áp dụng góc nhìn Principal Software Architect: tập trung cấu trúc modular, SOLID, strict type safety, zero technical debt.',
    security: 'Áp dụng góc nhìn Cybersecurity Auditor: tập trung OWASP Top 10, sanitization, an toàn mã hóa Web Crypto, defensive coding.',
    debugger: 'Áp dụng góc nhìn Senior Debugger: phân tích root cause, kiểm soát triệt để edge cases, null/undefined checks, error boundaries.',
    developer: 'Áp dụng góc nhìn Senior Fullstack Engineer: code sạch, production-ready, tối ưu hiệu năng và xử lý lỗi đầy đủ.',
    copywriter: 'Áp dụng góc nhìn Senior Copywriter: văn phong tự nhiên, bố cục rõ ràng, lập luận sắc bén và cấu trúc bài viết mạch lạc.',
  };

  const selectedGuide = personaGuides[persona] || personaGuides.developer;

  return `Bạn là Chuyên gia Kỹ thuật Prompt (Prompt Engineer) hàng đầu.
Phong cách chuyên môn: ${selectedGuide}

Nhiệm vụ: Nhận prompt thô của người dùng và tạo ra 2 phiên bản prompt cải thiện vượt trội (dạng JSON hợp lệ):

1. "minimal" (Phiên bản Tối giản):
   - Ngắn gọn, súc tích, đi thẳng vào trọng tâm, loại bỏ từ thừa, tiết kiệm token tối đa.
2. "detailed" (Phiên bản Chi tiết & Đầy đủ):
   - Thiết lập vai trò chuyên gia, bối cảnh, các bước cụ thể, ràng buộc chất lượng và format đầu ra.
   - BẮT BUỘC viết đầy đủ, trọn vẹn, không được dừng giữa chừng hoặc bỏ lửng câu.
3. "assumptions": Mảng gồm 2 đến 4 giả định hợp lý bạn đưa ra khi prompt thô bị thiếu ngữ cảnh.
4. "taskType": "${taskType}".
5. "persona": "${persona}".

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON HỢP LỆ (KHÔNG KÈM VĂN BẢN NGOÀI JSON, KHÔNG BỌC BACKTICKS):
{
  "minimal": "string",
  "detailed": "string",
  "assumptions": ["string", "string"],
  "taskType": "${taskType}",
  "persona": "${persona}"
}

Nếu prompt gốc là tiếng Việt, hãy viết bằng tiếng Việt. Nếu tiếng Anh, hãy viết bằng tiếng Anh.`;
}

// ─── TRÍCH XUẤT RETRY DELAY KHI GẶP RATE LIMIT 429 ──────────────────────────
function extractRetryDelaySeconds(errText) {
  try {
    if (typeof errText === 'string') {
      const match = errText.match(/retry in\s+([\d\.]+)s/i);
      if (match) return Math.ceil(parseFloat(match[1]));
      const parsed = JSON.parse(errText);
      if (Array.isArray(parsed?.error?.details)) {
        for (const detail of parsed.error.details) {
          if (detail.retryDelay) {
            const s = parseFloat(String(detail.retryDelay).replace('s', ''));
            if (!isNaN(s)) return Math.ceil(s);
          }
        }
      }
      const msg = parsed?.error?.message || '';
      const m = msg.match(/retry in\s+([\d\.]+)s/i);
      if (m) return Math.ceil(parseFloat(m[1]));
    }
  } catch {}
  return 15;
}

// ─── GỌI GEMINI API VỚI CHUỖI FALLBACK MODEL ───────────────────────────────
async function callGemini(promptText, taskType, persona, apiKey) {
  const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    throw new Error('GEMINI_API_KEY bị trống. Hãy chạy `wrangler secret put GEMINI_API_KEY`.');
  }

  const systemInstruction = buildSystemInstruction(taskType, persona);
  const combinedPrompt = `${systemInstruction}\n\n====================\nPROMPT CẦN CẢI THIỆN:\n"""\n${promptText}\n"""`;
  const errorsList = [];
  let rateLimitCount = 0;
  let minRetryAfter = 15;

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    
    const requestBody = {
      contents: [
        {
          parts: [{ text: combinedPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    };

    const controller = new AbortController();
    const modelTimer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(modelTimer);

      if (!res.ok) {
        const errText = await res.text();
        
        // Quota Rate Limit 429: Ghi nhận và chuyển model tiếp theo trong danh sách fallback
        if (res.status === 429) {
          rateLimitCount++;
          const retryDelay = extractRetryDelaySeconds(errText);
          if (retryDelay > minRetryAfter) minRetryAfter = retryDelay;
          console.warn(`[Backend] Model ${model} gặp Rate Limit 429 (retryDelay ~${retryDelay}s). Đang chuyển sang model tiếp theo trong chuỗi fallback...`);
          errorsList.push(`[${model} 429 RateLimit]: Quota exceeded (thử lại sau ~${retryDelay}s)`);
          continue;
        }

        // Lỗi xác thực API Key sai (401, 403): Dừng ngay vì API key sai thì mọi model đều hỏng
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Lỗi Xác thực Gemini [${res.status}]: ${errText}`);
        }

        errorsList.push(`[${model} HTTP ${res.status}]: ${errText.slice(0, 120)}`);
        // Nếu 400, 404 hoặc lỗi khác thì thử tiếp model sau
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      return {
        ...parseGeminiResponse(rawText, taskType, persona, promptText),
        modelUsed: model,
      };
    } catch (err) {
      clearTimeout(modelTimer);
      if (err.message?.includes('Lỗi Xác thực Gemini')) {
        throw err;
      }
      errorsList.push(`[${model}]: ${err.message}`);
    }
  }

  // Nếu tất cả các model đều thất bại
  const allRateLimited = rateLimitCount === GEMINI_MODELS.length;
  const failureErr = new Error(
    allRateLimited
      ? `GEMINI_RATE_LIMIT (429): Tất cả các model (${GEMINI_MODELS.join(', ')}) đều vượt hạn mức quota. Vui lòng thử lại sau ~${minRetryAfter}s.`
      : `Không thể kết nối đến Gemini API qua các model (${GEMINI_MODELS.join(', ')}). Chi tiết: ${errorsList.join(' | ')}`
  );
  if (rateLimitCount > 0) {
    failureErr.isRateLimit = true;
    failureErr.retryAfterSeconds = minRetryAfter;
  }
  failureErr.modelsAttempted = GEMINI_MODELS;
  throw failureErr;
}

// ─── PARSE RESPONSE JSON AN TOÀN ────────────────────────────────────────────
function parseGeminiResponse(rawText, fallbackTaskType, fallbackPersona, originalPrompt) {
  let cleaned = rawText.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    return {
      minimal: typeof parsed.minimal === 'string' ? parsed.minimal : originalPrompt,
      detailed: typeof parsed.detailed === 'string' ? parsed.detailed : originalPrompt,
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      taskType: parsed.taskType || fallbackTaskType || 'general',
      persona: parsed.persona || fallbackPersona || 'developer',
    };
  } catch (parseErr) {
    console.warn('[Backend] JSON Parse Fallback do ký tự đặc biệt:', parseErr.message);
    
    return {
      minimal: originalPrompt,
      detailed: cleaned,
      assumptions: ['Tự động chuyển đổi định dạng do lỗi cấu trúc JSON'],
      taskType: fallbackTaskType || 'general',
      persona: fallbackPersona || 'developer',
    };
  }
}

// ─── WORKER FETCH HANDLER ───────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 2. Health check endpoint (GET / hoặc GET /health)
    if (request.method === 'GET') {
      return jsonResponse({
        status: 'online',
        service: 'Prompt Improver Backend (Cloudflare Worker)',
        hasApiKey: Boolean(env.GEMINI_API_KEY),
        supportedModels: GEMINI_MODELS,
        version: '2.0.0',
        timestamp: new Date().toISOString(),
      }, 200, corsHeaders);
    }

    // 3. Xử lý POST (/ hoặc /improve)
    if (request.method === 'POST') {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return jsonResponse(
          {
            success: false,
            error: 'MISSING_API_KEY',
            message: 'Chưa cấu hình GEMINI_API_KEY trên Cloudflare Worker. Hãy chạy `wrangler secret put GEMINI_API_KEY`.',
          },
          500,
          corsHeaders
        );
      }

      // Kiểm tra Optional Extension Token
      if (env.CLIENT_SHARED_TOKEN) {
        const token = request.headers.get('X-Extension-Token');
        if (token !== env.CLIENT_SHARED_TOKEN) {
          return jsonResponse({ success: false, error: 'UNAUTHORIZED_ACCESS' }, 401, corsHeaders);
        }
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { success: false, error: 'INVALID_JSON', message: 'Request body phải là JSON hợp lệ dạng {"prompt": "..."}' },
          400,
          corsHeaders
        );
      }

      const prompt = body?.prompt?.trim();
      if (!prompt) {
        return jsonResponse(
          { success: false, error: 'EMPTY_PROMPT', message: 'Trường "prompt" không được để trống.' },
          400,
          corsHeaders
        );
      }

      const taskType = body?.taskType || detectTaskType(prompt);
      const persona = body?.persona || 'developer';

      try {
        const result = await callGemini(prompt, taskType, persona, apiKey);
        return jsonResponse({
          success: true,
          original: prompt,
          ...result,
        }, 200, corsHeaders);
      } catch (err) {
        const isRateLimit = Boolean(err.isRateLimit || err.message?.includes('GEMINI_RATE_LIMIT') || err.message?.includes('429'));
        const status = isRateLimit ? 429 : 500;
        const extraHeaders = {};
        if (isRateLimit && err.retryAfterSeconds) {
          extraHeaders['Retry-After'] = String(err.retryAfterSeconds);
        }
        return jsonResponse(
          {
            success: false,
            error: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'GEMINI_CALL_FAILED',
            message: isRateLimit
              ? `Đã vượt quá giới hạn lượt gọi Gemini API (429 Quota Exceeded). Vui lòng thử lại sau ~${err.retryAfterSeconds || 15} giây.`
              : err.message,
            retryAfterSeconds: isRateLimit ? (err.retryAfterSeconds || 15) : undefined,
            modelsAttempted: err.modelsAttempted || GEMINI_MODELS,
            details: err.message,
          },
          status,
          corsHeaders,
          extraHeaders
        );
      }
    }

    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Chỉ hỗ trợ GET, POST và OPTIONS.' }, 405, corsHeaders);
  },
};
