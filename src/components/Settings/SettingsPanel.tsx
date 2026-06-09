import { useState, useEffect } from 'react';
import { useAIStore, MIN_MAX_ATTEMPTS, MAX_MAX_ATTEMPTS, type TelemetryStats } from '../../store/aiStore';
import { useUsageStore } from '../../store/usageStore';
import { shaderAgent } from '../../shader-agent/integration/service';
import { OpenAICompatibleProvider } from '../../shader-agent/integration/providers/openai-compatible';
import { MockAIProvider } from '../../shader-agent/integration/providers/mock';
import { normalizeProviderError } from '../../shader-agent/integration/types/provider-errors';

function formatPercent(part: number, total: number): string {
  if (total === 0) return '—';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
        {value}
        {hint && (
          <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontSize: 10 }}>
            ({hint})
          </span>
        )}
      </span>
    </div>
  );
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_PRESETS = [
  { id: 'mock', name: 'Mock AI (Testing)', description: 'No API key needed' },
  { id: 'deepseek', name: 'DeepSeek', description: 'deepseek-v4-pro' },
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o-mini, GPT-4o, etc.' },
  { id: 'groq', name: 'Groq', description: 'Fast inference with Llama models' },
  { id: 'together', name: 'Together AI', description: 'Open source models' },
  { id: 'custom', name: 'Custom (OpenAI-compatible)', description: 'Any OpenAI-compatible API' },
];

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  deepseek: 'deepseek-v4-pro',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3-70b-chat-hf',
};

const STORAGE_KEY = 'shaderforge-ai-settings';

interface AISettings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function loadSettings(): AISettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore parse errors */ }
  return { provider: 'mock', apiKey: '', baseUrl: '', model: '' };
}

