/**
 * Lightweight Code Validator
 * Catches obvious compatibility issues without being a full GLSL compiler.
 */

import { RENDERER_CAPABILITIES } from './renderer-capabilities';

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: string;
  message: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateShaderCode(code: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!code.includes('void mainImage(')) {
    issues.push({
      type: 'error',
      category: 'missing_entrypoint',
      message: 'Missing mainImage function. Required signature: void mainImage(out vec4 fragColor, in vec2 fragCoord)',
    });
  }

  if (code.includes('```')) {
    issues.push({
      type: 'error',
      category: 'markdown_fences',
      message: 'Code contains markdown fences (```). Remove all markdown formatting.',
    });
  }

  if (code.includes('sampler2D') || code.includes('samplerCube')) {
    issues.push({
      type: 'error',
      category: 'unsupported_texture',
      message: 'Texture samplers (sampler2D/samplerCube) are not supported. Use math-based patterns instead.',
    });
  }

  if (code.includes('iChannel')) {
    issues.push({
      type: 'error',
      category: 'unsupported_ichannel',
      message: 'iChannel textures are not supported. Use math-based patterns instead.',
    });
  }

  if (/\btexture\s*\(/.test(code)) {
    issues.push({
      type: 'error',
      category: 'unsupported_texture_call',
      message: 'texture() function is not supported. Use math-based patterns instead.',
    });
  }

  const autoUniformNames = RENDERER_CAPABILITIES.autoUniforms.map((u) => u.name);
  for (const uniformName of autoUniformNames) {
    const regex = new RegExp(`uniform\\s+\\w+\\s+${uniformName}\\s*;`, 'g');
    const matches = code.match(regex);
    if (matches && matches.length > 0) {
      issues.push({
        type: 'warning',
        category: 'duplicate_uniform',
        message: `Duplicate uniform declaration: ${uniformName} is auto-provided and should not be declared.`,
      });
    }
  }

  if (code.includes('#version')) {
    issues.push({
      type: 'warning',
      category: 'version_directive',
      message: '#version directive is auto-added. Remove it from your code.',
    });
  }

  if (code.includes('#ifdef GL_ES')) {
    issues.push({
      type: 'warning',
      category: 'ifdef_gles',
      message: '#ifdef GL_ES is not needed. The renderer handles this automatically.',
    });
  }

  const defineRegex = /#define\s+(\w+)/g;
  let defineMatch;
  const defines: Map<string, number> = new Map();

  while ((defineMatch = defineRegex.exec(code)) !== null) {
    const name = defineMatch[1];
    const lineNum = code.substring(0, defineMatch.index).split('\n').length;
    defines.set(name, lineNum);
  }

  for (const [name, defineLine] of defines) {
    const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
    let usageMatch;
    while ((usageMatch = usageRegex.exec(code)) !== null) {
      const usageLine = code.substring(0, usageMatch.index).split('\n').length;
      if (usageLine < defineLine && usageLine !== defineLine) {
        issues.push({
          type: 'error',
          category: 'define_order',
          message: `'${name}' is used on line ${usageLine} but defined on line ${defineLine}. #define must come BEFORE usage.`,
          line: usageLine,
        });
        break;
      }
    }
  }

  const lines = code.split('\n');
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
    if (line.length > 50 &&
        !line.includes(';') &&
        !line.includes('{') &&
        !line.includes('#') &&
        !line.startsWith('precision')) {
      issues.push({
        type: 'warning',
        category: 'prose_detected',
        message: 'Possible explanation text detected at the beginning of code. Ensure code starts with "precision mediump float;".',
        line: i + 1,
      });
    }
  }

  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type: 'error',
      category: 'unbalanced_braces',
      message: `Unbalanced braces: ${openBraces} opening vs ${closeBraces} closing braces.`,
    });
  }

  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push({
      type: 'error',
      category: 'unbalanced_parens',
      message: `Unbalanced parentheses: ${openParens} opening vs ${closeParens} closing parentheses.`,
    });
  }

  const arrayAccessRegex = /\w+\s*\[\s*[a-zA-Z_]\w*\s*\]/g;
  const arrayMatches = code.match(arrayAccessRegex);
  if (arrayMatches) {
    issues.push({
      type: 'warning',
      category: 'variable_array_index',
      message: 'Variable array indexing may not work in WebGL2. Use constant indices or loop variables.',
    });
  }

  if (/while\s*\(\s*(true|1|1\.0)\s*\)/i.test(code)) {
    issues.push({
      type: 'error',
      category: 'infinite_loop',
      message: 'Infinite while loop detected (while(true/1)). Use a bounded for loop instead.',
    });
  }

  const forLoopRegex = /for\s*\(\s*(?:int|float)\s+\w+\s*=\s*\d+\.?\d*\s*;\s*\w+\s*<\s*(\d+\.?\d*)\s*;/g;
  let forMatch;
  while ((forMatch = forLoopRegex.exec(code)) !== null) {
    const upperBound = parseFloat(forMatch[1]);
    if (upperBound > 256) {
      issues.push({
        type: 'error',
        category: 'excessive_loop',
        message: `Loop bound ${Math.round(upperBound)} exceeds maximum (256). Reduce iteration count to prevent browser freeze.`,
      });
    }
  }

  const loopBounds: number[] = [];
  let nestedMatch;
  while ((nestedMatch = forLoopRegex.exec(code)) !== null) {
    loopBounds.push(parseFloat(nestedMatch[1]));
  }
  if (loopBounds.length >= 2) {
    for (let i = 0; i < loopBounds.length - 1; i++) {
      const product = loopBounds[i] * loopBounds[i + 1];
      if (product > 4096) {
        issues.push({
          type: 'error',
          category: 'nested_loop_explosion',
          message: `Nested loop product (${Math.round(loopBounds[i])} × ${Math.round(loopBounds[i + 1])} = ${Math.round(product)}) exceeds maximum (4096). Reduce inner loop bounds.`,
        });
      }
    }
  }

  return {
    valid: issues.filter((i) => i.type === 'error').length === 0,
    issues,
  };
}
