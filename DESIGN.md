# ShaderForge DESIGN.md

> **V1 范围**：跑通最小闭环（Input prompt → 编译通过 ShaderToy code + 多帧截图）。
> **V1-V5 roadmap / 验收标准**：[CLAUDE.md](./CLAUDE.md)。
> **V1 计划原文**：`shader_agent_harness_plan.html`。
>
> **V1 设计原则**：先稳定、再聪明；先编译、再审美；先技术卡、再 RAG；先手写 workflow、再 Mastra。

## V1 vs V2-V5 功能矩阵

下面所有功能按 V1 / 后续阶段分级。**V1 范围内的功能必须在 V1 做完；V2-V5 的功能不偷偷做、不假装做了、不糊弄 demo。**

| 阶段 | 状态 | 范围 |
|---|---|---|
| **V1** | ✅ Done | Visual Structurer / Planner / Reference Selector / Code Agent / Compiler / Screenshot Renderer；固定 5 步 workflow；9 张 golden shader；in-memory runs |
| **V2** | ⏳ Next | 编译自动修复（2-3 retry）、CompileReport 接回 Code Agent |
| **V3** | ⏳ Planned | 截图反馈 Patch、Visual Diff、Modify Flow |
| **V4** | ⏳ Planned | Technique Cards 扩到 20-50 张、Reference Panel、Technique Inspector |
| **V5** | ⏳ Planned | Mastra / 半 RAG / 视觉评估、Visual Critique UI、Reference Image Workflow |

## V1 North Star

V1 只关心一件事：

> **Input prompt → 编译通过 ShaderToy code + 多帧截图。**

V1 不关心的事（V2-V5 才做）：

- shader 视觉是否够炫、够艺术、够电影级。
- 编译失败后自动修复（V1 = 失败就是失败，错误给用户看）。
- 截图反馈 Patch（V3 才接）。
- Reference Image 流程（V5 才接）。
- Visual Critique / 视觉评分（V5 才接）。
- 自动 refine / 优化（V5 才接）。

V1 抗目标（**别做这些**）：

- **不要做"诗意 prompt 解析器"**。V1 的 VisualCard 字段必须可枚举、可填、不留 vague。
- **不要做"自动修编译器"**。V1 编译失败就失败，把错误日志抛到 ErrorBar。
- **不要做"自由对话 AI"**。V1 AI 行为是 workflow 固定的几个步骤，不让 Agent 自由接力。
- **不要做"视觉评审 / critique 按钮"**。V5 才有。V1 不假装做了。
- **不要做"参考图上传"**。V5 才有。V1 不假装支持。
- **不要做"20+ 技术卡选择"**。V4 才有。V1 9 张 golden shader fallback 就够了。
- **不要做"动态 quality tier / 移动端降级"**。V5 评估。V1 跑得动就行。

