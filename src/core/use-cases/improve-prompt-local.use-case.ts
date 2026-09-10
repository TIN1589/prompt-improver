/**
 * improve-prompt-local.use-case.ts — Local-First Instant Prompt Optimization Engine
 * Tối ưu prompt siêu tốc (< 20ms) trực tiếp trên Client bằng Heuristics, Semantic Templates & Persona Strategy.
 * 100% Offline, Zero-Latency, không phụ thuộc Remote Network/Gemini API.
 */

import { ClassifyTaskUseCase } from './classify-task.use-case';
import { ScorePromptUseCase } from './score-prompt.use-case';
import { ApplyPersonaUseCase } from './apply-persona.use-case';
import { extractEntities } from '../../shared/utils/entity-extractor';
import type { PersonaId } from '../models/persona.entity';
import type { TaskType } from '../models/task-type.entity';
import type { PromptImproveResult } from '../../shared/types/messages';

export interface LocalImproveOptions {
  prompt: string;
  persona?: PersonaId;
  taskType?: TaskType;
}

export class ImprovePromptLocalUseCase {
  /**
   * Tối ưu prompt tức thì trong < 20ms
   */
  static execute(options: LocalImproveOptions): PromptImproveResult {
    const raw = options.prompt?.trim() || '';
    if (!raw) {
      throw new Error('Prompt không được để trống.');
    }

    const persona = options.persona || 'developer';
    const taskType = options.taskType || ClassifyTaskUseCase.execute(raw);
    const entities = extractEntities(raw);

    // 1. Chấm điểm prompt gốc
    const originalScore = ScorePromptUseCase.evaluate(raw);

    // 2. Tạo phiên bản Tối giản (Minimal): Lọc từ thừa, đưa động từ hành động lên đầu
    const minimal = this.generateMinimal(raw, taskType, entities);

    // 3. Tạo phiên bản Chi tiết (Detailed): Tích hợp Persona Strategy & Framework chuẩn
    const detailed = this.generateDetailed(raw, persona, taskType, entities);

    // 4. Tạo các giả định làm rõ (Assumptions)
    const assumptions = this.generateAssumptions(raw, taskType, entities);

    // 5. Chấm điểm cho cả 2 phiên bản mới
    const minimalScore = ScorePromptUseCase.evaluate(minimal);
    const detailedScore = ScorePromptUseCase.evaluate(detailed);

    return {
      minimal,
      detailed,
      assumptions,
      taskType,
      persona,
      originalScore,
      minimalScore,
      detailedScore,
      isCached: false,
      engine: 'instant',
    };
  }

  /**
   * Tạo bản Tối giản: Loại bỏ từ đệm, giữ lại mục tiêu cốt lõi và định dạng súc tích
   */
  private static generateMinimal(raw: string, taskType: TaskType, entities: ReturnType<typeof extractEntities>): string {
    // Làm sạch từ xã giao mở đầu
    let cleaned = raw
      .replace(/^(xin chào|chào bạn|hãy giúp tôi|tôi muốn hỏi|bạn có thể|làm ơn|cho tôi hỏi|cho hỏi)\s*[,:]?\s*/i, '')
      .replace(/\s*(cảm ơn|thank you|thanks)\s*!*$/i, '')
      .trim();

    // Chuẩn hóa câu hỏi mở đầu
    cleaned = cleaned
      .replace(/^(làm sao để|làm thế nào để|cách để|hướng dẫn)\s+/i, '')
      .trim();

    if (taskType === 'code') {
      const lang = entities.languages[0] || (entities.frameworks[0] ? 'TypeScript/JavaScript' : '');
      const prefix = lang ? `Viết code ${lang} để` : 'Viết hàm tối ưu để';
      return `${prefix} ${cleaned}. Yêu cầu: clean code, xử lý ngoại lệ, có type annotations và kèm ví dụ minh họa.`;
    }

    if (taskType === 'writing') {
      return `Soạn thảo nội dung hoàn chỉnh về "${cleaned}". Bố cục: Mở bài ấn tượng, các luận điểm chính mạch lạc kèm dẫn chứng, kết luận đúc kết hành động. Văn phong tự nhiên, súc tích.`;
    }

    if (taskType === 'translation') {
      return `Dịch chính xác và tự nhiên đoạn văn sau: "${cleaned}". Giữ nguyên thuật ngữ chuyên ngành và sắc thái biểu cảm.`;
    }

    if (taskType === 'analysis') {
      return `Phân tích đa chiều về "${cleaned}". Bao gồm: Bản chất cốt lõi, ưu/nhược điểm, các trường hợp thực tế và đề xuất hành động tối ưu.`;
    }

    // General
    return `Hướng dẫn phương pháp và các bước thực hành cụ thể về: "${cleaned}". Cung cấp các chiến lược hiệu quả, dễ áp dụng ngay kèm lưu ý quan trọng để đạt kết quả tốt nhất.`;
  }

