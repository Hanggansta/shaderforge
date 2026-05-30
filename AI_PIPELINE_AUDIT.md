# AI Pipeline Audit: ShaderSpec IR Insertion Point

## 1. Call Chain (Verified from Source)

```
AIChatPanel.tsx:46  handleSend()
  │  reads: input, activeIntent from useAIStore
  │  writes: messages, requestState via useAIStore
  │
  ▼
AIService.generate()           ← shaderforge/src/ai/service.ts:43
  │  receives: prompt (string), intent (AIIntent), options
  │  assembles fullPrompt per intent (line 60-87)
  │  calls agentLoop(provider, fullPrompt, options)
  │
  ▼
agentLoop()                    ← shaderforge/src/ai/agent-loop.ts:48
  │  receives: provider, userPrompt, options
  │  loop (max 3 attempts):
  │    attempt 1 → generateCode(provider, userPrompt)
  │    attempt N → fixCode(provider, currentCode, lastErrors)
  │    then → cleanShaderCode() → validateShaderCode() → compileShaderCandidate()
  │
  ▼
generateCode()                 ← shaderforge/src/ai/agent-loop.ts:208
  │  builds system prompt via buildSystemPrompt()
  │  calls provider.generateShader(fullPrompt)
  │  extracts GLSL from response
  │
  ▼
OpenAICompatibleProvider       ← shaderforge/src/ai/providers/openai-compatible.ts:93
  .generateShader()              calls /chat/completions with system + user messages
```

## 2. Key Boundaries

| Boundary | File | What It Owns |
|----------|------|-------------|
| UI → Service | `AIChatPanel.tsx` → `service.ts` | Passes raw `prompt` string + `intent` enum |
| Service → Loop | `service.ts` → `agent-loop.ts` | Passes assembled `fullPrompt` string |
| Loop → Provider | `agent-loop.ts` → `provider.generateShader()` | Passes prompt string, gets back `{code}` |
| Loop → Clean | `agent-loop.ts` → `clean-code.ts` | Raw code string in, cleaned code out |
| Loop → Validate | `agent-loop.ts` → `validator.ts` | Code string in, `{valid, issues}` out |
| Loop → Compile | `agent-loop.ts` → `shader-compiler.ts` | Code string in, `{success, errorLog}` out |
| Loop → ErrorAnalysis | `agent-loop.ts` → `error-analyzer.ts` | errorLog string in, `{errors, summary}` out |

## 3. Intent Handling

**Current:** User manually selects intent in `AIChatPanel.tsx:8-14` from 5 options:
`create | modify | fix | explain | optimize`

**Where auto-parse should go:** Inside `AIService.generate()` at `service.ts:57-87`, BEFORE the `switch(intent)` block. The auto-parser would replace the manual `activeIntent` selection, or augment it.

**Reuse opportunity:** The same `provider.callAPI()` can be used for a lightweight intent-parsing call (small prompt, small response). No new HTTP layer needed.

## 4. Prompt Construction Files

| File | Function | Purpose |
|------|----------|---------|
| `src/ai/conventions.ts:10` | `buildSystemPrompt()` | Renderer capabilities + GLSL rules |
| `src/ai/conventions.ts:60` | `buildFixPrompt()` | Error-driven repair instructions |
| `src/ai/capabilities.ts:118` | `getCapabilitiesSummary()` | WebGL2/Uniform/Limitation text block |
| `src/ai/providers/openai-compatible.ts:96-106` | `generateShader()` | Adds IMPORTANT REQUIREMENTS to user prompt |

**Key observation:** The system prompt is injected in TWO places — `buildSystemPrompt()` in `agent-loop.ts:209` and again in `openai-compatible.ts:94`. The provider's `generateShader()` prepends its own system prompt AND its own user prompt wrapper. This means the agent-loop's system prompt is redundant when using OpenAICompatibleProvider (it gets overridden). This is a minor existing issue but not blocking.

