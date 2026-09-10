/**
 * score.entity.ts — Thực thể điểm chất lượng Prompt
 */

export interface PromptScore {
  overallScore: number;
  clarity: number;
  context: number;
  conciseness: number;
  suggestions: string[];
}

export interface ScoreComparison {
  original: PromptScore;
  improved: PromptScore;
  delta: number;
}
