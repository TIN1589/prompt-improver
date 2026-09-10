/**
 * core_domain.test.ts — Unit Tests cho Clean Architecture Core Domain Layer
 * Chạy bằng Vitest
 */

import { describe, it, expect } from 'vitest';
import { ClassifyTaskUseCase } from '../../src/core/use-cases/classify-task.use-case';
import { ScorePromptUseCase } from '../../src/core/use-cases/score-prompt.use-case';
import { ApplyPersonaUseCase } from '../../src/core/use-cases/apply-persona.use-case';
import { ExpandSemanticUseCase } from '../../src/core/use-cases/expand-semantic.use-case';
import { estimateTokens } from '../../src/shared/utils/token-counter';
import { hashPrompt } from '../../src/shared/utils/crypto';
import { extractEntities, compressPrompt } from '../../src/shared/utils/entity-extractor';
import { isDomainMatch } from '../../src/shared/utils/domain-matcher';

describe('Clean Architecture Core Domain Suite', () => {
  describe('1. ClassifyTaskUseCase', () => {
    it('Nhận diện đúng task code', () => {
      expect(ClassifyTaskUseCase.execute('viết hàm kiểm tra số nguyên tố javascript')).toBe('code');
    });

    it('Nhận diện đúng task writing', () => {
      expect(ClassifyTaskUseCase.execute('viết email xin nghỉ phép gửi sếp')).toBe('writing');
    });

    it('Nhận diện đúng task translation', () => {
      expect(ClassifyTaskUseCase.execute('dịch đoạn văn sau sang tiếng Anh')).toBe('translation');
    });

    it('Nhận diện đúng task analysis', () => {
      expect(ClassifyTaskUseCase.execute('phân tích ưu nhược điểm của microservices')).toBe('analysis');
    });

    it('Nhận diện đúng task general', () => {
      expect(ClassifyTaskUseCase.execute('cho tôi vài gợi ý quà sinh nhật')).toBe('general');
    });
  });

  describe('2. ScorePromptUseCase', () => {
    it('Xử lý prompt rỗng trả về điểm 0', () => {
      const res = ScorePromptUseCase.evaluate('');
      expect(res.overallScore).toBe(0);
      expect(res.clarity).toBe(0);
      expect(res.context).toBe(0);
      expect(res.conciseness).toBe(0);
    });

    it('Đánh giá prompt chất lượng đầy đủ context', () => {
      const res = ScorePromptUseCase.evaluate(
        'Hãy viết một hàm TypeScript kiểm tra số nguyên tố tối ưu, có xử lý ngoại lệ và không dùng thư viện ngoài.'
      );
      expect(res.overallScore).toBeGreaterThanOrEqual(60);
      expect(res.clarity).toBeGreaterThanOrEqual(50);
      expect(res.context).toBeGreaterThanOrEqual(40);
      expect(res.conciseness).toBeGreaterThanOrEqual(50);
    });

    it('So sánh điểm prompt gốc và prompt mới', () => {
      const original = 'viết code nhanh';
      const improved =
        'Bạn là chuyên gia fullstack. Hãy viết hàm TypeScript kiểm tra số nguyên tố, có type strictly và xử lý ngoại lệ.';
      const comp = ScorePromptUseCase.compare(original, improved);
      expect(comp.delta).toBeGreaterThan(0);
      expect(comp.improved.overallScore).toBeGreaterThan(comp.original.overallScore);
    });
  });

  describe('3. ApplyPersonaUseCase', () => {
    it('Sinh instruction cho Senior Software Architect', () => {
      const result = ApplyPersonaUseCase.execute('tạo cache LRU', 'architect');
      expect(result).toContain('Principal Software Architect');
      expect(result).toContain('Modular Architecture');
      expect(result).toContain('tạo cache LRU');
    });

    it('Sinh instruction cho Cybersecurity Auditor', () => {
      const result = ApplyPersonaUseCase.execute('xây dựng API login', 'security');
      expect(result).toContain('Senior Application Security');
      expect(result).toContain('OWASP Auditor');
    });

    it('Sinh instruction cho Bug Hunter', () => {
      const result = ApplyPersonaUseCase.execute('sửa lỗi memory leak', 'debugger');
      expect(result).toContain('Senior Debugger');
      expect(result).toContain('Root Cause Analysis');
    });

    it('Sinh instruction cho Copywriter', () => {
      const result = ApplyPersonaUseCase.execute('viết landing page giới thiệu sản phẩm', 'copywriter');
      expect(result).toContain('Senior Communications & Copywriting');
      expect(result).toContain('Headlines');
    });
  });

  describe('4. ExpandSemanticUseCase', () => {
    it('Tự động nhận diện template debug khi có từ khóa lỗi', () => {
      expect(ExpandSemanticUseCase.detectTemplate('fix error null pointer exception in auth service')).toBe('debug');
    });

    it('Tự động nhận diện template refactor khi có từ khóa clean code', () => {
      expect(ExpandSemanticUseCase.detectTemplate('clean code and optimize loop')).toBe('refactor');
    });

    it('Sinh đủ 3 variations: Minimal, Detailed, Architecture', () => {
      const variations = ExpandSemanticUseCase.generate3Variations('tạo component modal react');
      expect(variations.length).toBe(3);
      expect(variations[0].id).toBe('minimal');
      expect(variations[1].id).toBe('detailed');
      expect(variations[2].id).toBe('architecture');
      expect(variations[0].prompt.length).toBeGreaterThan(0);
      expect(variations[1].prompt.length).toBeGreaterThanOrEqual(variations[0].prompt.length);
    });
  });

  describe('5. Pure Utilities & Hashing', () => {
    it('Ước tính token tiếng Việt có dấu chính xác', () => {
      const text = 'Xin chào, đây là câu lệnh mẫu để kiểm tra token tiếng Việt có dấu.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(10);
    });

    it('Trích xuất thực thể kỹ thuật (languages, frameworks, actions)', () => {
      const entities = extractEntities('Hãy viết một API bằng Python và FastAPI có xử lý try-catch');
      expect(entities.languages).toContain('python');
      expect(entities.frameworks).toContain('fastapi');
      expect(entities.actions).toContain('viết');
    });

    it('Nén prompt loại bỏ từ đệm xã giao', () => {
      const raw = 'Xin chào bạn, bạn có thể vui lòng giúp tôi viết hàm javascript được không? Cảm ơn bạn rất nhiều.';
      const compressed = compressPrompt(raw);
      expect(compressed.tokensSaved).toBeGreaterThan(0);
      expect(compressed.compressedText).not.toContain('Xin chào');
    });

    it('So khớp domain an toàn chống subdomain spoofing', () => {
      expect(isDomainMatch('chat.openai.com', 'openai.com')).toBe(true);
      expect(isDomainMatch('claude.ai', 'claude.ai')).toBe(true);
      expect(isDomainMatch('fakeopenai.com', 'openai.com')).toBe(false);
      expect(isDomainMatch('malicious-chatgpt.com', 'chatgpt.com')).toBe(false);
    });

    it('Tính SHA-256 hash chuẩn xác', async () => {
      const hash1 = await hashPrompt('hello world');
      const hash2 = await hashPrompt('  HELLO WORLD  ');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });
});
