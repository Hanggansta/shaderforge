export type ModifyTarget =
  | 'motion_speed'
  | 'color'
  | 'brightness'
  | 'contrast'
  | 'density'
  | 'glow'
  | 'noise'
  | 'composition'
  | 'style'
  | 'scene'
  | 'effect'
  | 'interaction'
  | 'unknown';

export type ModifyAction =
  | 'increase'
  | 'decrease'
  | 'set'
  | 'add'
  | 'remove'
  | 'replace'
  | 'unknown';

export interface ModifyOperation {
  target: ModifyTarget;
  action: ModifyAction;
  value?: string;
  strength: number;
}

export interface ModifyIntent {
  language: 'en' | 'zh' | 'mixed' | 'unknown';
  operations: ModifyOperation[];
  preserveCurrentStructure: boolean;
  requiresFullRewrite: boolean;
  confidence: number;
  summary: string;
  preserve: string[];
  avoid: string[];
}
