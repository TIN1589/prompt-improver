/**
 * semanticExpander.js — Semantic Prompt Expansion Module
 * Mở rộng ngữ nghĩa prompt theo nhiều chiều: rule-based, template slots, Claude-powered.
 * Không phụ thuộc vào DOM — dùng được cả ở content script lẫn popup.
 */

// ─── PROMPT TEMPLATES ─────────────────────────────────────────────────────────
// Mỗi template có slots: {user_prompt}, {context}, {tone}, {length}, {language}

export const PROMPT_TEMPLATES = {
  /** Dành cho các task viết/tạo code mới */
  code_generation: {
    id: 'code_generation',
    name: '🛠️ Sinh Code mới',
    description: 'Tạo code từ mô tả ngắn, có type safety và error handling',
    template: `TASK: {user_prompt}
STACK: {context}
REQUIREMENTS:
- Language: {language}
- Style: {tone}
- Scope: {length}
- Include: type annotations, error handling, edge cases
- Exclude: boilerplate, markdown prose, explanations unless critical
OUTPUT: Working code only. No intro sentence.`,
  },

  /** Dành cho refactor/cải thiện code có sẵn */
  refactor: {
    id: 'refactor',
    name: '♻️ Refactor Code',
    description: 'Cải thiện code hiện có: readable, performant, testable',
    template: `TASK: Refactor the following — {user_prompt}
CONTEXT: {context}
GOALS:
- Improve: readability, performance, maintainability
- Remove: dead code, magic numbers, nested ternaries
- Add: JSDoc/TSDoc, guard clauses, early returns
- Preserve: existing public API contracts
- Tone: {tone}
OUTPUT: Refactored code with inline comments for non-obvious changes only.`,
  },

  /** Debug / sửa lỗi */
  debug: {
    id: 'debug',
    name: '🐛 Debug & Fix',
    description: 'Phân tích lỗi, tìm root cause, đề xuất fix',
    template: `TASK: Debug and fix — {user_prompt}
ENVIRONMENT: {context}
ANALYSIS REQUIRED:
1. Identify root cause (not symptoms)
2. List all affected code paths
3. Propose minimal fix without side effects
4. Add defensive check to prevent recurrence
SEVERITY: {tone}
OUTPUT: Root cause explanation (1-2 lines) + fixed code block.`,
  },

  /** Viết test */
  testing: {
    id: 'testing',
    name: '🧪 Viết Tests',
    description: 'Tạo unit/integration tests đầy đủ',
    template: `TASK: Write tests for — {user_prompt}
STACK: {context}
COVERAGE:
- Happy path: primary success scenarios
- Edge cases: null, empty, boundary values, overflow
- Error states: exceptions, async failures, timeouts
- Mocks: external dependencies, timers, filesystem
FRAMEWORK: {tone}
SCOPE: {length}
OUTPUT: Complete test file. No explanation prose.`,
  },

  /** Thiết kế kiến trúc */
  architecture: {
    id: 'architecture',
    name: '🏗️ Kiến trúc hệ thống',
    description: 'Thiết kế data model, API contracts, module boundaries',
    template: `TASK: Design architecture for — {user_prompt}
CONSTRAINTS: {context}
DELIVERABLES:
- File/module structure (tree format)
- Core data types / interfaces (TypeScript or pseudocode)
- API contracts (input → output signatures)
- Key design decisions with rationale (1 line each)
- Scalability notes: {length}
STYLE: {tone}
OUTPUT: Structured document with code blocks. No padding sentences.`,
  },
};

// ─── TONE PRESETS ──────────────────────────────────────────────────────────────
export const TONE_PRESETS = {
  concise:    'ultra-concise, no fluff',
  detailed:   'detailed with reasoning',
  beginner:   'beginner-friendly with explanations',
  expert:     'expert-level, assume senior developer context',
  vietnamese: 'explain in Vietnamese, code in English',
};

// ─── LENGTH PRESETS ────────────────────────────────────────────────────────────
export const LENGTH_PRESETS = {
  micro:    'under 30 lines',
  short:    'under 80 lines',
  medium:   'under 200 lines',
  full:     'complete implementation, any length',
  skeleton: 'skeleton/scaffold only, no implementation details',
};

// ─── CORE FUNCTIONS ────────────────────────────────────────────────────────────

