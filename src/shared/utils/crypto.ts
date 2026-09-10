/**
 * crypto.ts — Mã hóa Web Crypto & Hashing an toàn chống tràn stack
 */

import { CryptoError } from '../errors/extension-error';

/**
 * Chuyển đổi Uint8Array sang Base64 an toàn không tràn Call Stack
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + chunkSize, len))));
  }
  return btoa(binary);
}

/**
 * Chuyển đổi Base64 sang Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Tính hash SHA-256 của prompt để lưu cache
 */
export async function hashPrompt(text: string = ''): Promise<string> {
  const normalized = text.trim().toLowerCase();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback FNV-1a hash cho non-crypto environments
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return 'h_' + (hash >>> 0).toString(16);
}

/**
 * Tạo CryptoKey từ mật khẩu (PBKDF2)
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Mã hóa chuỗi với AES-GCM và mật khẩu người dùng
 */
export async function encryptData(data: string, passphrase: string): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);

    const encodedData = new TextEncoder().encode(data);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Ghép: salt (16b) + iv (12b) + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return uint8ArrayToBase64(combined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new CryptoError(`Mã hóa thất bại: ${message}`, err);
  }
}

/**
 * Giải mã chuỗi đã mã hóa bằng mật khẩu
 */
export async function decryptData(encryptedBase64: string, passphrase: string): Promise<string> {
  try {
    const combined = base64ToUint8Array(encryptedBase64);
    const salt = combined.subarray(0, 16);
    const iv = combined.subarray(16, 28);
    const ciphertext = combined.subarray(28);

    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );

    return new TextDecoder().decode(decrypted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new CryptoError(`Giải mã thất bại (sai mật khẩu hoặc dữ liệu lỗi): ${message}`, err);
  }
}
