# ShaderForge

Browser-based Shadertoy-style GLSL shader editor with AI-assisted shader generation.

> **V1 状态**：V1 完成，V2 完成。
> **V1 计划原文**：`shader_agent_harness_plan.html`（最高优先级）。
> **设计语言**：[DESIGN.md](./DESIGN.md)。

## V1-V5 Roadmap

V1 核心原则：**先稳定、再聪明；先编译、再审美；先技术卡、再 RAG；先手写 workflow、再 Mastra。**

| 阶段 | 目标 | 状态 |
|---|---|---|
| **V1** | Input prompt → Visual Structurer → Shader Planner → Reference Selector → Code Agent → Compiler → Screenshot Renderer。固定 workflow，编译能通过，截图能出。 | ✅ Done |
| **V2** | 编译自动修复：Compiler 失败 → Code Agent 拿错误日志重写 → 2-3 次 retry。 | ✅ Done |
| **V3** | 截图反馈 Patch：Screenshot → Visual diff → Code Agent 改。 | ⏳ Planned |
| **V4** | Technique Cards 扩到 20-50 张；建立 index / search。 | ⏳ Planned |
| **V5** | Mastra / 半 RAG / 视觉评估；candidate-eval 接 workflow。 | ⏳ Planned |

## Architecture (V1)

**固定 workflow，禁止 Agent 自由决定下一步。**

```
User Prompt
   ↓
Agent 1: Visual Structurer ──→ VisualCard (mustHave/avoid/...)
   ↓
Agent 2: Shader Planner ──→ ShaderPlan (modules + referenceNeeds)
   ↓
Tool 1: Reference Selector ──→ ReferenceCard[] (3-5 technique cards)
   ↓
Agent 3: Code/Patch Agent ──→ GLSL (Shadertoy mainImage)
   ↓
Tool 2: Shader Compiler ──→ CompileReport
   ↓ (V1: log only; V2: retry loop)
Tool 3: Screenshot Renderer ──→ Screenshot[] (multi-frame)
   ↓
Output
```

**职责边界（硬性）**：

- **Agent** = 理解、规划、写代码、修代码。**只调 LLM**，不做真实 IO。
- **Tool** = 选择参考、真实编译、真实截图。**deterministic**，**不调 LLM**。
- **Workflow** = 强制调度 Agent / Tool 顺序。Agent 不许决定"下一步该调谁"。

## V1 验收标准

| 模块 | V1 验收 |
|---|---|
| Agent 1: Visual Structurer | 稳定输出 VisualCard JSON（含 mustHave / avoid / palette / motion / composition）。 |
| Agent 2: Shader Planner | 把 VisualCard 拆成 modules + referenceNeeds；不返回噪声字段。 |
| Tool 1: Reference Selector | 返 3-5 张技术卡；fallback 到 9 张 golden shader；不超范围。 |
| Agent 3: Code/Patch Agent | 输出 Shadertoy `mainImage(out vec4 fragColor, in vec2 fragCoord)`，可编译。 |
| Tool 2: Shader Compiler | 浏览器内用 WebGL2 真实编译；返 CompileReport（含错误日志 / 行号）。 |
| Tool 3: Screenshot Renderer | 稳定输出 PNG / 多帧 screenshot（含 iTime 系列）。 |

## Code Structure

