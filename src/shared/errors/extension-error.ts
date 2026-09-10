/**
 * extension-error.ts — Domain Error Hierarchy
 * Cây phân cấp lỗi tập trung cho toàn bộ Extension.
 */

export abstract class ExtensionError extends Error {
  abstract readonly code: string;
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiRateLimitError extends ExtensionError {
  readonly code = 'RATE_LIMIT_429';
  constructor(
    message: string = 'Quá giới hạn tần suất gọi API (Rate limit 429).',
    public readonly retryAfterSeconds: number = 15,
    details?: unknown
  ) {
    super(message, details);
  }
}

export class BackendConfigurationMissingError extends ExtensionError {
  readonly code = 'BACKEND_URL_MISSING';
  constructor(
    message: string = 'Chưa cấu hình Backend URL! Vui lòng mở Popup Extension để nhập URL Cloudflare Worker.'
  ) {
    super(message);
  }
}

export class NetworkUnavailableError extends ExtensionError {
  readonly code = 'NETWORK_ERROR';
  constructor(
    message: string = 'Không thể kết nối đến máy chủ hoặc đường truyền mạng bị ngắt.',
    details?: unknown
  ) {
    super(message, details);
  }
}

export class StorageQuotaExceededError extends ExtensionError {
  readonly code = 'STORAGE_QUOTA_EXCEEDED';
  constructor(
    message: string = 'Dung lượng lưu trữ của trình duyệt đã đạt giới hạn tối đa.',
    details?: unknown
  ) {
    super(message, details);
  }
}

export class ServiceWorkerTimeoutError extends ExtensionError {
  readonly code = 'SW_TIMEOUT';
  constructor(
    message: string = 'Service Worker đã hết thời gian chờ phản hồi.',
    details?: unknown
  ) {
    super(message, details);
  }
}

export class InvalidInputError extends ExtensionError {
  readonly code = 'INVALID_INPUT';
  constructor(message: string = 'Dữ liệu đầu vào không hợp lệ.', details?: unknown) {
    super(message, details);
  }
}

export class CryptoError extends ExtensionError {
  readonly code = 'CRYPTO_ERROR';
  constructor(message: string = 'Lỗi mã hóa/giải mã an toàn.', details?: unknown) {
    super(message, details);
  }
}
