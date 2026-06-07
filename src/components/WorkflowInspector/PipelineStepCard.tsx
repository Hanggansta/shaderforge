/**
 * PipelineStepCard — collapsible card for a single WorkflowStep.
 *
 * Compact when collapsed (dot + title + status badge + duration), expands
 * to show: meta line (provider / model / usage), input (JSON tree),
 * output (typed: code, JSON, or refs), prompts (for LLM steps), warnings,
 * and error block.
 */

import { useState, type CSSProperties } from 'react';
import type { WorkflowStep } from '../../shader-agent/integration/workflow-types';
import { StepStatusBadge } from './StepStatusBadge';
import { JsonView } from './JsonView';
import { CodeViewer } from './CodeViewer';
import { PromptViewer } from './PromptViewer';
import { CollapsibleSection } from './CollapsibleSection';

interface PipelineStepCardProps {
  step: WorkflowStep;
  defaultOpen?: boolean;
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatUsage(usage: WorkflowStep['usage']): string {
  if (!usage) return '';
  const total = usage.totalTokens ?? (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);
  return `${total} tokens (${usage.promptTokens ?? '?'}↑ / ${usage.completionTokens ?? '?'}↓)`;
}

const META_LABEL_STYLE: CSSProperties = {
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: 9,
  marginRight: 3,
};
const META_VALUE_STYLE: CSSProperties = {
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
};

function MetaLine({ step }: { step: WorkflowStep }) {
  const items: Array<{ label: string; value: string }> = [];
  if (step.provider) items.push({ label: 'provider', value: step.provider });
  if (step.model) items.push({ label: 'model', value: step.model });
  if (step.usage) items.push({ label: 'usage', value: formatUsage(step.usage) });
  if (step.durationMs !== undefined) items.push({ label: 'duration', value: formatDuration(step.durationMs) });

  if (items.length === 0) return null;
  return (
    <div className="workflow-step-card__meta">
      {items.map((it) => (
        <span key={it.label} className="workflow-step-card__meta-item">
          <span style={META_LABEL_STYLE}>{it.label}</span>
          <strong style={META_VALUE_STYLE}>{it.value}</strong>
        </span>
      ))}
    </div>
  );
}

function renderOutput(step: WorkflowStep) {
  if (step.output === undefined || step.output === null) return null;

  if (step.kind === 'code_agent_generate' || step.kind === 'code_agent_fix_compile' || step.kind === 'code_agent_fix_feedback') {
    if (typeof step.output === 'string') {
      return (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>OUTPUT (GLSL)</div>
          <CodeViewer code={step.output} language="glsl" maxHeight={240} />
        </div>
      );
    }
  }

  if (step.kind === 'shader_compiler' && typeof step.output === 'object') {
    const report = step.output as { ok: boolean; errors: Array<{ line: number; message: string }> };
    return (
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>COMPILE REPORT</div>
        <JsonView value={report} maxStringPreview={120} />
      </div>
    );
  }

  if (step.kind === 'screenshot_renderer' && typeof step.output === 'object') {
    return (
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>OUTPUT</div>
        <JsonView value={step.output} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>OUTPUT</div>
      <JsonView value={step.output} maxStringPreview={120} />
    </div>
  );
}

export function PipelineStepCard({ step, defaultOpen = false }: PipelineStepCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const hasInput = step.input !== undefined;
  const hasOutput = step.output !== undefined && step.output !== null;
  const hasPrompts = step.systemPrompt !== undefined || step.userPromptSent !== undefined || step.rawLlmResponse !== undefined;
  const hasWarnings = step.warnings !== undefined && step.warnings.length > 0;
  const hasNotes = step.notes !== undefined && step.notes.length > 0;

  return (
    <div className="workflow-step-card" data-step-kind={step.kind} data-step-status={step.status}>
      <span
        className={`workflow-step-card__marker ${step.status}`}
        aria-hidden="true"
      />
      <button
        type="button"
        className="workflow-step-card__header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="workflow-step-card__title">{step.title}</span>
        <StepStatusBadge status={step.status} size="sm" showLabel={false} />
        {step.durationMs !== undefined && (
          <span className="workflow-step-card__duration">{formatDuration(step.durationMs)}</span>
        )}
      </button>

      {open && (
        <div className="workflow-step-card__body">
          <MetaLine step={step} />

          {hasNotes && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {step.notes}
            </div>
          )}

          {step.error && (
            <div
              className="workflow-step-card__errors"
              style={{
                background: 'rgba(248, 81, 73, 0.08)',
                border: '1px solid rgba(248, 81, 73, 0.3)',
                borderRadius: 3,
                padding: '4px 8px',
              }}
            >
              <ul style={{ margin: 0, padding: 0 }}>
                <li>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{step.error.message}</span>
                </li>
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div className="workflow-step-card__warnings">
              <ul style={{ margin: 0, padding: 0 }}>
                {step.warnings!.map((w, i) => (
                  <li key={i} style={{ color: 'var(--accent-yellow)' }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {hasInput && (
            <CollapsibleSection title="Input" defaultOpen={false}>
              <JsonView value={step.input} maxStringPreview={80} />
            </CollapsibleSection>
          )}

          {hasOutput && (
            <CollapsibleSection title="Output" defaultOpen={false}>
              {renderOutput(step)}
            </CollapsibleSection>
          )}

          {hasPrompts && (
            <CollapsibleSection title="LLM" defaultOpen={false}>
              <PromptViewer
                system={step.systemPrompt}
                user={step.userPromptSent}
                raw={step.rawLlmResponse}
              />
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
