export type AIIntent = 'create' | 'modify' | 'fix' | 'explain' | 'optimize';

export interface ShaderContext {
  currentCode?: string;
  errorOutput?: string;
  supportedUniforms?: string[];
  intent?: AIIntent;
}

export interface AIResponse {
  code?: string;
  explanation?: string;
  warnings?: string[];
  rawResponse?: string;
  providerName?: string;
  model?: string;
}

export interface AIProvider {
  name: string;
  isConfigured: () => boolean;
  configure: (config: Record<string, string>) => void;

  generateShader: (prompt: string, context?: ShaderContext) => Promise<AIResponse>;
  modifyShader: (prompt: string, currentCode: string, context?: ShaderContext) => Promise<AIResponse>;
  fixShader: (currentCode: string, errorOutput: string, context?: ShaderContext) => Promise<AIResponse>;
  explainShader: (currentCode: string, context?: ShaderContext) => Promise<AIResponse>;
}

export function extractGLSLFromResponse(response: string): string | null {
  // Try to extract code from markdown code blocks
  const codeBlockMatch = response.match(/```(?:glsl|c|cpp)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find mainImage function directly
  const mainImageMatch = response.match(/(void\s+mainImage\s*\([\s\S]*?\{[\s\S]*?\n\})/);
  if (mainImageMatch) {
    return mainImageMatch[1];
  }

  // Try to find void main() function
  const mainMatch = response.match(/(void\s+main\s*\(\s*\)\s*\{[\s\S]*?\n\})/);
  if (mainMatch) {
    return mainMatch[1];
  }

  // If the response looks like raw GLSL (starts with precision or void)
  if (response.trim().startsWith('precision') || response.trim().startsWith('void')) {
    return response.trim();
  }

  return null;
}
