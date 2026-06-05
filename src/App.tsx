import { useEffect, useState } from 'react';
import { AIChatPanel } from './components/AIChat/AIChatPanel';
import { MonacoEditor } from './components/Editor/MonacoEditor';
import { PreviewPanel } from './components/Preview/PreviewPanel';
import { ErrorBar } from './components/ErrorBar/ErrorBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useProjectStore } from './store/projectStore';
import { useEditorStore } from './store/editorStore';
import { useAIStore } from './store/aiStore';
import { useUiStore } from './store/uiStore';
import { usePanelResize } from './hooks/usePanelResize';
import { shaderAgent } from './shader-agent/integration/service';
import { OpenAICompatibleProvider } from './shader-agent/integration/providers/openai-compatible';
import { MockAIProvider } from './shader-agent/integration/providers/mock';
import { decodeShaderFromUrl } from './utils/shareUrl';
import './App.css';

const SETTINGS_KEY = 'shaderforge-ai-settings';

/**
 * Restore saved AI provider from localStorage.
 * Falls back to dev provider (DeepSeek) only if no saved settings exist.
 * If neither exists, the default Mock AI stays active.
 */
function restoreSavedProvider() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const settings = JSON.parse(data);
      if (settings.provider === 'mock') {
        shaderAgent.setProvider(new MockAIProvider());
        useAIStore.getState().setProvider('Mock AI', 'mock-v1');
      } else if (settings.provider && settings.apiKey) {
        const provider = settings.provider === 'custom'
          ? new OpenAICompatibleProvider('custom', {
              apiKey: settings.apiKey,
              baseUrl: settings.baseUrl,
              model: settings.model,
            })
          : OpenAICompatibleProvider.createPreset(settings.provider, settings.apiKey);
        shaderAgent.setProvider(provider);
        useAIStore.getState().setProvider(settings.provider, settings.model || 'default');
      }
      return true;
    }
  } catch { /* ignore parse errors */ }

  // No saved settings — try OpenAI as default, then DeepSeek as fallback
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    const provider = OpenAICompatibleProvider.createPreset('openai', openaiKey);
    shaderAgent.setProvider(provider);
    useAIStore.getState().setProvider('OpenAI', 'gpt-4o-mini');
    return true;
  }

  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey !== 'your_api_key_here') {
    const provider = OpenAICompatibleProvider.createPreset('deepseek', deepseekKey);
    shaderAgent.setProvider(provider);
    useAIStore.getState().setProvider('DeepSeek', 'deepseek-v4-pro');
    return true;
  }

  return false;
}

function App() {
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const setCode = useEditorStore((s) => s.setCode);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const aiWidth = useUiStore((s) => s.panels.ai.width ?? 300);
  const previewWidth = useUiStore((s) => s.panels.preview.width ?? 400);

  const aiEditorResize = usePanelResize('ai', 'editor');
  const editorPreviewResize = usePanelResize('editor', 'preview');

  // Load projects, check shared URL, auto-configure dev provider
  useEffect(() => {
    loadProjects();
    restoreSavedProvider();

    const sharedCode = decodeShaderFromUrl();
    if (sharedCode) {
      setCode(sharedCode);
      window.location.hash = '';
    }
  }, [loadProjects, setCode]);

  const handleToggleMaximize = () => {
    setPreviewMaximized(!previewMaximized);
  };

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace" style={{
        flexDirection: previewMaximized ? 'column' : 'row',
      }}>
        {!previewMaximized && (
          <>
            <ErrorBoundary name="AI Copilot" fallback={
              <div className="ai-panel panel" style={{ width: aiWidth }}>
                <div className="panel-header">
                  <span className="panel-title">AI Copilot</span>
                </div>
                <div className="panel-content" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                }}>
                  AI panel unavailable
                </div>
              </div>
            }>
              <AIChatPanel style={{ width: aiWidth }} />
            </ErrorBoundary>

            <div
              className="resize-handle"
              onPointerDown={aiEditorResize.handlePointerDown}
            />

            <ErrorBoundary name="Editor">
              <div className="editor-panel panel">
                <div className="panel-header">
                  <span className="panel-title">Editor</span>
                </div>
                <div className="panel-content">
                  <MonacoEditor />
                  <ErrorBar />
                </div>
              </div>
            </ErrorBoundary>

            <div
              className="resize-handle"
              onPointerDown={editorPreviewResize.handlePointerDown}
            />
          </>
        )}

        <ErrorBoundary name="Preview" fallback={
          <div className="preview-panel panel" style={{
            flex: previewMaximized ? 1 : undefined,
            width: previewMaximized ? undefined : previewWidth,
          }}>
            <div className="panel-header">
              <span className="panel-title">Preview</span>
            </div>
            <div className="panel-content" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}>
              Preview unavailable
            </div>
          </div>
        }>
          <PreviewPanel
            maximized={previewMaximized}
            onToggleMaximize={handleToggleMaximize}
            style={{
              width: previewMaximized ? undefined : previewWidth,
              flexShrink: previewMaximized ? undefined : 0,
            }}
          />
        </ErrorBoundary>
      </div>
      {import.meta.env.DEV && null}
    </div>
  );
}

export default App;
