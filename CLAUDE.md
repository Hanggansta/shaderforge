# ShaderForge

Browser-based Shadertoy-style GLSL shader editor with AI-assisted code generation.
## Product North Star

ShaderForge is not just a Shadertoy clone with AI code generation.

ShaderForge is an AI-native shader creation studio: a visual invention machine where users can create, modify, debug, critique, and refine GLSL shader art through natural language, reference images, visual feedback, agent loops, and structured shader knowledge.

The goal is not merely compiling valid GLSL. The goal is to help users produce visually ambitious, editable, performant, Shadertoy-style procedural art.

Core product principles:

* Visual quality matters as much as code correctness.
* A shader that compiles but looks boring is not a successful result.
* Natural-language intent must be understood structurally, not reduced to keyword matching.
* Reference images must be analyzed through the vision pipeline before visual conclusions are made.
* AI generation should move through a creative loop: intent → visual spec → GLSL plan → code → compile check → performance check → visual critique → refinement.
* The product should make shader creation feel magical, controllable, inspectable, and iterative.
* Do not downgrade ambitious visual goals into safe templates, generic gradients, or low-effort noise fields.

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
│   ├── knowledge/    # Shader knowledge base
│   │   ├── rag/      # RAG system (types, search, embeddings, loader, preprocess)
│   │   ├── scene-instructions.ts  # Scene-specific GLSL techniques
│   │   ├── mood-palettes.ts       # Mood → color palette mapping
│   │   ├── motion-patterns.ts     # Motion → GLSL animation patterns
│   │   └── pitfalls.ts            # Common GLSL generation pitfalls
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

## Vision Routing

Main thread model: `mimo-v2.5-pro[1m]` — **cannot read images**. Main thread visual tasks MUST go through `mimo-vision-agent`.

All subagents use `model: haiku` (mimo-v2.5) — **they can read images directly** and do not need routing through `mimo-vision-agent`.

### Main Thread Rules

1. **ALWAYS** call `mimo-vision-agent` for any visual analysis on the main thread.
2. **NEVER** pass full conversation history to the vision agent — only the current image/path and minimal task context.
3. If the image is already in context (user pasted it directly), you MUST still call `mimo-vision-agent` — do not analyze it yourself.

### Subagent Rules

Subagents can read images directly. Each agent has **Visual Analysis Standards** in its definition specifying the required analysis quality and granularity for its domain.

### Vision Report Requirements

`mimo-vision-agent` must return **detailed, thorough** visual reports. Do not summarize or abbreviate.

Required sections (all mandatory, every time):
1. Visual Summary
2. Detailed Visual Breakdown (composition, color, lighting, texture, depth)
3. Shader-Specific Analysis (technique, quality metrics, artifacts)
4. UI-Specific Analysis (layout, components, information architecture)
5. Comparison Analysis (when reference image provided)
6. Actionable Guidance (specific, prioritized, not vague)
7. Uncertainties

If the image type is ambiguous, include ALL relevant analysis sections (both Section 3 and Section 4). Do not guess the type and skip a section.

Hard rules for reports:
- Name colors by specific hue ("deep magenta", "cool cyan"), not generic ("blue", "red")
- Explain WHY something works or fails, not just THAT it does
- Provide concrete, actionable guidance — specific GLSL techniques, specific CSS changes
- Commit to observations; move ambiguity to Uncertainties section
- Report ALL sections even if brief — structure consistency aids downstream parsing

## Subagents

### Available Agents

| Agent | Model | Role | Visual | Edit |
|---|---|---|---|---|
| mimo-vision-agent | haiku | 视觉分析专用（主线程调用） | ✅ | ❌ |
| glsl-shadertoy-engineer | haiku | GLSL 代码审查、shader 视觉质量评审 | ✅ | ❌ |
| frontend-product-engineer | haiku | UI/UX 审查、布局分析、交互评估 | ✅ | ❌ |
| shader-runtime-debugger | haiku | 调试编译失败、运行时 bug、修复代码 | ✅ | ✅ |
| performance-safety-engineer | haiku | 性能分析、安全审查、浏览器冻结风险 | ✅ | ❌ |
| qa-regression-engineer | haiku | 测试设计、回归验证、QA 检查 | ✅ | ❌ |
| ai-shader-pipeline-architect | sonnet | AI 管线架构审查、intent/spec/plan 设计 | ❌ | ❌ |
| principal-architect | sonnet | 系统架构审查、模块边界、技术债 | ❌ | ❌ |

