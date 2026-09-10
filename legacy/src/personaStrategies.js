/**
 * personaStrategies.js — Hệ thống Persona Strategy Pattern
 * Cung cấp các chiến lược định hình góc nhìn chuyên sâu của AI theo từng vai trò cụ thể.
 */

/**
 * 1. Persona: Senior Software Architect
 */
export class SeniorArchitectStrategy {
  static get id() { return 'architect'; }
  static get label() { return '🏗️ Kiến trúc sư Cấp cao'; }
  static get icon() { return '🏗️'; }
  static get description() { return 'Tập trung kiến trúc mô-đun, SOLID, Type Safety, khả năng mở rộng và cấu trúc thư mục.'; }

  static buildInstruction(userPrompt, taskType = 'code') {
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

/**
 * 2. Persona: Cybersecurity Auditor
 */
export class SecurityAuditorStrategy {
  static get id() { return 'security'; }
  static get label() { return '🛡️ Chuyên gia Bảo mật'; }
  static get icon() { return '🛡️'; }
  static get description() { return 'Tập trung bảo mật OWASP, mã hóa an toàn, sanitization và ngăn chặn lỗ hổng.'; }

  static buildInstruction(userPrompt, taskType = 'code') {
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

/**
 * 3. Persona: Bug Hunter & Debugger
 */
export class BugHunterStrategy {
  static get id() { return 'debugger'; }
  static get label() { return '🐛 Chuyên gia Sửa lỗi & Tối ưu'; }
  static get icon() { return '🐛'; }
  static get description() { return 'Truy tìm root cause, xử lý triệt để edge cases, rò rỉ bộ nhớ và async race conditions.'; }

  static buildInstruction(userPrompt, taskType = 'code') {
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

/**
 * 4. Persona: Fullstack Engineer (Mặc định)
 */
export class FullstackDevStrategy {
  static get id() { return 'developer'; }
  static get label() { return '⚡ Fullstack Developer'; }
  static get icon() { return '⚡'; }
  static get description() { return 'Cân bằng giữa hiệu năng, độ súc tích, tính dễ đọc và sẵn sàng production.'; }

  static buildInstruction(userPrompt, taskType = 'code') {
    return `[ROLE]: Senior Fullstack Engineer
[OBJECTIVE]: ${userPrompt}
[STANDARDS]:
- Viết code hoàn chỉnh, chạy được ngay (production-ready).
- Tối ưu hiệu năng, bất đồng bộ (async/await) mượt mà, xử lý lỗi đầy đủ.
- Định dạng rõ ràng, súc tích, không chat xã giao.
[OUTPUT]: Mã nguồn chuẩn kèm giải thích các điểm quan trọng.`;
  }
}

/**
 * 5. Persona: Professional Copywriter
 */
export class CopywriterStrategy {
  static get id() { return 'copywriter'; }
  static get label() { return '✍️ Chuyên gia Nội dung & Văn bản'; }
  static get icon() { return '✍️'; }
  static get description() { return 'Tập trung văn phong chuyên nghiệp, thuyết phục, cấu trúc bài viết mạch lạc.'; }

  static buildInstruction(userPrompt, taskType = 'writing') {
    return `[ROLE]: Senior Communications & Copywriting Expert
[OBJECTIVE]: ${userPrompt}
[TONE & STRUCTURE]:
- Văn phong: Tự nhiên, thuyết phục, chuẩn văn cảnh và đối tượng người đọc.
- Bố cục: Tiêu đề cuốn hút, các đoạn văn mạch lạc, bullet points trực quan.
- Độ súc tích: Loại bỏ từ thừa, câu văn cô đọng, thông điệp trọng tâm.
[OUTPUT]: Bản thảo hoàn chỉnh sẵn sàng sử dụng.`;
  }
}

/**
 * Factory điều phối các Persona Strategy
 */
export class PersonaStrategyFactory {
  static strategies = {
    architect: SeniorArchitectStrategy,
    security: SecurityAuditorStrategy,
    debugger: BugHunterStrategy,
    developer: FullstackDevStrategy,
    copywriter: CopywriterStrategy,
  };

  /**
   * Lấy danh sách tất cả các persona hỗ trợ
   * @returns {Array<{id: string, label: string, icon: string, description: string}>}
   */
  static listAll() {
    return Object.values(this.strategies).map(s => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      description: s.description,
    }));
  }

  /**
   * Lấy Strategy tương ứng theo ID
   * @param {string} personaId
   * @returns {typeof SeniorArchitectStrategy}
   */
  static getStrategy(personaId = 'developer') {
    return this.strategies[personaId] || this.strategies.developer;
  }
}
