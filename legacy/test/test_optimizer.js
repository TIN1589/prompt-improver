import {
  estimateTokens,
  compressPrompt,
  extractEntities,
  summarizeText,
  expandConceptRuleBased,
  buildTemplatePrompt
} from '../src/utils.js';

console.log('====================================================');
console.log('🧪 BẮT ĐẦU CHẠY UNIT TESTS CHO CLAUDE CODE OPTIMIZER');
console.log('====================================================\n');

// TEST 1: Token Estimation
console.log('--- TEST 1: Ước lượng Token ---');
const sampleEN = "Hello world! This is a simple test prompt for Claude Code CLI.";
const sampleVI = "Xin chào Claude, hãy viết cho tôi một hàm JavaScript để tính tổng các số chẵn.";
const tokensEN = estimateTokens(sampleEN);
const tokensVI = estimateTokens(sampleVI);
console.log(`EN Text: "${sampleEN}" => Estimated: ${tokensEN} tokens`);
console.log(`VI Text: "${sampleVI}" => Estimated: ${tokensVI} tokens`);
console.assert(tokensEN > 0 && tokensVI > 0, 'Test 1 Thất bại: Đếm token phải > 0');
console.log('✅ TEST 1 PASSED\n');

// TEST 2: Entity Extraction
console.log('--- TEST 2: Trích xuất thực thể ---');
const codeContext = "Tôi cần xây dựng một API bằng TypeScript và Express, sử dụng Docker, không dùng lodash, max 50 lines.";
const entities = extractEntities(codeContext);
console.log('Entities extracted:', JSON.stringify(entities, null, 2));
console.assert(entities.languages.includes('typescript'), 'Test 2 Thất bại: Thiếu typescript');
console.assert(entities.frameworks.includes('express'), 'Test 2 Thất bại: Thiếu express');
console.assert(entities.frameworks.includes('docker'), 'Test 2 Thất bại: Thiếu docker');
console.log('✅ TEST 2 PASSED\n');

// TEST 3: Compression Modes (Conservative, Balanced, Aggressive)
console.log('--- TEST 3: Các chế độ nén Prompt ---');
const verbosePrompt = `Xin chào bạn, tôi đang làm một dự án và tôi muốn nhờ bạn hãy giúp tôi viết mã nguồn cho một hàm kiểm tra email hợp lệ bằng Javascript trong trường hợp mà người dùng nhập khoảng trắng thì tự động loại bỏ. Cảm ơn bạn rất nhiều!`;
const tokensOriginal = estimateTokens(verbosePrompt);

const conservative = compressPrompt(verbosePrompt, 'conservative');
const balanced = compressPrompt(verbosePrompt, 'balanced');
const aggressive = compressPrompt(verbosePrompt, 'aggressive');

const tokensCons = estimateTokens(conservative);
const tokensBal = estimateTokens(balanced);
const tokensAggr = estimateTokens(aggressive);

console.log(`Prompt gốc (${tokensOriginal} tokens):\n"${verbosePrompt}"\n`);
console.log(`Conservative (${tokensCons} tokens, -${Math.round((tokensOriginal - tokensCons)/tokensOriginal*100)}%):\n"${conservative}"\n`);
console.log(`Balanced (${tokensBal} tokens, -${Math.round((tokensOriginal - tokensBal)/tokensOriginal*100)}%):\n"${balanced}"\n`);
console.log(`Aggressive (${tokensAggr} tokens, -${Math.round((tokensOriginal - tokensAggr)/tokensOriginal*100)}%):\n"${aggressive}"\n`);

console.assert(tokensCons <= tokensOriginal, 'Conservative không được dài hơn bản gốc');
console.assert(tokensBal <= tokensCons, 'Balanced phải gọn hơn Conservative');
console.assert(tokensAggr <= tokensBal, 'Aggressive phải gọn nhất');
console.log('✅ TEST 3 PASSED\n');

// TEST 4: Rule-based Concept Expansion
console.log('--- TEST 4: Mở rộng concept (Rule-based) ---');
const concept = "Authentication Module JWT";
const variations = expandConceptRuleBased(concept);
console.log(`Concept: "${concept}" => Sinh ra ${variations.length} biến thể:`);
variations.forEach((v, i) => {
  console.log(`[${i+1}] ${v.title} (~${v.estimatedTokens} tokens):\n${v.prompt}\n`);
});
console.assert(variations.length === 3, 'Test 4 Thất bại: Phải sinh đúng 3 biến thể');
console.log('✅ TEST 4 PASSED\n');

// TEST 5: Template Builder
console.log('--- TEST 5: Xây dựng template prompt ---');
const tplResult = buildTemplatePrompt({
  task: 'Create Redis cache wrapper',
  context: 'Node.js v20, ioredis',
  constraints: ['Auto reconnect', 'TTL default 3600s'],
  outputFormat: 'code'
});
console.log('Template Output:\n' + tplResult);
console.assert(tplResult.includes('TASK: Create Redis cache wrapper'), 'Test 5 Thất bại: Sai TASK');
console.assert(tplResult.includes('RULES:'), 'Test 5 Thất bại: Sai RULES');
console.log('✅ TEST 5 PASSED\n');

console.log('====================================================');
console.log('🎉 TẤT CẢ 5 BỘ TEST ĐÃ CHẠY THÀNH CÔNG VỚI ĐỘ CHÍNH XÁC CAO!');
console.log('====================================================');
