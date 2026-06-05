/**
 * OpenAI-compatible provider — chat-completions endpoint for DeepSeek, OpenAI,
 * Groq, Together AI, and any custom OpenAI-shaped API.
 *
 * The new shader-agent harness uses `generateWithMessages` (passes spec-aware
 * system prompt directly) instead of `generateShader` (which builds its own
 * system prompt). Both paths are kept for backward compatibility with
 * Settings panel "Test Connection" buttons.
 */

import type { AIProvider, AIResponse, ShaderContext } from '../types/ai-provider';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIGS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro' },
  openai:   { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq:     { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  together: { baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3-70b-chat-hf' },
};

/**
 * Inline renderer capabilities — the only piece of GLSL convention we need
 * for OpenAI-compatible generation. The buildWeightedSystemPrompt adds the
 * full prompt; here we only need a minimal system prompt for the
 * pre-harness `generateShader` / `fixShader` paths.
 */
const INLINE_SYSTEM_PROMPT = `You are a WebGL2 GLSL shader generator. Your goal is to create visually interesting, creative shaders that compile and run correctly.

RENDERER CAPABILITIES:
- WebGL 2, GLSL ES 300
- Entry point: void mainImage(out vec4 fragColor, in vec2 fragCoord)
- Auto-provided uniforms: iTime (float), iTimeDelta (float), iFrame (int), iResolution (vec3), iMouse (vec4), iDate (vec4)
- DO NOT declare uniforms that are auto-provided
- DO NOT redefine built-in functions (reflect, normalize, length, etc.)
- DO NOT use iChannel, sampler2D, texture() — no texture support
- DO NOT use #version (auto-added), #ifdef GL_ES (not needed)
- #define allowed for simple constants: #define PI 3.14159

CODE STRUCTURE:
- Start with: precision mediump float;
- Define structs, helpers, variables BEFORE using them
- mainImage is the entry point

OUTPUT FORMAT:
- Output ONLY raw GLSL code
- NO markdown fences, NO explanations
- Start directly with: precision mediump float;`;

export class OpenAICompatibleProvider implements AIProvider {
  name: string;
  private config: OpenAICompatibleConfig;

  constructor(name: string, config: OpenAICompatibleConfig) {
    this.name = name;
    this.config = config;
  }

  static createPreset(preset: string, apiKey: string): OpenAICompatibleProvider {
    const config = DEFAULT_CONFIGS[preset];
    if (!config) throw new Error(`Unknown provider preset: ${preset}`);
    return new OpenAICompatibleProvider(preset, { apiKey, ...config });
  }

  static getPresets(): string[] {
    return Object.keys(DEFAULT_CONFIGS);
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  configure(config: Record<string, string>): void {
    if (config.apiKey) this.config.apiKey = config.apiKey;
    if (config.baseUrl) this.config.baseUrl = config.baseUrl;
    if (config.model) this.config.model = config.model;
  }

  private async callAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.5,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) throw new Error('Invalid API key. Please check your API key in settings.');
      if (response.status === 429) throw new Error('Rate limited. Please wait a moment and try again.');
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    return this.callAPI(messages);
  }

  async generateShader(prompt: string, _context?: ShaderContext): Promise<AIResponse> {
    const userPrompt = `Create a complete, working GLSL shader based on this description:\n\n"${prompt}"\n\nIMPORTANT:\n- Include ALL struct/helper definitions before using them\n- Do NOT use out/inout parameters in helper functions\n- Do NOT redefine built-in functions\n- Output ONLY raw GLSL starting with "precision mediump float;"`;

    const rawResponse = await this.callAPI([
      { role: 'system', content: INLINE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    return {
      code: rawResponse,
      explanation: 'Generated shader based on your description.',
      rawResponse,
      providerName: this.name,
      model: this.config.model,
    };
  }

  async modifyShader(prompt: string, currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    const userPrompt = `Current shader code:\n\`\`\`glsl\n${currentCode}\n\`\`\`\n\nModify the shader according to this request:\n"${prompt}"\n\nOutput the COMPLETE modified shader code.`;
    const rawResponse = await this.callAPI([
      { role: 'system', content: INLINE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    return { code: rawResponse, explanation: 'Modified shader based on your request.', rawResponse, providerName: this.name, model: this.config.model };
  }

  async fixShader(currentCode: string, errorOutput: string, _context?: ShaderContext): Promise<AIResponse> {
    const userPrompt = `Shader code with compilation errors:\n\`\`\`glsl\n${currentCode}\n\`\`\`\n\nErrors:\n${errorOutput}\n\nFix these specific errors. Output the COMPLETE fixed shader code.`;
    const rawResponse = await this.callAPI([
      { role: 'system', content: INLINE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    return { code: rawResponse, explanation: 'Fixed shader based on compilation errors.', rawResponse, providerName: this.name, model: this.config.model };
  }

  async explainShader(currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    const userPrompt = `Explain how this shader works in detail:\n\`\`\`glsl\n${currentCode}\n\`\`\`\n\nBreak down the structure, key math, the visual effect, and each function.`;
    const rawResponse = await this.callAPI([{ role: 'user', content: userPrompt }]);
    return { explanation: rawResponse, rawResponse, providerName: this.name, model: this.config.model };
  }

  async generateWithMessages(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    const rawResponse = await this.callAPI(messages);
    return { code: rawResponse, explanation: 'Generated shader based on your description.', rawResponse, providerName: this.name, model: this.config.model };
  }

  async fixWithMessages(_currentCode: string, messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    const rawResponse = await this.callAPI(messages);
    return { code: rawResponse, explanation: 'Fixed shader based on compilation errors.', rawResponse, providerName: this.name, model: this.config.model };
  }

  private async callAPIMulti(messages: Array<{ role: string; content: string }>, n: number): Promise<AIResponse[]> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 8192,
        n,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) throw new Error('Invalid API key. Please check your API key in settings.');
      if (response.status === 429) throw new Error('Rate limited. Please wait a moment and try again.');
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return (data.choices || []).map((choice: { message?: { content?: string } }) => ({
      code: choice.message?.content || '',
      explanation: 'Generated shader based on your description.',
      rawResponse: choice.message?.content || '',
      providerName: this.name,
      model: this.config.model,
    }));
  }

  async generateCandidates(messages: Array<{ role: string; content: string }>, n: number): Promise<AIResponse[]> {
    return this.callAPIMulti(messages, n);
  }
}
