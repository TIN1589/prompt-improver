/**
 * test_semantic_expander.js — Unit tests cho module semanticExpander.js
 * Chạy: node test/test_semantic_expander.js
 */

import {
  expandPrompt,
  autoDetectTemplate,
  fillTemplate,
  generate3Variations,
  PROMPT_TEMPLATES,
  TONE_PRESETS,
  LENGTH_PRESETS,
} from '../src/semanticExpander.js';

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

console.log('\n================================================');
console.log('🧪 TEST SUITE: semanticExpander.js');
console.log('================================================\n');

// ─── TEST 1: fillTemplate ─────────────────────────────────────────────────────
console.log('--- TEST 1: fillTemplate (slot filling) ---');
{
  const tpl = 'TASK: {user_prompt}\nSTACK: {context}\nTONE: {tone}';
  const result = fillTemplate(tpl, { user_prompt: 'build auth', context: 'Node.js', tone: 'concise' });
  assert(result.includes('build auth'), 'user_prompt slot filled');
  assert(result.includes('Node.js'), 'context slot filled');
  assert(result.includes('concise'), 'tone slot filled');
  assert(!result.includes('{'), 'No unfilled slots remaining');
}
console.log();

// ─── TEST 2: autoDetectTemplate ───────────────────────────────────────────────
console.log('--- TEST 2: autoDetectTemplate (keyword scoring) ---');
{
  assert(autoDetectTemplate('viết hàm validate email typescript') === 'code_generation', 'Detect code_generation (VI)');
  assert(autoDetectTemplate('create a REST API endpoint') === 'code_generation', 'Detect code_generation (EN)');
  assert(autoDetectTemplate('refactor this class to use dependency injection') === 'refactor', 'Detect refactor');
  assert(autoDetectTemplate('lỗi Cannot read properties of undefined') === 'debug', 'Detect debug (VI)');
  assert(autoDetectTemplate('fix the bug in authentication middleware') === 'debug', 'Detect debug (EN)');
  assert(autoDetectTemplate('viết unit test cho auth service jest') === 'testing', 'Detect testing (VI)');
  assert(autoDetectTemplate('design microservice architecture for e-commerce') === 'architecture', 'Detect architecture');
}
console.log();

// ─── TEST 3: expandPrompt — code_generation ───────────────────────────────────
console.log('--- TEST 3: expandPrompt — code_generation template ---');
{
  const result = expandPrompt({
    userPrompt: 'viết hàm validate email typescript',
    tone: 'concise',
    length: 'short',
  });
  assert(result.expanded.length > 0, 'Expanded prompt is non-empty');
  assert(result.templateId === 'code_generation', 'Auto-detected correct template');
  assert(result.expanded.includes('TASK:'), 'Contains TASK: prefix');
  assert(result.expanded.includes('validate email'), 'Contains original intent');
  assert(result.tokensEstimated > 0, 'Token estimate is positive');
  console.log('  📄 Template used:', result.templateUsed);
  console.log('  🔢 Est. tokens:', result.tokensEstimated);
}
console.log();

// ─── TEST 4: expandPrompt — debug template ────────────────────────────────────
console.log('--- TEST 4: expandPrompt — debug template ---');
{
  const result = expandPrompt({
    userPrompt: 'lỗi Cannot read properties of undefined reading map trong React',
    tone: 'expert',
    length: 'short',
  });
  assert(result.templateId === 'debug', 'Debug template selected');
  assert(result.expanded.includes('root cause'), 'Contains root cause instruction');
  assert(result.expanded.includes('Cannot read properties'), 'Original error text preserved');
}
console.log();

// ─── TEST 5: expandPrompt — testing template ──────────────────────────────────
console.log('--- TEST 5: expandPrompt — testing template ---');
{
  const result = expandPrompt({
    userPrompt: 'test cho JWT auth middleware express',
    templateId: 'testing',
    tone: 'concise',
    length: 'medium',
  });
  assert(result.templateId === 'testing', 'Testing template forced');
  assert(result.expanded.includes('TASK:'), 'TASK: section present');
  assert(result.expanded.includes('edge case') || result.expanded.includes('Edge case') || result.expanded.includes('COVERAGE'), 'Coverage instruction present');
}
console.log();

// ─── TEST 6: expandPrompt — tone/length presets ───────────────────────────────
console.log('--- TEST 6: expandPrompt — tone and length presets ---');
{
  const result1 = expandPrompt({ userPrompt: 'create API', tone: 'detailed', length: 'full' });
  const result2 = expandPrompt({ userPrompt: 'create API', tone: 'concise', length: 'micro' });
  assert(result1.expanded.includes('detailed') || result1.tokensEstimated >= result2.tokensEstimated,
    'Detailed/full tone generates more content than concise/micro');
  assert(result1.expanded.includes('detailed with reasoning') || result1.expanded.includes('detailed'), 'Tone preset applied');
}
console.log();

// ─── TEST 7: generate3Variations ──────────────────────────────────────────────
console.log('--- TEST 7: generate3Variations ---');
{
  const variations = generate3Variations('build a Redis cache wrapper in Node.js');
  assert(variations.length === 3, 'Generates exactly 3 variations');
  assert(variations.every(v => v.label && v.prompt && v.icon), 'All variations have label, prompt, icon');
  assert(variations[0].label === 'Tối giản (Minimal)', 'First variation is Minimal');
  assert(variations[1].label === 'Chi tiết (Detailed)', 'Second variation is Detailed');
  assert(variations[2].label === 'Kiến trúc (Architecture)', 'Third variation is Architecture');

  // Minimal should be shorter than Detailed
  assert(
    variations[0].prompt.length <= variations[1].prompt.length,
    'Minimal prompt ≤ length of Detailed prompt'
  );

  variations.forEach((v, i) => {
    console.log(`  [${i+1}] ${v.icon} ${v.label}: ${v.prompt.length} chars`);
  });
}
console.log();

// ─── TEST 8: expandPrompt edge cases ─────────────────────────────────────────
console.log('--- TEST 8: Edge cases ---');
{
  const empty = expandPrompt({ userPrompt: '' });
  assert(empty.expanded === '', 'Empty input returns empty output');

  const whitespace = expandPrompt({ userPrompt: '   ' });
  assert(whitespace.expanded === '', 'Whitespace-only input returns empty');

  const noSlots = expandPrompt({ userPrompt: 'fix bug' }); // No context/tone/length
  assert(noSlots.expanded.length > 0, 'Works with only userPrompt provided');
}
console.log();

// ─── TEST 9: All templates are reachable ─────────────────────────────────────
console.log('--- TEST 9: All 5 built-in templates produce valid output ---');
{
  const templateIds = Object.keys(PROMPT_TEMPLATES);
  assert(templateIds.length === 5, 'Exactly 5 built-in templates');
  for (const id of templateIds) {
    const result = expandPrompt({ userPrompt: 'sample task', templateId: id });
    assert(result.expanded.length > 20, `Template "${id}" generates non-trivial output`);
  }
}
console.log();

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log('================================================');
console.log(`🎯 KẾT QUẢ: ${passed} passed / ${passed + failed} total`);
if (failed === 0) {
  console.log('🎉 TẤT CẢ TESTS ĐÃ PASS!');
} else {
  console.error(`❌ ${failed} test(s) FAILED!`);
  process.exit(1);
}
console.log('================================================\n');
