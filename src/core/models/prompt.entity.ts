/**
 * prompt.entity.ts — Thực thể Lịch sử và Cải thiện Prompt
 */

import type { PersonaId } from './persona.entity';
import type { TaskType } from './task-type.entity';

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  minimal?: string;
  detailed?: string;
  assumptions?: string[];
  taskType: TaskType;
  persona: PersonaId;
  originalScore?: number;
  improvedScore?: number;
  timestamp: number;
}

export interface PromptCacheEntry<T = unknown> {
  timestamp: number;
  data: T;
}
