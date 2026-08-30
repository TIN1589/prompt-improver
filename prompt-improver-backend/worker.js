/**
 * Cloudflare Worker: Prompt Improver Backend
 * 
 * Chức năng:
 * - Bảo mật Gemini API Key qua Worker Secret (GEMINI_API_KEY).
 * - Nhận prompt gốc và phân loại tác vụ (code, writing, analysis, translation, general).
 * - Gọi Google Gemini API (model gemini-3.6-flash, maxOutputTokens: 8192, responseMimeType: application/json).
 * - Trả về JSON chuẩn hoàn chỉnh, không bị cắt cụt (truncate).
 * - Hỗ trợ đầy đủ CORS headers cho Chrome Extension.
 */

// ─── CẤU HÌNH GEMINI ────────────────────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-exp',
];

// ─── CORS HEADERS ───────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

// ─── PHÂN LOẠI TÁC VỤ (TASK TYPE DETECTION) ─────────────────────────────────
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

// ─── TẠO SYSTEM PROMPT DỰA TRÊN TÁC VỤ ──────────────────────────────────────
function buildSystemInstruction(taskType, userPrompt) {
  const taskGuidance = {
    code: `Tập trung vào tính chính xác kỹ thuật, kiến trúc hệ thống, Clean Code, Design Patterns, xử lý ngoại lệ và định dạng đầu ra rõ ràng.`,
    writing: `Tập trung vào văn phong, bố cục mạch lạc, đối tượng người đọc và cấu trúc bài viết hoàn chỉnh.`,
    analysis: `Tập trung vào cấu trúc phân tích đa chiều, luận điểm rõ ràng, lộ trình từng bước và tiêu chuẩn đầu ra.`,
    translation: `Tập trung vào độ chuẩn xác ngữ nghĩa, thuật ngữ chuyên ngành và văn phong tự nhiên.`,
    general: `Tập trung vào làm rõ mục tiêu, loại bỏ từ thừa, định hình cấu trúc yêu cầu và tiêu chuẩn đầu ra.`,
  };

  return `Bạn là Chuyên gia Kỹ thuật Prompt (Prompt Engineer) hàng đầu.
Nhiệm vụ: Nhận prompt thô của người dùng và tạo ra 2 phiên bản prompt cải thiện vượt trội (dạng JSON hợp lệ):

1. "minimal" (Phiên bản Tối giản):
   - Ngắn gọn, súc tích, đi thẳng vào trọng tâm, loại bỏ từ thừa, tiết kiệm token tối đa.
2. "detailed" (Phiên bản Chi tiết & Đầy đủ):
   - Thiết lập vai trò chuyên gia, bối cảnh, các bước/học phần cụ thể, ràng buộc chất lượng và format đầu ra.
   - BẮT BUỘC viết đầy đủ, trọn vẹn tất cả các mục/học phần, KHÔNG ĐƯỢC dừng giữa chừng hoặc bỏ lửng câu.
3. "assumptions": Mảng gồm 2 đến 4 giả định hợp lý bạn đưa ra khi prompt thô bị thiếu ngữ cảnh.
4. "taskType": "${taskType}".

Chỉ dẫn chuyên sâu: ${taskGuidance[taskType] || taskGuidance.general}

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON HỢP LỆ (KHÔNG KÈM VĂN BẢN NGOÀI JSON, KHÔNG BỌC BACKTICKS):
{
  "minimal": "string",
  "detailed": "string",
  "assumptions": ["string", "string"],
  "taskType": "${taskType}"
}

Nếu prompt gốc là tiếng Việt, hãy viết bằng tiếng Việt. Nếu tiếng Anh, hãy viết bằng tiếng Anh.`;
}