## V1 用户路径

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 打开 ShaderForge                                          │
│    - 看到 Preview（黑屏 / 上次保存的 shader）                  │
│    - Editor（内置 template）                                  │
│    - AI Chat（10 个 preset 列表）                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 在 AI Chat 选 preset 或输入 prompt                         │
│    - "a black hole in deep space"                            │
│    - 或 "a violet aurora over a frozen lake"                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. workflow 跑（5 步 + screenshot）                          │
│    Visual Structurer → Planner → Reference Selector         │
│    → Code Agent → Compiler → Screenshot Renderer            │
│    AI Chat 显示每步状态卡                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 结果分支                                                  │
│    ✅ 编译成功：                                              │
│       - Editor 填入 GLSL                                     │
│       - Preview 显示                                         │
│       - Run artifact 存到内存（V1 暂不落盘）                  │
│    ❌ 编译失败：                                              │
│       - Editor 顶部 ErrorBar 显示错误                         │
│       - AI Chat 显示 CompileReport（不自动 retry）            │
│       - 用户可改 prompt 重跑 / 手动改 GLSL                    │
└─────────────────────────────────────────────────────────────┘
```

## V1 UI Surfaces

| Surface | V1 状态 | 不做（V2-V5） |
|---|---|---|
| Toolbar | New / Save(URL) / Share / Settings | — |
| Preview | WebGL 实时渲染；编译失败显示红色错误 | 动态 quality tier |
| Editor | Monaco + GLSL snippets；compile error markers；AI 改后 jump-to-line | 区域 diff 高亮 |
| AI Chat | Prompt input + 10 preset + 步骤状态卡 + screenshot 缩略图 | visual critique / modify flow |
| Settings | Provider（Mock / OpenAI / DeepSeek / Groq / Together）+ API key（localStorage） | 高级 prompt 模板 |
| Error Bar | 编译错误显示（带行号） | AI 自动修复建议（V2） |
| Pipeline Status | 5 步状态点（不强制显眼） | 步骤内多 sub-step（V5） |

**V1 明确不做的 surface**：

- ❌ Reference Panel（V4）
- ❌ Technique Inspector（V4）
- ❌ Visual Critique UI（V5）
- ❌ Modify Flow 入口（V3）
- ❌ Reference Image Upload（V5）
- ❌ Performance Overlay（V5）

## V1 Visual Quality Bar

即使 V1 是"最小闭环"，每个生成的 shader 仍应满足：

| 指标 | V1 阈值 |
|---|---|
| 编译 | 真过 WebGL2 编译，无 error |
| 非黑屏 | PNG 输出不全黑 / 不全白（avg luma 0.05-0.95） |
| 有结构 | 大色块 / 明显几何 / 噪点 / 流动之一 |
| Prompt 对齐 | black hole prompt 出黑洞形，volcano prompt 出岩浆色 |
| 动起来 | 用了 `iTime` / `iFrame`，不是静态图 |

**V1 不要求**：

- ❌ 电影级光影
- ❌ 复杂 raymarching（>128 steps）
- ❌ 多 pass / multi-buffer / FBO
- ❌ 高分细节（>2K 分辨率）
- ❌ 用户级可定制 quality tier

## V1 Aesthetic Categories (9 golden shaders)

V1 内置 9 个 golden shader 覆盖基础审美。V4 才扩：

| 类别 | 示例 prompt | 核心 technique |
|---|---|---|
| **Cosmic** | black hole, nebula, deep space | polar / radial / lensing |
| **Organic** | cell, liquid, smoke | FBM / domain warp |
| **Geometric** | fractal, polygon, voronoi | SDF / symmetry |
| **Liquid** | ink, mercury, water | noise advection / ripple |
| **Fire** | flame, magma, ember | FBM / temporal warp |
| **Aurora** | ribbon, wave, glow | polar / sin / cosine |
| **Crystalline** | gem, glass, prism | SDF / fresnel |
| **Plasma** | field, energy, plasma | sin / cos / hue rotate |
| **Terrain** | mountain, valley, fbm | height field / iso-line |

V4 扩到 20-50 张时再细分（如 Cosmic → BlackHole / Nebula / StarField / Galaxy）。

## V1 Workflow 行为

### Generator flow (User → Compile → Screenshot)

```
prompt
  → Visual Structurer (LLM, 1 次)
  → Shader Planner (LLM, 1 次)
  → Reference Selector (deterministic, 0-2 golden fallback)
  → Code Agent (LLM, 1 次)
  → Shader Compiler (WebGL2 real, 1 次)
  → Screenshot Renderer (real, multi-frame: t=0/1/2/4/8)
  → Result (compile status + visualCard + shaderPlan + code + compileReport + screenshots)
