import { describe, it, expect, vi } from 'vitest';
import { parseIntent } from '../intent/parse-intent';
import type { AIProvider } from '../adapter';

function mockProvider(response: string): AIProvider {
  return {
    name: 'test',
    isConfigured: () => true,
    configure: () => {},
    generateShader: vi.fn(),
    modifyShader: vi.fn(),
    fixShader: vi.fn(),
    explainShader: vi.fn(),
    chatCompletion: vi.fn().mockResolvedValue(response),
  };
}

function throwingProvider(): AIProvider {
  return {
    name: 'test',
    isConfigured: () => true,
    configure: () => {},
    generateShader: vi.fn(),
    modifyShader: vi.fn(),
    fixShader: vi.fn(),
    explainShader: vi.fn(),
    chatCompletion: vi.fn().mockRejectedValue(new Error('API error')),
  };
}

describe('parseIntent', () => {
  it('resolves create from a create prompt', async () => {
    const provider = mockProvider('{"intent":"create","confidence":0.95,"reason":"New shader from scratch"}');
    const result = await parseIntent('Create a nebula shader', provider, { hasCode: false });
    expect(result.intent).toBe('create');
    expect(result.confidence).toBe(0.95);
    expect(result.needsCurrentCode).toBe(false);
    expect(result.shouldAskClarifyingQuestion).toBe(false);
  });

  it('resolves modify from a modify prompt with code', async () => {
    const provider = mockProvider('{"intent":"modify","confidence":0.9,"reason":"Changing existing shader"}');
    const result = await parseIntent('Make it slower', provider, { hasCode: true });
    expect(result.intent).toBe('modify');
    expect(result.confidence).toBe(0.9);
    expect(result.needsCurrentCode).toBe(true);
  });

  it('resolves modify from a Chinese modify prompt', async () => {
    const provider = mockProvider('{"intent":"modify","confidence":0.85,"reason":"User wants to change speed"}');
    const result = await parseIntent('慢一点', provider, { hasCode: true });
    expect(result.intent).toBe('modify');
    expect(result.needsCurrentCode).toBe(true);
  });

  it('resolves explain from an explain prompt', async () => {
    const provider = mockProvider('{"intent":"explain","confidence":0.95,"reason":"User wants explanation"}');
    const result = await parseIntent('Explain this shader', provider, { hasCode: true });
    expect(result.intent).toBe('explain');
    expect(result.needsCurrentCode).toBe(true);
  });

  it('resolves fix from a fix prompt', async () => {
    const provider = mockProvider('{"intent":"fix","confidence":0.9,"reason":"User has errors"}');
    const result = await parseIntent('Fix the errors', provider, { hasCode: true });
    expect(result.intent).toBe('fix');
    expect(result.needsCurrentCode).toBe(true);
  });

  it('resolves optimize from an optimize prompt', async () => {
    const provider = mockProvider('{"intent":"optimize","confidence":0.85,"reason":"Performance improvement"}');
    const result = await parseIntent('Optimize for performance', provider, { hasCode: true });
    expect(result.intent).toBe('optimize');
    expect(result.needsCurrentCode).toBe(true);
  });

  it('forces create when no code and LLM returns modify (safety guard)', async () => {
    const provider = mockProvider('{"intent":"modify","confidence":0.3,"reason":"Ambiguous"}');
    const result = await parseIntent('something', provider, { hasCode: false });
    // Safety: no code + modify intent → forced to create
    expect(result.intent).toBe('create');
    expect(result.confidence).toBe(0.3);
    expect(result.shouldAskClarifyingQuestion).toBe(true);
  });

  it('flags low confidence with code for clarification', async () => {
    const provider = mockProvider('{"intent":"modify","confidence":0.4,"reason":"Not sure"}');
    const result = await parseIntent('do something', provider, { hasCode: true });
    expect(result.shouldAskClarifyingQuestion).toBe(true);
    expect(result.confidence).toBe(0.4);
  });

  it('does not flag high confidence for clarification', async () => {
    const provider = mockProvider('{"intent":"create","confidence":0.9,"reason":"Clear"}');
    const result = await parseIntent('create a nebula', provider, { hasCode: false });
    expect(result.shouldAskClarifyingQuestion).toBe(false);
  });

  it('does not flag exact 0.5 confidence for clarification', async () => {
    const provider = mockProvider('{"intent":"modify","confidence":0.5,"reason":"Borderline"}');
    const result = await parseIntent('change it', provider, { hasCode: true });
    expect(result.shouldAskClarifyingQuestion).toBe(false);
  });

  it('falls back to create on API failure with no code', async () => {
    const provider = throwingProvider();
    const result = await parseIntent('Create a shader', provider, { hasCode: false });
    expect(result.intent).toBe('create');
    expect(result.confidence).toBe(0.3);
    expect(result.reason).toContain('Could not determine');
    expect(result.shouldAskClarifyingQuestion).toBe(false); // fallback is safe
  });

  it('falls back to modify on API failure with code', async () => {
    const provider = throwingProvider();
    const result = await parseIntent('Make it better', provider, { hasCode: true });
    expect(result.intent).toBe('modify');
    expect(result.confidence).toBe(0.3);
    expect(result.shouldAskClarifyingQuestion).toBe(false); // fallback is safe
  });

  it('falls back on invalid JSON response', async () => {
    const provider = mockProvider('Sorry, I cannot parse that.');
    const result = await parseIntent('do something', provider, { hasCode: false });
    expect(result.intent).toBe('create');
    expect(result.confidence).toBe(0.3);
  });

  it('extracts JSON from markdown-wrapped response', async () => {
    const provider = mockProvider('Here is the result: {"intent":"modify","confidence":0.8,"reason":"changing speed"}');
    const result = await parseIntent('Make it slower', provider, { hasCode: true });
    expect(result.intent).toBe('modify');
    expect(result.confidence).toBe(0.8);
  });

  it('forces create when no code and LLM returns modify', async () => {
    const provider = mockProvider('{"intent":"modify","confidence":0.9,"reason":"Change something"}');
    const result = await parseIntent('Make it slower', provider, { hasCode: false });
    expect(result.intent).toBe('create');
    expect(result.needsCurrentCode).toBe(false);
  });

  it('forces create when no code and LLM returns fix', async () => {
    const provider = mockProvider('{"intent":"fix","confidence":0.9,"reason":"Fix errors"}');
    const result = await parseIntent('Fix the errors', provider, { hasCode: false });
    expect(result.intent).toBe('create');
  });

  it('forces create when no code and LLM returns optimize', async () => {
    const provider = mockProvider('{"intent":"optimize","confidence":0.9,"reason":"Optimize"}');
    const result = await parseIntent('Optimize it', provider, { hasCode: false });
    expect(result.intent).toBe('create');
  });

  it('allows create when code exists and user asks for new scene', async () => {
    const provider = mockProvider('{"intent":"create","confidence":0.95,"reason":"New scene"}');
    const result = await parseIntent('Create a completely new nebula shader', provider, { hasCode: true });
    expect(result.intent).toBe('create');
    expect(result.needsCurrentCode).toBe(false);
  });

  it('never returns auto as intent', async () => {
    const provider = mockProvider('{"intent":"auto","confidence":0.9,"reason":"test"}');
    const result = await parseIntent('test', provider, { hasCode: false });
    // 'auto' is not in INTENT_MAP, so it falls back
    expect(result.intent).not.toBe('auto');
  });

  it('falls back on unknown intent value', async () => {
    const provider = mockProvider('{"intent":"unknown_intent","confidence":0.9,"reason":"test"}');
    const result = await parseIntent('test', provider, { hasCode: false });
    expect(result.intent).toBe('create'); // fallback for no code
  });

  it('uses only one system message at index 0', async () => {
    const provider = mockProvider('{"intent":"create","confidence":0.9,"reason":"test"}');
    await parseIntent('test', provider, { hasCode: false });
    const call = (provider.chatCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call).toHaveLength(2);
    expect(call[0].role).toBe('system');
    expect(call[1].role).toBe('user');
  });
});
