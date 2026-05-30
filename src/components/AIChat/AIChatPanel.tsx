import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAIStore, type ChatMessage, type TelemetrySummary } from '../../store/aiStore';
import { aiService, type AgentProgress } from '../../ai/service';
import { friendlyQualityLabel } from '../../ai/telemetry/quality-labels';
import { normalizeProviderError } from '../../ai/errors/provider-errors';
import { PRESETS } from '../../ai/presets';
import { SettingsPanel } from '../Settings/SettingsPanel';
import type { AIIntent } from '../../ai/adapter';

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
  cleaning: 'Cleaning code',
  validating: 'Validating',
  compiling: 'Compiling',
  fixing: 'Fixing errors',
  success: 'Done',
  failed: 'Failed',
};

function QualityBadge({ telemetry }: { telemetry?: TelemetrySummary }) {
  if (!telemetry) return null;

  const severityColor =
    telemetry.qualitySeverity === 'high' ? '#f85149' :
    telemetry.qualitySeverity === 'medium' ? '#d29922' :
    '#3fb950';

  return (
    <span
      className="quality-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 8,
        background: severityColor + '20',
        color: severityColor,
        marginLeft: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {friendlyQualityLabel(telemetry.qualityLabel)}
    </span>
  );
}

function TelemetryDetails({ telemetry }: { telemetry?: TelemetrySummary }) {
  if (!telemetry) return null;

  return (
    <div style={{
      fontSize: 11,
      color: 'var(--text-secondary)',
      marginTop: 6,
      padding: '6px 8px',
      background: 'var(--bg-primary)',
      borderRadius: 4,
      lineHeight: 1.5,
    }}>
      {telemetry.metrics && (
        <div>
          Brightness {telemetry.metrics.brightness.toFixed(2)} · Contrast {telemetry.metrics.contrast.toFixed(2)} · Saturation {telemetry.metrics.saturation.toFixed(2)}
        </div>
      )}
      {telemetry.repairAttempted && (
        <div style={{ marginTop: 3 }}>
          🔧 Repair: {telemetry.repairSuccess ? 'applied' : 'skipped'}
          {telemetry.repairSummary && ` — ${telemetry.repairSummary}`}
        </div>
      )}
    </div>
  );
}