  /**
   * Tạo bản Chi tiết: Dựa trên Persona Strategy chuẩn và các ràng buộc kỹ thuật
   */
  private static generateDetailed(
    raw: string,
    persona: PersonaId,
    taskType: TaskType,
    entities: ReturnType<typeof extractEntities>
  ): string {
    // 1. Áp dụng Persona Strategy
    const personaInstruction = ApplyPersonaUseCase.execute(raw, persona, taskType);

    // 2. Bổ sung cấu trúc phản hồi chuẩn hóa
    const contextAddons: string[] = [];

    if (entities.languages.length > 0 || entities.frameworks.length > 0) {
      const techStack = [...entities.languages, ...entities.frameworks].join(', ');
      contextAddons.push(`- Công nghệ mục tiêu: ${techStack}`);
    }

    if (entities.constraints.length > 0) {
      contextAddons.push(`- Ràng buộc: ${entities.constraints.join('; ')}`);
    }

    let deliverables = '';
    if (taskType === 'code') {
      deliverables = `
[YÊU CẦU ĐẦU RA]:
1. Mã nguồn hoàn chỉnh, production-ready, có chú thích các đoạn logic quan trọng.
2. Kiểm soát chặt chẽ edge cases, xử lý lỗi (defensive coding).
3. Đoạn mã test mẫu hoặc kịch bản kiểm thử (test case) để xác minh kết quả.`;
    } else {
      deliverables = `
[YÊU CẦU ĐẦU RA]:
1. Hướng dẫn toàn diện theo từng bước (Step-by-step) có thể áp dụng được ngay.
2. Ví dụ thực tế minh họa rõ ràng và các mẹo tối ưu hiệu suất.
3. Cảnh báo các sai lầm phổ biến cần tránh.`;
    }

    return `${personaInstruction}${contextAddons.length > 0 ? `\n[BỐI CẢNH BỔ SUNG]:\n${contextAddons.join('\n')}` : ''}${deliverables}`;
  }

  /**
   * Tạo các giả định làm rõ (Assumptions)
   */
  private static generateAssumptions(
    _raw: string,
    taskType: TaskType,
    entities: ReturnType<typeof extractEntities>
  ): string[] {
    const list: string[] = [];

    if (taskType === 'code') {
      const lang = entities.languages[0] || 'TypeScript/Modern JS';
      list.push(`Giả định môi trường triển khai hiện đại (${lang}), tuân thủ chuẩn Clean Architecture.`);
      list.push('Ưu tiên giải pháp tối ưu hiệu năng, dễ bảo trì và có kiểm soát lỗi toàn diện.');
    } else if (taskType === 'writing') {
      list.push('Mục tiêu bài viết hướng đến độc giả chuyên nghiệp, đề cao tính thuyết phục và súc tích.');
      list.push('Nội dung có thể dùng làm tài liệu tham khảo hoặc chia sẻ trực tiếp.');
    } else {
      list.push('Người dùng tìm kiếm giải pháp có tính hành động cao (actionable), có thể áp dụng ngay.');
      list.push('Kỳ vọng hướng dẫn có cấu trúc mạch lạc, dẫn chứng thực tế thay vì lý thuyết chung.');
    }

    return list;
  }
}
