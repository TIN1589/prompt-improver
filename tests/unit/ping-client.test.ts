/**
 * ping-client.test.ts — Unit tests for PingClient with Timeout & Resilience
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PingClient } from '../../src/infrastructure/api/ping-client';

describe('PingClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Trả về lỗi nếu URL rỗng', async () => {
    const res = await PingClient.ping('');
    expect(res.online).toBe(false);
    expect(res.error).toContain('Vui lòng nhập Backend URL');
  });

  it('Kết nối thành công trả về online = true kèm latency và info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'online',
        service: 'Prompt Improver Worker Test',
        hasApiKey: true,
      }),
    });

    const res = await PingClient.ping('https://my-worker.workers.dev');
    expect(res.online).toBe(true);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.hasApiKey).toBe(true);
    expect(res.info).toBe('Prompt Improver Worker Test');
  });

  it('Xử lý phản hồi lỗi HTTP (e.g. 500) an toàn không văng exception', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const res = await PingClient.ping('https://my-worker.workers.dev');
    expect(res.online).toBe(false);
    expect(res.error).toContain('500');
  });

  it('Xử lý lỗi mạng (Network Error) an toàn và trả về online = false', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const res = await PingClient.ping('https://invalid-domain.xyz');
    expect(res.online).toBe(false);
    expect(res.error).toContain('Failed to fetch');
  });

  it('Xử lý timeout khi server bị treo và trả về thông báo timeout', async () => {
    // Giả lập fetch bị treo và kích hoạt AbortError
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    // Test với timeout ngắn 50ms
    const res = await PingClient.ping('https://slow-backend.workers.dev', 50);
    expect(res.online).toBe(false);
    expect(res.error).toContain('Timeout');
  });
});
