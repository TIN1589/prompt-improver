/**
 * messages.ts — Type-Safe Discriminated Union Messages Schema
 * Quy chuẩn thông điệp giao tiếp giữa Content Script, Service Worker và UI Pages.
 */

import type { PromptScore } from '../../core/models/score.entity';
import type { TaskType } from '../../core/models/task-type.entity';
import type { PersonaId } from '../../core/models/persona.entity';

// ─── REQUEST MESSAGES ────────────────────────────────────────────────────────
export type ExtensionMessage =
  | {
      type: 'PROMPT:IMPROVE';
      payload: {
        prompt: string;
        persona?: PersonaId;
        bypassCache?: boolean;
        taskType?: TaskType;
      };
    }
  | {
      type: 'PROMPT:SCORE';
      payload: {
        text: string;
      };
    }
  | {
      type: 'BACKEND:PING';
      payload: {
        url: string;
      };
    }
  | {
      type: 'CACHE:GET_STATS';
      payload?: undefined;
    }
  | {
      type: 'CACHE:CLEAR';
      payload?: undefined;
    }
  | {
      type: 'HISTORY:CLEAR';
      payload?: undefined;
    }
  | {
      type: 'SITE:CHECK_ENABLED';
      payload: {
        hostname: string;
      };
    }
  | {
      type: 'SYSTEM:GET_VERSION';
      payload?: undefined;
    }
  | {
      type: 'TAB:TRIGGER_IMPROVE';
      payload: {
        text: string;
      };
    };

// ─── RESPONSE PAYLOADS ───────────────────────────────────────────────────────
export interface PromptImproveResult {
  minimal: string;
  detailed: string;
  assumptions: string[];
  taskType: TaskType;
  persona: PersonaId;
  originalScore: PromptScore;
  minimalScore: PromptScore;
  detailedScore: PromptScore;
  isCached: boolean;
}

export interface PingResult {
  online: boolean;
  latencyMs: number;
  hasApiKey: boolean;
  info: string;
  error?: string;
}

export interface CacheStatsResult {
  cacheCount: number;
}

export interface ClearCacheResult {
  clearedCount: number;
}

export interface CheckSiteResult {
  enabled: boolean;
}

export interface VersionResult {
  version: string;
}

// ─── STANDARD RESPONSE CONTRACT ─────────────────────────────────────────────
export type MessageResponse<T = unknown> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
        isRateLimit?: boolean;
        retryAfterSeconds?: number;
      };
    };
