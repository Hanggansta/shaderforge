import type * as Monaco from 'monaco-editor';

interface ShortcutHandlers {
  onSave: () => void;
  onRecompile: () => void;
}

export function registerShortcuts(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor,
  handlers: ShortcutHandlers
) {
  // Ctrl/Cmd + S: Save
  editor.addAction({
    id: 'shader-save',
    label: 'Save Shader',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    run: () => {
      handlers.onSave();
    },
  });

  // Ctrl/Cmd + Enter: Force recompile
  editor.addAction({
    id: 'shader-recompile',
    label: 'Recompile Shader',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: () => {
      handlers.onRecompile();
    },
  });
}