## 5. Provider Abstraction Reusability

```typescript
// src/ai/adapter.ts
interface AIProvider {
  generateShader(prompt, context?) → AIResponse
  modifyShader(prompt, currentCode, context?) → AIResponse
  fixShader(currentCode, errorOutput, context?) → AIResponse
  explainShader(currentCode, context?) → AIResponse
}
```

**Can a separate parser call reuse the provider?** Yes. `OpenAICompatibleProvider.callAPI()` (line 63) is a private generic method that accepts `messages[]` and returns raw string. Two options:

- **Option A (minimal):** Add a `parseIntent(prompt)` method to `AIProvider` interface. Each provider implements it.
- **Option B (simpler):** Add a standalone function that calls `provider.generateShader()` with a parsing-specific prompt. No interface change needed, but wastes the system prompt injection.

**Recommendation:** Option A is cleaner. But for Phase 1, Option B requires zero interface changes and can be done entirely in `service.ts`.

## 6. Store Involvement

| Store | File | Relevant State |
|-------|------|---------------|
| `useAIStore` | `src/store/aiStore.ts` | `messages`, `activeIntent`, `requestState`, `lastError` |
| `useEditorStore` | `src/store/editorStore.ts` | `code`, `compileStatus`, `compileErrors`, `lastValidCode` |
| `usePreviewStore` | `src/store/previewStore.ts` | `isPlaying`, `resolution`, `fps`, `compileResult` |

**ShaderSpec impact:** Phase 1 does NOT need new store state. The spec is consumed inside `AIService.generate()` and passed to the provider as part of the prompt. No UI changes needed.

Later phases (showing spec in UI, editing spec, debug panel) would need a new `useSpecStore` or additions to `useAIStore`.

## 7. Build/Typecheck Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build (typecheck + production build)
npm run lint       # ESLint
```

**No test runner configured.** No test files exist in `src/`. Validation is typecheck + lint + manual dev server testing.

## 8. Risks of Inserting ShaderSpec Before GLSL Generation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Extra LLM call adds latency | Medium | Use a small/fast model for parsing; cache common patterns |
| Spec JSON parsing failure | Medium | Fallback: pass raw prompt directly to GLSL generation (bypass spec) |
| Spec constrains LLM creativity | Low | Spec is advisory context, not hard constraint on the prompt |
| Provider interface changes break existing mock | Low | Add new method with default implementation |
| Agent loop unaware of spec | None | Spec affects prompt construction, not the loop itself |
| Compile-repair loop affected | None | Loop receives GLSL code string — spec is upstream only |

## 9. Smallest Safe Insertion Point

**Location:** `AIService.generate()` in `src/ai/service.ts`, lines 57-87.

**Current flow:**
```
prompt + intent → switch(intent) → assemble fullPrompt → agentLoop(fullPrompt)
```

**Phase 1 flow (proposed):**
```
prompt + intent → [AUTO PARSE] → ShaderSpec → [BUILD SPEC-AWARE PROMPT] → agentLoop(fullPrompt)
```

**Why here:**
- It's the single choke point between UI and agent loop
- No changes to agent-loop.ts, clean-code.ts, validator.ts, shader-compiler.ts, or any provider
- The spec only affects what prompt string gets passed to `agentLoop()`
- If spec generation fails, fall back to current behavior (zero regression risk)

## 10. Phase 1 Implementation Plan

### New Files (3 files)

| File | Purpose |
|------|---------|
| `src/ai/shader-spec.ts` | `ShaderSpec` TypeScript interface + `parseShaderSpec()` function |
| `src/ai/spec-parser.ts` | LLM call to convert natural language → ShaderSpec JSON |
| `src/ai/spec-prompt.ts` | `buildSpecAwarePrompt(spec)` — converts spec into GLSL generation prompt |

### Modified Files (1 file)

| File | Change |
|------|--------|
| `src/ai/service.ts` | In `generate()`, after intent switch, call spec parser then spec-prompt builder |

### ShaderSpec Interface (Phase 1 — minimal)

```typescript
interface ShaderSpec {
  type: 'background' | 'effect' | 'pattern' | 'scene3d' | 'abstract';
  subject: string;           // "energy field", "fractal", "ocean waves"
  style: string[];           // ["premium", "futuristic", "calm"]
  palette: {
    background: string;      // "deep navy"
    primary: string;         // "violet"
    secondary?: string;      // "blue"
    accent?: string;         // "cyan"
  };
  motion: {
    speed: 'slow' | 'medium' | 'fast';
    style: 'flowing' | 'pulsing' | 'rotating' | 'static';
  };
  techniques: string[];      // ["domain_warped_fbm", "soft_glow", "vignette"]
  constraints: {
    mobileFriendly?: boolean;
    complexity?: 'low' | 'medium' | 'high';
  };
}
```

### parseShaderSpec() Logic

1. Call provider with a parsing-specific prompt (short, structured output)
2. Extract JSON from response (handle markdown fences)
3. Validate required fields exist
4. On failure: return `null` (caller falls back to raw prompt)

### buildSpecAwarePrompt() Logic

Convert ShaderSpec into a detailed GLSL generation prompt that:
- Describes the visual goal in LLM-friendly language
- Lists recommended techniques
- Specifies color palette
- Specifies motion characteristics
- Includes the renderer capabilities (from existing `buildSystemPrompt()`)

### Changes to service.ts

```typescript
// In generate(), after intent switch, before agentLoop call:

