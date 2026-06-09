import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AIChatPanel } from '../components/AIChat/AIChatPanel';
import { MonacoEditorLazy } from '../components/Editor/MonacoEditorLazy';
import { PreviewPanel } from '../components/Preview/PreviewPanel';
import { ErrorBar } from '../components/ErrorBar/ErrorBar';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MyShadersPanelGate } from '../components/MyShaders/MyShadersPanelGate';
import { useProjectStore } from '../store/projectStore';
import { useAIStore } from '../store/aiStore';
import { useUsageStore } from '../store/usageStore';
import { useEditorStore } from '../store/editorStore';
import { useUiStore } from '../store/uiStore';
import { usePanelResize } from '../hooks/usePanelResize';
import { restoreSavedProvider } from '../lib/restoreProvider';
import { PRESETS } from '../shader-agent/presets';
import { toast } from 'sonner';
import '../App.css';

const COMPILE_LABELS: Record<string, string> = {
  idle: 'Ready',
  compiling: 'Compiling…',
  success: 'Compiled',
  error: 'Compile error',
};

export default function Studio() {
  const [searchParams] = useSearchParams();
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [showMyShaders, setShowMyShaders] = useState(false);

  const aiWidth = useUiStore((s) => s.panels.ai.width ?? 300);
  const previewWidth = useUiStore((s) => s.panels.preview.width ?? 400);

  const aiEditorResize = usePanelResize('ai', 'editor');
  const editorPreviewResize = usePanelResize('editor', 'preview');

  const candidateCount = useAIStore((s) => s.candidateCount);
  const providerName = useAIStore((s) => s.providerName);
  const remaining = useUsageStore((s) => s.remaining);
  const periodLimit = useUsageStore((s) => s.periodLimit);
  const tier = useUsageStore((s) => s.tier);
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const requestState = useAIStore((s) => s.requestState);

  const closeDrawer = useCallback(() => setShowMyShaders(false), []);

  useEffect(() => {
    loadProjects();
    restoreSavedProvider();

    const presetId = searchParams.get('preset');
    if (presetId) {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (preset) {
        toast(`Loaded preset: ${preset.title}`, {
          description: 'Describe variations or hit send in the AI Copilot to forge.',
        });
      }
    }

    const inspiration = searchParams.get('inspiration');
    if (inspiration) {
      toast.info(`Inspiration: ${inspiration}`, {
        description: 'Describe how you want to evolve this in the AI Copilot.',
      });
    }

    const openHandler = () => setShowMyShaders(true);
    window.addEventListener('open-my-shaders', openHandler);
    return () => window.removeEventListener('open-my-shaders', openHandler);
  }, [loadProjects, searchParams]);

  useEffect(() => {
    if (!showMyShaders) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMyShaders, closeDrawer]);

  const openUpgrade = () => {
    window.dispatchEvent(new CustomEvent('open-upgrade'));
  };

  const compilePillClass =
    compileStatus === 'success' ? 'studio-pill--ok'
      : compileStatus === 'error' ? 'studio-pill--error'
        : compileStatus === 'compiling' ? 'studio-pill--active'
          : '';

  return (
    <div className="studio-page" id="main-content">
      <Toolbar />

      <div className="studio-status-bar" role="status" aria-live="polite">
        <div className="studio-status-group">
          <span className="studio-status-title">THE FORGE</span>
          <span className={`studio-pill studio-pill--tier studio-pill--${tier}`}>
            {tier.toUpperCase()}
          </span>
          <span className={`studio-pill ${compilePillClass}`}>
            {COMPILE_LABELS[compileStatus] ?? compileStatus}
          </span>
          {requestState === 'loading' && (
            <span className="studio-pill studio-pill--active">AI running</span>
          )}
        </div>

        <div className="studio-status-group">
          <span className="studio-pill studio-pill--muted tabular-nums">
            {candidateCount}× candidates
          </span>
          <span className="studio-pill studio-pill--muted">
            {providerName}
          </span>
          <span className="studio-pill studio-pill--quota tabular-nums">
            {remaining()} / {periodLimit} gens
          </span>
          {tier === 'free' && (
            <button type="button" onClick={openUpgrade} className="studio-banner-link">
              Upgrade
            </button>
          )}
        </div>
      </div>

      <div className={`studio-workspace${previewMaximized ? ' is-column' : ''}`}>
        {!previewMaximized && (
          <>
            <ErrorBoundary name="AI Copilot">
              <AIChatPanel style={{ width: aiWidth }} />
            </ErrorBoundary>

            <div className="resize-handle" onPointerDown={aiEditorResize.handlePointerDown} />

            <ErrorBoundary name="Editor">
              <div className="editor-panel panel" style={{ flex: 1, minWidth: 0, width: 'auto' }}>
                <div className="panel-header">
                  <span className="panel-title">GLSL Editor</span>
                  <span className="studio-editor-meta">mainImage · WebGL2 · Shift+Enter to send in AI</span>
                </div>
                <div className="panel-content" style={{ display: 'flex', flexDirection: 'column' }}>
                  <MonacoEditorLazy />
                  <ErrorBar />
                </div>
              </div>
            </ErrorBoundary>

            <div className="resize-handle" onPointerDown={editorPreviewResize.handlePointerDown} />
          </>
        )}

        <ErrorBoundary name="Preview">
          <PreviewPanel
            maximized={previewMaximized}
            onToggleMaximize={() => setPreviewMaximized(!previewMaximized)}
            style={{
              width: previewMaximized ? undefined : previewWidth,
              flexShrink: previewMaximized ? undefined : 0,
            }}
          />
        </ErrorBoundary>
      </div>

      {showMyShaders && (
        <>
          <button
            type="button"
            className="studio-drawer-backdrop"
            aria-label="Close My Shaders"
            onClick={closeDrawer}
          />
          <aside className="studio-drawer" aria-label="My Shaders">
            <div className="studio-drawer-header">
              <span className="text-strong">My Shaders</span>
              <button type="button" onClick={closeDrawer} className="studio-drawer-close">
                Close
              </button>
            </div>
            <div className="studio-drawer-body">
              <MyShadersPanelGate onClose={closeDrawer} />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}