### When to Use Which Agent

| 任务类型 | 首选 Agent | 备选 |
|---|---|---|
| 看图分析（主线程） | mimo-vision-agent | — |
| 审查 GLSL 代码质量 | glsl-shadertoy-engineer | — |
| 审查 UI/UX | frontend-product-engineer | — |
| 调试 shader 编译/运行时问题 | shader-runtime-debugger | — |
| 分析 shader 性能/安全 | performance-safety-engineer | — |
| 设计/验证测试 | qa-regression-engineer | — |
| 审查 AI 管线架构 | ai-shader-pipeline-architect | — |
| 审查系统架构 | principal-architect | — |
| 广度搜索（找文件/代码位置） | Explore（内置） | 主线程 Glob/Grep |
| 设计实现方案 | Plan（内置） | 主线程直接分析 |
| 没有匹配的 agent | 主线程直接完成 | — |

### How to Call

```
Agent(subagent_type: "agent-name", prompt: "任务描述")
```

- `subagent_type` 必须与 `.claude/agents/` 中的文件名（不含 `.md`）完全匹配
- `prompt` 应该清晰、具体、有限范围
- 对于后台 agent 使用 `run_in_background: true`

### Priority Rules

1. **项目 agent 优先**：有匹配职责的项目 agent 时，必须使用项目 agent
2. **主线程兜底**：没有匹配的项目 agent 时，在主线程上直接完成
3. **内置 agent 补充**：仅当项目 agent 和主线程都不适合时，使用内置 agent

### Built-in Agent Rules

- **Explore**：仅用于广度搜索（找文件、找代码位置、搜索关键词），不用于深度分析或读取完整文件
- **Plan**：仅用于设计方案，不用于直接执行或修改文件
- **general-purpose**：不建议使用，优先用项目 agent 或主线程
- **禁止**：不使用内置 agent 处理视觉任务（必须用 mimo-vision-agent 或有视觉能力的项目 agent）

### Failure Handling

**如果任何 subagent 没有返回结果（空输出、超时、静默失败），必须立即提醒用户。** 不要忽略失败的 agent，不要假装它成功了。

检测方式：
- 后台 agent 完成后检查输出是否为空
- Agent 返回后检查是否有实际内容
- 如果 agent 在合理时间内没有响应，告知用户

## Rules

### 1. Think Before Coding, But Do Not Stall

Do not hide uncertainty. State assumptions and tradeoffs clearly.

However, uncertainty is not automatically a stop condition. If a decision is safe, reversible, and grounded in the repository, make a reasonable assumption and continue.

Ask the user only when the decision is destructive, security-sensitive, payment-related, requires external credentials, changes model/provider routing, or is likely to cause major rework.

### 2. Use the Right Mode: Maintenance vs Innovation

ShaderForge has two working modes.

#### Maintenance Mode

Use conservative engineering when the user asks for:

* bug fixes,
* regressions,
* type errors,
* build failures,
* small UI corrections,
* performance hazards,
* broken provider settings.

In this mode, keep changes focused and verify carefully.

#### Innovation Mode

Use ambitious system-building when the user asks for:

* AI shader generation quality,
* agent loop improvements,
* visual critique,
* reference image matching,
* RAG / shader knowledge,
* natural-language modification,
* shader style systems,
* world-class product experience,
* revolutionary creative workflow.

In this mode, do not hide behind minimal patches. Build the architecture, state model, interfaces, demo paths, and validation loops needed for the final product.

### 3. Do Not Downgrade Creative Goals

Do not replace ambitious shader creation goals with:

* generic gradients,
* random noise fields,
* plain color palette swaps,
* shallow keyword matching,
* one-off templates,
* compile-only success,
* low-effort UI polish.

If the full feature is too large, implement the strongest useful slice:

* structured types,
* pipeline boundary,
* visible prototype,
* test/demo path,
* fallback behavior,
* clear next step.

Never claim a feature is complete if only a placeholder exists.

### 4. Natural Language Intent Must Be Structured

Do not use keyword matching as the primary mechanism for create/modify intent.

The main path should convert user requests into structured shader intent/spec, such as:

* scene,
* subject,
* palette,
* mood,
* motion,
* material,
* camera,
* depth,
* composition,
* interaction,
* complexity,
* performance budget,
* requested edit target.

Keyword rules may be used only as fallback, validation, or safety guardrails.

Modification requests must identify what the user wants changed and what must be preserved.

