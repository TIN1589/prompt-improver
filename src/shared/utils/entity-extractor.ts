/**
 * entity-extractor.ts — Trích xuất thực thể, nén prompt và xử lý văn bản
 */

import { estimateTokens } from './token-counter';

export interface ExtractedEntities {
  languages: string[];
  frameworks: string[];
  actions: string[];
  identifiers: string[];
  constraints: string[];
}

export function escapeHtml(text: string = ''): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Trích xuất thực thể và từ khóa kỹ thuật bằng Regex & Heuristics
 */
export function extractEntities(text: string): ExtractedEntities {
  if (!text) return { languages: [], frameworks: [], actions: [], identifiers: [], constraints: [] };

  const languages: string[] = [];
  const frameworks: string[] = [];
  const actions: string[] = [];
  const identifiers: string[] = [];
  const constraints: string[] = [];

  // Ngôn ngữ & Nền tảng
  const langRegex = /\b(javascript|typescript|python|golang|go|rust|java|c\+\+|c#|php|ruby|swift|kotlin|sql|html|css|bash|shell|powershell)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = langRegex.exec(text)) !== null) {
    const val = match[1].toLowerCase();
    if (!languages.includes(val)) languages.push(val);
  }

  // Frameworks & Libraries
  const frameworkRegex = /\b(react|vue|angular|svelte|next\.js|nuxt|express|fastapi|django|flask|spring|laravel|tailwind|bootstrap|docker|kubernetes|chrome extension|manifest v3)\b/gi;
  while ((match = frameworkRegex.exec(text)) !== null) {
    const val = match[1].toLowerCase();
    if (!frameworks.includes(val)) frameworks.push(val);
  }

  // Hành động chính
  const actionRegex = /\b(tạo|xây dựng|viết|tối ưu|sửa lỗi|refactor|debug|create|build|implement|optimize|fix|test|generate|deploy)\b/gi;
  while ((match = actionRegex.exec(text)) !== null) {
    const val = match[1].toLowerCase();
    if (!actions.includes(val)) actions.push(val);
  }

  // Ký hiệu biến, hàm
  const identifierRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*\b|\b[a-z0-9]+_[a-z0-9_]+\b/g;
  while ((match = identifierRegex.exec(text)) !== null) {
    if (!identifiers.includes(match[0]) && match[0].length > 3) identifiers.push(match[0]);
  }

  // Ràng buộc
  const constraintPatterns = [
    /(không dùng|không sử dụng|no|without|do not use)\s+([a-zA-Z0-9_\-\s]+?)(?=[,;.\n]|$)/gi,
    /(chỉ dùng|chỉ sử dụng|only use)\s+([a-zA-Z0-9_\-\s]+?)(?=[,;.\n]|$)/gi,
    /(tối đa|maximum|max)\s+([0-9]+\s*[a-zA-Z0-9_\-\s]+?)(?=[,;.\n]|$)/gi
  ];
  for (const cp of constraintPatterns) {
    while ((match = cp.exec(text)) !== null) {
      const val = match[0].trim();
      if (val && !constraints.includes(val)) constraints.push(val);
    }
  }

  return {
    languages,
    frameworks,
    actions,
    identifiers: identifiers.slice(0, 8),
    constraints: constraints.slice(0, 5)
  };
}

/**
 * Tóm tắt văn bản theo phương pháp Extractive TextRank đơn giản hóa
 */
