/**
 * apply-persona.use-case.ts — Áp dụng chiến lược Persona Strategy Pattern
 */

import type { PersonaId, PersonaMetadata } from '../models/persona.entity';
import { PERSONA_LIST } from '../models/persona.entity';
import type { TaskType } from '../models/task-type.entity';

export interface PersonaStrategy {
  id: PersonaId;
  metadata: PersonaMetadata;
  buildInstruction(userPrompt: string, taskType?: TaskType): string;
}

export class SeniorArchitectStrategy implements PersonaStrategy {
  id: PersonaId = 'architect';
  metadata = PERSONA_LIST.find(p => p.id === 'architect')!;

  buildInstruction(userPrompt: string): string {
    return `[ROLE]: Principal Software Architect & Tech Lead
[OBJECTIVE]: ${userPrompt}
[ARCHITECTURAL REQUIREMENTS]:
- Modular Architecture: Áp dụng SOLID principles, Clean Architecture, phân tách ranh giới các layer rõ ràng.
- Type Safety: Sử dụng strict typing (TypeScript/Type annotations), đầy đủ Interfaces/Types, zero implicit 'any'.
- Error Boundaries: Xử lý ngoại lệ toàn diện (try-catch, custom error types, defensive coding).
- Code Standards: Clean Code, tự tài liệu hóa (Self-documenting), không code thừa, không magic numbers.
[DELIVERABLES]: Cấu trúc file/folder gợi ý + mã nguồn triển khai mẫu hoàn chỉnh.`;
  }
}

export class SecurityAuditorStrategy implements PersonaStrategy {
  id: PersonaId = 'security';
  metadata = PERSONA_LIST.find(p => p.id === 'security')!;

  buildInstruction(userPrompt: string): string {
    return `[ROLE]: Senior Application Security (AppSec) Engineer & OWASP Auditor
[OBJECTIVE]: ${userPrompt}
[SECURITY REQUIREMENTS]:
- Input Validation & Sanitization: Ngăn chặn XSS, SQLi, Prototype Pollution, ReDoS.
- Secure Cryptography: Sử dụng Web Crypto / PBKDF2 / AES-GCM chuẩn, không dùng thuật toán cũ (MD5/SHA1).
- Authorization & Least Privilege: Kiểm soát quyền hạn, tokens, secrets an toàn.
- Defensive Hardening: Rate limiting, CORS kiểm soát, an toàn Service Worker MV3.
[DELIVERABLES]: Báo cáo rủi ro tiềm ẩn (nếu có) + mã nguồn đã được gia cố bảo mật (Hardened Code).`;
  }
}

export class BugHunterStrategy implements PersonaStrategy {
  id: PersonaId = 'debugger';
  metadata = PERSONA_LIST.find(p => p.id === 'debugger')!;

  buildInstruction(userPrompt: string): string {
    return `[ROLE]: Senior Debugger & Performance Optimization Specialist
[OBJECTIVE]: Phân tích và khắc phục triệt để — ${userPrompt}
[DEBUGGING METHODOLOGY]:
1. Phân tích nguyên nhân gốc rễ (Root Cause Analysis - không chỉ chữa triệu chứng).
2. Liệt kê các trường hợp biên (Edge Cases: null, undefined, race condition, network timeout, memory leak).
3. Đề xuất giải pháp sửa đổi tối thiểu (Minimal Non-Breaking Fix).
4. Thêm kiểm tra phòng vệ (Defensive Guards) để lỗi không tái diễn.
[DELIVERABLES]: Giải thích ngắn gọn nguyên nhân (1-2 câu) + Code fix chuẩn kèm comment chỉ rõ thay đổi.`;
  }
}

export class FullstackDevStrategy implements PersonaStrategy {
  id: PersonaId = 'developer';
  metadata = PERSONA_LIST.find(p => p.id === 'developer')!;

  buildInstruction(userPrompt: string): string {
    return `[ROLE]: Senior Fullstack Engineer
[OBJECTIVE]: ${userPrompt}
[STANDARDS]:
- Viết code hoàn chỉnh, chạy được ngay (production-ready).
- Tối ưu hiệu năng, bất đồng bộ (async/await) mượt mà, xử lý lỗi đầy đủ.
- Định dạng rõ ràng, súc tích, không chat xã giao.
[OUTPUT]: Mã nguồn chuẩn kèm giải thích các điểm quan trọng.`;
  }
}

export class CopywriterStrategy implements PersonaStrategy {
  id: PersonaId = 'copywriter';
  metadata = PERSONA_LIST.find(p => p.id === 'copywriter')!;

  buildInstruction(userPrompt: string): string {
    return `[ROLE]: Senior Communications & Copywriting Expert
[OBJECTIVE]: ${userPrompt}
[COPYWRITING STANDARDS]:
- Giọng văn tự nhiên, thuyết phục, phù hợp với đối tượng mục tiêu.
- Cấu trúc bài viết chặt chẽ: Mở đầu ấn tượng, Thân bài giàu giá trị, Kêu gọi hành động (CTA) dứt khoát.
- Tối ưu ngữ nghĩa, loại bỏ sáo rỗng, tập trung vào lợi ích cốt lõi.
[DELIVERABLES]: Bản nháp hoàn thiện kèm các biến thể tiêu đề (Headlines) nổi bật.`;
  }
}

const STRATEGIES: Record<PersonaId, PersonaStrategy> = {
  developer: new FullstackDevStrategy(),
  architect: new SeniorArchitectStrategy(),
  security: new SecurityAuditorStrategy(),
  debugger: new BugHunterStrategy(),
  copywriter: new CopywriterStrategy(),
};

export class ApplyPersonaUseCase {
  static getStrategy(personaId: PersonaId = 'developer'): PersonaStrategy {
    return STRATEGIES[personaId] || STRATEGIES.developer;
  }

  static execute(userPrompt: string, personaId: PersonaId = 'developer', taskType?: TaskType): string {
    const strategy = this.getStrategy(personaId);
    return strategy.buildInstruction(userPrompt, taskType);
  }
}