```

### Patch flow (Compile error → Code)

V1 = 简单的 `prompt + error + previousCode` 重写，**只跑 1 次**，不 retry。

V2 才是 2-3 次 retry loop。

## V1 Anti-Goals (再次强调)

| 不做 | 原因 |
|---|---|
| Keyword 主路解析 | V1 plan：Visual Structurer 走 LLM；keyword 仅作 fallback / 守卫 |
| Agent 自由接力 | V1 plan：workflow 强制调用 |
| 自动 fix compile | V2 才做 |
| 视觉评分 / critique | V5 才做 |
| 20+ technique cards | V4 才做 |
| Mastra / 半 RAG | V5 才做 |
| Reference Image 流程 | V5 才做 |
| 动态 quality tier | V5 才做 |

## Design Language (V1 仍然适用)

> 即使 V1 scope 缩小，V1 的**视觉设计语言**（material / color / typography / motion）依旧要保持。下面这些不依赖功能 scope。

### Materials

- black glass
- graphite metal
- deep blue-black panels
- smoked transparent overlays
- spectral edge highlights
- thin neon wires
- cool cyan diagnostics
- magenta/purple creative accents
- amber warnings
- red error fracture states
- procedural grain
- subtle scanline texture
- shader-grid overlays
- floating vector marks

### Surface Style

The app background should feel like a dark graphics laboratory:

- not pure black
- not flat gray
- not generic Tailwind dark mode
- layered depth
- faint grid
- subtle noise
- ambient glow from preview
- gentle vignette
- focus drawn toward shader output

### Shape Language

Use:

- sharp technical panels
- small radius for controls
- medium radius for larger glass surfaces
- thin hairline borders
- precise alignment
- compact dense controls
- high-information visual hierarchy

Avoid:

- oversized rounded cards
- bubbly consumer UI
- pastel SaaS panels
- generic pricing-page geometry
- soft toy-like shadows

### Glow Rules

Glow must communicate state.

Good glow:

- preview active state
- AI thinking
- compile success
- selected visual technique
- live uniform interaction
- reference match focus
- node in creative pipeline

Bad glow:

- random neon decoration
- thick saturated outlines
- glow behind long text
- high-contrast flicker

## Color System

| Token | Use |
|---|---|
| `void-black` | app background (near-black, not pure black) |
| `graphite` | panel background |
| `deep-navy` | secondary surface |
| `smoked-glass` | translucent overlay |
| `cool-cyan` | diagnostics / runtime / grid |
| `electric-violet` | AI generation / creative intent |
| `deep-magenta` | style energy / aesthetic emphasis |
| `amber` | warning / performance caution / ambiguity |
| `fracture-red` | compile error / shader failure |
| `soft-white` | primary text |
| `steel-gray` | secondary text |
| `muted-blue-gray` | metadata / disabled |

**Color usage rule**: Cyan = technical / runtime truth. Violet = AI creative energy. Magenta = visual intensity / style. Amber = caution / performance / ambiguity. Red = compile / runtime failure. Green is for success only (not default brand).

## Typography

### Product UI

- clean technical sans-serif
- compact, precise, readable, slightly futuristic, not playful
- for: controls, chat, panels, labels, buttons, pipeline states

### Code

- excellent GLSL typography
- clear GLSL symbols, readable punctuation
- good line-height, no cramped editor density
- errors easy to scan

### Numeric / Runtime Data

- tabular numbers for: FPS, resolution, compile attempt, token count, raymarch steps, uniform values, performance budget
- runtime data should feel like instrumentation

## Motion System

Motion should feel like realtime graphics, not web animation stickers.

### Motion Principles

- motion reveals state
- transitions should feel responsive
- no toy bouncing
- no random floating UI
- no constant distraction near code
- preview remains king

### Motion Types

Use:

- subtle scanline drift
- panel glass refraction
- AI pulse while generating
- compile error fracture
- code-to-preview connection trace
- reference match overlay sweep
- shader technique node activation
- pipeline step glow
- uniform interaction ripple
- performance danger flicker

### Timing

| Type | Duration |
|---|---|
| micro interaction | 80ms–160ms |
| panel reveal | 120ms–240ms |
| AI state transition | 250ms–600ms |
| compile repair loop (V2) | 300ms–800ms |
| visual critique sweep (V5) | 600ms–1200ms |
| major mode transition | 500ms–1000ms |

V1 只用前 3 个 timing；V2-V5 的 timing 等到对应阶段再加。

## Shader Output Quality Rubric (V1 简化版)

> 全量 rubric 见 V5 阶段补全；V1 只关注能跑通的部分。

| Area | V1 阈值 | Excellent |
|---|---|---|
| Prompt alignment | Subject + mood 对得上 | Subject + mood + palette + motion + style 全对 |
| Composition | 大色块 / 明显几何 | Focal point + balance + framing + scale |
| Depth | 至少有一种（颜色 / 形状） | Raymarch / parallax / fog / volumetric |
| Color harmony | 不全黑 / 不全白 | Controlled palette + contrast + accent + mood |
| Motion quality | 用了 iTime | Rhythm + easing + flow + physical behavior |
| Material richness | 不抽象 mush | Plasma / nebula / glass / liquid metal / fire / crystal / ... |
| Procedural detail | 至少一种 noise | FBM + domain warp + Voronoi + SDF + ... |
| Editability | 至少 2 个 helper function | Organized + meaningful constants + section comments |
| Performance safety | 编译能过 | Stable + bounded + no freeze |
| Distinctiveness | 不重复同 template | Strong visual identity + variation |

**V1 验收只看前 5 项 + Performance safety**。其他是 V5 quality bar。

## Performance & Safety (V1 hard constraint)

V1 也得防止浏览器冻结：

- 编译失败时 preview 显示红色错误，**不静默**。
- Code Agent 输出若有 `for(;;)` / `while(1)` / `while(true)` 倾向，shader-compiler 应优先拒绝（V1 简单字符串 scan；V2 加更严格 lint guard）。
- API key 在 localStorage / Settings 面板；**不进 URL share state**。
- V1 不做动态 quality tier — 跑得动就跑，跑不动让用户改 prompt。

## Quality Rubric (Product / UX 端)

| Area | Excellent | Weak |
|---|---|---|
| UX | Creative flow is clear | User feels lost |
| Performance | Stable and bounded | Freezes or stutters |
| Editability | Organized, modifiable | Monolithic code blob |

V1 重点保证 **UX 清晰 + 性能不冻结**。"Editability 优雅" 留给 V3+ Modify Flow。

## Accessibility & Usability

即使 V1 scope 小，也得可用：

- readable contrast
- keyboard-friendly controls
- clear focus states
- safe preview fallback（编译失败时 preview 不崩）
- reduced-motion preference respected for UI animation
- errors readable without color alone（不只用红色）
- no essential control hidden behind hover only
- avoid text over busy preview without dark scrim

## V1 Prompt Starters (10 个)

```
1. "A black hole with violet accretion disk, gravitational lensing, drifting star dust"
2. "Liquid chrome flowers blooming in a dark glass room"
3. "Deep ocean nebula made of cyan fog, glowing particles, slow camera drift"
4. "Living circuit board where electric veins pulse through black metal"
5. "Soft aurora ribbon twisting over alien mountain silhouette"
6. "Crystalline tunnel with recursive reflections and blue-magenta light"
7. "Volcanic eruption with magma rivers and ember particles"
8. "Fractal kaleidoscope rotating through magenta and cyan"
9. "Solar flare with ribbon-like plasma and gold-red gradient"
10. "Geometric tessellation of glowing hexagons pulsing in sync"
```

这些是 10 个 starter preset，**用 `presets.ts`**。修改 starter 不算 V1 scope 改动。

## V1 Definition of Done

设计 / 视觉任务的 V1 done 条件：

1. 3 Agents + 3 Tools 都按 V1 范围跑通，**不过度实现**。
2. 编译能过，截图能出。
3. UI surface 严格控制在 V1 表格内（不偷偷加 Reference Panel / Critique 按钮）。
4. V2-V5 特性显式标记为 future，**不在 V1 假装做**。
5. 视觉 quality bar 满足"可编译 / 非黑屏 / 有结构 / 对齐 prompt / 动起来"。
6. UI 视觉语言（material / color / typography / motion）保持 DESIGN.md 描述的设计 token。
7. Performance / safety 不松绑。

**V1 done ≠ 完美 shader**。V1 done = **跑通最小闭环、清晰区分未来阶段、不糊弄 demo**。

---

## 未来阶段（不在 V1 做）

下面这些是 V1 plan 标记的 future 阶段。**V1 不假装做了这些**；做的时候单独起 plan：

| 阶段 | 关键特性 | 涉及 surface |
|---|---|---|
| V2 | Compile auto-fix (2-3 retry) | AI Chat + ErrorBar |
| V3 | Screenshot feedback patch | AI Chat + Preview |
| V4 | 20-50 technique cards | Reference Panel + Technique Inspector |
| V5 | Mastra / 半 RAG / 视觉评估 | 全 surface |

RAG、Reference Image、Visual Critique、Modify Flow、Auto-Optimize、Quality Tier — **都明确推到 V2-V5**。