```
src/
├── shader-agent/                # V1 harness 核心（来自 V1 计划目录建议）
│   ├── schemas/                 # 5 个 V1 必做 schema
│   │   ├── visual-card.ts
│   │   ├── shader-plan.ts
│   │   ├── reference-card.ts
│   │   ├── compile-report.ts
│   │   └── shader-result.ts
│   ├── agents/                  # 3 个 V1 必做 Agent
│   │   ├── visual-structurer.ts
│   │   ├── shader-planner.ts
│   │   └── code-patch-agent.ts
│   ├── tools/                   # 3 个 V1 必做 Tool
│   │   ├── reference-selector.ts
│   │   ├── shader-compiler.ts
│   │   └── screenshot-renderer.ts
│   ├── workflows/               # V1 workflow
│   │   ├── generate-shader.ts
│   │   └── patch-shader.ts
│   ├── kb/                      # V1: 9 张 golden shader（V4 扩到 20-50）
│   ├── runs/                    # V1: in-memory artifact store
│   ├── llm-client.ts            # LLMClient 抽象
│   ├── presets.ts               # 10 个 starter preset
│   ├── integration/             # 桥接 aiStore / AIChatPanel
│   │   ├── service.ts           #   shaderAgent 单例
│   │   ├── llm-adapters.ts      #   OpenAI-compatible / Mock
│   │   ├── providers/           #   provider 实现
│   │   ├── agent-result-adapter.ts
│   │   └── agent-result-types.ts
│   └── __tests__/               # 5 个测试文件 / 34 测试
├── services/
│   └── shader/                  # 浏览器内 WebGL 编译 + 截图（offscreen-renderer）
├── components/                  # Preview / Editor / AIChat / Settings / Toolbar / ErrorBar
├── store/                       # Zustand: editor / ai / project / preview / ui
├── editor/                      # Monaco config + GLSL snippets
├── templates/                   # 内置 starter template
└── utils/                       # debounce / shareUrl
```

## Tech Stack

- **Framework**: React 19 + TypeScript（strict mode, `erasableSyntaxOnly`）
- **Build**: Vite 8 + @vitejs/plugin-react
- **State**: Zustand 5（one store per domain）
- **Editor**: Monaco Editor（@monaco-editor/react）
- **Linting**: ESLint 10 + typescript-eslint
- **WebGL**: 浏览器内原生 WebGL2（`src/services/shader/offscreen-renderer.ts`）
- **AI**: V1 = OpenAI SDK + 手写 Workflow（Mastra V5 评估）
- **Test**: Vitest（5 个 shader-agent 测试文件）

## Key Patterns

