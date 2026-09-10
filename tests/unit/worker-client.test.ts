/**
 * worker-client.test.ts — Unit tests for WorkerClient Resilience & Timeout
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { WorkerClient } from '../../src/infrastructure/api/worker-client';
import { BackendConfigurationMissingError, NetworkUnavailableError, ApiRateLimitError } from '../../src/shared/errors/extension-error';

describe('WorkerClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Ném lỗi BackendConfigurationMissingError khi URL rỗng', async () => {
    await expect(
      WorkerClient.improvePrompt('', { prompt: 'Test' })
    ).rejects.toThrow(BackendConfigurationMissingError);
  });

  it('Ném lỗi BackendConfigurationMissingError khi URL chứa placeholder xxx.workers.dev', async () => {
    await expect(
      WorkerClient.improvePrompt('https://prompt-improver.xxx.workers.dev', { prompt: 'Test' })
    ).rejects.toThrow(BackendConfigurationMissingError);
  });

  it('Trả về kết quả thành công khi backend phản hồi JSON hợp lệ', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        minimal: 'Tối giản prompt',
        detailed: 'Chi tiết prompt',
        assumptions: ['Giả định 1'],
        taskType: 'code',
      }),
    });

    const res = await WorkerClient.improvePrompt('https://my-worker.workers.dev', {
      prompt: 'Viết code Python',
    });

    expect(res.success).toBe(true);
    expect(res.minimal).toBe('Tối giản prompt');
    expect(res.detailed).toBe('Chi tiết prompt');
    expect(res.taskType).toBe('code');
  });

  it('Xử lý lỗi timeout (AbortError) mượt mà và trả về thông điệp dễ hiểu', async () => {
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

    // Test với timeout ngắn 50ms, 1 retry
    await expect(
      WorkerClient.improvePrompt('https://slow-backend.workers.dev', { prompt: 'Test' }, 1, 50)
    ).rejects.toThrow(/Timeout sau/);
  });

  it('Nhận diện lỗi 429 và ném ApiRateLimitError kèm retryAfterSeconds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (h: string) => (h === 'Retry-After' ? '18' : null),
      },
      json: async () => ({
        message: 'Quota exceeded',
        retryAfterSeconds: 18,
      }),
    });

    await expect(
      WorkerClient.improvePrompt('https://my-worker.workers.dev', { prompt: 'Test' }, 1)
    ).rejects.toThrow(ApiRateLimitError);
  });
});
