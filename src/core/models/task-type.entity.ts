/**
 * task-type.entity.ts — Thực thể phân loại tác vụ AI
 */

export type TaskType = 'code' | 'writing' | 'analysis' | 'translation' | 'general';

export interface TaskTypeMetadata {
  id: TaskType;
  label: string;
  iconId: string;
  description: string;
}

export const TASK_TYPE_CONFIG: Record<TaskType, TaskTypeMetadata> = {
  code: {
    id: 'code',
    label: 'Sinh & Sửa Code',
    iconId: 'i-code',
    description: 'Chuyên biệt cho các tác vụ lập trình, thuật toán, debug và kiến trúc phần mềm',
  },
  writing: {
    id: 'writing',
    label: 'Viết nội dung',
    iconId: 'i-pen',
    description: 'Tối ưu văn bản, email, bài blog, kịch bản và copywriting',
  },
  analysis: {
    id: 'analysis',
    label: 'Phân tích & Đánh giá',
    iconId: 'i-chart',
    description: 'So sánh, tóm tắt dữ liệu, tìm ưu nhược điểm và lập kế hoạch',
  },
  translation: {
    id: 'translation',
    label: 'Dịch thuật',
    iconId: 'i-globe',
    description: 'Chuyển đổi ngôn ngữ đa ngữ cảnh, bảo toàn thuật ngữ chuyên ngành',
  },
  general: {
    id: 'general',
    label: 'Tổng quát',
    iconId: 'i-spark',
    description: 'Các tác vụ đa năng tổng quát hàng ngày',
  },
};
