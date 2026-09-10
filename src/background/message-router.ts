/**
 * message-router.ts — Điều phối Message Tập Trung cho Service Worker
 */

import type {
  ExtensionMessage,
  MessageResponse,
  PromptImproveResult,
  PingResult,
  CacheStatsResult,
  ClearCacheResult,
  CheckSiteResult,
  VersionResult,
} from '../shared/types/messages';
import {
  ExtensionError,
  ApiRateLimitError,
  InvalidInputError,
  ServiceWorkerTimeoutError,
  BackendConfigurationMissingError,
} from '../shared/errors/extension-error';
import { ClassifyTaskUseCase } from '../core/use-cases/classify-task.use-case';
import { ScorePromptUseCase } from '../core/use-cases/score-prompt.use-case';
import { hashPrompt } from '../shared/utils/crypto';
import { isPlaceholderUrl } from '../shared/utils/url';
import { SettingsRepository } from '../infrastructure/storage/settings.repository';
import { CacheRepository } from '../infrastructure/storage/cache.repository';
import { HistoryRepository } from '../infrastructure/storage/history.repository';
import { WorkerClient } from '../infrastructure/api/worker-client';
import { PingClient } from '../infrastructure/api/ping-client';
import type { PersonaId } from '../core/models/persona.entity';
import type { TaskType } from '../core/models/task-type.entity';

export class MessageRouter {
  /**
   * Khởi tạo listener cho chrome.runtime.onMessage
   */
  static init(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse: (response: MessageResponse<unknown>) => void) => {
        const ROUTER_TIMEOUT_MS = 40000; // Trần 40s an toàn, đảm bảo gọi sendResponse trước khi client timeout

        let isSettled = false;
        const timer = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            sendResponse({
              success: false,
              error: {
                code: 'SW_TIMEOUT',
                message: 'Quá thời gian chờ xử lý yêu cầu (Timeout sau 40s). Máy chủ AI không phản hồi kịp thời.',
                isRateLimit: false,
                retryAfterSeconds: 15,
              },
            });
          }
        }, ROUTER_TIMEOUT_MS);

        this.route(message)
          .then((data) => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timer);
            sendResponse({ success: true, data });
          })
          .catch((err: unknown) => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timer);

            const isRateLimit =
              err instanceof ApiRateLimitError ||
              (err instanceof Error &&
                (err.message.includes('429') ||
                  err.message.includes('RATE_LIMIT') ||
                  err.message.includes('Quota')));

            const retryAfter =
              err instanceof ApiRateLimitError
                ? err.retryAfterSeconds
                : (err as { retryAfterSeconds?: number })?.retryAfterSeconds || 15;

            const code =
              err instanceof ExtensionError
                ? err.code
                : isRateLimit
                ? 'RATE_LIMIT_429'
                : 'INTERNAL_ERROR';

            const messageText =
              err instanceof Error ? err.message : 'Lỗi không xác định khi xử lý message.';

            sendResponse({
              success: false,
              error: {
                code,
                message: messageText,
                isRateLimit,
                retryAfterSeconds: retryAfter,
              },
            });
          });

        return true; // Giữ kết nối bất đồng bộ cho sendResponse
      }
    );
  }

  /**
   * Định tuyến logic nghiệp vụ theo Type
   */
  private static async route(message: ExtensionMessage): Promise<unknown> {
    switch (message.type) {
      case 'PROMPT:IMPROVE':
        return this.handleImprovePrompt(message.payload);

      case 'PROMPT:SCORE':
        return ScorePromptUseCase.evaluate(message.payload.text);

      case 'BACKEND:PING':
        return PingClient.ping(message.payload.url);

      case 'CACHE:GET_STATS': {
        const cacheCount = await CacheRepository.count();
        const res: CacheStatsResult = { cacheCount };
        return res;
      }

      case 'CACHE:CLEAR': {
        const clearedCount = await CacheRepository.clear();
        const res: ClearCacheResult = { clearedCount };
        return res;
      }

      case 'HISTORY:CLEAR':
        await HistoryRepository.clear();
        return { success: true };

      case 'SITE:CHECK_ENABLED': {
        const enabled = await SettingsRepository.isSiteEnabled(message.payload.hostname);
        const res: CheckSiteResult = { enabled };
        return res;
      }

      case 'SYSTEM:GET_VERSION': {
        const version = chrome.runtime.getManifest().version;
        const res: VersionResult = { version };
        return res;
      }

      default:
        throw new InvalidInputError(`Không hỗ trợ message type: ${(message as { type: string }).type}`);
    }
  }

  /**
   * Xử lý tối ưu prompt: chấm điểm, kiểm tra cache, gọi backend và lưu lịch sử
   */
  private static async handleImprovePrompt(payload: {
    prompt: string;
    persona?: PersonaId;
    bypassCache?: boolean;
    taskType?: TaskType;
  }): Promise<PromptImproveResult> {
    const cleanPrompt = payload.prompt?.trim();
    if (!cleanPrompt) {
      throw new InvalidInputError('Prompt không được để trống.');
    }

    const persona = payload.persona || 'developer';
    const taskType = payload.taskType || ClassifyTaskUseCase.execute(cleanPrompt);
    const hash = await hashPrompt(`${persona}:${cleanPrompt}`);

    const settings = await SettingsRepository.getSettings();
    const enableCache = settings.enableCache !== false;
    const cacheTtlMs = settings.cacheTtlMs;

    // 1. Chấm điểm prompt gốc
    const originalScore = ScorePromptUseCase.evaluate(cleanPrompt);

    // 2. Kiểm tra Cache
    if (enableCache && !payload.bypassCache) {
      const cached = await CacheRepository.get<PromptImproveResult>(hash, cacheTtlMs);
      if (cached) {
        return {
          ...cached,
          isCached: true,
          originalScore,
        };
      }
    }

    // 3. Gọi Cloudflare Worker Backend
    const backendUrl = settings.backendUrl?.trim() || '';
    if (!backendUrl || isPlaceholderUrl(backendUrl)) {
      throw new BackendConfigurationMissingError(
        'Chưa cấu hình Backend URL hoặc URL đang chứa mẫu placeholder (xxx.workers.dev). Vui lòng cấu hình URL Cloudflare Worker hợp lệ tại tab Cấu hình.'
      );
    }

    const responseData = await WorkerClient.improvePrompt(backendUrl, {
      prompt: cleanPrompt,
      taskType,
      persona,
    });

    // 4. Chấm điểm cho 2 bản prompt được tạo
    const minimalScore = ScorePromptUseCase.evaluate(responseData.minimal || cleanPrompt);
    const detailedScore = ScorePromptUseCase.evaluate(responseData.detailed || cleanPrompt);

    const result: PromptImproveResult = {
      minimal: responseData.minimal,
      detailed: responseData.detailed,
      assumptions: responseData.assumptions || [],
      taskType: responseData.taskType || taskType,
      persona,
      originalScore,
      minimalScore,
      detailedScore,
      isCached: false,
    };

    // 5. Lưu Cache
    if (enableCache && responseData.success) {
      await CacheRepository.set(hash, result, settings.maxCacheEntries);
    }

    // 6. Lưu vào Lịch sử
    await HistoryRepository.saveItem({
      id: 'hist_' + Date.now(),
      prompt: cleanPrompt,
      minimal: responseData.minimal,
      detailed: responseData.detailed,
      assumptions: responseData.assumptions || [],
      taskType: result.taskType,
      persona,
      originalScore: originalScore.overallScore,
      improvedScore: detailedScore.overallScore,
      timestamp: Date.now(),
    });

    return result;
  }
}
