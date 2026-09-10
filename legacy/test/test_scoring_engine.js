/**
 * test_scoring_engine.js — Unit Tests cho Scoring Engine, Persona Strategy & Utils Hardening
 * Chạy: node test/test_scoring_engine.js
 */

import { PromptScoringEngine } from '../src/scoringEngine.js';
import { PersonaStrategyFactory } from '../src/personaStrategies.js';
import { isDomainMatch, uint8ArrayToBase64, base64ToUint8Array } from '../src/utils.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${label}`);
    failed++;
  }
}

console.log('\n====================================================');
console.log('🧪 BẮT ĐẦU CHẠY UNIT TESTS CHO SCORING & PERSONA ENGINE');
console.log('====================================================\n');

// ─── TEST 1: Scoring Engine - Raw vs Detailed Prompt ───────────────────────
console.log('--- TEST 1: Đánh giá chất lượng Prompt ---');
{
  const rawPrompt = 'viết code đăng nhập';
  const detailedPrompt = 'Hãy viết hàm authenticateUser bằng TypeScript với JWT và Bcrypt, xử lý ngoại lệ và không dùng thư viện ngoài';

  const rawScore = PromptScoringEngine.evaluate(rawPrompt);
  const detailedScore = PromptScoringEngine.evaluate(detailedPrompt);

  console.log(`Raw Prompt ("${rawPrompt}") => Score: ${rawScore.overallScore}/100`);
  console.log(`Detailed Prompt ("${detailedPrompt}") => Score: ${detailedScore.overallScore}/100`);

  assert(rawScore.overallScore > 0, 'Raw prompt score is positive');
  assert(detailedScore.overallScore > rawScore.overallScore, 'Detailed prompt gets higher score than raw prompt');
  assert(detailedScore.clarity >= rawScore.clarity, 'Detailed prompt has equal or higher clarity');
  assert(detailedScore.context > rawScore.context, 'Detailed prompt has significantly higher context');
  assert(rawScore.suggestions.length > 0, 'Raw prompt generates improvement suggestions');
}
console.log();

// ─── TEST 2: Scoring Engine - Compare Method ───────────────────────────────
console.log('--- TEST 2: So sánh Prompt Gốc vs Prompt Cải Thiện ---');
{
  const orig = 'sửa lỗi trong code react';
  const improved = 'Refactor component UserProfile trong React, khắc phục lỗi infinite re-render bằng useCallback và useMemo, strict types';

  const comparison = PromptScoringEngine.compare(orig, improved);
  console.log(`Comparison Delta: +${comparison.delta} điểm`);
  assert(comparison.delta > 0, 'Comparison delta is positive');
  assert(comparison.improved.overallScore > comparison.original.overallScore, 'Improved prompt outscores original');
}
console.log();

// ─── TEST 3: Persona Strategy Factory ───────────────────────────────────────
console.log('--- TEST 3: Persona Strategy Factory & Instruction Builder ---');
{
  const allPersonas = PersonaStrategyFactory.listAll();
  assert(allPersonas.length === 5, 'Factory provides exactly 5 personas');

  const architect = PersonaStrategyFactory.getStrategy('architect');
  const architectInstruction = architect.buildInstruction('Xây dựng REST API');
  assert(architectInstruction.includes('Architect'), 'Architect strategy includes architect role');
  assert(architectInstruction.includes('SOLID'), 'Architect strategy mentions SOLID/modularity');

  const security = PersonaStrategyFactory.getStrategy('security');
  const securityInstruction = security.buildInstruction('Xác thực người dùng');
  assert(securityInstruction.includes('OWASP'), 'Security strategy mentions OWASP');

  const bugHunter = PersonaStrategyFactory.getStrategy('debugger');
  const bugHunterInstruction = bugHunter.buildInstruction('Fix memory leak');
  assert(bugHunterInstruction.includes('Root Cause'), 'Debugger mentions Root Cause analysis');
}
console.log();

// ─── TEST 4: Safe Domain Matching (Anti-Domain Spoofing) ───────────────────
console.log('--- TEST 4: Kiểm tra So khớp Domain an toàn ---');
{
  assert(isDomainMatch('claude.ai', 'claude.ai') === true, 'Exact domain matches');
  assert(isDomainMatch('sub.claude.ai', 'claude.ai') === true, 'Subdomain matches');
  assert(isDomainMatch('chatgpt.com', 'chatgpt.com') === true, 'Exact chatgpt matches');
  assert(isDomainMatch('evil-claude.ai.com', 'claude.ai') === false, 'Spoofed domain evil-claude.ai.com is rejected');
  assert(isDomainMatch('claude.ai.attacker.org', 'claude.ai') === false, 'Spoofed domain claude.ai.attacker.org is rejected');
  assert(isDomainMatch('notclaude.ai', 'claude.ai') === false, 'Spoofed domain notclaude.ai is rejected');
}
console.log();

// ─── TEST 5: Large Payload Base64 Chunking (No Stack Overflow) ─────────────
console.log('--- TEST 5: Base64 Chunking trên mảng dữ liệu lớn (100,000 bytes) ---');
{
  const largeArray = new Uint8Array(100000);
  for (let i = 0; i < largeArray.length; i++) {
    largeArray[i] = i % 256;
  }

  let encoded = '';
  let decoded = null;
  let errorOccurred = false;

  try {
    encoded = uint8ArrayToBase64(largeArray);
    decoded = base64ToUint8Array(encoded);
  } catch (err) {
    errorOccurred = true;
    console.error('Lỗi mã hóa payload lớn:', err);
  }

  assert(!errorOccurred, 'No RangeError/Call stack overflow on 100KB payload');
  assert(decoded && decoded.length === 100000, 'Decoded array matches original length');
  assert(decoded[50000] === (50000 % 256), 'Data integrity verified at random offset');
}
console.log();

// ─── SUMMARY ───────────────────────────────────────────────────────────────
console.log('====================================================');
console.log(`🎯 KẾT QUẢ: ${passed} passed / ${passed + failed} total`);
if (failed === 0) {
  console.log('🎉 TẤT CẢ UNIT TESTS SCORING & PERSONA ENGINE ĐÃ PASS!');
} else {
  console.error(`❌ ${failed} test(s) FAILED!`);
  process.exit(1);
}
console.log('====================================================\n');
