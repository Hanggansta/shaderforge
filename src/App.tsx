import { useEffect, useState } from 'react';
import { AIChatPanel } from './components/AIChat/AIChatPanel';
import { MonacoEditor } from './components/Editor/MonacoEditor';
import { PreviewPanel } from './components/Preview/PreviewPanel';
import { ErrorBar } from './components/ErrorBar/ErrorBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevTestPanel } from './components/DevTools/DevTestPanel';
import { useProjectStore } from './store/projectStore';
import { useEditorStore } from './store/editorStore';
import { useAIStore } from './store/aiStore';
import { useUiStore } from './store/uiStore';
import { usePanelResize } from './hooks/usePanelResize';
import { aiService } from './ai/service';
import { OpenAICompatibleProvider } from './ai/providers/openai-compatible';
import { decodeShaderFromUrl } from './utils/shareUrl';
import './App.css';

function initDevProvider() {
  const key = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!key || key === 'your_api_key_here') return;

  const provider = OpenAICompatibleProvider.createPreset('deepseek', key);
  aiService.setProvider(provider);
  useAIStore.getState().setProvider('DeepSeek', 'deepseek-v4-pro');
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
    initDevProvider();

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
      {import.meta.env.DEV && <DevTestPanel />}
    </div>
  );
}

export default App;