export function AIChatPanel({ style }: { style?: React.CSSProperties } = {}) {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const messages = useAIStore((s) => s.messages);
  const activeIntent = useAIStore((s) => s.activeIntent);
  const requestState = useAIStore((s) => s.requestState);
  const providerName = useAIStore((s) => s.providerName);
  const addMessage = useAIStore((s) => s.addMessage);
  const setActiveIntent = useAIStore((s) => s.setActiveIntent);
  const setRequestState = useAIStore((s) => s.setRequestState);
  const setLastError = useAIStore((s) => s.setLastError);

  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const setCodeFromAI = useEditorStore((s) => s.setCodeFromAI);

  const isLoading = requestState === 'loading';

  const handleProgress = useCallback((progress: AgentProgress) => {
    const label = PROGRESS_LABELS[progress.status] || progress.status;
    setProgressSteps((prev) => {
      const existing = prev.findIndex((s) => s.label === label);
      if (existing >= 0) {
        // Update existing step
        const next = [...prev];
        next[existing] = {
          ...next[existing],
          status: progress.status === 'success' || progress.status === 'failed' ? 'done' : 'active',
          details: progress.details,
        };
        // Mark all previous steps as done
        for (let i = 0; i < existing; i++) {
          next[i] = { ...next[i], status: 'done' };
        }
        return next;
      }
      // Add new step, mark previous as done
      return [
        ...prev.map((s) => ({ ...s, status: 'done' as const })),
        { label, status: 'active' as const, details: progress.details },
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

    try {
      const result = await aiService.generate(
        prompt,
        intent,
        {
          onProgress: handleProgress,
          maxAttempts: 3,
          currentCode: code,
        }
      );

      const msgIntent = result.detectedIntent || intent;

      if (result.success && result.clarification) {
        // Low-confidence auto intent — ask user to clarify
        addMessage({
          role: 'assistant',
          content: result.clarification,
          intent: msgIntent,
          detectedIntent: result.detectedIntent,
        });
      } else if (result.success && result.explanation) {
        addMessage({
          role: 'assistant',
          content: result.explanation,
          intent: msgIntent,
          detectedIntent: result.detectedIntent,
        });
      } else if (result.success && result.code) {
        const requestId = aiService.getLastRequestId();
        if (requestId) {
          setCodeFromAI(result.code, requestId);
        } else {
          setCode(result.code);
        }

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
      } else {
        if (result.errors && result.errors.length > 0) {
          const errorSummary = result.errors
            .slice(0, 3)
            .map(e => `Line ${e.line}: ${e.rawMessage}`)
            .join('\n');

          addMessage({
            role: 'system',
            content: `Generation failed after ${result.attempts} attempts.\n${errorSummary}`,
          });
        } else if (result.validationIssues && result.validationIssues.length > 0) {
          const issueSummary = result.validationIssues
            .filter(i => i.type === 'error')
            .slice(0, 3)
            .map(i => i.message)
            .join('\n');

          addMessage({
            role: 'system',
            content: `Generation failed after ${result.attempts} attempts.\n${issueSummary}`,
          });
        } else {
          addMessage({
            role: 'system',
            content: 'Generation failed. Please try again or check your API settings.',
          });
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
  }, [input, activeIntent, isLoading, addMessage, setRequestState, setLastError, code, setCode, setCodeFromAI, handleProgress]);

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

  const handleCancel = () => {
    aiService.cancel();
    setRequestState('cancelled');
    setProgressSteps([]);
    addMessage({ role: 'system', content: 'Request cancelled.' });
  };

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
          <div className="ai-messages">
            {/* Preset grid — only when no user messages yet */}
            {!messages.some(m => m.role === 'user') && (
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
                  ✨ Try a preset to get started, or describe your own shader below.
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
                      transition: 'border-color 0.15s',
                      textAlign: 'center',
                      minHeight: 72,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent, #7c5cbf)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color, #333)'}
                  >
                    <span style={{ fontSize: 18 }}>{preset.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>
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
                  {msg.telemetry && <QualityBadge telemetry={msg.telemetry} />}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                {/* Telemetry details (collapsible) */}
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
                      <TelemetryDetails telemetry={msg.telemetry} />
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
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Progress timeline */}
            {isLoading && progressSteps.length > 0 && (
              <div className="ai-message assistant">
                <div className="ai-message-label">AI</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {progressSteps.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        opacity: step.status === 'done' ? 0.7 : 1,
                      }}
                    >
                      <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>
                        {step.status === 'done' ? '✅' : step.status === 'active' ? '⏳' : '·'}
                      </span>
                      <span style={{
                        fontWeight: step.status === 'active' ? 500 : 400,
                        color: step.status === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                        {step.label}
                      </span>
                      {step.status === 'active' && progressSteps.some(s => s.label === 'Generating shader') && step.label === 'Generating shader' && (
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          Attempt {progressSteps.find(s => s.label === 'Generating shader')?.details || ''}
                        </span>
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

            {/* Loading without progress (fallback) */}
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
            <div className="ai-intent-bar">
              {INTENTS.map((intent) => (
                <button
                  key={intent.id}
                  className={`ai-intent-btn ${activeIntent === intent.id ? 'active' : ''}`}
                  onClick={() => setActiveIntent(intent.id)}
                  title={intent.label}
                >
                  {intent.icon} {intent.label}
                </button>
              ))}
            </div>
            <div className="ai-input-row">
              <textarea
                className="ai-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeIntent === 'auto'
                    ? 'Describe what you want — I\'ll figure out the rest...'
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
