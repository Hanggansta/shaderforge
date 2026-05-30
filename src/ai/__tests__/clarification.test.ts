import { describe, it, expect } from 'vitest';
import { generateClarificationMessage } from '../intent/clarification';

describe('generateClarificationMessage', () => {
  describe('with existing code', () => {
    it('mentions current shader exists', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('current shader');
    });

    it('suggests modify examples', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('Make it slower');
      expect(msg).toContain('更蓝一点');
    });

    it('suggests explain option', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('Explain');
    });

    it('suggests create option', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('Create');
    });

    it('suggests fix option', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('Fix');
    });

    it('suggests optimize option', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('Optimize');
    });

    it('mentions intent selector', () => {
      const msg = generateClarificationMessage(true);
      expect(msg).toContain('intent');
    });

    it('does not mention creating new shader as primary action', () => {
      const msg = generateClarificationMessage(true);
      // Should not just say "describe the shader you'd like to create"
      expect(msg).not.toContain('what kind of shader');
    });
  });

  describe('without existing code', () => {
    it('asks what kind of shader', () => {
      const msg = generateClarificationMessage(false);
      expect(msg).toContain('shader');
    });

    it('provides example prompts', () => {
      const msg = generateClarificationMessage(false);
      expect(msg).toContain('nebula');
      expect(msg).toContain('cyberpunk');
    });

    it('mentions intent selector', () => {
      const msg = generateClarificationMessage(false);
      expect(msg).toContain('intent');
    });

    it('does not mention modifying current shader', () => {
      const msg = generateClarificationMessage(false);
      expect(msg).not.toContain('current shader');
    });
  });

  describe('common properties', () => {
    it('returns non-empty string for both cases', () => {
      expect(generateClarificationMessage(true).length).toBeGreaterThan(0);
      expect(generateClarificationMessage(false).length).toBeGreaterThan(0);
    });

    it('messages are different for with/without code', () => {
      const withCode = generateClarificationMessage(true);
      const withoutCode = generateClarificationMessage(false);
      expect(withCode).not.toBe(withoutCode);
    });

    it('both messages are actionable (contain examples)', () => {
      const withCode = generateClarificationMessage(true);
      const withoutCode = generateClarificationMessage(false);
      // Should contain quoted example prompts
      expect(withCode).toContain('"');
      expect(withoutCode).toContain('"');
    });

    it('both messages mention intent selector', () => {
      const withCode = generateClarificationMessage(true);
      const withoutCode = generateClarificationMessage(false);
      expect(withCode).toContain('intent');
      expect(withoutCode).toContain('intent');
    });
  });
});
