/**
 * worker-client.ts — Gọi Cloudflare Worker Backend với Exponential Backoff & 429 Handler
 */

import { ApiRateLimitError, NetworkUnavailableError, BackendConfigurationMissingError } from '../../shared/errors/extension-error';
import type { TaskType } from '../../core/models/task-type.entity';
import type { PersonaId } from '../../core/models/persona.entity';
import { normalizeBackendUrl } from '../../shared/utils/url';

export interface ImproveRequestBody {
  prompt: string;
  taskType?: TaskType;
  persona?: PersonaId;
}

export interface ImproveResponseBody {
  success: boolean;
  minimal: string;
  detailed: string;
  assumptions: string[];
  taskType: TaskType;
  error?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WorkerClient {
  /**
   * Gửi yêu cầu cải thiện prompt đến Cloudflare Worker
   */
  static async improvePrompt(
    backendUrl: string,
    body: ImproveRequestBody,
    maxRetries: number = 3,
    timeoutMs: number = 30000
  ): Promise<ImproveResponseBody> {
    const rawUrl = normalizeBackendUrl(backendUrl);
    if (!rawUrl) {
      throw new BackendConfigurationMissingError();
    }

    const endpoint = rawUrl.endsWith('/improve') ? rawUrl : `${rawUrl}/improve`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.status === 429) {
          const errJson = (await res.json().catch(() => ({}))) as {
            message?: string;
            retryAfterSeconds?: number;
          };
          const retryAfterHeader = res.headers.get('Retry-After');
          const retrySeconds =
            errJson.retryAfterSeconds ||
            (retryAfterHeader ? parseInt(retryAfterHeader, 10) : 15);

          const rateLimitError = new ApiRateLimitError(
            errJson.message ||
              `Quá giới hạn lượt gọi API Gemini (Rate limit 429). Vui lòng thử lại sau ~${retrySeconds}s.`,
            retrySeconds,
            errJson
          );

          if (attempt < maxRetries - 1) {
            const backoff = Math.min(Math.max(retrySeconds * 1000, 2000), 5000);
            await delay(backoff);
            continue;
          }
          throw rateLimitError;
        }

        if (res.status === 502 || res.status === 503 || res.status === 504) {
          const errJson = (await res.json().catch(() => ({}))) as { message?: string };
          lastError = new NetworkUnavailableError(
            errJson.message || `Máy chủ tạm thời không phản hồi (HTTP ${res.status})`
          );

          if (attempt < maxRetries - 1) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 6000);
            await delay(backoff);
            continue;
          }
          throw lastError;
        }

        if (!res.ok) {
          const errJson = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(errJson.message || `Backend báo lỗi HTTP ${res.status}`);
        }

        const data = (await res.json()) as ImproveResponseBody;
        return data;
      } catch (err: unknown) {
        clearTimeout(timer);
        if (err instanceof ApiRateLimitError) {
          throw err;
        }

        const message = err instanceof Error ? err.message : String(err);
        if (
          message.includes('GEMINI_API_KEY') ||
          message.includes('MISSING_API_KEY') ||
          message.includes('API key not valid') ||
          message.includes('UNAUTHORIZED_ACCESS')
        ) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(message);

        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 6000);
          await delay(backoff);
        }
      }
    }

    throw (
      lastError ||
      new NetworkUnavailableError('Không thể kết nối đến Backend sau nhiều lần thử lại.')
    );
  }
}