export function summarizeText(text: string, maxSentences: number = 3): string {
  if (!text || typeof text !== 'string') return '';

  const sentences = text
    .split(/(?<=[.?!;:\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  if (sentences.length <= maxSentences) return text;

  const wordFreq: Record<string, number> = {};
  const stopWords = new Set(['và', 'là', 'của', 'các', 'cho', 'với', 'trong', 'được', 'có', 'để', 'một', 'này', 'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with']);

  const words = text.toLowerCase().match(/\b[a-zA-Z0-9à-ỹÀ-Ỹ_]{2,}\b/g) || [];
  for (const w of words) {
    if (!stopWords.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const scoredSentences = sentences.map((sentence, index) => {
    const sWords = sentence.toLowerCase().match(/\b[a-zA-Z0-9à-ỹÀ-Ỹ_]{2,}\b/g) || [];
    let score = 0;
    for (const w of sWords) {
      if (wordFreq[w]) score += wordFreq[w];
    }
    if (index === 0) score *= 1.3;
    score = score / (sWords.length || 1);
    return { sentence, score, index };
  });

  scoredSentences.sort((a, b) => b.score - a.score);
  const selected = scoredSentences.slice(0, maxSentences);
  selected.sort((a, b) => a.index - b.index);

  return selected.map(s => s.sentence).join(' ');
}

// Từ đệm tiếng Việt & tiếng Anh
const FILLER_PATTERNS_VI = [
  /xin chào( bạn| claude| trợ lý)?/gi,
  /tôi muốn (nhờ|hỏi|yêu cầu) bạn/gi,
  /bạn có thể (vui lòng|giúp tôi)?/gi,
  /hãy giúp tôi/gi,
  /làm ơn/gi,
  /cảm ơn bạn( rất nhiều)?/gi,
  /tôi đang làm một dự án/gi,
  /như bạn đã biết/gi,
  /theo tôi nghĩ/gi,
  /rất mong nhận được phản hồi/gi,
  /bạn có hiểu không\??/gi
];

const FILLER_PATTERNS_EN = [
  /hello( there| claude| assistant)?/gi,
  /hey( there)?/gi,
  /i want you to( please)?/gi,
  /could you please/gi,
  /can you help me( to)?/gi,
  /please help me( to)?/gi,
  /thank you( very much| in advance)?/gi,
  /i am working on a project/gi,
  /as you may know/gi,
  /in my opinion/gi,
  /i was wondering if/gi,
  /do you understand\??/gi
];

const VERBOSE_REPLACEMENTS = [
  { pattern: /trong trường hợp mà/gi, replacement: "nếu" },
  { pattern: /với mục đích là để/gi, replacement: "để" },
  { pattern: /có khả năng thực hiện/gi, replacement: "có thể" },
  { pattern: /tiến hành kiểm tra/gi, replacement: "kiểm tra" },
  { pattern: /thực hiện việc tối ưu/gi, replacement: "tối ưu" },
  { pattern: /đưa ra giải pháp/gi, replacement: "giải pháp" },
  { pattern: /viết mã nguồn/gi, replacement: "viết code" },
  { pattern: /không phân biệt chữ hoa chữ thường/gi, replacement: "case-insensitive" },
  { pattern: /dưới dạng định dạng json/gi, replacement: "dạng JSON" },
  { pattern: /đáp ứng yêu cầu về hiệu năng/gi, replacement: "tối ưu hiệu năng" },
  { pattern: /in order to/gi, replacement: "to" },
  { pattern: /due to the fact that/gi, replacement: "because" },
  { pattern: /at the present time/gi, replacement: "currently" },
  { pattern: /with the exception of/gi, replacement: "except" },
  { pattern: /has the ability to/gi, replacement: "can" },
  { pattern: /make sure that you/gi, replacement: "ensure" },
  { pattern: /provide me with/gi, replacement: "provide" },
  { pattern: /in a step by step manner/gi, replacement: "step-by-step" },
  { pattern: /as soon as possible/gi, replacement: "ASAP" },
  { pattern: /write source code for/gi, replacement: "code" }
];

export interface CompressResult {
  originalText: string;
  compressedText: string;
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  reductionPercentage: number;
}

/**
 * Nén prompt: loại bỏ từ đệm, thay thế cụm từ dài dòng
 */
export function compressPrompt(text: string): CompressResult {
  if (!text || typeof text !== 'string') {
    return {
      originalText: '',
      compressedText: '',
      originalTokens: 0,
      compressedTokens: 0,
      tokensSaved: 0,
      reductionPercentage: 0
    };
  }

  let result = text;
  for (const pattern of [...FILLER_PATTERNS_VI, ...FILLER_PATTERNS_EN]) {
    result = result.replace(pattern, '');
  }

  for (const item of VERBOSE_REPLACEMENTS) {
    result = result.replace(item.pattern, item.replacement);
  }

  // Chuẩn hóa khoảng trắng & dấu câu dư
  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/(\r\n|\n|\r){3,}/g, '\n\n')
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/^[,.:;?!-]\s*/, '')
    .trim();

  const originalTokens = estimateTokens(text);
  const compressedTokens = estimateTokens(result);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);
  const reductionPercentage = originalTokens > 0
    ? Math.round((tokensSaved / originalTokens) * 100)
    : 0;

  return {
    originalText: text,
    compressedText: result,
    originalTokens,
    compressedTokens,
    tokensSaved,
    reductionPercentage
  };
}
