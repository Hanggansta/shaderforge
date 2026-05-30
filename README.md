# ShaderForge

Browser-based Shadertoy-style GLSL shader editor with AI-assisted code generation.

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Build**: Vite 8 + @vitejs/plugin-react
- **State**: Zustand 5 (one store per domain)
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Linting**: ESLint 10 + typescript-eslint
- **Testing**: Vitest

## Quick Start

```bash
npm install
npm run dev        # Start dev server (http://localhost:5173)
```

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + production build
npm run lint       # ESLint (0 errors expected)
npm run test       # Vitest (75 tests across 8 files)
```

## AI Provider Setup

1. Click the ⚙️ gear icon in the AI Copilot panel
2. Select a provider (DeepSeek, OpenAI, Groq, Together)
3. Enter your API key
4. Optionally set a custom base URL and model

Or set the `VITE_DEEPSEEK_API_KEY` environment variable for auto-configuration.

## Architecture

```
src/
├── ai/                    # AI service layer
│   ├── adapter.ts         # Provider interface + intent types
│   ├── agent-loop.ts      # Retry loop with compile feedback
│   ├── service.ts         # AIService singleton (orchestrator)
│   ├── conventions.ts     # System prompt construction
│   ├── spec/              # ShaderSpec IR (structured prompt representation)
│   ├── planner/           # TechniquePlan (deterministic spec→technique mapping)
│   ├── library/           # Golden shader examples (10 curated references)
│   ├── modify/            # ModifyIntent parsing + strategy derivation
│   ├── fallback/          # Fallback shaders (8 safe options)
│   ├── telemetry/         # Render quality analysis + auto-repair
│   └── providers/         # Mock + OpenAI-compatible providers
├── components/
│   ├── AIChat/            # Chat panel for shader generation
│   ├── Editor/            # Monaco editor with GLSL snippets
│   ├── Preview/           # WebGL2 shader preview + telemetry
│   ├── DevTools/          # Dev-only test harness (production-gated)
│   ├── ErrorBar/          # Compile error display
│   ├── Settings/          # Provider configuration
│   └── Toolbar/           # Top toolbar
├── store/                 # Zustand stores (editor, ai, project, preview, ui)
├── editor/                # Monaco config (error markers, GLSL snippets, shortcuts)
├── services/shader/       # Shader compiler, validator, wrapper
└── utils/                 # debounce, shareUrl
```

## AI Pipeline

```
User Prompt → ShaderSpec IR → TechniquePlan → Golden Examples → Agent Loop → GLSL
                                          ↓
                                  Modify Intent (modify only)
                                          ↓
                                  Modify Strategy
```

### Intent Modes

| Intent | Description |
|--------|-------------|
| ✨ Create | Generate a new shader from a description |
| ✏️ Modify | Modify the current shader based on instructions |
| 🔧 Fix Error | Auto-fix compilation errors |
| 📖 Explain | Explain how the current shader works |
| ⚡ Optimize | Optimize shader performance |

### Telemetry Pipeline

After AI-generated code compiles successfully:

1. **Pixel capture** — 3 frames analyzed for brightness, contrast, saturation, motion, flicker
2. **Quality signals** — Deterministic threshold-based signal derivation
3. **Quality diagnosis** — LLM-based diagnosis with shouldRepair decision
4. **Repair plan** — LLM-based structured repair plan (only if shouldRepair)
5. **Auto-repair** — One-shot, low-risk-only repair with safety guards

### codeSource Tracking

| codeSource | Set by | Telemetry | Auto-repair |
|------------|--------|-----------|-------------|
| `ai_generation` | `setCodeFromAI()` | ✅ Triggers | ✅ Can apply |
| `quality_repair` | `setCodeFromRepair()` | ❌ Skipped | ❌ Cannot re-trigger |
| `manual` | `setCode()` | ❌ Skipped | ❌ Cannot overwrite |

## Testing

```bash
npm run test       # Run all 75 tests
```

Test files cover:
- `normalizeShaderSpec` — enum validation, numeric clamping, defaults
- `planTechnique` — scene mapping, effects, loop budget
- `selectGoldenExamples` — scoring, performance filtering
- `determineModifyStrategy` — rewrite detection, parameter adjustment
- `deriveQualitySignals` — all threshold checks
- `parseQualityDiagnosis` — JSON parsing, fallback defaults
- `parseQualityRepairPlan` — JSON parsing, no_op fallback
- `canApplyAutoRepair` — safety guard for repair application

## Dev-Only Test Harness

In development mode (`npm run dev`), a test harness panel appears in the bottom-right corner:

- **Shader injection** — Inject known shader presets (black screen, low contrast, flickering, colorful)
- **Repair mode selector** — Control auto-repair behavior (success, invalid, API error, delayed)
- **Status display** — Shows current codeSource and requestId

All harness code is gated behind `import.meta.env.DEV` and excluded from production builds.

## Conventions

- No unused locals/params (tsconfig `noUnusedLocals` + `noUnusedParameters`)
- `erasableSyntaxOnly: true` — no runtime enums or namespaces
- JSX: `react-jsx` transform (no React import needed)
- CSS: Plain CSS files (`App.css`, `index.css`)
- Error boundaries wrap each major panel
- Shadertoy-style `mainImage()` with `iTime`, `iResolution`, `iMouse` uniforms
