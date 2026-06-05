/**
 * Code Cleanup Module
 * Cleans AI-generated code before validation/compilation.
 */

import { RENDERER_CAPABILITIES } from './renderer-capabilities';

export interface CleanupResult {
  code: string;
  changes: string[];
}

export function cleanShaderCode(rawCode: string): CleanupResult {
  let code = rawCode;
  const changes: string[] = [];

  const fenceRegex = /```(?:glsl|c|cpp|javascript)?\s*\n?/gi;
  if (fenceRegex.test(code)) {
    code = code.replace(fenceRegex, '');
    code = code.replace(/```\s*$/gm, '');
    changes.push('Removed markdown code fences');
  }

  const codeStart = code.indexOf('precision');
  if (codeStart > 0) {
    const beforeCode = code.substring(0, codeStart).trim();
    if (beforeCode.length > 0 && !beforeCode.startsWith('#')) {
      code = code.substring(codeStart);
      changes.push('Removed prose before code');
    }
  }

  if (code.includes('#version')) {
    code = code.replace(/^\s*#version\s+\d+\s+\w+\s*;?\s*$/gm, '');
    changes.push('Removed #version directive');
  }

  if (code.includes('#ifdef GL_ES')) {
    code = code.replace(/#ifdef\s+GL_ES[\s\S]*?#endif\s*/g, '');
    changes.push('Removed #ifdef GL_ES block');
  }

  const precisionCount = (code.match(/^\s*precision\s+\w+\s+\w+\s*;\s*$/gm) || []).length;
  if (precisionCount > 1) {
    let foundFirst = false;
    code = code.replace(/^\s*precision\s+\w+\s+\w+\s*;\s*$/gm, (match) => {
      if (!foundFirst) {
        foundFirst = true;
        return match;
      }
      return '';
    });
    changes.push('Removed duplicate precision declarations');
  }

  const autoUniformNames = RENDERER_CAPABILITIES.autoUniforms.map((u) => u.name);
  for (const uniformName of autoUniformNames) {
    const regex = new RegExp(`^\\s*uniform\\s+\\w+\\s+${uniformName}\\s*;\\s*$`, 'gm');
    if (regex.test(code)) {
      code = code.replace(regex, '');
      changes.push(`Removed duplicate uniform declaration: ${uniformName}`);
    }
  }

  const defines: string[] = [];
  const lines = code.split('\n');
  const nonDefineLines: string[] = [];
  let precisionIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#define')) {
      defines.push(lines[i]);
    } else {
      nonDefineLines.push(lines[i]);
      if (line.startsWith('precision') && precisionIndex === -1) {
        precisionIndex = nonDefineLines.length - 1;
      }
    }
  }

  if (defines.length > 0) {
    const firstDefineLine = lines.findIndex((l) => l.trim().startsWith('#define'));
    const firstUsageLine = lines.findIndex((l, i) => {
      if (i === firstDefineLine) return false;
      for (const def of defines) {
        const match = def.match(/#define\s+(\w+)/);
        if (match && l.includes(match[1])) return true;
      }
      return false;
    });

    if (firstDefineLine > firstUsageLine && firstUsageLine !== -1) {
      const defineBlock = defines.join('\n');
      const nonDefineCode = nonDefineLines.join('\n');

      if (precisionIndex !== -1) {
        const beforePrecision = nonDefineLines.slice(0, precisionIndex + 1).join('\n');
        const afterPrecision = nonDefineLines.slice(precisionIndex + 1).join('\n');
        code = beforePrecision + '\n\n' + defineBlock + '\n\n' + afterPrecision;
      } else {
        code = defineBlock + '\n\n' + nonDefineCode;
      }
      changes.push('Moved #define directives to top of file');
    }
  }

  const originalLength = code.length;
  code = code.replace(/\n{3,}/g, '\n\n');
  if (code.length < originalLength) {
    changes.push('Cleaned up extra blank lines');
  }

  code = code.trim();

  if (!code.startsWith('precision') && !code.startsWith('//') && !code.startsWith('/*') && !code.startsWith('#define')) {
    code = 'precision mediump float;\n\n' + code;
    changes.push('Added precision declaration');
  }

  return { code, changes };
}

export function extractGLSLFromResponse(response: string): string | null {
  const fenceMatch = response.match(/```(?:glsl|c|cpp)?\s*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const mainImageRegex = /void\s+mainImage\s*\([\s\S]*?\{[\s\S]*?\n\}/;
  const mainImageMatch = response.match(mainImageRegex);
  if (mainImageMatch) {
    const mainImageIndex = response.indexOf(mainImageMatch[0]);
    const beforeMain = response.substring(0, mainImageIndex).trim();
    if (beforeMain.includes('precision') || beforeMain.includes('struct') || beforeMain.includes('float')) {
      return beforeMain + '\n\n' + mainImageMatch[0];
    }
    return mainImageMatch[0];
  }

  if (response.includes('void mainImage') ||
      (response.includes('precision') && response.includes('void'))) {
    return response.trim();
  }

  return null;
}
