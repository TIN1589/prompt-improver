/**
 * classify-task.use-case.ts — Phân loại tác vụ AI tự động
 */

import type { TaskType } from '../models/task-type.entity';

export class ClassifyTaskUseCase {
  static execute(prompt: string = ''): TaskType {
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
}
