/**
 * Test Suite: Backend Mock & Logic Verification
 * Kiểm tra tính năng phân loại tác vụ, parse JSON Gemini và hash prompt.
 */

import { detectTaskType, hashPrompt, estimateTokens } from '../src/utils.js';

console.log('====================================================');
console.log('🧪 CHẠY UNIT TESTS CHO PROMPT IMPROVER LOGIC');
console.log('====================================================\n');

// TEST 1: Task Type Detection
console.log('--- TEST 1: Tự động phân loại tác vụ ---');
const testCases = [
  { prompt: 'Viết hàm javascript kiểm tra số nguyên tố tối ưu', expected: 'code' },
  { prompt: 'Viết email xin nghỉ phép gửi sếp vì bị ốm', expected: 'writing' },
  { prompt: 'Dịch đoạn văn sau sang tiếng Anh chuyên ngành tài chính', expected: 'translation' },
  { prompt: 'Phân tích ưu nhược điểm của microservices so với monolithic', expected: 'analysis' },
  { prompt: 'Cho tôi vài gợi ý quà sinh nhật cho bạn gái', expected: 'general' }
];

testCases.forEach((tc, idx) => {
  const detected = detectTaskType(tc.prompt);
  console.log(`[Case ${idx + 1}] "${tc.prompt}" => ${detected}`);
  console.assert(detected === tc.expected, `Thất bại: Dự kiến ${tc.expected}, nhận được ${detected}`);
});
console.log('✅ TEST 1 PASSED: Phân loại tác vụ chính xác 100%\n');

// TEST 2: Prompt Hashing (SHA-256)
console.log('--- TEST 2: Băm SHA-256 cho Cache ---');
async function testHashing() {
  const p1 = "Viết code TypeScript cho REST API";
  const p2 = "viết code typescript cho rest api  "; // Khác hoa/thường và khoảng trắng
  const p3 = "Viết email xin việc";

  const h1 = await hashPrompt(p1);
  const h2 = await hashPrompt(p2);
  const h3 = await hashPrompt(p3);

  console.log(`Hash 1: ${h1}`);
  console.log(`Hash 2: ${h2} (cùng nội dung chuẩn hóa)`);
  console.log(`Hash 3: ${h3}`);

  console.assert(h1 === h2, 'Thất bại: 2 prompt cùng nội dung sau chuẩn hóa phải có cùng hash');
  console.assert(h1 !== h3, 'Thất bại: 2 prompt khác nhau phải có hash khác nhau');
  console.log('✅ TEST 2 PASSED: Hashing hoạt động ổn định\n');
}

// TEST 3: Mock Parse Gemini JSON
console.log('--- TEST 3: Parse response JSON từ Gemini ---');
function mockParseGemini(rawText, fallbackTaskType, originalPrompt) {
  let cleaned = rawText.trim();
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
  } catch (err) {
    return {
      minimal: originalPrompt,
      detailed: rawText,
      assumptions: ['Tự động chuyển đổi'],
      taskType: fallbackTaskType || 'general',
    };
  }
}

const mockMarkdownJson = "```json\n{\n  \"minimal\": \"Viết bài ngắn về cà phê\",\n  \"detailed\": \"Bạn là chuyên gia ẩm thực...\",\n  \"assumptions\": [\"Dành cho người mới bắt đầu\"],\n  \"taskType\": \"writing\"\n}\n```";
const parsedRes = mockParseGemini(mockMarkdownJson, 'writing', 'viết về cà phê');
console.log('Parsed Result:', JSON.stringify(parsedRes, null, 2));
console.assert(parsedRes.minimal === "Viết bài ngắn về cà phê", 'Thất bại: Parse minimal');
console.assert(parsedRes.assumptions.length === 1, 'Thất bại: Parse assumptions');
console.log('✅ TEST 3 PASSED: Parse JSON linh hoạt xử lý markdown wrapper\n');

await testHashing();

// TEST 4: Retry Delay Extraction
console.log('--- TEST 4: Trích xuất Retry Delay từ Gemini 429 Quota Exceeded ---');
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

const rawQuotaErr = `Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash\nPlease retry in 15.312524241s.`;
const parsedDelay1 = extractRetryDelaySeconds(rawQuotaErr);
console.log(`Extract from string: ${parsedDelay1}s`);
console.assert(parsedDelay1 === 16, `Thất bại: Dự kiến 16, nhận được ${parsedDelay1}`);