- **Workflow pattern**：每个 workflow 强制调度 Agent + Tool，定义"先调谁 / 失败怎么办 / 怎么衔接"。
- **Agent pattern**：`Agent<I, O> = (input, ctx) => Promise<O>`，**只调 LLM**，不做真实 IO。
- **Tool pattern**：`Tool<I, O> = (input) => Promise<O>`，**deterministic**，不调 LLM。
- **Schema pattern**：TypeScript interface + 显式 `validate()` 守卫，输出和持久化都用 schema。
- **Store pattern**：`create<Interface>((set) => ({ ... }))` from Zustand，one file per domain。
- **Shader convention**：Shadertoy-style `mainImage(out vec4 fragColor, in vec2 fragCoord)` with `iTime` / `iResolution` / `iMouse` uniforms。

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Type-check + production build
npm run lint       # ESLint
npm test           # Vitest unit tests
```

## Conventions

- No unused locals/params（`noUnusedLocals` + `noUnusedParameters`）。
- `erasableSyntaxOnly: true` — no runtime enums or namespaces。
- JSX: `react-jsx` transform（no React import needed）。
- CSS: plain CSS files（无 CSS modules）。
- Error boundaries wrap each major panel（AI / Editor / Preview）。
- 禁止 commit `.env` / 截图 / 大文件（见 `.gitignore`）。

## Rules

### 1. V1 范围内不做 V2-V5 的事

不要为 V2（自动修复）/ V3（截图反馈 Patch）/ V4（Technique Cards 扩 20-50）/ V5（Mastra / RAG / 视觉评估）写代码，除非用户明确指定做下一阶段。

**反例**：把 `candidate-eval` 视觉评分接进 workflow（V5 才接）。
**反例**：把 compile error 拿去做 retry loop（V2 才接）。
**反例**：用 50 张 technique card 做 RAG（V4 才扩）。

### 2. Workflow 强制调用，不让 Agent 自由决定下一步

每个 workflow 必须明确定义：先调哪个 Agent、Tool 怎么衔接、失败怎么处理。Agent **不许**自己决定"该调哪个 tool / 是否重试"。

**反例**：在 Agent 3 内部写"如果编译失败就重试"。
**反例**：让 LLM 决定下一步调 reference-selector 还是 compiler。

### 3. 编译成功是 V1 唯一硬指标

V1 范围内，shader 必须能在浏览器内真实编译、能跑出非黑屏截图。视觉审美 / 风格完美 / 光影高级 — 这些是 V2-V5 的事。

### 4. Tool 必须 deterministic，不调 LLM

Tool = 真实 WebGL 编译 / 真实截图 / 真实查表。Tool 不读 LLM，不发外部网络（Reference Selector 只查内置 golden shader 表）。

### 5. 性能与安全仍是 hard constraint

不管 V1 多"最小闭环"，shader 都不能冻结浏览器：

- 禁止无界循环 / 过度 raymarch / 嵌套昂贵 noise。
- 编译失败时显示 error，不静默吃错。
- 不上传 .env / API key / 截图进 git。

### 6. 验证

每次改动后：

- `npm run lint` 走 ESLint。
- `npm test` 跑 5 个 shader-agent 测试。
- `npm run build` 走 type-check + 生产 build。
- 浏览器视觉验证由用户 `npm run dev` 手动跑（LLM / 视觉评分不在主线程跑）。

### 7. Completion Report

完成一项后给一个简短汇报：

- 改了什么文件
- 跑了什么检查
- 还有什么 known gap
- 下一步建议

**不要**把"完成"和"看起来差不多"画等号。

## Subagents

### Available Agents

| Agent | Model | 职责 | 视觉 | 编辑 |
|---|---|---|---|---|
| mimo-vision-agent | haiku | 视觉分析专用（主线程调用） | ✅ | ❌ |
| glsl-shadertoy-engineer | haiku | GLSL 代码审查 / shader 视觉质量评审 | ✅ | ❌ |
| frontend-product-engineer | haiku | UI/UX 审查 / 布局分析 / 交互评估 | ✅ | ❌ |
| shader-runtime-debugger | haiku | 调试编译失败 / 运行时 bug / 修复代码 | ✅ | ✅ |
| performance-safety-engineer | haiku | 性能分析 / 安全审查 / 浏览器冻结风险 | ✅ | ❌ |
| qa-regression-engineer | haiku | 测试设计 / 回归验证 / QA 检查 | ✅ | ❌ |
| ai-shader-pipeline-architect | sonnet | shader-agent 架构审查 / workflow 设计 | ❌ | ❌ |
| principal-architect | sonnet | 系统架构审查 / 模块边界 / 技术债 | ❌ | ❌ |

### Vision Routing

主线程模型（`minimax-m3-free`）**不能读图**。所有主线程视觉任务必须走 `mimo-vision-agent`。
所有 subagent 用 `haiku`，**可以直接读图**，无需绕 vision-agent。

主线程硬规则：

1. 任何视觉分析 → `mimo-vision-agent`。
2. 不传完整对话历史给 vision-agent，只传当前图片 + 任务上下文。
3. 即使图片已在上下文中（用户直接粘贴），主线程仍必须调 `mimo-vision-agent`，不自分析。

### Vision Report Requirements

`mimo-vision-agent` 必须返回**详细、彻底**的视觉报告。Required sections：

1. Visual Summary
2. Detailed Visual Breakdown（composition / color / lighting / texture / depth）
3. Shader-Specific Analysis（technique / quality metrics / artifacts）
4. UI-Specific Analysis（layout / components / information architecture）
5. Comparison Analysis（提供 reference image 时）
6. Actionable Guidance（具体、可执行、非空泛）
7. Uncertainties

### Subagent 失败处理

如果 subagent 返回空 / 超时 / 静默失败，**必须立即告诉用户**。不假装成功。

## Definition of Done

V1 任务 done 的条件：

- 在 V1 范围里（不偷偷做 V2-V5）。
- 编译能过（V1 硬指标）。
- 5 个 shader-agent 测试 + lint + build 全过。
- 浏览器内能跑（用户 `npm run dev` 验证）。
- 没把 .env / 截图 / 临时文件 commit。
- 给一个简短 completion report。

**视觉审美、自动修复、截图反馈、20-50 张技术卡、Mastra** —— 这些是 V2-V5 的事，**不是 V1 done 的条件。**
