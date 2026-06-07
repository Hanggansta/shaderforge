/**
 * Manual-fix prompt builder — pure helper used by AIChatPanel when the
 * 3-attempt compile-fix loop exhausts. The user gets a "manual fix"
 * button that prefills the input box with the last compile error so
 * they can describe what to do differently and re-send.
 *
 * Extracted as a pure function so it can be tested in isolation
 * (the rest of AIChatPanel is React component logic).
 */

export interface ManualFixInput {
  /** The original user prompt that produced the failed run. */
  userPrompt: string;
  /** Pre-formatted, multi-line error summary (one error per line). */
  errorSummary: string;
}

export interface ManualFixOutput {
  /** The text to drop into the input box. */
  inputText: string;
  /** Cursor offset where the user's follow-up starts (after the prefix). */
  cursorOffset: number;
}

const PREFIX = '[Last compile error]';
const BODY_SEPARATOR = '\n\n';
const PROMPT_HEADER = 'What should I do differently?';
const PROMPT_HEADER_NEWLINES = '\n\n';

export function buildManualFixPrompt(input: ManualFixInput): ManualFixOutput {
  const trimmedError = input.errorSummary.trim();
  const inputText =
    `${PREFIX}\n${trimmedError}${BODY_SEPARATOR}${PROMPT_HEADER}${PROMPT_HEADER_NEWLINES}`;
  // Cursor lands on the line right after "What should I do differently?\n\n"
  return {
    inputText,
    cursorOffset: inputText.length,
  };
}