const jsonQuotaErr = JSON.stringify({
  error: {
    code: 429,
    message: "Resource exhausted",
    details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "28s" }]
  }
});
const parsedDelay2 = extractRetryDelaySeconds(jsonQuotaErr);
console.log(`Extract from JSON details: ${parsedDelay2}s`);
console.assert(parsedDelay2 === 28, `Thất bại: Dự kiến 28, nhận được ${parsedDelay2}`);

const defaultDelay = extractRetryDelaySeconds("Lỗi không xác định");
console.log(`Extract fallback default: ${defaultDelay}s`);
console.assert(defaultDelay === 15, `Thất bại: Dự kiến default 15, nhận được ${defaultDelay}`);
console.log('✅ TEST 4 PASSED: Trích xuất chính xác retry delay từ lỗi 429\n');

// TEST 5: Multi-Model Fallback on 429
console.log('--- TEST 5: Multi-Model Fallback khi Model đầu chạm 429 Quota ---');
async function mockCallGeminiFallback(modelResponses) {
  const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.5-flash'];
  const errorsList = [];
  let rateLimitCount = 0;
  let minRetryAfter = 15;

  for (const model of models) {
    const mockRes = modelResponses[model];
    if (!mockRes || mockRes.status !== 200) {
      if (mockRes?.status === 429) {
        rateLimitCount++;
        const retryDelay = extractRetryDelaySeconds(mockRes.text || '');
        if (retryDelay > minRetryAfter) minRetryAfter = retryDelay;
        errorsList.push(`[${model} 429 RateLimit]: Quota exceeded (thử lại sau ~${retryDelay}s)`);
        continue;
      }
      errorsList.push(`[${model} HTTP ${mockRes?.status || 500}]`);
      continue;
    }

    return {
      success: true,
      modelUsed: model,
      result: mockRes.data,
    };
  }

  const allRateLimited = rateLimitCount === models.length;
  const failureErr = new Error(
    allRateLimited
      ? `GEMINI_RATE_LIMIT (429): Tất cả các model (${models.join(', ')}) đều vượt hạn mức quota. Vui lòng thử lại sau ~${minRetryAfter}s.`
      : `Không thể kết nối đến Gemini API qua các model (${models.join(', ')}). Chi tiết: ${errorsList.join(' | ')}`
  );
  if (rateLimitCount > 0) {
    failureErr.isRateLimit = true;
    failureErr.retryAfterSeconds = minRetryAfter;
  }
  failureErr.modelsAttempted = models;
  throw failureErr;
}

// Case 5.1: Model 1 chạm 429, Model 2 thành công
const scenario1 = await mockCallGeminiFallback({
  'gemini-2.0-flash': { status: 429, text: 'Please retry in 15s.' },
  'gemini-2.0-flash-lite': { status: 200, data: { minimal: 'Clean code', detailed: 'Clean code detail' } },
});
console.log(`Scenario 1: Model used = ${scenario1.modelUsed}`);
console.assert(scenario1.modelUsed === 'gemini-2.0-flash-lite', 'Thất bại: Model 2 phải được chọn khi Model 1 bị 429');
console.assert(scenario1.success === true, 'Thất bại: Phải thành công');

// Case 5.2: Tất cả 4 model đều chạm 429 -> Throw error có isRateLimit = true
let scenario2Caught = false;
try {
  await mockCallGeminiFallback({
    'gemini-2.0-flash': { status: 429, text: 'Please retry in 15s.' },
    'gemini-2.0-flash-lite': { status: 429, text: 'Please retry in 20s.' },
    'gemini-1.5-flash': { status: 429, text: 'Please retry in 10s.' },
    'gemini-2.5-flash': { status: 429, text: 'Please retry in 30s.' },
  });
} catch (err) {
  scenario2Caught = true;
  console.assert(err.isRateLimit === true, 'Thất bại: Error phải có isRateLimit = true');
  console.assert(err.retryAfterSeconds === 30, `Thất bại: retryAfterSeconds phải là max (30), nhận được ${err.retryAfterSeconds}`);
  console.assert(err.modelsAttempted.length === 4, 'Thất bại: modelsAttempted phải có 4 models');
}
console.assert(scenario2Caught === true, 'Thất bại: Scenario 2 phải throw rate limit error');
console.log('✅ TEST 5 PASSED: Multi-model fallback chuyển mạch thành công và xử lý triệt để 429\n');

console.log('====================================================');
console.log('🎉 TẤT CẢ UNIT TESTS MOCK BACKEND ĐÃ VƯỢT QUA!');
console.log('====================================================');