function saveSettings(settings: AISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable */ }
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const setProvider = useAIStore((s) => s.setProvider);
  const candidateCount = useAIStore((s) => s.candidateCount);
  const setCandidateCount = useAIStore((s) => s.setCandidateCount);
  const maxAttempts = useAIStore((s) => s.maxAttempts);
  const setMaxAttempts = useAIStore((s) => s.setMaxAttempts);
  const telemetryStats = useAIStore((s) => s.telemetryStats);
  const visualPolishEnabled = useAIStore((s) => s.visualPolishEnabled);
  const setVisualPolishEnabled = useAIStore((s) => s.setVisualPolishEnabled);
  const tier = useUsageStore((s) => s.tier);
  const isFreeTier = tier === 'free';

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings()); // eslint-disable-line react-hooks/set-state-in-effect -- reload from storage
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSettings(settings);

    // Apply provider
    if (settings.provider === 'mock') {
      shaderAgent.setProvider(new MockAIProvider());
      setProvider('Mock AI', 'mock-v1');
    } else {
      const provider = settings.provider === 'custom'
        ? new OpenAICompatibleProvider('custom', {
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
          })
        : OpenAICompatibleProvider.createPreset(settings.provider, settings.apiKey);

      shaderAgent.setProvider(provider);
      setProvider(settings.provider, settings.model || 'default');
    }

    onClose();
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestError('');

    try {
      let provider: OpenAICompatibleProvider;

      if (settings.provider === 'custom') {
        provider = new OpenAICompatibleProvider('custom', {
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
        });
      } else {
        provider = OpenAICompatibleProvider.createPreset(settings.provider, settings.apiKey);
      }

      const response = await provider.generateShader('a simple blue circle');
      if (response.code || response.explanation) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setTestError('No response from API');
      }
    } catch (error) {
      setTestStatus('error');
      const providerError = normalizeProviderError(error);
      setTestError(providerError.actionHint
        ? `${providerError.message} ${providerError.actionHint}`
        : providerError.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 24,
          width: 480,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>AI Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Provider Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}>
            Provider
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PROVIDER_PRESETS.map((preset) => (
              <label
                key={preset.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: settings.provider === preset.id ? 'var(--bg-tertiary)' : 'transparent',
                  border: `1px solid ${settings.provider === preset.id ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="provider"
                  value={preset.id}
                  checked={settings.provider === preset.id}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{preset.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{preset.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* API Key */}
        {settings.provider !== 'mock' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}>
              API Key
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="sk-..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <button
                className="toolbar-btn"
                onClick={() => setShowKey(!showKey)}
                style={{ fontSize: 11 }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginTop: 6,
            }}>
              Stored in local storage. Persists across sessions.
            </p>
          </div>
        )}

        {/* Custom Provider Settings */}
        {settings.provider === 'custom' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}>
                Base URL
              </label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}>
                Model
              </label>
              <input
                type="text"
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                placeholder="gpt-4o-mini"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
            </div>
          </>
        )}

        {/* Model for non-custom providers */}
        {settings.provider !== 'mock' && settings.provider !== 'custom' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}>
              Model (optional)
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder={PROVIDER_DEFAULT_MODELS[settings.provider] || 'Leave empty for default'}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>
        )}

        {/* Test Button */}
        {settings.provider !== 'mock' && settings.apiKey && (
          <div style={{ marginBottom: 20 }}>
            <button
              className="toolbar-btn"
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus === 'success' && (
              <p style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 8 }}>
                ✓ Connection successful!
              </p>
            )}
            {testStatus === 'error' && (
              <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 8 }}>
                ✗ {testError}
              </p>
            )}
          </div>
        )}

        {/* Generation Quality */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}>
            Candidates per request
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={candidateCount}
              onChange={(e) => setCandidateCount(Number.parseInt(e.target.value, 10))}
              style={{ flex: 1, accentColor: 'var(--accent-blue)' }}
            />
            <div style={{
              minWidth: 32,
              textAlign: 'right',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}>
              {candidateCount}×
            </div>
          </div>
          <p style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 6,
          }}>
            Generate up to {candidateCount} shader{candidateCount === 1 ? '' : 's'} per request
            and keep the one that best matches your intent. Higher = better visual
            quality, more API tokens.
          </p>
        </div>

        {/* Post-success visual polish (Pro) */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              background: visualPolishEnabled && !isFreeTier ? 'var(--bg-tertiary)' : 'transparent',
              border: `1px solid ${visualPolishEnabled && !isFreeTier ? 'var(--accent-blue)' : 'var(--border-color)'}`,
              borderRadius: 6,
              cursor: isFreeTier ? 'not-allowed' : 'pointer',
              opacity: isFreeTier ? 0.7 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={visualPolishEnabled && !isFreeTier}
              disabled={isFreeTier}
              onChange={(e) => setVisualPolishEnabled(e.target.checked)}
              data-testid="visual-polish-toggle"
              style={{ accentColor: 'var(--accent-blue)', marginTop: 2 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Post-success visual polish
              </div>
              <p style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginTop: 4,
                lineHeight: 1.45,
              }}>
                After a shader compiles, run an extra pass to refine composition and color.
                Uses more tokens. {isFreeTier ? 'Available on Pro.' : 'Recommended for final-quality output.'}
              </p>
            </div>
          </label>
        </div>

        {/* V2: Compile Retry Attempts */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}>
            Compile retry attempts
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min={MIN_MAX_ATTEMPTS}
              max={MAX_MAX_ATTEMPTS}
              step={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number.parseInt(e.target.value, 10))}
              data-testid="max-attempts-slider"
              style={{ flex: 1, accentColor: 'var(--accent-blue)' }}
            />
            <div style={{
              minWidth: 32,
              textAlign: 'right',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}>
              {maxAttempts}
            </div>
          </div>
          <p style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 6,
          }}>
            If the LLM's shader fails to compile, the system will retry up to{' '}
            {maxAttempts - 1} more time{maxAttempts === 2 ? '' : 's'} with the
            error fed back to the model. Higher = more chances to self-repair,
            more API tokens.
          </p>
        </div>

        {/* V2: Telemetry (read-only) */}
        <TelemetrySection stats={telemetryStats} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="toolbar-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="toolbar-btn primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TelemetrySection({ stats }: { stats: TelemetryStats }) {
  const successTotal = stats.firstAttemptSuccess + stats.retrySuccess;
  return (
    <div
      data-testid="telemetry-section"
      style={{
        marginBottom: 20,
        padding: 12,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: 6,
      }}
    >
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 8,
      }}>
        Compile retry stats
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <StatRow label="Total runs" value={String(stats.totalRuns)} />
        <StatRow
          label="First-attempt success"
          value={String(stats.firstAttemptSuccess)}
          hint={formatPercent(stats.firstAttemptSuccess, stats.totalRuns)}
        />
        <StatRow
          label="Retry success"
          value={String(stats.retrySuccess)}
          hint={formatPercent(stats.retrySuccess, stats.totalRuns)}
        />
        <StatRow
          label="Total failures"
          value={String(stats.totalFailures)}
          hint={formatPercent(stats.totalFailures, stats.totalRuns)}
        />
        <StatRow
          label="Overall success rate"
          value={formatPercent(successTotal, stats.totalRuns)}
        />
      </div>
    </div>
  );
}
