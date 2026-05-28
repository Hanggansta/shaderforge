import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { usePreviewStore } from '../../store/previewStore';
import { useProjectStore } from '../../store/projectStore';
import { SHADER_TEMPLATES } from '../../templates';
import { copyShareUrl, exportShaderAsGlsl, exportShaderAsJson, importShaderFromFile } from '../../utils/shareUrl';

export function Toolbar() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState('');

  const compileStatus = useEditorStore((s) => s.compileStatus);
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const isDirty = useEditorStore((s) => s.isDirty);
  const markDirty = useEditorStore((s) => s.markDirty);

  const fps = usePreviewStore((s) => s.fps);
  const isPlaying = usePreviewStore((s) => s.isPlaying);

  const projects = useProjectStore((s) => s.projects);
  const saveProject = useProjectStore((s) => s.saveProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const handleSave = () => {
    const currentProject = useProjectStore.getState().getCurrentProject();
    if (currentProject) {
      useProjectStore.getState().updateProject(currentProject.id, { code });
      markDirty(false);
    } else {
      setShowSaveDialog(true);
    }
  };

  const handleSaveAs = () => {
    setProjectName('');
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = () => {
    if (projectName.trim()) {
      saveProject(projectName.trim(), code);
      markDirty(false);
      setShowSaveDialog(false);
      setProjectName('');
    }
  };

  const handleLoadProject = (id: string) => {
    const project = useProjectStore.getState().projects.find((p) => p.id === id);
    if (project) {
      setCode(project.code);
      setCurrentProject(id);
      markDirty(false);
    }
  };

  const handleShare = () => {
    const success = copyShareUrl(code);
    if (success) {
      alert('Share URL copied to clipboard!');
    } else {
      alert('Shader too large for URL. Use Export instead.');
    }
  };

  const handleExportGlsl = () => {
    const name = useProjectStore.getState().getCurrentProject()?.name || 'shader';
    exportShaderAsGlsl(code, name);
  };

  const handleExportJson = () => {
    const name = useProjectStore.getState().getCurrentProject()?.name || 'shader';
    exportShaderAsJson(code, name);
  };

  const handleImport = async () => {
    const result = await importShaderFromFile();
    if (result) {
      setCode(result.code);
      markDirty(true);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = SHADER_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      if (isDirty) {
        const confirm = window.confirm('You have unsaved changes. Load template anyway?');
        if (!confirm) return;
      }
      setCode(template.code);
      setCurrentProject(null);
      markDirty(false);
    }
    setShowTemplates(false);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-logo">ShaderForge</span>
        <div style={{ position: 'relative' }}>
          <button
            className="toolbar-btn"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            📄 Templates
          </button>
          {showTemplates && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              padding: 8,
              minWidth: 200,
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              {SHADER_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ fontWeight: 600 }}>{template.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{template.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="toolbar-center">
        <button className="toolbar-btn" onClick={handleSave}>
          💾 Save
        </button>
        <button className="toolbar-btn" onClick={handleSaveAs}>
          💾 Save As
        </button>
        <button className="toolbar-btn" onClick={handleShare}>
          🔗 Share
        </button>
        <button className="toolbar-btn" onClick={handleExportGlsl}>
          📥 Export GLSL
        </button>
        <button className="toolbar-btn" onClick={handleExportJson}>
          📦 Export JSON
        </button>
        <button className="toolbar-btn" onClick={handleImport}>
          📂 Import
        </button>
      </div>
      <div className="toolbar-right">
        {projects.length > 0 && (
          <select
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              padding: '4px 8px',
              fontSize: 11,
            }}
            onChange={(e) => handleLoadProject(e.target.value)}
            value=""
          >
            <option value="" disabled>Load Project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {isPlaying ? `${fps} FPS` : 'Paused'}
        </span>
        <div className={`status-indicator ${compileStatus}`} />
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            padding: 24,
            minWidth: 300,
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Save Project</h3>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 14,
                marginBottom: 16,
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="toolbar-btn"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
              <button
                className="toolbar-btn primary"
                onClick={handleSaveConfirm}
                disabled={!projectName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
