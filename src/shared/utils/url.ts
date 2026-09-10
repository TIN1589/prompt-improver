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
    if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
      url = 'http://' + url;
    } else {
      url = 'https://' + url;
    }
  }
  return url;
}

/**
 * Kiểm tra xem URL có phải là URL mẫu (placeholder) chưa thay subdomain hay không
 */
export function isPlaceholderUrl(url: string): boolean {
  return /xxx\.workers\.dev/i.test(url || '');
}