// ─── GỌI GEMINI API ─────────────────────────────────────────────────────────
async function callGemini(promptText, taskType, apiKey) {
  const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    throw new Error('GEMINI_API_KEY bị trống. Hãy chạy `wrangler secret put GEMINI_API_KEY`.');
  }

  const systemInstruction = buildSystemInstruction(taskType, promptText);
  const combinedPrompt = `${systemInstruction}\n\n====================\nPROMPT CẦN CẢI THIỆN:\n"""\n${promptText}\n"""`;
  let errorsList = [];

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    
    const requestBody = {
      contents: [
        {
          parts: [{ text: combinedPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192, // Tăng lên 8192 token để không bị ngắt quãng giữa chừng
        responseMimeType: 'application/json', // Ép JSON chuẩn
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        errorsList.push(`[${model} HTTP ${res.status}]: ${errText}`);
        
        // Quota 429
        if (res.status === 429) {
          throw new Error(`GEMINI_RATE_LIMIT (429): Quota exceeded. Chi tiết: ${errText}`);
        }

        // Lỗi xác thực API Key hoặc quyền (400, 401, 403)
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(`Lỗi Google Gemini [${res.status}]: ${errText}`);
        }

        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Gemini (${model}) không trả về text. Dữ liệu: ` + JSON.stringify(data).slice(0, 200));
      }

      return {
        ...parseGeminiResponse(rawText, taskType, promptText),
        modelUsed: model,
      };
    } catch (err) {
      if (
        err.message?.includes('GEMINI_RATE_LIMIT') ||
        err.message?.includes('Lỗi Google Gemini')
      ) {
        throw err;
      }
      errorsList.push(`[${model}]: ${err.message}`);
    }
  }

  throw new Error(`Không thể kết nối đến Gemini API. Chi tiết: ${errorsList.join(' | ')}`);
}

// ─── PARSE RESPONSE JSON AN TOÀN ────────────────────────────────────────────
function parseGeminiResponse(rawText, fallbackTaskType, originalPrompt) {
  let cleaned = rawText.trim();
  
  // Bỏ markdown code block ```json ... ``` nếu có
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      minimal: parsed.minimal || originalPrompt,
      detailed: parsed.detailed || originalPrompt,
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      taskType: parsed.taskType || fallbackTaskType || 'general',
    };
  } catch (parseErr) {
    console.warn('[Backend] JSON Parse Fallback do ký tự đặc biệt:', parseErr.message);
    
    // Regex phục hồi dữ liệu nếu JSON có ký tự chưa escape
    const minMatch = cleaned.match(/"minimal"\s*:\s*"([\s\S]*?)(?="\s*,\s*"detailed")/);
    const detMatch = cleaned.match(/"detailed"\s*:\s*"([\s\S]*?)(?="\s*,\s*"assumptions"|"\s*,\s*"taskType"|\}\s*$)/);
    
    if (minMatch || detMatch) {
      return {
        minimal: minMatch ? unescapeJsonString(minMatch[1]) : originalPrompt,
        detailed: detMatch ? unescapeJsonString(detMatch[1]) : cleaned,
        assumptions: ['Tự động tối ưu định dạng phản hồi'],
        taskType: fallbackTaskType || 'general',
      };
    }

    return {
      minimal: originalPrompt,
      detailed: cleaned,
      assumptions: ['Tự động chuyển đổi nội dung'],
      taskType: fallbackTaskType || 'general',
    };
  }
}

function unescapeJsonString(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

// ─── WORKER FETCH HANDLER ───────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // 1. Xử lý CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health check endpoint (GET / hoặc GET /health)
    if (request.method === 'GET') {
      return jsonResponse({
        status: 'online',
        service: 'Prompt Improver Backend (Cloudflare Worker)',
        hasApiKey: !!env.GEMINI_API_KEY,
        version: '1.2.3',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Xử lý POST (hỗ trợ cả / và /improve)
    if (request.method === 'POST') {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return jsonResponse(
          {
            success: false,
            error: 'MISSING_API_KEY',
            message: 'Chưa cấu hình GEMINI_API_KEY trên Cloudflare Worker. Hãy chạy `wrangler secret put GEMINI_API_KEY`.',
          },
          500
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { success: false, error: 'INVALID_JSON', message: 'Request body phải là JSON hợp lệ dạng {"prompt": "..."}' },
          400
        );
      }

      const prompt = body?.prompt?.trim();
      if (!prompt) {
        return jsonResponse(
          { success: false, error: 'EMPTY_PROMPT', message: 'Trường "prompt" không được để trống.' },
          400
        );
      }

      const taskType = body?.taskType || detectTaskType(prompt);

      try {
        const result = await callGemini(prompt, taskType, apiKey);
        return jsonResponse({
          success: true,
          original: prompt,
          ...result,
        });
      } catch (err) {
        const isRateLimit = err.message?.includes('GEMINI_RATE_LIMIT') || err.message?.includes('429');
        const status = isRateLimit ? 429 : 500;
        return jsonResponse(
          {
            success: false,
            error: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'GEMINI_CALL_FAILED',
            message: err.message,
          },
          status
        );
      }
    }

    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Chỉ hỗ trợ GET, POST và OPTIONS.' }, 405);
  },
};
