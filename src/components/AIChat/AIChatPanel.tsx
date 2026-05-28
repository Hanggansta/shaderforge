import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAIStore, type ChatMessage } from '../../store/aiStore';
import { aiService, type AgentProgress, type CompileResult } from '../../ai/service';
import { SettingsPanel } from '../Settings/SettingsPanel';
import type { AIIntent } from '../../ai/adapter';

const INTENTS: { id: AIIntent; label: string; icon: string }[] = [
  { id: 'create', label: 'Create', icon: '✨' },
  { id: 'modify', label: 'Modify', icon: '✏️' },
  { id: 'fix', label: 'Fix Error', icon: '🔧' },
  { id: 'explain', label: 'Explain', icon: '📖' },
  { id: 'optimize', label: 'Optimize', icon: '⚡' },
];

// Status icons
const STATUS_ICONS: Record<string, string> = {
  generating: '✨',
  cleaning: '🧹',
  validating: '🔍',
  compiling: '⚙️',
  fixing: '🔧',
  success: '✅',
  failed: '❌',
  idle: '⏳',
};

export function AIChatPanel() {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<AgentProgress | null>(null);

  const messages = useAIStore((s) => s.messages);
  const activeIntent = useAIStore((s) => s.activeIntent);
  const requestState = useAIStore((s) => s.requestState);
  const providerName = useAIStore((s) => s.providerName);
  const addMessage = useAIStore((s) => s.addMessage);
  const setActiveIntent = useAIStore((s) => s.setActiveIntent);
  const setRequestState = useAIStore((s) => s.setRequestState);
  const setLastError = useAIStore((s) => s.setLastError);

  const setCode = useEditorStore((s) => s.setCode);

  const isLoading = requestState === 'loading';

  // Compile function that uses our WebGL renderer
  const compileShader = useCallback(async (code: string): Promise<CompileResult> => {
    // We'll use a simple approach: set the code and check if it compiles
    // The actual compilation happens in PreviewPanel
    return new Promise((resolve) => {
      // Set the code to trigger compilation
      setCode(code);

      // Wait a bit for compilation to happen
      setTimeout(() => {
        const errors = useEditorStore.getState().compileErrors;
        const status = useEditorStore.getState().compileStatus;

        if (status === 'success') {
          resolve({ success: true });
        } else if (status === 'error' && errors.length > 0) {
          const errorLog = errors.map(e => `ERROR: 0:${e.line}: ${e.message}`).join('\n');
          resolve({ success: false, errorLog });
        } else {
          // Timeout or unknown state
          resolve({ success: false, errorLog: 'Compilation timeout or unknown state' });
        }
      }, 500); // Wait 500ms for compilation
    });
  }, [setCode]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content: input,
      intent: activeIntent,
    };

    addMessage(userMessage);
    setInput('');
    setRequestState('loading');
    setLastError(null);
    setCurrentProgress(null);

    try {
      const result = await aiService.generate(
        input,
        activeIntent,
        {
          compileFn: compileShader,
          onProgress: (progress) => {
            setCurrentProgress(progress);
          },
          maxAttempts: 3,
        }
      );

      if (result.success && result.code) {
        // Apply the code to editor
        setCode(result.code);

        // Success message
        addMessage({
          role: 'assistant',
          content: result.attempts > 1
            ? `Generated shader successfully after ${result.attempts} attempts!`
            : 'Generated shader successfully!',
          code: result.code,
          intent: activeIntent,
        });
      } else if (result.code) {
        // Failed but have code - offer to apply anyway
        addMessage({
          role: 'assistant',
          content: `Generated code after ${result.attempts} attempts, but it may have compilation issues.`,
          code: result.code,
          intent: activeIntent,
        });

        if (result.errors && result.errors.length > 0) {
          const errorSummary = result.errors
            .slice(0, 3)
            .map(e => `Line ${e.line}: ${e.rawMessage}`)
            .join('\n');

          addMessage({
            role: 'system',
            content: `Compilation issues:\n${errorSummary}`,
          });
        }

        if (result.validationIssues && result.validationIssues.length > 0) {
          const issueSummary = result.validationIssues
            .filter(i => i.type === 'error')
            .slice(0, 3)
            .map(i => i.message)
            .join('\n');

          if (issueSummary) {
            addMessage({
              role: 'system',
              content: `Validation issues:\n${issueSummary}`,
            });
          }
        }
      } else {
        // Complete failure
        addMessage({
          role: 'system',
          content: 'Failed to generate shader. Please try again or check your API settings.',
        });
      }

      setRequestState('idle');
      setCurrentProgress(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      setRequestState('error');
      setCurrentProgress(null);

      addMessage({
        role: 'system',
        content: `Error: ${errorMessage}`,
      });
    }
  }, [input, activeIntent, isLoading, addMessage, setRequestState, setLastError, setCode, compileShader]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApplyCode = (code: string) => {
    setCode(code);
    addMessage({
      role: 'system',
      content: 'Code applied to editor!',
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addMessage({
      role: 'system',
      content: 'Code copied to clipboard!',
    });
  };

  const handleCancel = () => {
    aiService.cancel();
    setRequestState('cancelled');
    setCurrentProgress(null);
    addMessage({
      role: 'system',
      content: 'Request cancelled.',
    });
  };

  return (
    <>
      <div className="ai-panel panel">
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
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message ${msg.role}`}>
                <div className="ai-message-label">
                  {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}
                  {msg.intent && ` · ${msg.intent}`}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
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

            {/* Progress indicator */}
            {isLoading && currentProgress && (
              <div className="ai-message assistant">
                <div className="ai-message-label">
                  AI · {currentProgress.status}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>
                      {STATUS_ICONS[currentProgress.status] || '⏳'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{currentProgress.message}</div>
                      {currentProgress.details && (
                        <div style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          marginTop: 4,
                          maxHeight: 60,
                          overflow: 'auto',
                        }}>
                          {currentProgress.details}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="toolbar-btn"
                    style={{ fontSize: 10, alignSelf: 'flex-start' }}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Loading without progress (fallback) */}
            {isLoading && !currentProgress && (
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
                  activeIntent === 'create'
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
                onClick={handleSend}
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
