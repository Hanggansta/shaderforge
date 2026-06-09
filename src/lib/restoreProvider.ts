import { useAIStore } from '../store/aiStore';
import { shaderAgent } from '../shader-agent/integration/service';
import { OpenAICompatibleProvider } from '../shader-agent/integration/providers/openai-compatible';
import { MockAIProvider } from '../shader-agent/integration/providers/mock';

const SETTINGS_KEY = 'shaderforge-ai-settings';

/** Restore saved AI provider — called when entering Studio, not on marketing routes. */
export function restoreSavedProvider(): boolean {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const settings = JSON.parse(data) as {
        provider: string;
        apiKey: string;
        baseUrl: string;
        model: string;
      };
      if (settings.provider === 'mock') {
        shaderAgent.setProvider(new MockAIProvider());
        useAIStore.getState().setProvider('Mock AI', 'mock-v1');
      } else if (settings.provider && settings.apiKey) {
        const provider = settings.provider === 'custom'
          ? new OpenAICompatibleProvider('custom', {
              apiKey: settings.apiKey,
              baseUrl: settings.baseUrl,
              model: settings.model,
            })
          : OpenAICompatibleProvider.createPreset(settings.provider, settings.apiKey);
        shaderAgent.setProvider(provider);
        useAIStore.getState().setProvider(settings.provider, settings.model || 'default');
      }
      return true;
    }
  } catch {
    // ignore
  }

  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    const provider = OpenAICompatibleProvider.createPreset('openai', openaiKey);
    shaderAgent.setProvider(provider);
    useAIStore.getState().setProvider('OpenAI', 'gpt-4o-mini');
    return true;
  }

  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey !== 'your_api_key_here') {
    const provider = OpenAICompatibleProvider.createPreset('deepseek', deepseekKey);
    shaderAgent.setProvider(provider);
    useAIStore.getState().setProvider('DeepSeek', 'deepseek-v4-pro');
    return true;
  }

  return false;
}