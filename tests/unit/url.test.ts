/**
 * url.test.ts — Unit tests for normalizeBackendUrl
 */

import { describe, it, expect } from 'vitest';
import { normalizeBackendUrl } from '../../src/shared/utils/url';

describe('normalizeBackendUrl', () => {
  it('Xử lý chuỗi rỗng và khoảng trắng', () => {
    expect(normalizeBackendUrl('')).toBe('');
    expect(normalizeBackendUrl('   ')).toBe('');
  });

  it('Tự động thêm tiền tố https:// khi thiếu giao thức', () => {
    expect(normalizeBackendUrl('prompt-improver.xxx.workers.dev')).toBe('https://prompt-improver.xxx.workers.dev');
    expect(normalizeBackendUrl('localhost:8787')).toBe('https://localhost:8787');
  });

  it('Giữ nguyên giao thức nếu đã có http:// hoặc https://', () => {
    expect(normalizeBackendUrl('http://localhost:8787')).toBe('http://localhost:8787');
    expect(normalizeBackendUrl('https://my-worker.workers.dev')).toBe('https://my-worker.workers.dev');
  });

  it('Loại bỏ trailing slashes và khoảng trắng thừa', () => {
    expect(normalizeBackendUrl('  https://my-worker.workers.dev/  ')).toBe('https://my-worker.workers.dev');
    expect(normalizeBackendUrl('https://my-worker.workers.dev///')).toBe('https://my-worker.workers.dev');
    expect(normalizeBackendUrl('my-worker.workers.dev/')).toBe('https://my-worker.workers.dev');
  });
});
