/**
 * Lightweight Code Validator
 * Catches obvious compatibility issues without being a full GLSL compiler.
 * WebGL compile remains the source of truth.
 */

import { RENDERER_CAPABILITIES } from './capabilities';

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

/**
 * Validate shader code structure
 * This is lightweight - catches obvious issues before compilation
 */
export function validateShaderCode(code: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Check for mainImage function
  if (!code.includes('void mainImage(')) {
    issues.push({
      type: 'error',
      category: 'missing_entrypoint',
      message: 'Missing mainImage function. Required signature: void mainImage(out vec4 fragColor, in vec2 fragCoord)',
    });
  }

  // 2. Check for markdown fences (should have been cleaned, but double-check)
  if (code.includes('```')) {
    issues.push({
      type: 'error',
      category: 'markdown_fences',
      message: 'Code contains markdown fences (```). Remove all markdown formatting.',
    });
  }

  // 3. Check for unsupported texture features
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

  // 4. Check for duplicate uniform declarations
  const autoUniformNames = RENDERER_CAPABILITIES.autoUniforms.map(u => u.name);
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

  // 5. Check for #version directive
  if (code.includes('#version')) {
    issues.push({
      type: 'warning',
      category: 'version_directive',
      message: '#version directive is auto-added. Remove it from your code.',
    });
  }

  // 6. Check for #ifdef GL_ES
  if (code.includes('#ifdef GL_ES')) {
    issues.push({
      type: 'warning',
      category: 'ifdef_gles',
      message: '#ifdef GL_ES is not needed. The renderer handles this automatically.',
    });
  }

  // 7. Check #define placement - must be before usage
  const defineRegex = /#define\s+(\w+)/g;
  let defineMatch;
  const defines: Map<string, number> = new Map();

  while ((defineMatch = defineRegex.exec(code)) !== null) {
    const name = defineMatch[1];
    const lineNum = code.substring(0, defineMatch.index).split('\n').length;
    defines.set(name, lineNum);
  }

  // Check if defined identifiers are used before definition
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
        break; // Only report first usage
      }
    }
  }

  // 8. Check for obvious prose/explanation text
  const lines = code.split('\n');
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }
    // Check if first non-comment line looks like prose
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

  // 8. Check for basic syntax balance
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

  // 9. Check for common WebGL2 issues
  // Variable indexing in arrays
  const arrayAccessRegex = /\w+\s*\[\s*[a-zA-Z_]\w*\s*\]/g;
  const arrayMatches = code.match(arrayAccessRegex);
  if (arrayMatches) {
    issues.push({
      type: 'warning',
      category: 'variable_array_index',
      message: 'Variable array indexing may not work in WebGL2. Use constant indices or loop variables.',
    });
  }

  return {
    valid: issues.filter(i => i.type === 'error').length === 0,
    issues,
  };
}
