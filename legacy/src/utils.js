/**
 * Prompt Improver - Core Utility Module
 * Chứa các thuật toán nén prompt, trích xuất thực thể, băm SHA-256, phân loại tác vụ,
 * kiểm tra domain an toàn và mã hoá Web Crypto chống tràn stack.
 */

// Danh sách từ đệm và mẫu câu hội thoại dư thừa (tiếng Việt & tiếng Anh)
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

// Bản đồ thay thế cụm từ dài dòng thành từ ngắn gọn
const VERBOSE_REPLACEMENTS = [
  // Tiếng Việt
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

  // Tiếng Anh
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

/**
 * 1. Chuyển đổi Uint8Array sang Base64 an toàn không lo tràn Stack
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
  }
  return btoa(binary);
}

/**
 * 2. Chuyển đổi Base64 sang Uint8Array an toàn
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 3. Ước lượng số lượng token
 * Hỗ trợ nhận diện đặc thù tiếng Việt (dấu thanh/âm tiết ghép) và tiếng Anh/Code.
 * @param {string} text - Văn bản cần đếm token
 * @returns {number} Số token ước tính
 */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Kiểm tra tỷ lệ ký tự tiếng Việt có dấu
  const vietnameseAccentsRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const isVietnamese = vietnameseAccentsRegex.test(trimmed);

  if (isVietnamese) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    const punctuationCount = (trimmed.match(/[,.;:?!(){}[\]<>"/\\|=+*#@$%^&~`_-]/g) || []).length;
    return Math.ceil(words.length * 1.25 + punctuationCount * 0.4);
  } else {
    const charEstimate = Math.ceil(trimmed.length / 3.8);
    const wordEstimate = Math.ceil(trimmed.split(/\s+/).filter(Boolean).length * 1.3);
    return Math.max(Math.ceil((charEstimate + wordEstimate) / 2), 1);
  }
}

/**
 * 4. Kiểm tra so khớp Domain an toàn chống Domain Spoofing
 * @param {string} currentHostname
 * @param {string} targetDomain
 * @returns {boolean}
 */
export function isDomainMatch(currentHostname, targetDomain) {
  if (!currentHostname || !targetDomain) return false;
  const host = currentHostname.toLowerCase();
  const target = targetDomain.toLowerCase();
  return host === target || host.endsWith('.' + target);
}

/**
 * 5. Phân loại tác vụ từ prompt (Code, Writing, Analysis, Translation, General)
 * @param {string} prompt
 * @returns {'code' | 'writing' | 'analysis' | 'translation' | 'general'}
 */
export function detectTaskType(prompt = '') {
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

/**
 * 6. Tính hash SHA-256 của prompt để lưu cache
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function hashPrompt(text = '') {
  const normalized = text.trim().toLowerCase();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback FNV-1a hash cho non-crypto environments
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return 'h_' + (hash >>> 0).toString(16);
}

/**
 * 7. Trích xuất thực thể và từ khóa kỹ thuật bằng Regex + Heuristics
 * @param {string} text
 * @returns {{languages: string[], frameworks: string[], actions: string[], identifiers: string[], constraints: string[]}}
 */
export function extractEntities(text) {
  if (!text) return { languages: [], frameworks: [], actions: [], identifiers: [], constraints: [] };

  const languages = [];
  const frameworks = [];
  const actions = [];
  const identifiers = [];
  const constraints = [];

  // Ngôn ngữ & Nền tảng
  const langRegex = /\b(javascript|typescript|python|golang|go|rust|java|c\+\+|c#|php|ruby|swift|kotlin|sql|html|css|bash|shell|powershell)\b/gi;
  let match;
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

  // Ký hiệu biến, hàm, camelCase / snake_case / kebab-case
  const identifierRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*\b|\b[a-z0-9]+_[a-z0-9_]+\b/g;
  while ((match = identifierRegex.exec(text)) !== null) {
    if (!identifiers.includes(match[0]) && match[0].length > 3) identifiers.push(match[0]);
  }

  // Ràng buộc (Constraints)
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
 * 8. Tóm tắt văn bản theo phương pháp Extractive TextRank đơn giản hóa
 * @param {string} text
 * @param {number} maxSentences
 * @returns {string}
 */
export function summarizeText(text, maxSentences = 3) {
  if (!text || typeof text !== 'string') return '';
  
  const sentences = text
    .split(/(?<=[.?!;:\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  if (sentences.length <= maxSentences) return text;

  const wordFreq = {};
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

  return selected.map(item => item.sentence).join(' ');
}

/**
 * 9. Nén Prompt theo 3 cấp độ (Conservative, Balanced, Aggressive)
 * @param {string} text - Văn bản prompt gốc
 * @param {'conservative' | 'balanced' | 'aggressive'} mode - Cấp độ nén
 * @returns {string} Văn bản prompt sau khi tối ưu
 */
export function compressPrompt(text, mode = 'balanced') {
  if (!text || typeof text !== 'string') return '';

  let result = text;

  // BƯỚC 1: Xóa filler words & hội thoại thừa
  for (const pattern of [...FILLER_PATTERNS_VI, ...FILLER_PATTERNS_EN]) {
    result = result.replace(pattern, ' ');
  }

  // Chuẩn hóa khoảng trắng & dấu câu lặp
  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/(\r\n|\n|\r){3,}/g, '\n\n')
    .replace(/^[ ,.;:!\-]+/gm, '')
    .replace(/[ ,;:\-]+$/gm, '')
    .replace(/([.?!,;])\1+/g, '$1')
    .trim();

  // Loại bỏ các từ nối mở đầu bị lẻ ở đầu câu
  result = result.replace(/^(và|để|thì|nhưng|and|so|then)\s+/gim, '').trim();

  if (mode === 'conservative') {
    return result;
  }

  // BƯỚC 2: Rút gọn cụm từ dài dòng (Balanced & Aggressive)
  for (const { pattern, replacement } of VERBOSE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/^([A-ZÀ-Ỹa-zà-ỹ0-9 ]+:\s*)?(tôi cần|hãy|bạn hãy|vui lòng)\s+/gim, '')
    .replace(/^[ ,.;:!\-]+/gm, '')
    .trim();

  if (mode === 'balanced') {
    return result;
  }

  // BƯỚC 3: Aggressive Compression - Rút gọn tối đa mọi từ phụ
  let cleanTask = result
    .replace(/\b(hàm|function|chương trình)\b/gi, 'fn')
    .replace(/\b(hợp lệ|valid)\b/gi, 'valid')
    .replace(/\b(kiểm tra|validate|check)\b/gi, 'validate')
    .replace(/\b(cho một|cho|một|các|những|thì|tự động|thực hiện)\b/gi, '')
    .replace(/[.?!]+$/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return cleanTask;
}

/**
 * 9. Mở rộng Concept theo quy tắc (Rule-based Expansion)
 * @param {string} concept - Ý tưởng cốt lõi
 * @returns {Array<{title: string, prompt: string, estimatedTokens: number}>}
 */
export function expandConceptRuleBased(concept) {
  if (!concept) return [];

  const cleanConcept = concept.trim();

  const variations = [
    {
      title: "Kiến trúc & Cấu trúc Dữ liệu (Architecture & Data Model)",
      prompt: `TASK: Implement core architecture & data types for "${cleanConcept}".\nREQUIREMENTS: Modular design, strict type safety, zero redundancy.\nOUTPUT: TypeScript types/interfaces and file structure only.`,
    },
    {
      title: "Xử lý Logic & Edge Cases (Logic & Boundary Conditions)",
      prompt: `TASK: Write core business logic & edge-case handlers for "${cleanConcept}".\nREQUIREMENTS: Handle null/undefined, error boundaries, input validation.\nOUTPUT: Clean implementation code + inline comments for edge cases.`,
    },
    {
      title: "Kiểm thử & Tối ưu Hiệu năng (Testing & Optimization)",
      prompt: `TASK: Create unit tests & performance benchmarks for "${cleanConcept}".\nREQUIREMENTS: Cover happy path, failure states, async timeout.\nOUTPUT: Unit test suite (Jest/Vitest) with mock data.`,
    }
  ];

  return variations.map(v => ({
    ...v,
    estimatedTokens: estimateTokens(v.prompt)
  }));
}

/**
 * 10. Xây dựng Prompt theo khuôn mẫu chuẩn
 */
export function buildTemplatePrompt({ task, context = '', constraints = [], outputFormat = 'code' }) {
  const parts = [];
  
  if (task) parts.push(`TASK: ${task.trim()}`);
  if (context) parts.push(`CONTEXT: ${context.trim()}`);
  if (constraints && constraints.length > 0) {
    parts.push(`RULES:\n- ${constraints.map(c => c.trim()).join('\n- ')}`);
  }
  
  if (outputFormat === 'code') {
    parts.push(`FORMAT: Code only. No chat, no markdown intro.`);
  } else if (outputFormat === 'json') {
    parts.push(`FORMAT: Valid raw JSON only without markdown wrapper.`);
  } else {
    parts.push(`FORMAT: Concise bullet points.`);
  }

  return parts.join('\n\n');
}

/**
 * 11. Web Crypto API: Mã hoá AES-GCM 256-bit an toàn với PBKDF2
 */
export async function encryptData(plainText, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(plainText)
  );

  return {
    cipherText: uint8ArrayToBase64(new Uint8Array(encrypted)),
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt)
  };
}

/**
 * 12. Web Crypto API: Giải mã AES-GCM an toàn
 */
export async function decryptData(encryptedObj, passphrase) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const salt = base64ToUint8Array(encryptedObj.salt);
  const iv = base64ToUint8Array(encryptedObj.iv);
  const cipherBytes = base64ToUint8Array(encryptedObj.cipherText);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    cipherBytes
  );

  return dec.decode(decrypted);
}

/**
 * 13. Thoát chuỗi HTML để hiển thị an toàn
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
