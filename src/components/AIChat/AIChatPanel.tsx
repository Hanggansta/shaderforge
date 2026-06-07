import { useState, useCallback, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAIStore, type ChatMessage } from '../../store/aiStore';
import { shaderAgent } from '../../shader-agent/integration/service';
import type { AgentProgress } from '../../shader-agent/integration/agent-result-types';
import { normalizeProviderError } from '../../shader-agent/integration/types/provider-errors';
import { PRESETS } from '../../shader-agent/presets';
import { SettingsPanel } from '../Settings/SettingsPanel';
import type { AIIntent } from '../../shader-agent/integration/types/ai-provider';
import { buildManualFixPrompt, type ManualFixInput } from './manual-fix-prompt';

interface FailedContext {
  prompt: string;
  errorSummary: string;
}

const INTENTS: { id: AIIntent; label: string; icon: string }[] = [
  { id: 'auto', label: 'Auto', icon: '🤖' },
  { id: 'create', label: 'Create', icon: '✨' },
  { id: 'modify', label: 'Modify', icon: '✏️' },
  { id: 'fix', label: 'Fix Error', icon: '🔧' },
  { id: 'explain', label: 'Explain', icon: '📖' },
  { id: 'optimize', label: 'Optimize', icon: '⚡' },
];

interface ProgressStep {
  label: string;
  status: 'active' | 'done';
  details?: string;
}

const PROGRESS_LABELS: Record<string, string> = {
  generating: 'Generating shader',
  compiling: 'Compiling',
  fixing: 'Fixing errors',
  success: 'Done',
  failed: 'Failed',
};

function mapIntent(value: string | undefined): AIIntent {
  if (value === 'create' || value === 'modify' || value === 'fix' || value === 'explain' || value === 'optimize' || value === 'auto') {
    return value;
  }
  return 'auto';
}

