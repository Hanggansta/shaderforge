import type { AIProvider, AIResponse, ShaderContext } from '../adapter';
import { buildSystemPrompt } from '../conventions';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIGS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3-70b-chat-hf',
  },
};

export class OpenAICompatibleProvider implements AIProvider {
  name: string;
  private config: OpenAICompatibleConfig;

  constructor(name: string, config: OpenAICompatibleConfig) {
    this.name = name;
    this.config = config;
  }

  static createPreset(preset: string, apiKey: string): OpenAICompatibleProvider {
    const config = DEFAULT_CONFIGS[preset];
    if (!config) {
      throw new Error(`Unknown provider preset: ${preset}`);
    }
    return new OpenAICompatibleProvider(preset, {
      apiKey,
      ...config,
    });
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
        temperature: 0.5, // Lower temperature for more consistent code
        max_tokens: 8192, // More tokens for complex shaders
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your API key in settings.');
      }
      if (response.status === 429) {
        throw new Error('Rate limited. Please wait a moment and try again.');
      }
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    return this.callAPI(messages);
  }

  async generateShader(prompt: string, __context?: ShaderContext): Promise<AIResponse> {
    const systemPrompt = buildSystemPrompt();

    let userPrompt = `Create a complete, working GLSL shader based on this description:\n\n"${prompt}"\n\n`;
    userPrompt += `IMPORTANT REQUIREMENTS:\n`;
    userPrompt += `1. Include ALL struct definitions (like Ray, Hit) before using them\n`;
    userPrompt += `2. Include ALL helper functions before calling them\n`;
    userPrompt += `3. Do NOT use out/inout parameters in helper functions\n`;
    userPrompt += `4. Do NOT redefine built-in functions (reflect, normalize, etc.)\n`;
    userPrompt += `5. Define camera position/target variables before using them\n`;
    userPrompt += `6. Output ONLY the raw GLSL code starting with "precision mediump float;"\n`;

    const rawResponse = await this.callAPI([
      { role: 'system', content: systemPrompt },
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
    const systemPrompt = buildSystemPrompt();

    let userPrompt = `Current shader code:\n\`\`\`glsl\n${currentCode}\n\`\`\`\n\n`;
    userPrompt += `Modify the shader according to this request:\n"${prompt}"\n\n`;
    userPrompt += `IMPORTANT:\n`;
    userPrompt += `1. Keep ALL existing struct definitions\n`;
    userPrompt += `2. Keep ALL existing helper functions\n`;
    userPrompt += `3. Only change what's requested\n`;
    userPrompt += `4. Output the COMPLETE modified shader code\n`;

    const rawResponse = await this.callAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return {
      code: rawResponse,
      explanation: 'Modified shader based on your request.',
      rawResponse,
      providerName: this.name,
      model: this.config.model,
    };
  }

  async fixShader(currentCode: string, errorOutput: string, _context?: ShaderContext): Promise<AIResponse> {
    const systemPrompt = buildSystemPrompt();

    let userPrompt = `Shader code with compilation errors:\n\`\`\`glsl\n${currentCode}\n\`\`\`\n\n`;
    userPrompt += `Compilation errors:\n${errorOutput}\n\n`;
    userPrompt += `Fix these specific errors. Common fixes:\n`;
    userPrompt += `- "undeclared identifier": Add the missing variable/function definition\n`;
    userPrompt += `- "out/inout parameters": Change to return values\n`;
    userPrompt += `- "redefining built-in": Remove the custom function\n`;
    userPrompt += `- "dimension mismatch": Check vector types\n`;
    userPrompt += `\nOutput the COMPLETE fixed shader code.\n`;

    const rawResponse = await this.callAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return {
      code: rawResponse,
      explanation: 'Fixed shader based on compilation errors.',
      rawResponse,
      providerName: this.name,
      model: this.config.model,
    };
  }

  async explainShader(currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    const userPrompt = `Explain how this shader works in detail:\n\`\`\`glsl\n${currentCode}\n\`\`\`\n\nBreak down:\n1. The overall structure\n2. Key mathematical concepts\n3. How the visual effect is achieved\n4. What each function does`;

    const rawResponse = await this.callAPI([
      { role: 'user', content: userPrompt },
    ]);

    return {
      explanation: rawResponse,
      rawResponse,
      providerName: this.name,
      model: this.config.model,
    };
  }
}
