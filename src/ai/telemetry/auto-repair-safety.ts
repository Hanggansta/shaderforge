/**
 * Pure guard function for auto-repair apply safety.
 * Determines whether repaired code can be safely applied to the editor.
 */

import type { CodeSource } from '../../store/editorStore';

/** Snapshot of editor state captured when telemetry triggers */
export interface RepairSnapshot {
  requestId: string;
  code: string;
}

/** Current editor state read at apply time */
export interface EditorStateSnapshot {
  codeSource: CodeSource;
  lastRequestId: string | null;
  code: string;
}

/**
 * Returns true only when the editor state is unchanged from when repair was triggered.
 * Prevents overwriting manual edits or concurrent repairs.
 */
export function canApplyAutoRepair(
  snapshot: RepairSnapshot,
  currentState: EditorStateSnapshot
): boolean {
  return (
    currentState.codeSource === 'ai_generation' &&
    currentState.lastRequestId === snapshot.requestId &&
    currentState.code === snapshot.code
  );
}
