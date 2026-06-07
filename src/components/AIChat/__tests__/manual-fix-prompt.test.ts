/**
 * buildManualFixPrompt tests — pure helper, no React.
 */

import { describe, it, expect } from 'vitest';
import { buildManualFixPrompt } from '../manual-fix-prompt';

describe('buildManualFixPrompt', () => {
  it('prefixes the input with [Last compile error] and the error summary', () => {
    const out = buildManualFixPrompt({
      userPrompt: 'a black hole',
      errorSummary: "Line 5: 'undeclared identifier foo'",
    });
    expect(out.inputText).toContain('[Last compile error]');
    expect(out.inputText).toContain("Line 5: 'undeclared identifier foo'");
  });

  it('ends with a "What should I do differently?" follow-up prompt', () => {
    const out = buildManualFixPrompt({
      userPrompt: 'a black hole',
      errorSummary: "Line 5: 'undeclared identifier foo'",
    });
    expect(out.inputText).toMatch(/What should I do differently\?\s*$/);
  });

  it('cursor offset points to the end (user types after the prefix)', () => {
    const out = buildManualFixPrompt({
      userPrompt: 'p',
      errorSummary: 'e',
    });
    expect(out.cursorOffset).toBe(out.inputText.length);
  });

  it('trims whitespace around the error summary', () => {
    const out = buildManualFixPrompt({
      userPrompt: 'p',
      errorSummary: '\n  Line 1: error one  \n  Line 2: error two  \n',
    });
    expect(out.inputText).toContain('Line 1: error one  \n  Line 2: error two');
    // No leading whitespace right after the prefix label
    expect(out.inputText).not.toMatch(/\[Last compile error\]\n\s/);
  });

  it('handles a multi-line error summary', () => {
    const out = buildManualFixPrompt({
      userPrompt: 'p',
      errorSummary: 'Line 1: e1\nLine 2: e2',
    });
    expect(out.inputText).toContain('Line 1: e1');
    expect(out.inputText).toContain('Line 2: e2');
  });
});
