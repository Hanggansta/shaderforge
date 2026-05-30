import { describe, it, expect } from 'vitest';
import { normalizeProviderError } from '../errors/provider-errors';

describe('normalizeProviderError', () => {
  describe('missing API key', () => {
    it('handles "API key missing"', () => {
      const result = normalizeProviderError(new Error('API key missing'));
      expect(result.title).toBe('API key required');
      expect(result.retryable).toBe(false);
      expect(result.actionHint).toBeDefined();
      expect(result.title).not.toContain('API key missing');
    });

    it('handles "API key not set"', () => {
      const result = normalizeProviderError(new Error('API key not set'));
      expect(result.title).toBe('API key required');
      expect(result.retryable).toBe(false);
    });

    it('handles "API key not configured"', () => {
      const result = normalizeProviderError(new Error('Provider not configured: API key not configured'));
      expect(result.title).toBe('API key required');
      expect(result.retryable).toBe(false);
    });
  });

  describe('401 / unauthorized', () => {
    it('handles HTTP 401', () => {
      const result = normalizeProviderError(new Error('API error (401): Unauthorized'));
      expect(result.title).toBe('Invalid API key');
      expect(result.retryable).toBe(false);
      expect(result.actionHint).toBeDefined();
    });

    it('handles "unauthorized" keyword', () => {
      const result = normalizeProviderError(new Error('Request unauthorized'));
      expect(result.title).toBe('Invalid API key');
      expect(result.retryable).toBe(false);
    });

    it('handles "invalid api key"', () => {
      const result = normalizeProviderError(new Error('Invalid API key provided'));
      expect(result.title).toBe('Invalid API key');
      expect(result.retryable).toBe(false);
    });
  });

  describe('403 forbidden', () => {
    it('handles HTTP 403', () => {
      const result = normalizeProviderError(new Error('API error (403): Forbidden'));
      expect(result.title).toBe('Access denied');
      expect(result.retryable).toBe(false);
      expect(result.actionHint).toBeDefined();
      expect(result.actionHint).toContain('permissions');
    });
  });

  describe('429 rate limit', () => {
    it('handles HTTP 429', () => {
      const result = normalizeProviderError(new Error('API error (429): Too Many Requests'));
      expect(result.title).toBe('Rate limited');
      expect(result.retryable).toBe(true);
    });

    it('handles "rate limit" keyword', () => {
      const result = normalizeProviderError(new Error('Rate limit exceeded'));
      expect(result.title).toBe('Rate limited');
      expect(result.retryable).toBe(true);
    });
  });

  describe('network failures', () => {
    it('handles "Failed to fetch"', () => {
      const result = normalizeProviderError(new Error('Failed to fetch'));
      expect(result.title).toBe('Connection failed');
      expect(result.retryable).toBe(true);
      expect(result.actionHint).toBeDefined();
    });

    it('handles "NetworkError"', () => {
      const result = normalizeProviderError(new Error('NetworkError when attempting to fetch resource'));
      expect(result.title).toBe('Connection failed');
      expect(result.retryable).toBe(true);
    });

    it('handles ERR_CONNECTION_CLOSED', () => {
      const result = normalizeProviderError(new Error('net::ERR_CONNECTION_CLOSED'));
      expect(result.title).toBe('Connection closed');
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('temporary');
    });

    it('handles "socket hang up"', () => {
      const result = normalizeProviderError(new Error('socket hang up'));
      expect(result.title).toBe('Connection closed');
      expect(result.retryable).toBe(true);
    });
  });

  describe('timeout', () => {
    it('handles "timeout"', () => {
      const result = normalizeProviderError(new Error('Request timeout after 30000ms'));
      expect(result.title).toBe('Request timed out');
      expect(result.retryable).toBe(true);
    });

    it('handles "timed out"', () => {
      const result = normalizeProviderError(new Error('The operation timed out'));
      expect(result.title).toBe('Request timed out');
      expect(result.retryable).toBe(true);
    });

    it('handles "aborted"', () => {
      const result = normalizeProviderError(new Error('The operation was aborted'));
      expect(result.title).toBe('Request timed out');
      expect(result.retryable).toBe(true);
    });
  });

  describe('invalid model', () => {
    it('handles "model not found"', () => {
      const result = normalizeProviderError(new Error('Model not found: gpt-99'));
      expect(result.title).toBe('Invalid model');
      expect(result.retryable).toBe(false);
      expect(result.actionHint).toBeDefined();
    });

    it('handles "model does not exist"', () => {
      const result = normalizeProviderError(new Error('The model does not exist'));
      expect(result.title).toBe('Invalid model');
      expect(result.retryable).toBe(false);
    });
  });

  describe('invalid base URL', () => {
    it('handles "ENOTFOUND"', () => {
      const result = normalizeProviderError(new Error('getaddrinfo ENOTFOUND api.example.com'));
      expect(result.title).toBe('Invalid server address');
      expect(result.retryable).toBe(false);
      expect(result.actionHint).toBeDefined();
    });

    it('handles "invalid url"', () => {
      const result = normalizeProviderError(new Error('Invalid URL: not-a-url'));
      expect(result.title).toBe('Invalid server address');
      expect(result.retryable).toBe(false);
    });
  });

  describe('5xx server errors', () => {
    it('handles HTTP 500', () => {
      const result = normalizeProviderError(new Error('API error (500): Internal Server Error'));
      expect(result.title).toBe('Server error');
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('500');
    });

    it('handles HTTP 502', () => {
      const result = normalizeProviderError(new Error('API error (502): Bad Gateway'));
      expect(result.title).toBe('Server error');
      expect(result.retryable).toBe(true);
    });

    it('handles HTTP 503', () => {
      const result = normalizeProviderError(new Error('API error (503): Service Unavailable'));
      expect(result.title).toBe('Server error');
      expect(result.retryable).toBe(true);
    });
  });

  describe('generic fallback', () => {
    it('handles unknown error', () => {
      const result = normalizeProviderError(new Error('Something went wrong'));
      expect(result.title).toBe('Generation failed');
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Something went wrong');
    });

    it('truncates long messages', () => {
      const longMessage = 'A'.repeat(200);
      const result = normalizeProviderError(new Error(longMessage));
      expect(result.title).toBe('Generation failed');
      expect(result.message.length).toBeLessThanOrEqual(120);
      expect(result.message).toContain('...');
    });

    it('handles non-Error values', () => {
      const result = normalizeProviderError('string error');
      expect(result.title).toBe('Generation failed');
      expect(result.message).toBe('string error');
      expect(result.retryable).toBe(true);
    });

    it('handles null/undefined', () => {
      const result = normalizeProviderError(null);
      expect(result.title).toBe('Generation failed');
      expect(result.retryable).toBe(true);
    });
  });

  describe('no raw message in title', () => {
    it('titles are always user-friendly, not raw error text', () => {
      const cases = [
        'Failed to fetch',
        'net::ERR_CONNECTION_CLOSED',
        'API error (401): Unauthorized',
        'Rate limit exceeded',
        'Model not found: gpt-99',
        'getaddrinfo ENOTFOUND api.example.com',
        'API error (500): Internal Server Error',
      ];

      for (const raw of cases) {
        const result = normalizeProviderError(new Error(raw));
        // Title should not be the raw error message
        expect(result.title).not.toBe(raw);
        // Title should be short and friendly
        expect(result.title.length).toBeLessThan(30);
      }
    });
  });
});
