import { create } from 'zustand';

export interface ShaderProject {
  id: string;
  name: string;
  code: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

const STORAGE_KEY = 'shaderforge-projects';
const PROJECT_VERSION = 1;

function loadProjects(): ShaderProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ({
      ...p,
      version: p.version || PROJECT_VERSION,
    }));
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

  loadProjects: () => {
    const projects = loadProjects();
    set({ projects });
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
    };

    const projects = [...get().projects, project];
    saveProjects(projects);
    set({ projects, currentProjectId: project.id });

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

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    saveProjects(projects);
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