export function AIChatPanel({ style }: { style?: React.CSSProperties } = {}) {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [lastFailedContext, setLastFailedContext] = useState<FailedContext | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const messages = useAIStore((s) => s.messages);
  const activeIntent = useAIStore((s) => s.activeIntent);
  const requestState = useAIStore((s) => s.requestState);
  const providerName = useAIStore((s) => s.providerName);
  const maxAttempts = useAIStore((s) => s.maxAttempts);
  const addMessage = useAIStore((s) => s.addMessage);
  const setActiveIntent = useAIStore((s) => s.setActiveIntent);
  const setRequestState = useAIStore((s) => s.setRequestState);
  const setLastError = useAIStore((s) => s.setLastError);

  const setCode = useEditorStore((s) => s.setCode);
  const setCodeFromAI = useEditorStore((s) => s.setCodeFromAI);
  const undoStack = useEditorStore((s) => s.undoStack);
  const popUndo = useEditorStore((s) => s.popUndo);

  const isLoading = requestState === 'loading';

  const handleProgress = useCallback((progress: AgentProgress) => {
    const baseLabel = PROGRESS_LABELS[progress.status] || progress.status;
    const label =
      progress.attempt > 0 && progress.maxAttempts > 0
        ? `${baseLabel} ${progress.attempt}/${progress.maxAttempts}`
        : baseLabel;
    const details = progress.details ?? progress.message;
    setProgressSteps((prev) => {
      const existing = prev.findIndex((s) => s.label === label);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = {
          ...next[existing],
          status: progress.status === 'success' || progress.status === 'failed' ? 'done' : 'active',
          details,
        };
        for (let i = 0; i < existing; i++) {
          next[i] = { ...next[i], status: 'done' };
        }
        return next;
      }
      return [
        ...prev.map((s) => ({ ...s, status: 'done' as const })),
        { label, status: 'active' as const, details },
      ];
    });
  }, []);

  const handleSend = useCallback(async (overridePrompt?: string, overrideIntent?: AIIntent) => {
    const prompt = overridePrompt ?? input;
    const intent = overrideIntent ?? activeIntent;

    if (!prompt.trim() || isLoading) return;

    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content: prompt,
      intent: intent,
    };

    addMessage(userMessage);
    if (!overridePrompt) setInput('');
    setRequestState('loading');
    setLastError(null);
    setProgressSteps([]);
    setLastFailedContext(null);

    try {
      const result = await shaderAgent.generateAsAgentResult(
        prompt,
        {
          onProgress: handleProgress,
          maxAttempts,
        }
      );

      const msgIntent: AIIntent = result.detectedIntent ?? intent;

      if (result.success && result.code) {
        const requestId = `ai-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
        setCodeFromAI(result.code, requestId);

        const attemptNote = result.attempts > 1
          ? ` (after ${result.attempts} attempts)`
          : '';

        addMessage({
          role: 'assistant',
          content: `Shader created${attemptNote}`,
          code: result.code,
          intent: msgIntent,
          detectedIntent: result.detectedIntent,
        });
        setLastFailedContext(null);
      } else {
        if (result.errors && result.errors.length > 0) {
          const errorSummary = result.errors
            .slice(0, 3)
            .map((e) => `Line ${e.line}: ${e.rawMessage}`)
            .join('\n');

          addMessage({
            role: 'system',
            content: `Generation failed after ${result.attempts} attempts.\n${errorSummary}\n\nTry simplifying your description or select a preset.`,
          });
          setLastFailedContext({ prompt, errorSummary });
        } else {
          addMessage({
            role: 'system',
            content: 'Generation failed. Please try again or check your API settings.',
          });
          setLastFailedContext({ prompt, errorSummary: 'No structured error captured.' });
        }
      }

      setRequestState('idle');
    } catch (error) {
      const providerError = normalizeProviderError(error);
      setLastError(providerError.message);
      setRequestState('error');

      const lines = [`${providerError.title}: ${providerError.message}`];
      if (providerError.actionHint) lines.push(providerError.actionHint);
      if (providerError.retryable) lines.push('This error may be temporary — try again.');

      addMessage({
        role: 'system',
        content: lines.join('\n'),
      });
    }
  }, [input, activeIntent, isLoading, maxAttempts, addMessage, setRequestState, setLastError, setCodeFromAI, handleProgress]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApplyCode = (code: string) => {
    setCode(code);
    addMessage({ role: 'system', content: 'Code applied to editor!' });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addMessage({ role: 'system', content: 'Code copied to clipboard!' });
  };

  const handleUndo = () => {
    const prev = popUndo();
    if (prev) {
      addMessage({ role: 'system', content: 'Restored previous shader.' });
    }
  };

  const handleCancel = () => {
    shaderAgent.cancel();
    setRequestState('cancelled');
    setProgressSteps([]);
    addMessage({ role: 'system', content: 'Request cancelled.' });
  };

  const handleRetry = useCallback(() => {
    if (!lastFailedContext || isLoading) return;
    void handleSend(lastFailedContext.prompt, activeIntent);
  }, [lastFailedContext, isLoading, handleSend, activeIntent]);

  const handleManualFix = useCallback(() => {
    if (!lastFailedContext) return;
    const fixInput: ManualFixInput = {
      userPrompt: lastFailedContext.prompt,
      errorSummary: lastFailedContext.errorSummary,
    };
    const { inputText, cursorOffset } = buildManualFixPrompt(fixInput);
    setInput(inputText);
    // Defer focus + caret positioning to the next tick so React commits the
    // new value to the textarea first.
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(cursorOffset, cursorOffset);
    });
  }, [lastFailedContext]);

  const toggleDetails = (msgId: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  return (
    <>
      <div className="ai-panel panel" style={style}>
        <div className="panel-header">
          <span className="panel-title">AI Copilot</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {providerName}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 2,
                fontSize: 14,
                lineHeight: 1,
              }}
              title="AI Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        <div className="panel-content">
          {providerName === 'Mock AI' && (
            <div style={{
              fontSize: 11,
              padding: '6px 10px',
              background: '#d2992220',
              color: '#d29922',
              borderRadius: 4,
              marginBottom: 8,
              lineHeight: 1.4,
            }}>
              Using <strong>mock AI</strong> — results are pre-built samples.
              Configure a real provider in Settings.
            </div>
          )}
          <div className="ai-messages">
            {!messages.some((m) => m.role === 'user') && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                padding: '8px 0',
              }}>
                <div style={{
                  gridColumn: '1 / -1',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                }}>
                  Try a preset to get started, or describe your own shader below.
                </div>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSend(preset.prompt, 'auto')}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '10px 6px',
                      background: 'var(--bg-secondary, #1e1e2e)',
                      border: '1px solid var(--border-color, #333)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: 72,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {preset.title}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message ${msg.role}`}>
                <div className="ai-message-label">
                  {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}
                  {msg.detectedIntent && msg.detectedIntent !== 'auto'
                    ? ` · ${msg.detectedIntent}`
                    : msg.intent && msg.intent !== 'auto' && ` · ${msg.intent}`}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                {msg.telemetry && (
                  <div style={{ marginTop: 4 }}>
                    <button
                      onClick={() => toggleDetails(msg.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 10,
                        padding: 0,
                      }}
                    >
                      {expandedDetails.has(msg.id) ? '▼ Hide details' : '▶ Show details'}
                    </button>
                    {expandedDetails.has(msg.id) && (
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        marginTop: 6,
                        padding: '6px 8px',
                        background: 'var(--bg-primary)',
                        borderRadius: 4,
                        lineHeight: 1.5,
                      }}>
                        {msg.telemetry.metrics && (
                          <div>
                            Brightness {msg.telemetry.metrics.brightness.toFixed(2)} · Contrast {msg.telemetry.metrics.contrast.toFixed(2)} · Saturation {msg.telemetry.metrics.saturation.toFixed(2)}
                          </div>
                        )}
                        {msg.telemetry.repairAttempted && (
                          <div style={{ marginTop: 3 }}>
                            Repair: {msg.telemetry.repairSuccess ? 'applied' : 'skipped'}
                            {msg.telemetry.repairSummary && ` — ${msg.telemetry.repairSummary}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {msg.generationSummary && (
                  <div style={{ marginTop: 4 }}>
                    <button
                      onClick={() => toggleDetails(msg.id + '-prov')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 10,
                        padding: 0,
                      }}
                    >
                      {expandedDetails.has(msg.id + '-prov') ? '▼ How this was made' : '▶ How this was made'}
                    </button>
                    {expandedDetails.has(msg.id + '-prov') && (
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        marginTop: 6,
                        padding: '6px 8px',
                        background: 'var(--bg-primary)',
                        borderRadius: 4,
                        lineHeight: 1.5,
                      }}>
                        <div>Scene: <strong>{msg.generationSummary.sceneType}</strong></div>
                        <div>Mood: <strong>{msg.generationSummary.mood}</strong></div>
                        <div>Palette: <strong>{msg.generationSummary.palette}</strong></div>
                        <div>Technique: <strong>{msg.generationSummary.baseTechnique}</strong></div>
                        <div>Motion: <strong>{msg.generationSummary.motionType}</strong></div>
                        <div>Attempts: <strong>{msg.generationSummary.attempts}</strong></div>
                        {typeof msg.generationSummary.visualScore === 'number' && (
                          <div>Visual quality: <strong>{msg.generationSummary.visualScore}/100</strong></div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {msg.code && (
                  <div style={{ marginTop: 8 }}>
                    <pre style={{
                      background: 'var(--bg-primary)',
                      padding: 8,
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      overflow: 'auto',
                      maxHeight: 150,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      <code>{msg.code.length > 300 ? msg.code.substring(0, 300) + '...' : msg.code}</code>
                    </pre>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button
                        className="toolbar-btn"
                        style={{ fontSize: 11 }}
                        onClick={() => handleApplyCode(msg.code!)}
                      >
                        Apply to Editor
                      </button>
                      <button
                        className="toolbar-btn"
                        style={{ fontSize: 11 }}
                        onClick={() => handleCopyCode(msg.code!)}
                      >
                        Copy
                      </button>
                      {undoStack.length > 0 && (
                        <button
                          className="toolbar-btn"
                          style={{ fontSize: 11 }}
                          onClick={handleUndo}
                          title="Restore previous shader"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && progressSteps.length > 0 && (
              <div className="ai-message assistant">
                <div className="ai-message-label">AI</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {progressSteps.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        opacity: step.status === 'done' ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>
                          {step.status === 'done' ? '✓' : '·'}
                        </span>
                        <span style={{
                          fontWeight: step.status === 'active' ? 500 : 400,
                          color: step.status === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}>
                          {step.label}
                        </span>
                      </div>
                      {step.details && (
                        <div
                          data-testid="progress-step-details"
                          style={{
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            paddingLeft: 22,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                          title={step.details}
                        >
                          {step.details}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    className="toolbar-btn"
                    style={{ fontSize: 10, alignSelf: 'flex-start', marginTop: 4 }}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isLoading && progressSteps.length === 0 && (
              <div className="ai-message assistant">
                <div className="ai-message-label">AI</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" />
                  <span>Processing...</span>
                  <button
                    className="toolbar-btn"
                    style={{ fontSize: 10, marginLeft: 'auto' }}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="ai-input-area">
            {!isLoading && lastFailedContext && (
              <div
                data-testid="ai-recovery"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                  padding: '4px 6px',
                  background: 'var(--bg-secondary, #1e1e2e)',
                  border: '1px solid var(--border-color, #333)',
                  borderRadius: 4,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ flex: 1 }}>Auto-repair failed. You can:</span>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={handleRetry}
                  title="Re-run generation with the same prompt"
                  data-testid="ai-recovery-retry"
                >
                  ↻ Retry
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={handleManualFix}
                  title="Prefill the input with the last compile error so you can guide the fix"
                  data-testid="ai-recovery-manual"
                >
                  ✎ Manual fix
                </button>
              </div>
            )}
            <div className="ai-intent-bar">
              {INTENTS.map((intent) => (
                <button
                  key={intent.id}
                  className={`ai-intent-btn ${activeIntent === intent.id ? 'active' : ''}`}
                  onClick={() => setActiveIntent(mapIntent(intent.id))}
                  title={intent.label}
                >
                  {intent.icon} {intent.label}
                </button>
              ))}
            </div>
            <div className="ai-input-row">
              <textarea
                ref={textareaRef}
                className="ai-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeIntent === 'auto'
                    ? "Describe what you want — I'll figure out the rest..."
                    : activeIntent === 'create'
                    ? 'Describe any shader you want to create...'
                    : activeIntent === 'fix'
                    ? 'Click Fix to auto-fix errors, or describe the issue...'
                    : activeIntent === 'explain'
                    ? 'Press send to explain current code...'
                    : 'Describe what to change...'
                }
                rows={2}
                disabled={isLoading}
              />
              <button
                className="ai-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
