/**
 * persona.entity.ts — Thực thể chiến lược Persona AI
 */

export type PersonaId = 'developer' | 'architect' | 'security' | 'debugger' | 'copywriter';

export interface PersonaMetadata {
  id: PersonaId;
  label: string;
  iconId: string;
  roleName: string;
  description: string;
}

export const PERSONA_LIST: PersonaMetadata[] = [
  {
    id: 'developer',
    label: 'Fullstack Dev',
    iconId: 'i-code',
    roleName: 'Senior Fullstack Engineer',
    description: 'Cân bằng giữa hiệu năng, độ súc tích, tính dễ đọc và sẵn sàng production.',
  },
  {
    id: 'architect',
    label: 'Architect',
    iconId: 'i-layers',
    roleName: 'Principal Software Architect & Tech Lead',
    description: 'Tập trung kiến trúc mô-đun, SOLID, Type Safety, khả năng mở rộng và cấu trúc thư mục.',
  },
  {
    id: 'security',
    label: 'AppSec',
    iconId: 'i-shield',
    roleName: 'Senior Application Security (AppSec) Engineer & OWASP Auditor',
    description: 'Tập trung bảo mật OWASP, mã hóa an toàn, sanitization và ngăn chặn lỗ hổng.',
  },
  {
    id: 'debugger',
    label: 'Bug Hunter',
    iconId: 'i-bug',
    roleName: 'Senior Debugger & Performance Optimization Specialist',
    description: 'Truy tìm root cause, xử lý triệt để edge cases, rò rỉ bộ nhớ và async race conditions.',
  },
  {
    id: 'copywriter',
    label: 'Copywriter',
    iconId: 'i-pen',
    roleName: 'Senior Communications & Copywriting Expert',
    description: 'Tập trung văn phong chuyên nghiệp, thuyết phục, cấu trúc bài viết mạch lạc.',
  },
];
