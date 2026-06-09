import { useAIStore } from '../store/aiStore';
import { shaderAgent } from '../shader-agent/integration/service';
import { OpenAICompatibleProvider } from '../shader-agent/integration/providers/openai-compatible';
import { MockAIProvider } from '../shader-agent/integration/providers/mock';
import { resolveOpenAIApiKey, resolveOpenAIModel } from './ai-config';

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
        return true;
      }
      if (settings.provider === 'openai') {
        const apiKey = settings.apiKey.trim() || resolveOpenAIApiKey();
        if (!apiKey) return false;
        const model = settings.model.trim() || resolveOpenAIModel();
        const provider = OpenAICompatibleProvider.createOpenAI(apiKey, model);
        shaderAgent.setProvider(provider);
        useAIStore.getState().setProvider('OpenAI', model);
        return true;
      }
    }
  } catch {
    // ignore
  }

  const openaiKey = resolveOpenAIApiKey();
  if (openaiKey) {
    const model = resolveOpenAIModel();
    const provider = OpenAICompatibleProvider.createOpenAI(openaiKey, model);
    shaderAgent.setProvider(provider);
    useAIStore.getState().setProvider('OpenAI', model);
    return true;
  }

  return false;
}