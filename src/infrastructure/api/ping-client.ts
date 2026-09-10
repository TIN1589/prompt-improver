/**
 * ping-client.ts — Kiểm tra kết nối và đo độ trễ đến Backend
 */

import type { PingResult } from '../../shared/types/messages';
import { NetworkUnavailableError, BackendConfigurationMissingError } from '../../shared/errors/extension-error';
import { normalizeBackendUrl } from '../../shared/utils/url';

export class PingClient {
  static async ping(rawUrl: string): Promise<PingResult> {
    const url = normalizeBackendUrl(rawUrl);
    if (!url) {
      throw new BackendConfigurationMissingError('Vui lòng nhập Backend URL.');
    }

    const startTime = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        throw new NetworkUnavailableError(`Máy chủ trả về mã lỗi HTTP ${res.status}`);
      }

      const data = (await res.json().catch(() => ({}))) as {
        hasApiKey?: boolean;
        service?: string;
      };

      return {
        online: true,
        latencyMs,
        hasApiKey: data.hasApiKey !== false,
        info: data.service || 'Prompt Improver Worker',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new NetworkUnavailableError(`Kết nối thất bại: ${message}`);
    }
  }
}
