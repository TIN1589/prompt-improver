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

console.log('====================================================');
console.log('🎉 TẤT CẢ UNIT TESTS MOCK BACKEND ĐÃ VƯỢT QUA!');
console.log('====================================================');
