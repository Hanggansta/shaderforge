/** Default OpenAI model for ShaderLumen (local + production). */
export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

export const OPENAI_API_BASE = 'https://api.openai.com/v1';

export function resolveOpenAIApiKey(): string | undefined {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key || typeof key !== 'string') return undefined;
  const trimmed = key.trim();
  if (!trimmed || trimmed === 'your_openai_api_key_here') return undefined;
  return trimmed;
}

export function resolveOpenAIModel(): string {
  const fromEnv = import.meta.env.VITE_OPENAI_MODEL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return DEFAULT_OPENAI_MODEL;
}