/**
 * Generates user-friendly clarification messages for low-confidence Auto intent.
 * Pure function — no LLM calls, no side effects.
 */

/**
 * Generate a clarification message when Auto intent confidence is low.
 * @param hasCode - Whether the user has shader code in the editor
 * @returns A friendly, actionable clarification message
 */
export function generateClarificationMessage(hasCode: boolean): string {
  if (hasCode) {
    return [
      "I'm not quite sure what you'd like to do with your current shader.",
      '',
      'You can try:',
      '  Create a new shader  —  "Create a nebula with purple glow"',
      '  Modify the current one  —  "Make it slower" or "更蓝一点"',
      '  Explain it  —  "Explain this shader"',
      '  Fix errors  —  "Fix the compilation errors"',
      '  Optimize it  —  "Optimize for better performance"',
      '',
      'Or select a specific intent above the input field.',
    ].join('\n');
  }

  return [
    "I'm not sure what kind of shader you'd like.",
    '',
    'Try describing what you want to see:',
    '  "Create a dreamy purple nebula with slow flowing motion"',
    '  "Generate a neon cyberpunk cityscape"',
    '  "Make a simple ocean wave shader"',
    '',
    'Or select an intent mode above the input field.',
  ].join('\n');
}