/**
 * fillTemplate: Điền slots vào template
 * @param {string} templateStr
 * @param {Record<string, string>} slots
 * @returns {string}
 */
export function fillTemplate(templateStr, slots) {
  return templateStr.replace(/\{(\w+)\}/g, (match, key) => {
    return slots[key] !== undefined ? slots[key].trim() : match;
  });
}

/**
 * autoDetectTemplate: Tự động chọn template phù hợp dựa trên nội dung prompt
 * Sử dụng keyword scoring để quyết định
 * @param {string} userPrompt
 * @returns {string} template id
 */
export function autoDetectTemplate(userPrompt) {
  const lower = userPrompt.toLowerCase();

  const scores = {
    code_generation: 0,
    refactor:        0,
    debug:           0,
    testing:         0,
    architecture:    0,
  };

  // Code generation signals
  if (/\b(tạo|viết|create|build|implement|generate|làm|write)\b/.test(lower)) scores.code_generation += 2;
  if (/\b(function|class|module|component|api|endpoint)\b/.test(lower)) scores.code_generation += 1;

  // Refactor signals
  if (/\b(refactor|cải thiện|improve|optimize|clean|tối ưu|nâng cấp|restructure)\b/.test(lower)) scores.refactor += 3;

  // Debug signals
  if (/\b(lỗi|error|bug|fix|sửa|không hoạt động|crash|broken|fail|issue)\b/.test(lower)) scores.debug += 3;
  if (/\b(tại sao|why|what's wrong|problem|exception|stack trace)\b/.test(lower)) scores.debug += 2;

  // Testing signals
  if (/\b(test|kiểm thử|unit test|spec|jest|vitest|mocha|coverage)\b/.test(lower)) scores.testing += 4;

  // Architecture signals
  if (/\b(kiến trúc|architecture|design|thiết kế|schema|structure|system|database)\b/.test(lower)) scores.architecture += 3;
  if (/\b(scalable|microservice|monolith|ddd|mvp|module)\b/.test(lower)) scores.architecture += 2;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'code_generation';
}

/**
 * extractPageContext: Lấy ngữ cảnh từ DOM trang hiện tại (gọi từ content script)
 * Crawl visible text, title, URL để bổ sung vào prompt
 * @param {number} maxChars - Giới hạn ký tự ngữ cảnh
 * @returns {{ title: string, url: string, summary: string }}
 */
export function extractPageContext(maxChars = 300) {
  if (typeof document === 'undefined') return { title: '', url: '', summary: '' };

  const title = document.title?.slice(0, 80) || '';
  const url   = location.hostname || '';

  // Lấy text từ các thẻ semantic quan trọng
  const selectors = ['main', 'article', '[role="main"]', '.content', '#content', 'body'];
  let rawText = '';
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      rawText = el.innerText?.replace(/\s+/g, ' ').trim() || '';
      if (rawText.length > 50) break;
    }
  }

  const summary = rawText.slice(0, maxChars);
  return { title, url, summary };
}

/**
 * expandPrompt: Hàm chính — mở rộng prompt người dùng thành prompt chuẩn cho Claude Code
 * @param {object} params
 * @param {string} params.userPrompt - Prompt gốc của người dùng
 * @param {string} [params.templateId] - Template ID (tự detect nếu không truyền)
 * @param {string} [params.context]   - Ngữ cảnh bổ sung (stack, file, schema...)
 * @param {string} [params.tone]      - Tone preset key hoặc custom text
 * @param {string} [params.length]    - Length preset key hoặc custom text
 * @param {string} [params.language]  - Ngôn ngữ lập trình (tự detect nếu không truyền)
 * @returns {{ expanded: string, templateUsed: string, tokensEstimated: number }}
 */
export function expandPrompt({ userPrompt, templateId, context = '', tone = 'concise', length = 'short', language = '' }) {
  if (!userPrompt?.trim()) return { expanded: '', templateUsed: '', tokensEstimated: 0 };

  // Auto-detect template và language nếu chưa chỉ định
  const resolvedTemplate = templateId || autoDetectTemplate(userPrompt);
  const resolvedLanguage = language || detectLanguage(userPrompt);
  const resolvedTone     = TONE_PRESETS[tone]   || tone;
  const resolvedLength   = LENGTH_PRESETS[length] || length;

  const tpl = PROMPT_TEMPLATES[resolvedTemplate] || PROMPT_TEMPLATES.code_generation;

  const slots = {
    user_prompt: userPrompt,
    context:     context || resolvedLanguage || 'not specified',
    tone:        resolvedTone,
    length:      resolvedLength,
    language:    resolvedLanguage || 'any',
  };

  const expanded = fillTemplate(tpl.template, slots);

  return {
    expanded,
    templateUsed: tpl.name,
    templateId:   resolvedTemplate,
    tokensEstimated: Math.ceil(expanded.length / 3.8),
  };
}

