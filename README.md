# ShaderLumen

Browser-based Shadertoy-style GLSL shader editor with AI-assisted shader generation.

> **V1 状态**：V1 完成，V2 完成。
> V1 计划原文：`shader_agent_harness_plan.html`。
> V1-V5 roadmap / 验收标准：[CLAUDE.md](./CLAUDE.md)。
> 设计语言：[DESIGN.md](./DESIGN.md)。

## What ShaderLumen Does (V1)

ShaderLumen turns a natural-language prompt into a runnable GLSL shader, compiles it in the browser via WebGL2, and renders multi-frame screenshots — all through a fixed 5-step agent workflow.

```
User Prompt
   ↓
Agent 1: Visual Structurer ──→ VisualCard
   ↓
Agent 2: Shader Planner ──→ ShaderPlan
   ↓
Tool 1: Reference Selector ──→ 3-5 technique cards
   ↓
Agent 3: Code/Patch Agent ──→ GLSL (mainImage)
   ↓
Tool 2: Shader Compiler ──→ CompileReport (real WebGL2)
   ↓
Tool 3: Screenshot Renderer ──→ Multi-frame PNG
   ↓
Output
```

V1 scope is **minimum viable loop**: input prompt → compileable ShaderToy code + screenshots. Visual aesthetic / auto-repair / RAG / reference image are V2-V5.

## Quick Start

```bash
npm install
npm run dev        # Start dev server (http://localhost:5173)
```

Click the ⚙️ gear in the AI Copilot panel, choose **Mock** for a free zero-config test, or pick OpenAI / DeepSeek / Groq / Together and paste an API key.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # TypeScript check + production build
npm run lint       # ESLint (0 errors expected)
npm test           # Vitest (34 tests across 5 files)
```

## AI Provider Setup

ShaderLumen ships with a `Mock` provider for zero-config testing.

For real LLM usage:

1. Click the ⚙️ gear in the AI Copilot panel.
2. Select a provider (OpenAI / DeepSeek / Groq / Together).
3. Paste your API key (stored in `localStorage` — never committed).
4. Optionally set a custom base URL and model name.

Or set `VITE_OPENAI_API_KEY` / `VITE_DEEPSEEK_API_KEY` etc. in `.env.local` (gitignored).

## Architecture

```
src/
├── shader-agent/                # V1 harness 核心
│   ├── schemas/                 # 5 个 V1 schema
│   │   ├── visual-card.ts
│   │   ├── shader-plan.ts
│   │   ├── reference-card.ts
│   │   ├── compile-report.ts
│   │   └── shader-result.ts
│   ├── agents/                  # 3 个 V1 Agent
│   │   ├── visual-structurer.ts
│   │   ├── shader-planner.ts
│   │   └── code-patch-agent.ts
│   ├── tools/                   # 3 个 V1 Tool
│   │   ├── reference-selector.ts
│   │   ├── shader-compiler.ts
│   │   └── screenshot-renderer.ts
│   ├── workflows/               # V1 固定 workflow
│   │   ├── generate-shader.ts
│   │   └── patch-shader.ts
│   ├── kb/                      # 9 张 golden shader（V1 起步）
│   ├── runs/                    # in-memory run artifact store
│   ├── llm-client.ts            # LLMClient 抽象
│   ├── presets.ts               # 10 个 starter preset
│   ├── integration/             # 桥接 aiStore / AIChatPanel
│   │   ├── service.ts           #   shaderAgent 单例
│   │   ├── llm-adapters.ts      #   OpenAI-compatible / Mock
│   │   ├── providers/           #   provider 实现
│   │   ├── agent-result-adapter.ts
│   │   └── agent-result-types.ts
│   └── __tests__/               # 5 文件 / 34 测试
├── services/
│   └── shader/                  # 浏览器内 WebGL 编译 + 截图（offscreen-renderer）
├── components/                  # Preview / Editor / AIChat / Settings / Toolbar / ErrorBar
├── store/                       # Zustand: editor / ai / project / preview / ui
├── editor/                      # Monaco config + GLSL snippets
├── templates/                   # 内置 starter template
└── utils/                       # debounce / shareUrl
```

## AI Pipeline (V1)

V1 跑的是**固定 5 步 workflow**，Agent 不允许自由接力。

| Step | Type | What it does |
|---|---|---|
| 1 | **Agent** | Visual Structurer — LLM 把 prompt 拆成 structured `VisualCard` (mustHave/avoid/palette/motion/composition) |
| 2 | **Agent** | Shader Planner — LLM 把 `VisualCard` 拆成 `ShaderPlan` (modules + referenceNeeds) |
| 3 | **Tool** | Reference Selector — deterministic 选 3-5 张 technique card，fallback 到 9 张 golden shader |
| 4 | **Agent** | Code/Patch Agent — LLM 生成 Shadertoy `mainImage(out vec4 fragColor, in vec2 fragCoord)` |
| 5 | **Tool** | Shader Compiler — 浏览器 WebGL2 真实编译，返 `CompileReport` |
| 6 | **Tool** | Screenshot Renderer — 多帧截图（t=0/1/2/4/8）存到 in-memory run artifact |

V1 compile 失败**不自动 retry**；错误日志进 ErrorBar，用户改 prompt 重跑或手动改 GLSL。V2 才加 2-3 次 retry。

### Intent Modes (V1)

V1 只支持 2 个 intent mode：

| Intent | Description |
|---|---|
| ✨ Create | Generate a new shader from a description |
| ✏️ Modify | Modify the current shader based on instructions |

V1 故意砍掉的 mode（V2-V5 才加）：

- ❌ 🔧 Fix Error（V2 才做 auto-repair）
- ❌ 📖 Explain（V5 才做）
- ❌ ⚡ Optimize（V5 才做）

## Testing

```bash
npm test           # 5 files / 34 tests
```

Test files cover:

- `schemas` — VisualCard / ShaderPlan / CompileReport / ShaderResult validation
- `agents` — Visual Structurer / Planner / Code Agent schema conformance
- `workflows` — generate / patch workflow state machine
- `service` — `shaderAgent` singleton contract
- `agent-result-adapter` — ShaderResult → AgentResult bridging

Browser-side real WebGL2 编译无法在 Vitest 跑，**视觉验证**需要 `npm run dev` 手动看。

## Conventions

- No unused locals/params (`noUnusedLocals` + `noUnusedParameters`).
- `erasableSyntaxOnly: true` — no runtime enums or namespaces.
- JSX: `react-jsx` transform (no React import needed).
- CSS: plain CSS files.
- Error boundaries wrap each major panel (AI / Editor / Preview).
- Shadertoy-style `mainImage(out vec4 fragColor, in vec2 fragCoord)` with `iTime` / `iResolution` / `iMouse` uniforms.
- `.env` / 截图 / 临时文件不进 git（见 `.gitignore`）。

## V1-V5 Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| **V1** | 跑通最小闭环 (3 Agents + 3 Tools 固定 workflow) | ✅ Done |
| **V2** | 编译自动修复（2-3 retry） | ✅ Done |
| **V3** | 截图反馈 Patch + Modify Flow | ⏳ Planned |
| **V4** | Technique Cards 扩到 20-50 张 | ⏳ Planned |
| **V5** | Mastra / 半 RAG / 视觉评估 | ⏳ Planned |

V1 不偷做 V2-V5 的事；V2-V5 不假装已经在 V1 跑通。

## License

MIT for original code. Third-party shader snippets (e.g. golden shaders) are hand-rewritten from public references and re-released under MIT. No proprietary assets shipped.
