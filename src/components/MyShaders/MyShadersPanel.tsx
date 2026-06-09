import { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { listCloudProjects, saveCloudProject, deleteCloudProject, type CloudProject } from '../../lib/db';
import { useEditorStore } from '../../store/editorStore';
import { toast } from 'sonner';
import { IconCloud, IconDisk, IconEye, IconTrash } from '../icons/ForgeIcons';

interface MyShadersPanelProps {
  onClose?: () => void;
  /** When true, cloud save requires an authenticated Clerk session. */
  requireSignInForCloud?: boolean;
  isSignedIn?: boolean;
}

export function MyShadersPanel({
  onClose,
  requireSignInForCloud = false,
  isSignedIn = false,
}: MyShadersPanelProps) {
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'public'>('all');

  const localProjects = useProjectStore((s) => s.projects);
  const loadLocal = useProjectStore((s) => s.loadProjects);
  const setCode = useEditorStore((s) => s.setCode);
  const setCurrent = useProjectStore((s) => s.setCurrentProject);

  async function refreshCloud() {
    setLoading(true);
    try {
      const projs = await listCloudProjects(filter === 'public');
      setCloudProjects(projs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCloud();
  }, [filter, loadLocal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoad = (proj: { code: string; id?: string; name?: string }) => {
    setCode(proj.code);
    if (proj.id) {
      const localMatch = localProjects.find((p) => p.code === proj.code);
      if (localMatch) setCurrent(localMatch.id);
    }
    toast.success(`Loaded "${proj.name || 'shader'}" into Studio`);
    onClose?.();
  };

  const handleSaveToCloud = async (localProj: { name: string; code: string; description?: string; tags?: string[] }) => {
    if (requireSignInForCloud && !isSignedIn) {
      toast.error('Sign in to save to cloud', {
        description: 'Cloud saves are tied to your account and sync across devices.',
      });
      return;
    }
    try {
      await saveCloudProject({
        name: localProj.name,
        code: localProj.code,
        description: localProj.description,
        tags: localProj.tags,
        isPublic: false,
      } as Parameters<typeof saveCloudProject>[0]);
      toast.success('Saved to cloud (Dexie)');
      await refreshCloud();
    } catch {
      toast.error('Failed to save to cloud');
    }
  };

  const handleDeleteCloud = async (id: string) => {
    if (!confirm('Delete this shader from your cloud storage?')) return;
    await deleteCloudProject(id);
    await refreshCloud();
    toast.info('Deleted from cloud');
  };

  type ShaderListItem = {
    id: string;
    name: string;
    code: string;
    description?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
    source: 'local' | 'cloud';
    visualScore?: number;
  };

  const combined: ShaderListItem[] = [
    ...localProjects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      tags: p.tags,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      source: 'local' as const,
    })),
    ...cloudProjects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      tags: p.tags,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      source: 'cloud' as const,
      visualScore: p.visualScore,
    })),
  ].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

  return (
    <div className="my-shaders">
      <div className="my-shaders-header">
        <div className="row row-center row-gap-sm text-strong">
          <IconCloud className="icon-md text-accent" /> My Shaders
        </div>
        <div className="my-shaders-filters">
          {(['all', 'mine', 'public'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`filter-chip${filter === f ? ' is-active' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="my-shaders-list">
        {loading && <div className="text-muted" style={{ padding: 16 }}>Syncing with the void...</div>}

        {!loading && combined.length === 0 && (
          <div className="my-shaders-empty">
            No shaders yet. Generate something in the AI Copilot to get started.
          </div>
        )}

        {combined.map((proj) => (
          <div
            key={proj.id + (proj.source || '')}
            className="holo-card"
            style={{ padding: 12, cursor: 'pointer' }}
            onClick={() => handleLoad(proj)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad(proj)}
          >
            <div className="row row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="text-strong">{proj.name}</div>
                {proj.description && (
                  <div className="text-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.description}
                  </div>
                )}
              </div>
              <div className="row row-center row-gap-sm text-muted" style={{ fontSize: 10 }}>
                {proj.source === 'cloud' ? <IconCloud size={12} /> : <IconDisk size={12} />}
                {proj.visualScore != null && <span style={{ color: 'var(--neon-green)' }}>{proj.visualScore}</span>}
              </div>
            </div>

            <div className="my-shaders-item-actions">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleLoad(proj); }}
                className="item-action-btn"
              >
                <IconEye size={12} /> Load
              </button>

              {proj.source === 'local' && (
                <button
                  type="button"
                  onClick={async (e) => { e.stopPropagation(); await handleSaveToCloud(proj); }}
                  className="item-action-btn"
                >
                  ↑ Cloud
                </button>
              )}

              {proj.source === 'cloud' && (
                <button
                  type="button"
                  onClick={() => { void handleDeleteCloud(String(proj.id)); }}
                  className="item-action-btn item-action-btn-danger"
                >
                  <IconTrash size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="my-shaders-footer">
        Local = this browser · Cloud = Dexie (persistent local DB)
      </div>
    </div>
  );
}