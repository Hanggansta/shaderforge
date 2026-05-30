# Manual E2E Checklist

> Run through these checks after any pipeline change. Last updated: Phase 7.3.

## Setup
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm run test` passes (75 tests across 8 files)
- [ ] Dev server starts: `npm run dev`

## Editor
- [ ] Monaco editor loads with default shader
- [ ] Typing in editor works (syntax highlighting, line numbers)
- [ ] Manual edit sets `codeSource: 'manual'`
- [ ] Manual edit clears `lastRequestId`
- [ ] Shader compiles after manual edit

## Preview
- [ ] Preview panel shows "success" status
- [ ] FPS counter displays and updates
- [ ] WebGL2 canvas renders shader output
- [ ] Pause/Play button works
- [ ] Reset button works
- [ ] Fullscreen toggle works

## Create Intent
- [ ] Type "create a nebula shader" → shader generates and renders
- [ ] Verify ShaderSpec logged in console (DEV mode)
- [ ] Verify TechniquePlan logged in console
- [ ] Verify GoldenExamples selected (should include nebula example)
- [ ] Shader compiles and displays in preview
- [ ] `codeSource` becomes `'ai_generation'`

## Modify Intent (English)
- [ ] With a shader loaded, type "make it slower"
- [ ] Verify ModifyIntent parsed (console)
- [ ] Verify ModifyStrategy derived (should be parameter_adjustment)
- [ ] Shader modifies and recompiles
- [ ] Original structure preserved

## Modify Intent (Chinese)
- [ ] With a shader loaded, type "慢一点" (slower)
- [ ] Verify language detected as 'zh'
- [ ] Verify ModifyIntent parsed correctly
- [ ] Shader modifies appropriately

## Explain Intent
- [ ] With a shader loaded, switch to "explain" intent
- [ ] Type anything and send
- [ ] Verify explanation text appears in chat
- [ ] Verify shader code does NOT change
- [ ] Verify no agent loop runs (no progress steps)

## Fallback on Failed Generation
- [ ] Disconnect API key or use invalid provider
- [ ] Type "create a complex shader"
- [ ] Verify all retry attempts fail
- [ ] Verify fallback shader appears (should be abstract gradient or scene-matched)
- [ ] Verify fallback is a valid compilable shader

## Telemetry on AI Generation
- [ ] Generate a shader with valid API
- [ ] Wait 1.5s after compilation
- [ ] Verify telemetry capture in console (DEV mode)
- [ ] Verify quality signals derived
- [ ] Verify diagnosis runs

## No Telemetry on Manual Edit
- [ ] Type directly into the code editor
- [ ] Verify no telemetry capture triggered
- [ ] Verify `codeSource` is 'manual'

## One-Shot Auto Repair
- [ ] Generate a very dark shader (low brightness)
- [ ] Wait for telemetry + diagnosis
- [ ] If auto-repair triggers, verify it runs exactly once
- [ ] Verify second render cycle does NOT trigger another repair
- [ ] Verify `autoRepairAttempted` set contains the requestId

## No Auto Repair for Normal Shader
- [ ] Generate a well-balanced shader
- [ ] Wait for telemetry
- [ ] Verify diagnosis shows "healthy" or low severity
- [ ] Verify no auto-repair attempted

## Dev Test Harness (DEV mode only)
- [ ] Dev panel visible in bottom-right corner
- [ ] "Black Screen" button injects black shader
- [ ] "Low Contrast Gray" button injects gray shader
- [ ] "Flickering" button injects flickering shader
- [ ] "Normal Colorful" button injects colorful shader
- [ ] Repair mode selector has: Off, Success, Invalid, API Error, Delayed
- [ ] Status shows current codeSource and requestId

## Dev Harness: repair-success
- [ ] Set repair mode to "Success"
- [ ] Inject "Black Screen" shader
- [ ] Wait for telemetry → diagnosis → repair plan → auto-repair
- [ ] Verify green shader applied to editor
- [ ] Verify `codeSource` becomes `'quality_repair'`
- [ ] Verify telemetry does NOT re-trigger

## Dev Harness: repair-invalid
- [ ] Set repair mode to "Invalid"
- [ ] Inject "Black Screen" shader
- [ ] Wait for telemetry → diagnosis → repair plan → auto-repair attempt
- [ ] Verify black shader preserved (invalid repair rejected)
- [ ] Verify `codeSource` remains `'ai_generation'`

## Dev Harness: repair-api-error
- [ ] Set repair mode to "API Error"
- [ ] Inject "Black Screen" shader
- [ ] Wait for telemetry → diagnosis → repair plan → auto-repair attempt
- [ ] Verify black shader preserved (API error caught)
- [ ] Verify `codeSource` remains `'ai_generation'`

## Runtime Safety Checks
- [ ] No system message appears after index 0 in API calls
- [ ] Auto-repair never applies fallback shader
- [ ] Manual edit during repair does not get overwritten
- [ ] `codeSource === 'quality_repair'` does not re-trigger telemetry
- [ ] No recursive auto-repair (one-shot per requestId)
- [ ] No vision model calls anywhere in pipeline
- [ ] `canApplyAutoRepair()` guard rejects mismatched codeSource/requestId/code

## Regression Checks
- [ ] Create intent still works end-to-end
- [ ] Modify intent still uses modifyShader (not generateShader)
- [ ] Explain intent still bypasses agent loop
- [ ] Fix intent still works with error context
- [ ] Golden examples still selected for matching scenes
- [ ] Fallback shaders still compile
- [ ] Clean/validate/compile loop unchanged
- [ ] FPS counter still works after lint cleanup
- [ ] Monaco typing still works after lint cleanup
- [ ] Preview render loop unaffected by lint changes

## Production Build
- [ ] `npm run build` produces dist/ without errors
- [ ] No DevTestPanel visible in production build
- [ ] No dev-only repair modes active in production
- [ ] Normal create/modify/explain/telemetry behavior unchanged
