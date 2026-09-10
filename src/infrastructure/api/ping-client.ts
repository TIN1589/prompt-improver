/**
 * ping-client.ts — Kiểm tra kết nối và đo độ trễ đến Backend (với Timeout 6s an toàn)
 */

import type { PingResult } from '../../shared/types/messages';
import { normalizeBackendUrl } from '../../shared/utils/url';

export class PingClient {
  /**
   * Đo độ trễ và kiểm tra trạng thái máy chủ Backend
   * @param rawUrl URL Cloudflare Worker hoặc backend local
   * @param timeoutMs Thời gian timeout tối đa (mặc định 6000ms = 6 giây)
   */
  static async ping(rawUrl: string, timeoutMs: number = 6000): Promise<PingResult> {
    const url = normalizeBackendUrl(rawUrl);
    if (!url) {
      return {
        online: false,
        latencyMs: 0,
        hasApiKey: false,
        info: '',
        error: 'Vui lòng nhập Backend URL.',
      };
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          online: false,
          latencyMs,
          hasApiKey: false,
          info: '',
          error: `Máy chủ trả về mã lỗi HTTP ${res.status} (${res.statusText || 'Error'})`,
        };
      }

      const data = (await res.json().catch(() => ({}))) as {
        hasApiKey?: boolean;
        service?: string;
        status?: string;
      };

      return {
        online: true,
        latencyMs,
        hasApiKey: data.hasApiKey !== false,
        info: data.service || 'Prompt Improver Worker',
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;
      const isAbort =
        (err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'))) ||
        controller.signal.aborted;

      const message = isAbort
        ? `Quá thời gian chờ phản hồi từ máy chủ (Timeout sau ${timeoutMs / 1000}s). Vui lòng kiểm tra lại URL hoặc trạng thái mạng.`
        : err instanceof Error
        ? err.message
        : String(err);

      return {
        online: false,
        latencyMs,
        hasApiKey: false,
        info: '',
        error: `Kết nối thất bại: ${message}`,
      };
    }
  }
}
