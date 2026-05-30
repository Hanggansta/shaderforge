# AI Pipeline Status

> Last updated: Phase 7.3 — Production Readiness Audit.

## Pipeline Overview

```
User Prompt → ShaderSpec IR → TechniquePlan → Golden Examples → Agent Loop → GLSL Shader
                                      ↓
                              Modify Intent (modify only)
                                      ↓
                              Modify Strategy
```

## Intent Paths

### create
```
prompt → parseShaderSpec() → planTechnique() → selectGoldenExamples()
  → agentLoop() → generateShader() → clean → validate → compile → retry
```

### modify
```
prompt → parseShaderSpec() → planTechnique() → selectGoldenExamples()
  → parse_modify_intent() → determineModifyStrategy()
  → agentLoop() → modifyShader() → clean → validate → compile → retry
```

### explain
```
prompt → explainShader() → return explanation (no agent loop)
```

### fix
```
prompt → parseShaderSpec() → planTechnique() → selectGoldenExamples()
  → agentLoop() → fixShader() → clean → validate → compile → retry
```

## Fallback System
When all agent loop attempts fail and `disableFallback` is false:
- Selects best-matching fallback shader from 8 curated options
- Scores by scene type and base technique match
- Returns abstract gradient as ultimate fallback
- Auto-repair runs with `disableFallback: true` (never applies fallback as repair)

## Telemetry Pipeline
After successful AI generation, triggered once per requestId:

```
captureFrame() ×3 → analyzePixels() → computeFlickerScore()
  → deriveQualitySignals() [deterministic]
  → diagnoseQuality() [LLM call]
  → createQualityRepairPlan() [LLM call, only if shouldRepair]
  → executeAutoRepair() [if low-risk, one-shot, not already attempted]
```

### Quality Signals (Deterministic)
- `too_dark`, `too_bright`, `low_contrast`, `low_saturation`
- `flat_color`, `no_visible_motion`, `excessive_flicker`
- `unbalanced_composition`, `healthy`

### Auto-Repair Safety
- One-shot per requestId (`autoRepairAttempted` Set)
- Only low-risk repairs (brightness_contrast, color_balance, motion, flicker)
- `disableFallback: true` — never applies fallback as repair
- `canApplyAutoRepair()` guard function — verifies codeSource, requestId, code match before applying
- Editor state re-verified after repair completes

### codeSource Tracking
| codeSource | Set by | Telemetry | Auto-repair |
|------------|--------|-----------|-------------|
| `ai_generation` | `setCodeFromAI()` | ✅ Triggers | ✅ Can apply |
| `quality_repair` | `setCodeFromRepair()` | ❌ Skipped | ❌ Cannot re-trigger |
| `manual` | `setCode()` | ❌ Skipped | ❌ Cannot overwrite |

## Module Map

| Module | File | LLM? | Purpose |
|--------|------|------|---------|
| ShaderSpec | `spec/shader-spec.ts` | — | IR type definition |
| Normalize Spec | `spec/normalize-shader-spec.ts` | No | Validate/correct arbitrary input |
| Parse Spec | `spec/parse-shader-spec.ts` | Yes | Prompt → ShaderSpec |
| TechniquePlan | `planner/technique-plan.ts` | — | Plan type definition |
| Plan Technique | `planner/plan-technique.ts` | No | ShaderSpec → TechniquePlan |
| Golden Examples | `library/golden-shaders.ts` | — | 10 curated reference shaders |
| Select Examples | `library/select-golden-examples.ts` | No | Score and select top 2 |
| Modify Intent | `modify/modify-intent.ts` | — | Intent type definition |
| Parse Modify | `modify/parse-modify-intent.ts` | Yes | Prompt → ModifyIntent |
| Modify Strategy | `modify/modify-strategy.ts` | No | ModifyIntent → ModifyStrategy |
| Fallback Shaders | `fallback/fallback-shaders.ts` | — | 8 safe fallback shaders |
| Select Fallback | `fallback/select-fallback-shader.ts` | No | Score and select best match |
| Quality Signals | `telemetry/quality-signals.ts` | No | Metrics → signals |
| Quality Diagnosis | `telemetry/quality-diagnosis.ts` | Yes | Telemetry → diagnosis |
| Repair Plan | `telemetry/quality-repair-plan.ts` | Yes | Diagnosis → repair plan |
| Auto-Repair Safety | `telemetry/auto-repair-safety.ts` | No | `canApplyAutoRepair()` guard |
| Parse Diagnosis | `telemetry/parse-quality-diagnosis.ts` | No | Safe JSON parser |
| Parse Repair Plan | `telemetry/parse-quality-repair-plan.ts` | No | Safe JSON parser |
| Agent Loop | `agent-loop.ts` | — | Generate/clean/validate/compile/retry |
| AI Service | `service.ts` | — | Main orchestrator |
| Conventions | `conventions.ts` | — | Prompt construction |

