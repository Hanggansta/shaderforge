import { useState, useEffect } from 'react';
import { useAIStore } from '../../store/aiStore';
import { aiService } from '../../ai/service';
import { OpenAICompatibleProvider } from '../../ai/providers/openai-compatible';
import { MockAIProvider } from '../../ai/providers/mock';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_PRESETS = [
  { id: 'mock', name: 'Mock AI (Testing)', description: 'No API key needed' },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat API' },
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o-mini, GPT-4o, etc.' },
  { id: 'groq', name: 'Groq', description: 'Fast inference with Llama models' },
  { id: 'together', name: 'Together AI', description: 'Open source models' },
  { id: 'custom', name: 'Custom (OpenAI-compatible)', description: 'Any OpenAI-compatible API' },
];

const STORAGE_KEY = 'shaderforge-ai-settings';

interface AISettings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function loadSettings(): AISettings {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { provider: 'mock', apiKey: '', baseUrl: '', model: '' };
}

function saveSettings(settings: AISettings): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const setProvider = useAIStore((s) => s.setProvider);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSettings(settings);

    // Apply provider
    if (settings.provider === 'mock') {
      aiService.setProvider(new MockAIProvider());
      setProvider('Mock AI', 'mock-v1');
    } else {
      const provider = settings.provider === 'custom'
        ? new OpenAICompatibleProvider('custom', {
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
          })
        : OpenAICompatibleProvider.createPreset(settings.provider, settings.apiKey);

      aiService.setProvider(provider);
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
      setTestError(error instanceof Error ? error.message : 'Unknown error');
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
              Stored in session storage only. Cleared when you close the browser tab.
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
              placeholder="Leave empty for default"
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
