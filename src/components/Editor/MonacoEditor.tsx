import { useRef, useEffect, useCallback } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import { registerGLSLSnippets } from '../../editor/glslSnippets';
import { setErrorMarkers, clearErrorMarkers } from '../../editor/errorMarkers';
import { registerShortcuts } from '../../editor/shortcuts';

// GLSL language definition
const GLSL_LANGUAGE = {
  defaultToken: 'source',
  keywords: [
    'attribute', 'const', 'uniform', 'varying', 'break', 'continue', 'do',
    'for', 'while', 'if', 'else', 'in', 'out', 'inout', 'float', 'int',
    'void', 'bool', 'true', 'false', 'lowp', 'mediump', 'highp', 'precision',
    'invariant', 'discard', 'return', 'mat2', 'mat3', 'mat4', 'vec2', 'vec3',
    'vec4', 'ivec2', 'ivec3', 'ivec4', 'bvec2', 'bvec3', 'bvec4', 'sampler2D',
    'samplerCube', 'struct',
  ],
  builtins: [
    'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
    'abs', 'sign', 'floor', 'ceil', 'fract', 'mod', 'min', 'max', 'clamp',
    'mix', 'step', 'smoothstep', 'length', 'distance', 'dot', 'cross',
    'normalize', 'faceforward', 'reflect', 'refract',
    'matrixCompMult', 'lessThan', 'lessThanEqual', 'greaterThan',
    'greaterThanEqual', 'equal', 'notEqual', 'any', 'all', 'not',
    'texture2D', 'textureCube', 'texture2DProj', 'texture2DLod',
    'dFdx', 'dFdy', 'fwidth',
  ],
  operators: [
    '=', '>', '<', '!', '~', '?', ':',
    '==', '<=', '>=', '!=', '&&', '||', '++', '--',
    '+', '-', '*', '/', '&', '|', '^', '%', '<<', '>>', '>>>',
    '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '<<=', '>>=',
  ],
  symbols: /[=><!~?:&|+\-*/^%]+/,
  digits: /\d+(_+\d+)*/,
  tokenizer: {
    root: [
      [/#\w+/, 'keyword.directive'],
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@builtins': 'type.identifier',
          '@default': 'source',
        },
      }],
      { include: '@whitespace' },
      [/[{}()[\]]/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],
      [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],
    ],
    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
  },
};

// Custom dark theme
const GLSL_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'source', foreground: 'c9d1d9' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'keyword.directive', foreground: 'd2a8ff' },
    { token: 'type.identifier', foreground: '79c0ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'number.float', foreground: '79c0ff' },
    { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
    { token: 'operator', foreground: 'ff7b72' },
    { token: 'brackets', foreground: 'c9d1d9' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#161b22',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#264f7855',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#c9d1d9',
    'editorCursor.foreground': '#58a6ff',
    'editor.wordHighlightBackground': '#264f7855',
    'editorBracketMatch.background': '#264f7855',
    'editorBracketMatch.border': '#58a6ff',
    'editorGutter.background': '#0d1117',
    'editorWidget.background': '#161b22',
    'editorWidget.border': '#30363d',
    'editorSuggestWidget.background': '#161b22',
    'editorSuggestWidget.border': '#30363d',
    'editorSuggestWidget.selectedBackground': '#21262d',
    'editorHoverWidget.background': '#161b22',
    'editorHoverWidget.border': '#30363d',
  },
};

export function MonacoEditor() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  /** Guard to prevent handleChange from firing during programmatic setValue */
  const settingValueRef = useRef(false);
  const code = useEditorStore((s) => s.code);
  const compileErrors = useEditorStore((s) => s.compileErrors);
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const setCode = useEditorStore((s) => s.setCode);
  const setCompileStatus = useEditorStore((s) => s.setCompileStatus);

  const handleSave = useCallback(() => {
    // Save to localStorage
    const code = useEditorStore.getState().code;
    localStorage.setItem('shaderforge-current', code);
    console.log('Shader saved');
  }, []);

  const handleRecompile = useCallback(() => {
    setCompileStatus('compiling');
    // The PreviewPanel will pick up the code change and recompile
  }, [setCompileStatus]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register GLSL language
    monaco.languages.register({ id: 'glsl' });
    monaco.languages.setMonarchTokensProvider('glsl', GLSL_LANGUAGE as Monaco.languages.IMonarchLanguage);

    // Define theme
    monaco.editor.defineTheme('shaderforge-dark', GLSL_THEME as Monaco.editor.IStandaloneThemeData);
    monaco.editor.setTheme('shaderforge-dark');

    // Set model language
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'glsl');
    }

    // Register snippets
    registerGLSLSnippets(monaco);

    // Register shortcuts
    registerShortcuts(monaco, editor, {
      onSave: handleSave,
      onRecompile: handleRecompile,
    });

    // Focus editor
    editor.focus();
  };

  const handleChange: OnChange = (value) => {
    if (value !== undefined && !settingValueRef.current) {
      setCode(value);
    }
  };

  // Update error markers when compile errors change
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (compileStatus === 'error' && compileErrors.length > 0) {
        setErrorMarkers(monacoRef.current, model, compileErrors);
      } else {
        clearErrorMarkers(monacoRef.current, model);
      }
    }
  }, [compileErrors, compileStatus]);

  // Update editor when code changes externally (e.g., from AI)
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== code) {
        settingValueRef.current = true;
        editorRef.current.setValue(code);
        settingValueRef.current = false;
      }
    }
  }, [code]);

  return (
    <div className="editor-container">
      <Editor
        defaultLanguage="glsl"
        defaultValue={code}
        theme="shaderforge-dark"
        onMount={handleMount}
        onChange={handleChange}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          wordWrap: 'off',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 12, bottom: 12 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