// NEW: Parse spec (only for 'create' intent, Phase 1)
let fullPrompt = prompt;
if (intent === 'create') {
  const spec = await parseShaderSpec(this.provider, prompt);
  if (spec) {
    fullPrompt = buildSpecAwarePrompt(spec);
  } else {
    // Fallback: use original prompt assembly
    fullPrompt = `Create a new shader: ${prompt}`;
  }
}

// EXISTING: agentLoop call unchanged
const result = await agentLoop(this.provider, fullPrompt, { ... });
```

## 11. What MUST NOT Change in Phase 1

- `src/ai/agent-loop.ts` — the compile-repair loop is untouched
- `src/ai/clean-code.ts` — code cleaning is untouched
- `src/ai/validator.ts` — validation is untouched
- `src/ai/error-analyzer.ts` — error analysis is untouched
- `src/ai/conventions.ts` — system prompt builder is untouched
- `src/ai/capabilities.ts` — renderer capabilities is untouched
- `src/services/shader/*` — all shader compilation/wrapping is untouched
- `src/ai/providers/*` — existing providers are untouched
- `src/components/*` — all UI components are untouched
- `src/store/*` — all stores are untouched
- `src/templates/*` — all templates are untouched

## 12. Validation Commands (Run After Implementation)

```bash
cd shaderforge
npm run build      # Must pass: tsc -b && vite build
npm run lint       # Must pass: no new warnings
npm run dev        # Manual: existing mock AI flow still works
```

## 13. File Inventory

```
src/ai/
├── adapter.ts           # Provider interface (NO CHANGE)
├── agent-loop.ts        # Compile-repair loop (NO CHANGE)
├── capabilities.ts      # Renderer profile (NO CHANGE)
├── clean-code.ts        # Code cleanup (NO CHANGE)
├── conventions.ts       # Prompt builders (NO CHANGE)
├── error-analyzer.ts    # Error classification (NO CHANGE)
├── service.ts           # AIService singleton (MODIFY — 1 insertion point)
├── validator.ts         # Static validation (NO CHANGE)
├── providers/
│   ├── mock.ts          # Mock provider (NO CHANGE)
│   └── openai-compatible.ts  # Real provider (NO CHANGE)
├── shader-spec.ts       # NEW — spec interface + types
├── spec-parser.ts       # NEW — LLM-based spec extraction
└── spec-prompt.ts       # NEW — spec → GLSL prompt builder
```
