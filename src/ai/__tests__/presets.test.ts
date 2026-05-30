import { describe, it, expect } from 'vitest';
import { PRESETS } from '../presets';

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Features not supported by our single-pass Shadertoy pipeline
const UNSUPPORTED = [
  /\btexture\b/i,
  /\biChannel\b/i,
  /\bsampler2D\b/i,
  /\bmultipass\b/i,
  /\bbuffer\b/i,
];

// Words that suggest modify/fix/explain rather than create
const NOT_CREATION_ORIENTED = [
  /\bfix\b/i,
  /\bmodify\b/i,
  /\bchange\b/i,
  /\bexplain\b/i,
  /\boptimize\b/i,
  /\bdebug\b/i,
  /\bupdate\b/i,
  /\breplace\b/i,
  /\bremove\b/i,
  /\bdelete\b/i,
];

describe('PRESETS catalog', () => {
  it('has at least 8 presets', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(8);
  });

  describe('each preset', () => {
    PRESETS.forEach((preset) => {
      describe(`"${preset.id}"`, () => {
        it('has unique id', () => {
          const duplicates = PRESETS.filter((p) => p.id === preset.id);
          expect(duplicates).toHaveLength(1);
        });

        it('id is kebab-case', () => {
          expect(preset.id).toMatch(KEBAB_CASE);
        });

        it('title is non-empty', () => {
          expect(preset.title.trim()).toBeTruthy();
        });

        it('description is non-empty', () => {
          expect(preset.description.trim()).toBeTruthy();
        });

        it('prompt is non-empty', () => {
          expect(preset.prompt.trim()).toBeTruthy();
        });

        it('prompt length is reasonable (10-200 chars)', () => {
          expect(preset.prompt.length).toBeGreaterThanOrEqual(10);
          expect(preset.prompt.length).toBeLessThanOrEqual(200);
        });

        it('tags array is non-empty', () => {
          expect(preset.tags.length).toBeGreaterThan(0);
        });

        it('icon is valid if present', () => {
          if (preset.icon !== undefined) {
            expect(preset.icon.trim()).toBeTruthy();
          }
        });

        it('does not reference unsupported features', () => {
          for (const pattern of UNSUPPORTED) {
            expect(preset.prompt).not.toMatch(pattern);
          }
        });

        it('is creation-oriented', () => {
          for (const pattern of NOT_CREATION_ORIENTED) {
            expect(preset.prompt).not.toMatch(pattern);
          }
        });
      });
    });
  });
});