/**
 * detectLanguage: Detect ngôn ngữ lập trình từ prompt text
 * @param {string} text
 * @returns {string}
 */
function detectLanguage(text) {
  const lower = text.toLowerCase();
  const langMap = [
    [/\b(typescript|\.ts|tsx)\b/, 'TypeScript'],
    [/\b(javascript|\.js|jsx|node\.?js)\b/, 'JavaScript'],
    [/\b(python|\.py|django|fastapi|flask)\b/, 'Python'],
    [/\b(golang|\.go|\bgo\b)\b/, 'Go'],
    [/\b(rust|\.rs|cargo)\b/, 'Rust'],
    [/\b(java|spring|maven|gradle)\b/, 'Java'],
    [/\b(c#|\.cs|dotnet|asp\.net)\b/, 'C#'],
    [/\b(php|laravel|symfony)\b/, 'PHP'],
    [/\b(swift|xcode|swiftui)\b/, 'Swift'],
    [/\b(kotlin|android)\b/, 'Kotlin'],
    [/\b(sql|postgres|mysql|sqlite)\b/, 'SQL'],
    [/\b(bash|shell|powershell|zsh)\b/, 'Shell'],
    [/\b(css|scss|tailwind)\b/, 'CSS'],
    [/\b(html|dom)\b/, 'HTML'],
  ];
  for (const [regex, lang] of langMap) {
    if (regex.test(lower)) return lang;
  }
  return '';
}

/**
 * generate3Variations: Tạo 3 biến thể prompt cho cùng 1 yêu cầu
 * (Quick actions cho overlay panel)
 * @param {string} userPrompt
 * @returns {Array<{label: string, prompt: string, icon: string}>}
 */
export function generate3Variations(userPrompt) {
  if (!userPrompt?.trim()) return [];

  return [
    {
      icon: '🎯',
      label: 'Tối giản (Minimal)',
      prompt: expandPrompt({ userPrompt, tone: 'concise', length: 'short' }).expanded,
    },
    {
      icon: '📚',
      label: 'Chi tiết (Detailed)',
      prompt: expandPrompt({ userPrompt, tone: 'detailed', length: 'medium' }).expanded,
    },
    {
      icon: '🏗️',
      label: 'Kiến trúc (Architecture)',
      prompt: expandPrompt({ userPrompt, templateId: 'architecture', tone: 'expert', length: 'full' }).expanded,
    },
  ];
}

// ─── 3 VÍ DỤ THỰC TẾ ──────────────────────────────────────────────────────────
// (Tham khảo cho test và documentation)
export const EXAMPLE_EXPANSIONS = [
  {
    label: 'Ví dụ 1: Tạo function',
    userInput: 'viết hàm validate email typescript',
    expanded: expandPrompt({
      userPrompt: 'viết hàm validate email typescript',
      tone: 'concise', length: 'short',
    }).expanded,
    expectedClaudeResponse:
      'export function validateEmail(email: string): boolean { ... } — with regex + trim',
  },
  {
    label: 'Ví dụ 2: Debug lỗi',
    userInput: 'lỗi Cannot read properties of undefined reading map trong React component',
    expanded: expandPrompt({
      userPrompt: 'lỗi Cannot read properties of undefined reading map trong React component',
      tone: 'expert', length: 'short',
    }).expanded,
    expectedClaudeResponse:
      'Root cause: async data not initialized. Fix: optional chaining + default value.',
  },
  {
    label: 'Ví dụ 3: Viết test',
    userInput: 'test cho auth middleware express jwt',
    expanded: expandPrompt({
      userPrompt: 'test cho auth middleware express jwt',
      templateId: 'testing', tone: 'concise', length: 'medium',
    }).expanded,
    expectedClaudeResponse:
      'Complete Jest test suite with mocks for jwt.verify, 4 test cases.',
  },
];
