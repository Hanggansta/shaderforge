/**
 * PromptViewer — display LLM system/user/raw prompts in monospace with folding.
 *
 * Each section (system / user / raw) is its own CollapsibleSection so a
 * long system prompt doesn't bury the user prompt.
 */

import { CollapsibleSection } from './CollapsibleSection';

interface PromptViewerProps {
  system?: string;
  user?: string;
  raw?: string;
  systemLabel?: string;
  userLabel?: string;
  rawLabel?: string;
  defaultOpen?: boolean;
}

export function PromptViewer({
  system,
  user,
  raw,
  systemLabel = 'system prompt',
  userLabel = 'user prompt (sent to LLM)',
  rawLabel = 'raw LLM response',
  defaultOpen = false,
}: PromptViewerProps) {
  const hasAny = system !== undefined || user !== undefined || raw !== undefined;
  if (!hasAny) {
    return (
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          padding: '2px 0',
        }}
      >
        No prompt data captured in V1 harness.
      </div>
    );
  }

  return (
    <div className="workflow-prompt-viewer" style={{ display: 'flex', flexDirection: 'column' }}>
      {system !== undefined && (
        <CollapsibleSection title={systemLabel} defaultOpen={defaultOpen}>
          <CodeBlock content={system} />
        </CollapsibleSection>
      )}
      {user !== undefined && (
        <CollapsibleSection title={userLabel} defaultOpen={defaultOpen}>
          <CodeBlock content={user} />
        </CollapsibleSection>
      )}
      {raw !== undefined && (
        <CollapsibleSection title={rawLabel} defaultOpen={defaultOpen}>
          <CodeBlock content={raw} />
        </CollapsibleSection>
      )}
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  return (
    <pre
      style={{
        background: 'var(--bg-primary)',
        padding: 8,
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        overflow: 'auto',
        maxHeight: 240,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: '1px solid var(--border-color)',
      }}
    >
      <code>{content}</code>
    </pre>
  );
}
