import { create } from 'zustand';
import { saveCloudProject, listCloudProjects, deleteCloudProject } from '../lib/db';

export interface ShaderProject {
  id: string;
  name: string;
  code: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  version: number;
  source?: 'local' | 'cloud';
}

const STORAGE_KEY = 'shaderforge-projects';
const PROJECT_VERSION = 1;

function isShaderProject(v: unknown): v is ShaderProject {
  return typeof v === 'object' && v !== null && 'id' in v && 'name' in v && 'code' in v;
}

function loadProjects(): ShaderProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isShaderProject)
      .map((p) => ({ ...p, version: p.version || PROJECT_VERSION }));
  } catch {
    return [];
  }
}

function saveProjects(projects: ShaderProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save projects:', error);
  }
}

interface ProjectState {
  projects: ShaderProject[];
  currentProjectId: string | null;

  // Actions
  loadProjects: () => void;
  saveProject: (name: string, code: string, description?: string) => ShaderProject;
  updateProject: (id: string, updates: Partial<Pick<ShaderProject, 'name' | 'code' | 'description' | 'tags'>>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => ShaderProject | null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,

  loadProjects: async () => {
    const local = loadProjects();
    try {
      const cloud = await listCloudProjects(false);
      const cloudMapped = cloud.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description,
        tags: c.tags,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        version: 1,
        source: 'cloud' as const,
      }));
      // Merge, prefer cloud versions if conflict
      const merged = [...local, ...cloudMapped].reduce((acc: ShaderProject[], p) => {
        if (!acc.find(x => x.id === p.id)) acc.push(p);
        return acc;
      }, []);
      set({ projects: merged });
    } catch {
      set({ projects: local });
    }
  },

  saveProject: (name, code, description) => {
    const now = Date.now();
    const project: ShaderProject = {
      id: now.toString() + Math.random().toString(36).substr(2, 9),
      name,
      code,
      description,
      createdAt: now,
      updatedAt: now,
      version: PROJECT_VERSION,
      source: 'local',
    };

    const projects = [...get().projects, project];
    saveProjects(projects);
    set({ projects, currentProjectId: project.id });

    // Also persist to Dexie "cloud" for SaaS feel
    void saveCloudProject({
      id: undefined as unknown as string,
      name,
      code,
      description,
      tags: [],
      isPublic: false,
    }).catch(() => {});

    return project;
  },

  updateProject: (id, updates) => {
    const projects = get().projects.map((p) =>
      p.id === id
        ? { ...p, ...updates, updatedAt: Date.now() }
        : p
    );
    saveProjects(projects);
    set({ projects });
  },

  deleteProject: async (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    saveProjects(projects.filter(p => p.source !== 'cloud'));
    try {
      await deleteCloudProject(id);
    } catch { /* ignore cloud delete errors in demo */ }
    set({
      projects,
      currentProjectId: get().currentProjectId === id ? null : get().currentProjectId,
    });
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id });
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },
}));
