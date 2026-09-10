/**
 * url.ts — URL Normalization & Validation Utilities
 */

/**
 * Chuẩn hóa Backend URL:
 * - Cắt khoảng trắng thừa
 * - Xóa dấu gạch chéo cuối chuỗi (trailing slash)
 * - Tự động thêm tiền tố 'https://' nếu người dùng không nhập giao thức http/https
 */
export function normalizeBackendUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!url) return '';

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}