### 5. Visual Quality Bar

A generated shader is successful only if it is:

* compilable,
* visually aligned with the prompt,
* aesthetically strong,
* animated with purpose,
* readable as a coherent scene or material,
* performant enough not to freeze the browser,
* editable for follow-up prompts.

Evaluate visual quality using:

* composition,
* depth,
* color harmony,
* motion quality,
* material richness,
* procedural detail,
* prompt alignment,
* uniqueness,
* performance,
* editability.

A shader that only compiles is not enough.

### 6. Creative Agent Loop

For major AI shader work, prefer this loop:

1. parse user intent into structured shader spec,
2. retrieve relevant shader knowledge or patterns,
3. create a shader plan,
4. generate GLSL,
5. compile and repair errors,
6. check performance risk,
7. use visual analysis when screenshots or reference images are involved,
8. refine based on visual critique,
9. report what improved and what remains.

Do not stop at compile success when the user asked for visual excellence.

### 7. Reference Image Workflow

When the user provides a reference image, follow the Vision Routing rules exactly.

Main thread visual analysis MUST go through `mimo-vision-agent`.

The reference workflow should be:

1. call `mimo-vision-agent`,
2. extract composition, color, lighting, texture, depth, subject, and artifacts,
3. translate the visual report into ShaderSpec requirements,
4. identify GLSL techniques needed,
5. generate or modify shader code,
6. compare output against the reference when possible,
7. iterate with concrete visual deltas.

Do not guess image contents on the main thread.

### 8. Subagent Discipline

Use project agents when their role matches the task.

* Use `mimo-vision-agent` for main-thread visual analysis.
* Use `glsl-shadertoy-engineer` for GLSL quality review.
* Use `shader-runtime-debugger` for compile/runtime repair.
* Use `performance-safety-engineer` for browser freeze and GPU-risk analysis.
* Use `frontend-product-engineer` for UI/UX review.
* Use `ai-shader-pipeline-architect` for intent/spec/agent-loop design.
* Use `principal-architect` for major system boundaries.

If a subagent returns empty output, times out, or silently fails, report it. Do not pretend it succeeded.

### 9. Performance Safety Is Part of Visual Quality

Beautiful shaders must not freeze the browser.

Watch for:

* unbounded loops,
* excessive raymarch steps,
* nested expensive noise,
* high iteration fractals,
* divergent branches,
* textureless feedback loops,
* resolution-dependent explosions,
* mobile-hostile workloads.

When visual ambition conflicts with safety, preserve the look through cheaper approximations, quality tiers, or fallback paths.

### 10. Verification

Run relevant checks after changes:

* `npm run build` for production-impacting changes,
* `npm run lint` for lint/type issues,
* shader compile checks for GLSL generation,
* visual inspection or vision-agent critique for visual tasks,
* performance review for heavy shaders.

If a check cannot run, explain why and continue with other verifiable work.

### 11. Completion Report

At the end of each run, report:

* completed work units,
* files changed,
* visible product changes,
* shader quality impact,
* agent calls used,
* checks run,
* checks not run and why,
* known gaps,
* next recommended work units.

Do not report “done” for a visual feature unless it is visible, testable, or demonstrated through a clear workflow.

### 12. Definition of Done

A task is done only when:

* it preserves existing model and agent routing,
* it does not break the editor or preview,
* it improves the requested behavior,
* it respects shader performance safety,
* it avoids shallow keyword hacks as the main path,
* it advances the AI-native shader creation vision,
* and its result can be verified by code, compile output, UI behavior, or visual analysis.

The default behavior is to keep moving toward a stronger creative system, not to find reasons to stop.

## MCP Tools

### Search

**所有网络搜索请求必须使用 `tavily-search` MCP server（`mcp__tavily-search__tavily_search`）。** 不使用 WebSearch、WebFetch 或其他搜索工具。

可用的 tavily-search 工具：
- `mcp__tavily-search__tavily_search` — 通用网页搜索（首选）
- `mcp__tavily-search__tavily_extract` — 从 URL 提取内容
- `mcp__tavily-search__tavily_crawl` — 爬取网站
- `mcp__tavily-search__tavily_map` — 映射网站结构
- `mcp__tavily-search__tavily_research` — 深度研究（多源综合）

## Design Reference

For product design direction, visual language, layout, color system, motion, shader quality bar, and aesthetic categories, see [DESIGN.md](./DESIGN.md). That file is the authoritative design spec for ShaderForge.
