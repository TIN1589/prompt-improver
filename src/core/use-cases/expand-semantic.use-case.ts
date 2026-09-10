/**
 * expand-semantic.use-case.ts — Mở rộng ngữ nghĩa Prompt (Templates, Slots & Variations)
 */

import { estimateTokens } from '../../shared/utils/token-counter';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
}

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
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

export const TONE_PRESETS: Record<string, string> = {
  concise: 'ultra-concise, no fluff',
  detailed: 'detailed with reasoning',
  beginner: 'beginner-friendly with explanations',
  expert: 'expert-level, assume senior developer context',
  vietnamese: 'explain in Vietnamese, code in English',
};

export const LENGTH_PRESETS: Record<string, string> = {
  micro: 'single function or minimal diff only',
  standard: 'full module with types and basic test',
  comprehensive: 'production-ready with tests, docs, error boundaries',
};

export interface ExpandOptions {
  userPrompt: string;
  templateId?: string;
  context?: string;
  tone?: string;
  length?: string;
  language?: string;
}

export interface ExpandedPromptResult {
  prompt: string;
  templateUsed: PromptTemplate;
  estimatedTokens: number;
}

export interface PromptVariation {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  tokens: number;
}

export class ExpandSemanticUseCase {
  static detectTemplate(userPrompt: string): string {
    const p = userPrompt.toLowerCase();
    if (/\b(error|bug|fix|lỗi|crash|fail|exception|stack trace)\b/.test(p)) return 'debug';
    if (/\b(refactor|tối ưu|improve|clean code|tái cấu trúc|optimize)\b/.test(p)) return 'refactor';
    if (/\b(test|unit test|spec|mock|kiểm thử|coverage)\b/.test(p)) return 'testing';
    if (/\b(kiến trúc|architecture|design system|data model|database schema|api contract)\b/.test(p)) return 'architecture';
    return 'code_generation';
  }

  static expand(options: ExpandOptions): ExpandedPromptResult {
    const {
      userPrompt,
      templateId,
      context = 'TypeScript / Modern Web / Node.js',
      tone = 'concise',
      length = 'standard',
      language = 'TypeScript',
    } = options;

    if (!userPrompt || !userPrompt.trim()) {
      return {
        prompt: '',
        templateUsed: PROMPT_TEMPLATES.code_generation,
        estimatedTokens: 0,
      };
    }

    const tId = templateId || this.detectTemplate(userPrompt);
    const tpl = PROMPT_TEMPLATES[tId] || PROMPT_TEMPLATES.code_generation;

    const toneVal = TONE_PRESETS[tone] || tone;
    const lengthVal = LENGTH_PRESETS[length] || length;

    const expanded = tpl.template
      .replace('{user_prompt}', userPrompt.trim())
      .replace('{context}', context)
      .replace('{tone}', toneVal)
      .replace('{length}', lengthVal)
      .replace('{language}', language);

    return {
      prompt: expanded,
      templateUsed: tpl,
      estimatedTokens: estimateTokens(expanded),
    };
  }

  static generate3Variations(
    userPrompt: string,
    baseOptions: Partial<ExpandOptions> = {}
  ): PromptVariation[] {
    const cleanPrompt = userPrompt?.trim() || '';
    if (!cleanPrompt) return [];

    const autoTemplate = this.detectTemplate(cleanPrompt);

    // 1. Tối giản
    const minimal = this.expand({
      ...baseOptions,
      userPrompt: cleanPrompt,
      templateId: autoTemplate,
      tone: 'concise',
      length: 'micro',
    });

    // 2. Chi tiết
    const detailed = this.expand({
      ...baseOptions,
      userPrompt: cleanPrompt,
      templateId: autoTemplate,
      tone: 'detailed',
      length: 'comprehensive',
    });

    // 3. Kiến trúc
    const architecture = this.expand({
      ...baseOptions,
      userPrompt: cleanPrompt,
      templateId: 'architecture',
      tone: 'expert',
      length: 'standard',
    });

    return [
      {
        id: 'minimal',
        label: 'Tối giản (Minimal)',
        icon: '🎯',
        prompt: minimal.prompt,
        tokens: minimal.estimatedTokens,
      },
      {
        id: 'detailed',
        label: 'Chi tiết (Detailed)',
        icon: '📚',
        prompt: detailed.prompt,
        tokens: detailed.estimatedTokens,
      },
      {
        id: 'architecture',
        label: 'Kiến trúc (Architecture)',
        icon: '🏗️',
        prompt: architecture.prompt,
        tokens: architecture.estimatedTokens,
      },
    ];
  }
}
