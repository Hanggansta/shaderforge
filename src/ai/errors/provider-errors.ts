/**
 * Normalize raw provider/API errors into user-friendly messages.
 * No LLM calls — pure string matching.
 */

export interface ProviderError {
  title: string;
  message: string;
  actionHint?: string;
  retryable: boolean;
}

/**
 * Normalize a raw error (from fetch, provider, or agent loop) into a user-friendly ProviderError.
 */
export function normalizeProviderError(error: unknown): ProviderError {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  // Missing API key
  if (lower.includes('api key') && (lower.includes('missing') || lower.includes('not set') || lower.includes('not configured'))) {
    return {
      title: 'API key required',
      message: 'Add your API key in Settings to generate shaders.',
      actionHint: 'Open AI Settings (⚙️) and enter your API key.',
      retryable: false,
    };
  }

  // Unauthorized / invalid key
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('invalid_api_key')) {
    return {
      title: 'Invalid API key',
      message: 'Your API key was rejected. Check that it is correct and still active.',
      actionHint: 'Update your key in AI Settings (⚙️).',
      retryable: false,
    };
  }

  // Rate limit
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      title: 'Rate limited',
      message: 'Too many requests. Wait a moment and try again.',
      retryable: true,
    };
  }

  // Network failures
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return {
      title: 'Connection failed',
      message: 'Could not reach the API server. Check your internet connection.',
      actionHint: 'Verify your network and base URL, then retry.',
      retryable: true,
    };
  }

  if (lower.includes('err_connection_closed') || lower.includes('connection closed') || lower.includes('socket hang up')) {
    return {
      title: 'Connection closed',
      message: 'The server closed the connection unexpectedly. This is usually temporary.',
      retryable: true,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return {
      title: 'Request timed out',
      message: 'The API took too long to respond. The server may be overloaded.',
      retryable: true,
    };
  }

  // Invalid model
  if (lower.includes('model') && (lower.includes('not found') || lower.includes('invalid') || lower.includes('does not exist'))) {
    return {
      title: 'Invalid model',
      message: 'The selected model is not available. Check the model name in settings.',
      actionHint: 'Verify the model name in AI Settings (⚙️).',
      retryable: false,
    };
  }

  // Invalid base URL
  if (lower.includes('base url') || lower.includes('invalid url') || lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return {
      title: 'Invalid server address',
      message: 'Could not connect to the API server at the configured URL.',
      actionHint: 'Check the Base URL in AI Settings (⚙️).',
      retryable: false,
    };
  }

  // HTTP status codes
  const statusMatch = raw.match(/(\d{3})/);
  if (statusMatch) {
    const code = parseInt(statusMatch[1]);
    if (code >= 500) {
      return {
        title: 'Server error',
        message: `The API server returned an error (${code}). This is usually temporary.`,
        retryable: true,
      };
    }
    if (code === 403) {
      return {
        title: 'Access denied',
        message: 'Your API key does not have permission for this operation.',
        actionHint: 'Check your API key permissions in your provider dashboard.',
        retryable: false,
      };
    }
  }

  // Generic fallback
  return {
    title: 'Generation failed',
    message: raw.length > 120 ? raw.substring(0, 117) + '...' : raw,
    retryable: true,
  };
}
