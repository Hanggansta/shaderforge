import { useEffect, useState } from 'react';
import { AIChatPanel } from './components/AIChat/AIChatPanel';
import { MonacoEditor } from './components/Editor/MonacoEditor';
import { PreviewPanel } from './components/Preview/PreviewPanel';
import { ErrorBar } from './components/ErrorBar/ErrorBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useProjectStore } from './store/projectStore';
import { useEditorStore } from './store/editorStore';
import { decodeShaderFromUrl } from './utils/shareUrl';
import './App.css';

function App() {
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const setCode = useEditorStore((s) => s.setCode);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // Load projects and check for shared URL on mount
  useEffect(() => {
    loadProjects();

    // Check for shared shader in URL
    const sharedCode = decodeShaderFromUrl();
    if (sharedCode) {
      setCode(sharedCode);
      // Clear the hash to avoid reloading on refresh
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
              <div className="ai-panel panel">
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
              <AIChatPanel />
            </ErrorBoundary>

            <div className="resize-handle" />

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

            <div className="resize-handle" />
          </>
        )}

        <ErrorBoundary name="Preview" fallback={
          <div className="preview-panel panel" style={{ flex: previewMaximized ? 1 : undefined }}>
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
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
