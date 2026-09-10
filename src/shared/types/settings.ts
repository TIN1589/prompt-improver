/**
 * settings.ts — Cấu hình Extension và Lưu trữ
 */

import type { PersonaId } from '../../core/models/persona.entity';

export interface SiteSettings {
  [domain: string]: boolean;
}

export interface CustomTemplate {
  id: string;
  title: string;
  template: string;
}

export interface ExtensionSettings {
  backendUrl: string;
  enableCache: boolean;
  cacheTtlMs: number;
  maxCacheEntries: number;
  defaultPersona: PersonaId;
  siteSettings: SiteSettings;
  enableContextMenu: boolean;
  encryptedApiKey?: string;
  defaultMode?: string;
  customTemplates?: CustomTemplate[];
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendUrl: '',
  enableCache: true,
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 giờ
  maxCacheEntries: 200,             // Giới hạn 200 items cache
  defaultPersona: 'developer',
  siteSettings: {
    'chatgpt.com': true,
    'chat.openai.com': true,
    'claude.ai': true,
    'deepseek.com': true,
    'gemini.google.com': true,
    'aistudio.google.com': true,
    'copilot.microsoft.com': true,
    'perplexity.ai': true,
    'phind.com': true,
    'poe.com': true,
  },
  enableContextMenu: true,
};
