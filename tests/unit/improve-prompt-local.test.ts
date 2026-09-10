/**
 * improve-prompt-local.test.ts — Unit Tests cho Local-First Instant Prompt Optimization Engine
 * Kiểm thử tính đúng đắn, tốc độ thực thi (< 20ms) và cải thiện điểm số
 */

import { describe, it, expect } from 'vitest';
import { ImprovePromptLocalUseCase } from '../../src/core/use-cases/improve-prompt-local.use-case';

describe('ImprovePromptLocalUseCase — Local Instant Engine Suite', () => {
  it('Tối ưu hóa prompt code và cải thiện điểm số rõ rệt', () => {
    const raw = 'làm hàm javascript kiểm tra số đối xứng';
    const result = ImprovePromptLocalUseCase.execute({
      prompt: raw,
      persona: 'developer',
    });

    expect(result.taskType).toBe('code');
    expect(result.engine).toBe('instant');
    expect(result.minimal).toContain('clean code');
    expect(result.minimal).toContain('type annotations');
    expect(result.detailed).toContain('[YÊU CẦU ĐẦU RA]');
    expect(result.assumptions.length).toBeGreaterThan(0);

    // Điểm sau tối ưu phải cao hơn điểm gốc
    expect(result.minimalScore.overallScore).toBeGreaterThan(result.originalScore.overallScore);
    expect(result.detailedScore.overallScore).toBeGreaterThan(result.originalScore.overallScore);
  });

  it('Tối ưu hóa prompt writing tự nhiên với Persona Copywriter', () => {
    const raw = 'xin chào hãy viết bài giới thiệu về cà phê Arabica đặc sản cảm ơn!';
    const result = ImprovePromptLocalUseCase.execute({
      prompt: raw,
      persona: 'copywriter',
    });

    expect(result.taskType).toBe('writing');
    // Đã lọc từ xã giao mở đầu và kết thúc
    expect(result.minimal).not.toContain('xin chào');
    expect(result.minimal).not.toContain('cảm ơn!');
    expect(result.minimal).toContain('Arabica');
    expect(result.detailed).toContain('Copywriting');
    expect(result.detailedScore.overallScore).toBeGreaterThan(result.originalScore.overallScore);
  });

  it('Áp dụng đúng Persona Software Architect cho kiến trúc hệ thống', () => {
    const raw = 'thiết kế hệ thống thông báo realtime';
    const result = ImprovePromptLocalUseCase.execute({
      prompt: raw,
      persona: 'architect',
    });

    expect(result.detailed).toContain('Principal Software Architect');
    expect(result.detailed).toContain('Modular Architecture');
    expect(result.persona).toBe('architect');
  });

  it('Bắt lỗi khi prompt rỗng', () => {
    expect(() => {
      ImprovePromptLocalUseCase.execute({ prompt: '   ' });
    }).toThrow('Prompt không được để trống.');
  });

  it('Đạt tốc độ siêu tốc: Thực thi 50 lượt liên tiếp với thời gian trung bình < 5ms', () => {
    const testPrompts = [
      'cách để ghi nhớ từ vựng tiếng anh nhanh',
      'viết hàm đệ quy tính fibonacci',
      'phân tích mô hình pub/sub vs message queue',
      'dịch hợp đồng kinh tế sang tiếng Nhật',
      'lập kế hoạch du lịch Đà Lạt 3 ngày 2 đêm',
    ];

    const startTime = performance.now();
    const ITERATIONS = 50;

    for (let i = 0; i < ITERATIONS; i++) {
      const prompt = testPrompts[i % testPrompts.length];
      const res = ImprovePromptLocalUseCase.execute({ prompt });
      expect(res.minimal.length).toBeGreaterThan(10);
    }

    const elapsed = performance.now() - startTime;
    const avgTimePerExecution = elapsed / ITERATIONS;

    // Phải hoàn thành dưới 5ms/lần thực thi (rẻ hơn 4000x so với 20.000ms của cloud LLM)
    expect(avgTimePerExecution).toBeLessThan(5);
  });
});
