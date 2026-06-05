/**
 * WebGL Error Analyzer
 * Classifies and normalizes WebGL compilation errors.
 */

export interface AnalyzedError {
  line: number;
  column: number;
  rawMessage: string;
  errorType: string;
  possibleCause: string;
  fixDirection: string;
}

export interface AnalysisResult {
  errors: AnalyzedError[];
  summary: string;
}

export function analyzeShaderErrors(errorLog: string): AnalysisResult {
  const errors: AnalyzedError[] = [];
  const lines = errorLog.split('\n');

  for (const line of lines) {
    const parsed = parseErrorLine(line);
    if (parsed) errors.push(parsed);
  }

  return { errors, summary: generateSummary(errors) };
}

function parseErrorLine(line: string): AnalyzedError | null {
  const patterns = [
    /ERROR:\s*(\d+):(\d+):\s*(.+)/,
    /(\d+):(\d+)\(\d+\):\s*(.+)/,
    /(\d+):\s*(.+)/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const col = match[2] ? parseInt(match[2], 10) : 0;
      const message = match[match.length - 1].trim();
      return {
        line: lineNum,
        column: col,
        rawMessage: message,
        errorType: classifyError(message),
        possibleCause: diagnoseCause(message),
        fixDirection: suggestFix(message),
      };
    }
  }
  return null;
}

function classifyError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('undeclared identifier') || msg.includes('not declared')) return 'undeclared_identifier';
  if (msg.includes('syntax error')) return 'syntax_error';
  if (msg.includes('cannot convert') || msg.includes('conversion')) return 'type_conversion';
  if (msg.includes('dimension mismatch')) return 'dimension_mismatch';
  if (msg.includes('redefinition') || msg.includes('redefining')) return 'redefinition';
  if (msg.includes('overload')) return 'function_overload';
  if (msg.includes('no matching function')) return 'no_matching_function';
  if (msg.includes('undefined')) return 'undefined';
  if (msg.includes('expected')) return 'unexpected_token';
  if (msg.includes('precision')) return 'precision_error';
  return 'unknown';
}

function diagnoseCause(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('undeclared identifier')) return 'Variable, function, or type used without being defined first';
  if (msg.includes('syntax error')) return 'Missing semicolon, brace, or incorrect syntax';
  if (msg.includes('cannot convert')) return 'Type mismatch - assigning wrong type to variable';
  if (msg.includes('dimension mismatch')) return 'Vector dimensions do not match (e.g., vec2 vs vec3)';
  if (msg.includes('redefinition')) return 'Function or variable defined multiple times, or redefining a built-in';
  if (msg.includes('no matching function')) return 'Function called with wrong argument types or count';
  return 'Unknown cause';
}

function suggestFix(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('undeclared identifier')) {
    const idMatch = message.match(/'(\w+)'/);
    const id = idMatch ? idMatch[1] : 'the identifier';
    const knownConstants: Record<string, string> = {
      'PI': '#define PI 3.14159265359 (place at top of file, before any usage)',
      'TWO_PI': '#define TWO_PI 6.28318530718 (place at top of file)',
      'HALF_PI': '#define HALF_PI 1.57079632679 (place at top of file)',
      'EPSILON': '#define EPSILON 0.0001 (place at top of file)',
    };
    if (knownConstants[id]) {
      return `Add definition: ${knownConstants[id]}. Make sure it's placed BEFORE line where it's used.`;
    }
    return `Define ${id} before using it. If it's a constant, add '#define ${id} value' at the top. If it's a struct, add 'struct ${id} { ... };'. If it's a variable, add 'vec3 ${id} = ...;'. If it's a function, define it before calling.`;
  }
  if (msg.includes('syntax error')) return 'Check for missing semicolons, unclosed braces, or incorrect operator usage.';
  if (msg.includes('cannot convert')) return 'Add explicit type conversion: vec3(x, y, z) or float(x).';
  if (msg.includes('dimension mismatch')) return 'Ensure vector dimensions match. Use .xy, .xyz, etc. to swizzle.';
  if (msg.includes('redefinition')) return 'Remove the duplicate definition. If redefining a built-in function (reflect, normalize, etc.), delete your custom version.';
  if (msg.includes('no matching function')) return 'Check function signature - argument types and count must match.';
  return 'Review the code around this line for syntax or type issues.';
}

function generateSummary(errors: AnalyzedError[]): string {
  if (errors.length === 0) return 'No errors found.';
  const typeCounts: Record<string, number> = {};
  for (const error of errors) {
    typeCounts[error.errorType] = (typeCounts[error.errorType] || 0) + 1;
  }
  const parts = Object.entries(typeCounts).map(([type, count]) => {
    const readable = type.replace(/_/g, ' ');
    return `${count} ${readable}`;
  });
  return `${errors.length} error(s): ${parts.join(', ')}`;
}

export function formatErrorsForAI(errors: AnalyzedError[]): string {
  return errors.map((e) =>
    `Line ${e.line}: [${e.errorType}] ${e.rawMessage}\n` +
    `  Cause: ${e.possibleCause}\n` +
    `  Fix: ${e.fixDirection}`
  ).join('\n\n');
}
