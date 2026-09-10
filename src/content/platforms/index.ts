/**
 * index.ts — Platform Adapter Registry & Resolver
 */

import type { PlatformAdapter } from './platform-adapter';
import { ClaudeAdapter } from './claude.adapter';
import { ChatGPTAdapter } from './chatgpt.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { CopilotAdapter } from './copilot.adapter';
import { GenericAdapter } from './generic.adapter';

export * from './platform-adapter';
export * from './claude.adapter';
export * from './chatgpt.adapter';
export * from './gemini.adapter';
export * from './deepseek.adapter';
export * from './copilot.adapter';
export * from './generic.adapter';

const ADAPTERS: PlatformAdapter[] = [
  new ClaudeAdapter(),
  new ChatGPTAdapter(),
  new GeminiAdapter(),
  new DeepSeekAdapter(),
  new CopilotAdapter(),
  new GenericAdapter(), // Fallback cuối cùng
];

export function resolvePlatformAdapter(hostname: string = window.location.hostname): PlatformAdapter {
  for (const adapter of ADAPTERS) {
    if (adapter.matches(hostname)) {
      return adapter;
    }
  }
  return ADAPTERS[ADAPTERS.length - 1];
}
