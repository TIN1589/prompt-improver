/**
 * worker-client.ts — Gọi Cloudflare Worker Backend với Exponential Backoff & 429 Handler
 */

import { ApiRateLimitError, NetworkUnavailableError, BackendConfigurationMissingError } from '../../shared/errors/extension-error';
import type { TaskType } from '../../core/models/task-type.entity';
import type { PersonaId } from '../../core/models/persona.entity';
import { normalizeBackendUrl, isPlaceholderUrl } from '../../shared/utils/url';

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
    maxRetries: number = 1,
    timeoutMs: number = 35000
  ): Promise<ImproveResponseBody> {
    const rawUrl = normalizeBackendUrl(backendUrl);
    if (!rawUrl || isPlaceholderUrl(rawUrl)) {
      throw new BackendConfigurationMissingError(
        'Chưa cấu hình Backend URL hoặc URL đang chứa mẫu placeholder (xxx.workers.dev). Vui lòng cấu hình URL Cloudflare Worker hợp lệ tại tab Cấu hình.'
      );
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

          // Backend đã tự động fallback qua toàn bộ các model Gemini. Nếu vẫn 429 thì ném lỗi ngay để UI hiển thị thông báo.
          throw new ApiRateLimitError(
            errJson.message ||
              `Quá giới hạn lượt gọi API Gemini (Rate limit 429). Vui lòng thử lại sau ~${retrySeconds}s.`,
            retrySeconds,
            errJson
          );
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

        const isAborted =
          (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) ||
          controller.signal.aborted;

        let friendlyMessage = err instanceof Error ? err.message : String(err);
        if (isAborted) {
          friendlyMessage = `Quá thời gian chờ phản hồi từ máy chủ (Timeout sau ${Math.round(timeoutMs / 1000)}s). Máy chủ có thể đang khởi động nguội (cold start) hoặc chưa phản hồi.`;
        } else if (friendlyMessage.includes('Failed to fetch') || friendlyMessage.includes('NetworkError')) {
          friendlyMessage = `Không thể kết nối đến máy chủ Cloudflare Worker (${rawUrl}). Vui lòng kiểm tra lại URL Worker hoặc kết nối mạng.`;
        }

        if (
          friendlyMessage.includes('GEMINI_API_KEY') ||
          friendlyMessage.includes('MISSING_API_KEY') ||
          friendlyMessage.includes('API key not valid') ||
          friendlyMessage.includes('UNAUTHORIZED_ACCESS')
        ) {
          throw err instanceof Error ? err : new Error(friendlyMessage);
        }

        lastError = isAborted
          ? new NetworkUnavailableError(friendlyMessage)
          : err instanceof Error
          ? new NetworkUnavailableError(friendlyMessage, err)
          : new NetworkUnavailableError(friendlyMessage);

        if (attempt < maxRetries - 1) {
          const backoff = isAborted ? 1000 : Math.min(1000 * Math.pow(2, attempt), 2000);
          await delay(backoff);
        }
      }
    }

    throw (
      lastError ||
      new NetworkUnavailableError('Không thể kết nối đến máy chủ Cloudflare Worker sau nhiều lần thử lại.')
    );
  }
}
