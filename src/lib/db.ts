import Dexie, { type Table } from 'dexie';
import {
  getEffectiveUserId,
  hasMigrated,
  markMigrated,
} from './auth';

export interface CloudProject {
  id: string;
  userId: string;
  name: string;
  code: string;
  description?: string;
  tags?: string[];
  isPublic: boolean;
  visualScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface GenerationRun {
  id: string;
  userId: string;
  projectId?: string;
  prompt: string;
  finalCode?: string;
  visualScore?: number;
  attempts: number;
  success: boolean;
  candidateCount: number;
  createdAt: number;
}

class ShaderLumenDB extends Dexie {
  projects!: Table<CloudProject, string>;
  runs!: Table<GenerationRun, string>;

  constructor() {
    super('shaderforge-db');
    this.version(1).stores({
      projects: 'id, userId, isPublic, updatedAt',
      runs: 'id, userId, projectId, createdAt, success',
    });
  }
}

export const db = new ShaderLumenDB();

/** @deprecated Use getEffectiveUserId from auth.ts */
export function getCurrentUserId(): string {
  return getEffectiveUserId();
}

export async function migrateUserData(fromUserId: string, toUserId: string): Promise<void> {
  if (fromUserId === toUserId || hasMigrated(fromUserId, toUserId)) return;

  await db.transaction('rw', db.projects, db.runs, async () => {
    const projects = await db.projects.where('userId').equals(fromUserId).toArray();
    for (const project of projects) {
      await db.projects.put({ ...project, userId: toUserId });
    }

    const runs = await db.runs.where('userId').equals(fromUserId).toArray();
    for (const run of runs) {
      await db.runs.put({ ...run, userId: toUserId });
    }
  });

  markMigrated(fromUserId, toUserId);
}

export async function saveCloudProject(
  project: Omit<CloudProject, 'userId' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<CloudProject> {
  const userId = getEffectiveUserId();
  const now = Date.now();

  const full: CloudProject = {
    id: project.id || `proj_${now}_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    name: project.name,
    code: project.code,
    description: project.description,
    tags: project.tags || [],
    isPublic: project.isPublic ?? false,
    visualScore: project.visualScore,
    createdAt: now,
    updatedAt: now,
  };

  await db.projects.put(full);
  return full;
}

export async function listCloudProjects(includePublic = false): Promise<CloudProject[]> {
  const userId = getEffectiveUserId();
  const query = db.projects.where('userId').equals(userId);

  if (includePublic) {
    const publicOnes = await db.projects.where('isPublic').equals(1).toArray();
    const own = await query.toArray();
    const map = new Map(own.map((p) => [p.id, p]));
    publicOnes.forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return (await query.toArray()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCloudProject(id: string): Promise<CloudProject | undefined> {
  const project = await db.projects.get(id);
  if (!project) return undefined;
  const userId = getEffectiveUserId();
  if (project.userId !== userId && !project.isPublic) return undefined;
  return project;
}

export async function deleteCloudProject(id: string): Promise<void> {
  const userId = getEffectiveUserId();
  const project = await db.projects.get(id);
  if (!project || project.userId !== userId) return;
  await db.projects.delete(id);
}

export async function recordGenerationRun(
  run: Omit<GenerationRun, 'userId' | 'createdAt'>,
): Promise<GenerationRun> {
  const userId = getEffectiveUserId();
  const full: GenerationRun = {
    ...run,
    userId,
    createdAt: Date.now(),
  };
  await db.runs.put(full);
  return full;
}

export async function listRecentRuns(limit = 20): Promise<GenerationRun[]> {
  const userId = getEffectiveUserId();
  return db.runs
    .where('userId')
    .equals(userId)
    .reverse()
    .limit(limit)
    .toArray();
}