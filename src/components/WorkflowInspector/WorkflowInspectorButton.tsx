/**
 * WorkflowInspectorButton — floating button placed in the Preview header.
 *
 * Toggles the Inspector drawer open/closed. Reuses the .preview-btn
 * CSS class for visual consistency with the other preview buttons
 * (Snapshot, Maximize, Fullscreen).
 */

interface WorkflowInspectorButtonProps {
  open: boolean;
  onClick: () => void;
}

export function WorkflowInspectorButton({ open, onClick }: WorkflowInspectorButtonProps) {
  return (
    <button
      type="button"
      className={`preview-btn ${open ? 'active' : ''}`}
      onClick={onClick}
      style={{ padding: '2px 6px', fontSize: 12 }}
      title={open ? 'Close workflow inspector' : 'Open workflow inspector'}
      data-testid="workflow-inspector-button"
      aria-pressed={open}
    >
      🧠 Workflow
    </button>
  );
}