## Runtime Safety

- **No system message after index 0**: All provider methods use single system message at index 0
- **No auto-repair recursion**: `autoRepairAttempted` Set prevents re-entry; `disableFallback: true` on repair
- **No fallback during auto-repair**: Explicit `disableFallback: true` flag
- **No manual edit overwrite**: `canApplyAutoRepair()` guard checks codeSource, requestId, code
- **No vision model required**: Telemetry uses pixel analysis only (BT.709 brightness, HSL saturation)

## Dev-Only Test Harness

All harness code is gated behind `import.meta.env.DEV`:

| Component | Gating | Purpose |
|-----------|--------|---------|
| `DevTestPanel.tsx` | `if (!import.meta.env.DEV) return null` + conditional render in App.tsx | Inject test shaders, control repair mode |
| `setTestGenerationContext()` | `if (!import.meta.env.DEV) return` | Inject generation context for telemetry |
| `setDevTestRepairMode()` | `if (!import.meta.env.DEV) return` | Set deterministic repair behavior |
| `buildDevTestRepairPlan()` | `if (import.meta.env.DEV && mode !== 'off')` | Hardcoded repair plan (no LLM) |
| Provider wrapper | `if (import.meta.env.DEV && mode !== 'off')` | Intercept modifyShader/fixShader |

Production builds exclude all harness code via Vite tree-shaking.

## Test Coverage

75 tests across 8 test files covering:
- `normalizeShaderSpec` — enum validation, numeric clamping, default values
- `planTechnique` — scene mapping, effects, loop budget, prompt hints
- `selectGoldenExamples` — scoring, performance filtering, max results
- `determineModifyStrategy` — rewrite detection, effect addition, parameter adjustment
- `deriveQualitySignals` — all threshold checks, multiple simultaneous issues
- `parseQualityDiagnosis` — valid JSON, markdown extraction, fallback defaults
- `parseQualityRepairPlan` — valid JSON, markdown extraction, no_op fallback
- `canApplyAutoRepair` — safety guard: unchanged state, manual edit, requestId change, code change, codeSource transitions

## Known Limitations

- **API instability**: DeepSeek and other providers may experience connection drops or timeouts. The agent loop retries, but live E2E tests may be unreliable.
- **No vision model**: Telemetry is pixel-statistics based (brightness, contrast, saturation, motion). It does not use semantic image understanding.
- **Auto-repair is conservative**: Only low-risk repairs (brightness_contrast, color_balance, motion, flicker). High-risk repairs (scene changes, technique changes) are skipped.
- **One-shot auto-repair**: Each requestId gets at most one auto-repair attempt. If it fails, no retry.
- **Dev harness is development-only**: The test harness panel and all dev repair modes are excluded from production builds.

## Build Commands

```bash
npm run build    # tsc -b && vite build
npm run lint     # eslint . (0 errors, 0 warnings)
npm run test     # vitest run (75 tests)
npm run dev      # vite dev server
```
