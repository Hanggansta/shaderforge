import { useEditorStore } from '../../store/editorStore';

export function ErrorBar() {
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const compileErrors = useEditorStore((s) => s.compileErrors);

  if (compileStatus === 'success') {
    return (
      <div className="error-bar success">
        ✓ Compiled successfully
      </div>
    );
  }

  if (compileStatus === 'error' && compileErrors.length > 0) {
    return (
      <div className="error-bar">
        {compileErrors.map((error, index) => (
          <div key={index}>
            {error.line > 0 && `Line ${error.line}: `}{error.message}
          </div>
        ))}
      </div>
    );
  }

  if (compileStatus === 'compiling') {
    return (
      <div className="error-bar" style={{ color: 'var(--accent-yellow)', background: '#2d1f0e', borderTopColor: 'rgba(210, 153, 34, 0.3)' }}>
        Compiling...
      </div>
    );
  }

  return null;
}
