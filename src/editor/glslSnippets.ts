import type * as Monaco from 'monaco-editor';

export function registerGLSLSnippets(monaco: typeof Monaco) {
  monaco.languages.registerCompletionItemProvider('glsl', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [
        // mainImage function
        {
          label: 'mainImage',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) {\n\t// Normalized pixel coordinates (0 to 1)\n\tvec2 uv = fragCoord / iResolution.xy;\n\t\n\t$0\n\t\n\tfragColor = vec4(uv, 0.5, 1.0);\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Shadertoy-style mainImage function',
          range,
        },
        // UV normalization
        {
          label: 'uv-normalize',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'vec2 uv = fragCoord / iResolution.xy;',
          documentation: 'Normalize pixel coordinates to 0-1 range',
          range,
        },
        // UV centered
        {
          label: 'uv-centered',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);',
          documentation: 'Centered UV coordinates (-0.5 to 0.5, aspect ratio corrected)',
          range,
        },
        // UV aspect ratio
        {
          label: 'uv-aspect',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'vec2 uv = fragCoord / iResolution.xy;\nuv.x *= iResolution.x / iResolution.y;',
          documentation: 'UV with aspect ratio correction',
          range,
        },
        // Time animation
        {
          label: 'time-animate',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'float t = iTime * $1; // Animation speed',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Time-based animation variable',
          range,
        },
        // Palette helper
        {
          label: 'palette',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '// Cosine palette function',
            'vec3 palette(float t) {',
            '\tvec3 a = vec3(0.5, 0.5, 0.5);',
            '\tvec3 b = vec3(0.5, 0.5, 0.5);',
            '\tvec3 c = vec3(1.0, 1.0, 1.0);',
            '\tvec3 d = vec3(0.263, 0.416, 0.557);',
            '\treturn a + b * cos(6.28318 * (c * t + d));',
            '}',
          ].join('\n'),
          documentation: 'Inigo Quilez cosine color palette',
          range,
        },
        // Rotation 2D
        {
          label: 'rotate2d',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'mat2 rotate2d(float angle) {',
            '\tfloat s = sin(angle);',
            '\tfloat c = cos(angle);',
            '\treturn mat2(c, -s, s, c);',
            '}',
          ].join('\n'),
          documentation: '2D rotation matrix',
          range,
        },
        // Circle SDF
        {
          label: 'sdf-circle',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'float circle = length($1 - $2) - $3; // center, point, radius',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Circle signed distance function',
          range,
        },
        // Smooth step
        {
          label: 'smooth-edge',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'float edge = smoothstep($1, $2, $3); // edge0, edge1, x',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Smooth edge transition',
          range,
        },
        // Uniforms
        {
          label: 'iTime',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'iTime',
          documentation: 'Elapsed time in seconds',
          range,
        },
        {
          label: 'iResolution',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'iResolution',
          documentation: 'Viewport resolution (width, height, pixel ratio)',
          range,
        },
        {
          label: 'iMouse',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'iMouse',
          documentation: 'Mouse coordinates (xy = current, zw = click)',
          range,
        },
        {
          label: 'iFrame',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'iFrame',
          documentation: 'Frame counter',
          range,
        },
        {
          label: 'iTimeDelta',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'iTimeDelta',
          documentation: 'Time since last frame in seconds',
          range,
        },
        {
          label: 'iDate',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'iDate',
          documentation: 'Date (year, month, day, seconds)',
          range,
        },
      ];

      return { suggestions };
    },
  });
}
