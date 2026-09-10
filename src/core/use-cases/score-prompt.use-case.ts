/**
 * score-prompt.use-case.ts — Đánh giá chất lượng Prompt đa chiều
 * Độc lập hoàn toàn với runtime của trình duyệt.
 */

import type { PromptScore, ScoreComparison } from '../models/score.entity';
import { estimateTokens } from '../../shared/utils/token-counter';
import { extractEntities } from '../../shared/utils/entity-extractor';

export class ScorePromptUseCase {
  /**
   * Đánh giá định lượng chất lượng của một prompt
   */
  static evaluate(prompt: string): PromptScore {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return {
        overallScore: 0,
        clarity: 0,
        context: 0,
        conciseness: 0,
        suggestions: ['Prompt đang trống, vui lòng nhập yêu cầu của bạn.'],
      };
    }

    const text = prompt.trim();
    const tokens = estimateTokens(text);
    const entities = extractEntities(text);

    // ── 1. ĐIỂM CLARITY (Độ rõ ràng & Hành động cụ thể: 0 - 100) ───────────
    let clarity = 35;
    if (entities.actions.length > 0) {
      clarity += Math.min(entities.actions.length * 15, 35);
    }
    if (/^(hãy|tạo|viết|implement|build|fix|refactor|design|optimize|sửa|kiểm tra|phân tích)\b/i.test(text)) {
      clarity += 20;
    }
    if (text.includes('?') || text.includes(':') || text.includes('\n')) {
      clarity += 10;
    }
    clarity = Math.min(Math.max(clarity, 10), 100);

    // ── 2. ĐIỂM CONTEXT (Độ đầy đủ của bối cảnh & ràng buộc: 0 - 100) ────────
    let context = 20;
    if (entities.languages.length > 0) {
      context += Math.min(entities.languages.length * 20, 30);
    }
    if (entities.frameworks.length > 0) {
      context += Math.min(entities.frameworks.length * 20, 30);
    }
    if (entities.constraints.length > 0) {
      context += Math.min(entities.constraints.length * 20, 30);
    }
    if (entities.identifiers.length > 0) {
      context += 10;
    }
    context = Math.min(Math.max(context, 10), 100);

    // ── 3. ĐIỂM CONCISENESS (Độ súc tích & Tiết kiệm Token: 0 - 100) ─────────
    let conciseness = 100;
    const fillerPatterns = [
      /xin chào/gi, /làm ơn/gi, /cảm ơn/gi, /bạn có thể/gi, /hãy giúp tôi/gi,
      /tôi muốn nhờ/gi, /hello/gi, /please/gi, /thank you/gi, /could you/gi
    ];
    let fillerHits = 0;
    for (const pat of fillerPatterns) {
      if (pat.test(text)) fillerHits++;
    }
    conciseness -= fillerHits * 15;

    // Phạt nếu prompt quá dài dòng nhưng ít ngữ cảnh kỹ thuật
    if (tokens > 80 && context < 40) {
      conciseness -= 25;
    }
    conciseness = Math.min(Math.max(conciseness, 15), 100);

    // ── 4. ĐIỂM TỔNG HỢP (OVERALL SCORE: 0 - 100) ──────────────────────────
    const overallScore = Math.round(clarity * 0.4 + context * 0.4 + conciseness * 0.2);

    // ── 5. GỢI Ý CẢI THIỆN (SUGGESTIONS) ──────────────────────────────────
    const suggestions: string[] = [];
    if (entities.actions.length === 0) {
      suggestions.push('Bổ sung động từ hành động cụ thể (ví dụ: Tạo hàm, Viết API, Refactor, Tối ưu).');
    }
    if (entities.languages.length === 0 && entities.frameworks.length === 0) {
      suggestions.push('Chỉ định rõ ngôn ngữ lập trình hoặc công nghệ mục tiêu (ví dụ: TypeScript, Python, React).');
    }
    if (entities.constraints.length === 0) {
      suggestions.push('Thêm ràng buộc chất lượng (ví dụ: Không dùng thư viện ngoài, Xử lý ngoại lệ, Strict Types).');
    }
    if (fillerHits > 0) {
      suggestions.push('Lược bỏ các từ chào hỏi xã giao để tiết kiệm token và tăng tốc độ phản hồi.');
    }

    return {
      overallScore,
      clarity,
      context,
      conciseness,
      suggestions: suggestions.slice(0, 3),
    };
  }

  /**
   * So sánh điểm số giữa Prompt Gốc và Prompt Cải Thiện
   */
  static compare(originalPrompt: string, improvedPrompt: string): ScoreComparison {
    const origScore = this.evaluate(originalPrompt);
    const impScore = this.evaluate(improvedPrompt);
    const delta = impScore.overallScore - origScore.overallScore;

    return {
      original: origScore,
      improved: impScore,
      delta,
    };
  }
}
