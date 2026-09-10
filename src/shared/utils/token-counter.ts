/**
 * token-counter.ts — Thuật toán ước lượng Token tối ưu cho Tiếng Việt và Tiếng Anh
 */

export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;

  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Nhận diện đặc thù tiếng Việt có dấu
  const vietnameseAccentsRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const isVietnamese = vietnameseAccentsRegex.test(trimmed);

  if (isVietnamese) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    const punctuationCount = (trimmed.match(/[,.;:?!(){}[\]<>"/\\|=+*#@$%^&~`_-]/g) || []).length;
    return Math.ceil(words.length * 1.25 + punctuationCount * 0.4);
  } else {
    const charEstimate = Math.ceil(trimmed.length / 3.8);
    const wordEstimate = Math.ceil(trimmed.split(/\s+/).filter(Boolean).length * 1.3);
    return Math.max(Math.ceil((charEstimate + wordEstimate) / 2), 1);
  }
}
