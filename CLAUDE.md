# ShaderForge

Browser-based Shadertoy-style GLSL shader editor with AI-assisted code generation.

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Build**: Vite 8 + @vitejs/plugin-react
- **State**: Zustand 5 (one store per domain)
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Linting**: ESLint 10 + typescript-eslint

## Architecture

```
src/
├── ai/               # AI service layer
│   ├── adapter.ts    # Provider interface + intent types
│   ├── agent-loop.ts # Retry loop with compile feedback
│   ├── service.ts    # AIService singleton
│   └── providers/    # Mock + OpenAI-compatible providers
├── components/
│   ├── AIChat/       # Chat panel for shader generation
│   ├── Editor/       # Monaco editor with GLSL snippets
│   ├── ErrorBar/     # Compile error display
│   ├── Preview/      # WebGL shader preview
│   ├── Settings/     # Provider configuration
│   └── Toolbar/      # Top toolbar
├── store/            # Zustand stores (editorStore, aiStore, projectStore, previewStore, uiStore)
├── editor/           # Monaco config (error markers, GLSL snippets, shortcuts)
├── templates/        # Shader templates
└── utils/            # debounce, shareUrl
```

## Key Patterns

- **Store pattern**: `create<Interface>((set) => ({ ... }))` from zustand, one file per domain
- **Component style**: Named exports, functional components, hooks at top
- **AI intents**: `create | modify | fix | explain | optimize` — defined in `ai/adapter.ts`
- **Agent loop**: AI generates code → compile → if errors, retry with error context (max 3 attempts)
- **Shader convention**: Shadertoy-style `mainImage(out vec4 fragColor, in vec2 fragCoord)` with `iTime`, `iResolution`, `iMouse` uniforms

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Type-check + production build
npm run lint       # ESLint
```

## Conventions

- No unused locals/params (tsconfig `noUnusedLocals` + `noUnusedParameters`)
- `erasableSyntaxOnly: true` — no runtime enums or namespaces
- JSX: `react-jsx` transform (no React import needed)
- CSS: CSS modules not used — plain CSS files (`App.css`, `index.css`)
- Error boundaries wrap each major panel (AI, Editor, Preview)
- **Image viewing**: Main model (mimo-v2.5-pro[1m]) has no vision. Always delegate image/screenshot reading to a subagent via `Agent(model="haiku")` which uses mimo-v2.5 (vision-capable). Never attempt to read image files directly.

## Rules

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
