import type * as Monaco from 'monaco-editor';
import type { ShaderError } from '../store/editorStore';

const OWNER = 'shader-compiler';

export function setErrorMarkers(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel | null,
  errors: ShaderError[]
) {
  if (!model) return;

  const markers: Monaco.editor.IMarkerData[] = errors.map((error) => ({
    severity: monaco.MarkerSeverity.Error,
    message: error.message,
    startLineNumber: error.line,
    startColumn: error.column || 1,
    endLineNumber: error.line,
    endColumn: error.column ? error.column + 10 : 999,
    source: OWNER,
  }));

  monaco.editor.setModelMarkers(model, OWNER, markers);
}

export function clearErrorMarkers(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel | null
) {
  if (!model) return;
  monaco.editor.setModelMarkers(model, OWNER, []);
}
