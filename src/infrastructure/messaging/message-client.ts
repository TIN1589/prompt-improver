/**
 * message-client.ts — Type-Safe Message Bus Client
 * Đóng gói việc gửi thông điệp chrome.runtime.sendMessage và giải nén response chuẩn.
 */

import type { ExtensionMessage, MessageResponse } from '../../shared/types/messages';
import { ExtensionError } from '../../shared/errors/extension-error';

export class MessageClient {
  /**
   * Gửi message tới Extension Runtime (Background) và nhận kết quả type-safe
   */
  static async send<T = unknown>(message: ExtensionMessage, timeoutMs: number = 45000): Promise<T> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      throw new Error('Chrome runtime không khả dụng trong môi trường hiện tại.');
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(
            new Error(
              'Extension runtime hoặc máy chủ AI không phản hồi kịp thời (Timeout sau 45s). Vui lòng thử lại sau.'
            )
          );
        }
      }, timeoutMs);

      try {
        chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);

          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            return reject(new Error(lastErr.message || 'Lỗi giao tiếp nội bộ extension.'));
          }

          if (!response) {
            return reject(new Error('Không nhận được phản hồi từ extension runtime.'));
          }

          if (response.success) {
            resolve(response.data);
          } else {
            const errPayload = response.error;
            const err = new Error(errPayload?.message || 'Lỗi không xác định.');
            (err as unknown as { code: string }).code = errPayload?.code || 'ERROR';
            (err as unknown as { isRateLimit?: boolean }).isRateLimit = errPayload?.isRateLimit;
            (err as unknown as { retryAfterSeconds?: number }).retryAfterSeconds = errPayload?.retryAfterSeconds;
            reject(err);
          }
        });
      } catch (err: unknown) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });
  }
}
