import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_OPENAI_MODEL,
  resolveOpenAIApiKey,
  resolveOpenAIModel,
} from '../ai-config';

describe('ai-config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to gpt-5.4-mini', () => {
    expect(DEFAULT_OPENAI_MODEL).toBe('gpt-5.4-mini');
    expect(resolveOpenAIModel()).toBe('gpt-5.4-mini');
  });

  it('reads VITE_OPENAI_MODEL override', () => {
    vi.stubEnv('VITE_OPENAI_MODEL', 'gpt-5.4-mini-2026-03-17');
    expect(resolveOpenAIModel()).toBe('gpt-5.4-mini-2026-03-17');
  });

  it('reads VITE_OPENAI_API_KEY', () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test-key');
    expect(resolveOpenAIApiKey()).toBe('sk-test-key');
  });
});