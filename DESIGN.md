# ShaderForge DESIGN.md

## Design Identity

ShaderForge is not a normal code editor.

ShaderForge is an AI-native shader creation studio: a browser-based visual invention machine where users create, modify, critique, debug, and refine GLSL shader art through natural language, reference images, structured intent, visual feedback, and agent loops.

The product should feel like a fusion of:

* Shadertoy,
* creative coding studio,
* visual synthesizer,
* cinematic shader lab,
* procedural art instrument,
* AI co-creator workspace,
* realtime graphics cockpit.

Do not design it as a generic SaaS dashboard, plain Monaco wrapper, ordinary chat app, or developer admin panel.

The interface should make users feel:

> I am not writing code in a box. I am steering light, matter, motion, and mathematics.

## North Star

The goal is not merely valid GLSL.

The goal is visually ambitious, editable, performant, prompt-aligned shader art.

A result is not good enough just because it compiles. A shader must have visual intention.

Every product decision should help users do at least one of these:

* imagine a visual scene,
* translate language into shader structure,
* see the output immediately,
* understand why the result works or fails,
* refine the visual direction,
* modify the shader without destroying what already works,
* learn reusable GLSL techniques,
* avoid browser-freezing performance traps.

ShaderForge should feel magical, but not opaque.
It should be spectacular, but still controllable.
It should be AI-native, but still inspectable.

## Design Anti-Goals

Avoid:

* generic dark developer tool UI,
* boring black editor plus preview split,
* plain chat sidebar,
* low-effort gradient backgrounds,
* random noise shaders as default output,
* unstyled Monaco-dominant layout,
* ordinary “Generate” button workflow,
* shallow keyword-template UX,
* visual results judged only by compilation,
* UI that hides the creative pipeline,
* UI that makes users feel they are fighting code instead of directing visuals.

Do not make ShaderForge feel like:

* a CRUD app,
* a prompt box glued to Monaco,
* a bland AI wrapper,
* a template gallery with chat,
* a basic Shadertoy clone.

## Product Personality

ShaderForge should feel:

* electric,
* cinematic,
* precise,
* experimental,
* technical,
* premium,
* strange,
* powerful,
* inspectable,
* high-performance,
* visually hungry.

Not cute.
Not corporate.
Not classroom-simple.
Not neon chaos without taste.

The ideal mood is:

> a black-glass graphics lab where an AI and a shader artist sculpt procedural worlds together.

## Core Product Surfaces

### 1. Preview

The Preview is the stage. It is the most important surface.

It must feel dominant, alive, and worthy of the generated art.

Requirements:

* large enough to judge composition and motion,
* visually framed like a render viewport, not a basic iframe,
* clear play/pause/restart affordance,
* time and resolution awareness,
* error state that does not feel like a dead app,
* screenshot/export-ready presentation later,
* performance status available without visual clutter.

The Preview should feel like a miniature universe generator.

### 2. Editor

The Editor is the instrument panel.

Monaco should remain powerful, but the interface must not feel like Monaco swallowed the whole product.

Requirements:

* GLSL code must be readable,
* compile errors must connect to code and preview,
* generated sections should be understandable,
* AI modifications should preserve user edits where possible,
* code should be structured enough for follow-up edits.

The Editor should feel technical and serious, but not visually dead.

### 3. AI Chat

AI Chat is not a support chatbot. It is the creative director interface.

It should help users express visual intent:

* scene,
* subject,
* material,
* color,
* motion,
* camera,
* depth,
* mood,
* style,
* interaction,
* performance budget,
* reference image target,
* modification target.

AI messages should not feel like generic assistant bubbles. They should feel like shader-generation states, creative decisions, and visual critique.

### 4. Pipeline / Agent Loop

The AI pipeline should be visible enough to build trust.

Users should understand whether the system is:

* parsing intent,
* retrieving shader knowledge,
* planning GLSL structure,
* generating code,
* compiling,
* repairing errors,
* checking performance,
* visually critiquing,
* refining toward a reference.

This can be shown as subtle pipeline states, not a heavy enterprise workflow diagram.

### 5. Knowledge / RAG

Knowledge is not a boring document search result.

Shader knowledge should feel like a library of visual techniques:

* raymarching,
* SDFs,
* volumetric fog,
* domain repetition,
* FBM,
* curl noise,
* reaction diffusion,
* palette functions,
* polar coordinates,
* camera motion,
* bloom-like illusions,
* dithering,
* fractals,
* plasma fields,
* Voronoi cells,
* signed distance blending,
* lighting tricks,
* anti-aliasing patterns.

Retrieved knowledge should appear as creative ammunition, not academic citations.

## Layout Direction

### Desktop Layout

The default layout should support a three-part creative flow:

1. AI intent and creative controls,
2. shader code editor,
3. live visual preview.

Recommended modes:

* Split Studio: Chat left, Editor center, Preview right.
* Visual First: Preview dominant, Editor collapsible, Chat as command rail.
* Code First: Editor dominant, Preview persistent, Chat compact.
* Critique Mode: Preview dominant with AI visual analysis and delta list.

The user should be able to feel that ShaderForge is a creation cockpit, not a webpage.

### Panel Behavior

Panels should feel like instruments:

* resizable,
* collapsible,
* stateful,
* visually distinct,
* not heavy cards,
* not ordinary admin dashboard panels.

Use subtle borders, glass, scanlines, glow, and shader-inspired materials.
Do not overload every panel with thick shadows or rounded SaaS card styling.

### Spatial Priority

Priority order:

1. Preview output,
2. user prompt / creative intent,
3. compile status / error feedback,
4. editor code,
5. settings and metadata.

Do not bury the preview.
Do not let settings dominate the creative experience.

## Visual Language

### Materials

Preferred materials:

* black glass,
* graphite metal,
* deep blue-black panels,
* smoked transparent overlays,
* spectral edge highlights,
* thin neon wires,
* cool cyan diagnostics,
* magenta/purple creative accents,
* amber warnings,
* red error fracture states,
* procedural grain,
* subtle scanline texture,
* shader-grid overlays,
* floating vector marks.

Use these as materials, not decoration.

### Surface Style

The app background should feel like a dark graphics laboratory:

* not pure black,
* not flat gray,
* not generic Tailwind dark mode,
* layered depth,
* faint grid,
* subtle noise,
* ambient glow from preview,
* gentle vignette,
* focus drawn toward shader output.

### Shape Language

Use:

* sharp technical panels,
* small radius for controls,
* medium radius for larger glass surfaces,
* thin hairline borders,
* precise alignment,
* compact dense controls,
* high-information visual hierarchy.

Avoid:

* oversized rounded cards,
* bubbly consumer UI,
* pastel SaaS panels,
* generic pricing-page geometry,
* soft toy-like shadows.

### Glow Rules

Glow must communicate state.

Good glow:

* preview active state,
* AI thinking,
* compile success,
* selected visual technique,
* live uniform interaction,
* reference match focus,
* node in creative pipeline.

Bad glow:

* random neon decoration,
* thick saturated outlines,
* glow behind long text,
* high-contrast flicker.

## Color System

ShaderForge should use a dark technical base with spectral accents.

### Core Palette

* Void Black: near-black base, not pure black.
* Graphite: panel background.
* Deep Navy: secondary surface.
* Smoked Glass: translucent overlay.
* Cool Cyan: diagnostics, active runtime, coordinate/grid language.
* Electric Violet: AI generation, creative intent, magic state.
* Deep Magenta: style energy, aesthetic emphasis.
* Amber: warning, performance caution, ambiguity.
* Fracture Red: compile error, shader failure.
* Soft White: primary text.
* Steel Gray: secondary text.
* Muted Blue Gray: metadata, disabled state.

### Color Usage

* Cyan = technical/runtime truth.
* Violet = AI creative energy.
* Magenta = visual intensity/style.
* Amber = caution/performance/ambiguity.
* Red = compile/runtime failure.
* Green should be used sparingly for success, not as a default brand color.

### Avoid

* generic blue primary everywhere,
* corporate purple CTA language,
* pastel productivity colors,
* flat black-and-white code editor look,
* random rainbow gradients unless the shader concept demands it.

## Typography

### Product UI

Use a clean technical sans-serif.

Preferred feel:

* compact,
* precise,
* readable,
* slightly futuristic,
* not playful.

Use for:

* controls,
* chat,
* panels,
* labels,
* buttons,
* pipeline states.

### Code

Code typography must remain excellent.

Requirements:

* clear GLSL symbols,
* readable punctuation,
* good line-height,
* no cramped editor density,
* errors easy to scan.

### Numeric / Runtime Data

Use tabular numbers where possible for:

* FPS,
* resolution,
* compile attempt,
* token count,
* raymarch steps,
* uniform values,
* performance budget.

Runtime data should feel like instrumentation.

## Motion System

Motion should feel like realtime graphics, not web animation stickers.

### Motion Principles

* motion reveals state,
* transitions should feel responsive,
* no toy bouncing,
* no random floating UI,
* no constant distraction near code,
* preview remains king.

### Motion Types

Use:

* subtle scanline drift,
* panel glass refraction,
* AI pulse while generating,
* compile error fracture,
* code-to-preview connection trace,
* reference match overlay sweep,
* shader technique node activation,
* pipeline step glow,
* uniform interaction ripple,
* performance danger flicker.

### Timing

* micro interaction: 80ms–160ms,
* panel reveal: 120ms–240ms,
* AI state transition: 250ms–600ms,
* compile repair loop: 300ms–800ms,
* visual critique sweep: 600ms–1200ms,
* major mode transition: 500ms–1000ms.

Prefer crisp and physical over slow and decorative.

## Shader Output Quality Bar

A generated shader is good only if it satisfies more than compilation.

Evaluate using:

### 1. Prompt Alignment

Does it match the requested subject, mood, palette, motion, and style?

### 2. Composition

Is there a clear visual structure?

Look for:

* focal point,
* balance,
* framing,
* scale,
* readable silhouette,
* intentional empty space.

### 3. Depth

Does it feel spatial?

Depth can come from:

* raymarching,
* parallax,
* fog,
* size falloff,
* lighting,
* layered particles,
* camera movement,
* volumetric effects.

### 4. Color Harmony

Are the colors intentional?

Avoid default rainbow chaos unless requested.
Prefer controlled palettes with contrast, accent, temperature, and mood.

### 5. Motion Quality

Does animation feel alive?

Good motion has rhythm, easing, flow, orbit, turbulence, drift, pulse, or physical behavior.
Bad motion is random jitter, uniform spinning, or noise flicker.

### 6. Material Richness

Does it look like something?

Possible materials:

* plasma,
* nebula,
* glass,
* liquid metal,
* smoke,
* fire,
* crystal,
* membrane,
* ink,
* energy field,
* black hole,
* ocean,
* biological tissue,
* hologram,
* fractal architecture.

### 7. Procedural Detail

Does it have layered detail without becoming visual mud?

Use:

* FBM,
* domain warping,
* Voronoi,
* SDF blending,
* noise layering,
* polar transforms,
* normal approximation,
* fake bloom,
* dithering,
* gamma correction.

### 8. Editability

Can the shader be modified later?

Prefer organized helper functions and meaningful constants over monolithic unreadable code.

### 9. Performance Safety

Does it avoid freezing the browser?

Visual ambition must include performance discipline.

### 10. Distinctiveness

Does it avoid looking like the same template every time?

Repeated output patterns are product failure.

## Generation Experience

The generation flow should feel like a creative process.

Preferred flow:

1. user prompt,
2. structured intent,
3. creative shader plan,
4. GLSL generation,
5. compile check,
6. automatic repair,
7. performance risk check,
8. visual critique when image/screenshot is available,
9. refinement,
10. final shader with explanation and editable direction.

Do not treat “generate code once” as the final experience.

## Intent and Spec Design

Natural language must become structured visual intent.

A good ShaderSpec should capture:

* scene,
* subject,
* mood,
* palette,
* motion,
* material,
* camera,
* composition,
* depth,
* lighting,
* interaction,
* complexity,
* performance budget,
* reference image constraints,
* preserve/change targets for modification.

Do not use keyword matching as the main product brain.

Keyword rules are allowed only for:

* fallback,
* validation,
* safety,
* deterministic guardrails,
* regression tests.

## Modify Flow

Modification is as important as creation.

When user asks to modify a shader, the UI and AI should identify:

* what to preserve,
* what to change,
* where in the code it likely lives,
* what visual delta is expected,
* whether the request affects palette, motion, camera, material, geometry, interaction, or performance.

Examples:

* “make it more cosmic” should not just add purple.
* “more depth” should affect camera, fog, parallax, or raymarch structure.
* “more like black hole” should affect lensing, accretion disk, radial distortion, gravitational composition.
* “less chaotic” should reduce noise frequency, motion speed, contrast, or particle density.

## Reference Image Workflow

When a user provides a reference image, the design goal is not vague similarity.

The system should extract:

* composition,
* subject,
* silhouette,
* color palette,
* lighting,
* depth,
* texture,
* material,
* motion implication,
* shader techniques needed,
* artifacts to avoid.

The generated shader should then be judged against the reference using concrete visual deltas:

* shape mismatch,
* color mismatch,
* depth mismatch,
* motion mismatch,
* material mismatch,
* scale mismatch,
* missing focal point,
* incorrect glow or contrast,
* lack of atmospheric density.

Do not guess reference image contents outside the approved vision workflow.

## Visual Critique UI

A visual critique should not be a wall of prose.

It should be structured as:

* What works,
* What fails,
* Why it fails,
* Exact shader techniques to adjust,
* Priority order,
* Expected visual delta.

For example:

* increase radial density near center,
* lower star noise brightness,
* add lensing distortion,
* introduce polar disk structure,
* reduce high-frequency flicker,
* add volumetric falloff,
* shift palette from flat blue to cyan-violet-black.

Critique must lead to action.

## Error and Repair Design

Errors should feel like part of the creative instrument, not a crash.

### Compile Error

Visual treatment:

* red fracture line,
* editor marker,
* concise explanation,
* repair action,
* affected line focus.

### Runtime Failure

Visual treatment:

* preview safe fallback,
* warning surface,
* shader paused if needed,
* performance note.

### AI Repair

Repair state should show:

* attempt number,
* error reason,
* what is being changed,
* whether visual intent is preserved.

Avoid generic “Something went wrong.”

## Performance Design

Performance is a design concern.

The UI should eventually communicate:

* FPS,
* resolution,
* quality tier,
* heavy loop risk,
* raymarch step estimate,
* mobile risk,
* browser freeze danger.

Expensive beauty is allowed, but it must be controlled.

Preferred performance strategies:

* quality tiers,
* capped iterations,
* dynamic resolution,
* preview pause,
* safe mode,
* lower-power fallback,
* warning before dangerous code,
* preserve visual style with cheaper approximations.

## Component Direction

### App Shell

Dark technical cockpit.

Features:

* preview-centered layout,
* panel resizing,
* mode switching,
* minimal chrome,
* strong focus on generated art.

### Preview Panel

Visual stage.

Features:

* high-priority space,
* live shader output,
* runtime overlay,
* screenshot/export affordance later,
* safe fallback state,
* performance display.

### Editor Panel

Code instrument.

Features:

* Monaco editor,
* GLSL-aware snippets,
* clear error markers,
* AI-changed region awareness later,
* preserve user control.

### AI Chat Panel

Creative command rail.

Features:

* prompt input,
* intent summary,
* generation state,
* modify actions,
* follow-up suggestions,
* critique summaries,
* reference image state.

### Pipeline Status

Subtle but visible.

States:

* parsing intent,
* retrieving knowledge,
* planning,
* generating,
* compiling,
* repairing,
* checking performance,
* critiquing,
* refining,
* ready.

### Technique Inspector

Future direction.

Displays detected or used techniques:

* raymarch,
* SDF,
* FBM,
* domain warp,
* Voronoi,
* particles,
* palette function,
* camera orbit,
* bloom approximation,
* distortion.

### Reference Panel

Future direction.

Displays:

* reference image,
* extracted visual spec,
* similarity deltas,
* next refinements.

## Empty States

Empty states should inspire creation, not look blank.

Good empty states:

* “Describe a world made of light, fog, metal, water, stars, or impossible geometry.”
* example prompt chips by visual category,
* animated but lightweight procedural background,
* starter scenes.

Avoid:

* “No data yet,”
* plain blank editor,
* generic onboarding cards.

## Prompt Starters

Use prompt examples that encourage visual ambition:

* “A black hole with a violet accretion disk, gravitational lensing, and drifting star dust.”
* “Liquid chrome flowers blooming in a dark glass room.”
* “A deep ocean nebula made of cyan fog, glowing particles, and slow camera drift.”
* “A living circuit board where electric veins pulse through black metal.”
* “A soft aurora ribbon twisting over an alien mountain silhouette.”
* “A crystalline tunnel with recursive reflections and blue-magenta light.”

Avoid boring examples:

* “make a gradient,”
* “add noise,”
* “draw a circle,”
* “blue animation.”

## Interaction Design

### Generate

Should feel like starting a visual experiment.

Feedback:

* AI creative energy,
* pipeline progress,
* preview anticipation,
* no fake instant magic if process has steps.

### Modify

Should feel surgical and visual.

The UI should preserve context:

* previous shader,
* requested change,
* expected visual delta,
* modified regions if possible.

### Fix

Should feel technical and trustworthy.

Focus on:

* compile error,
* broken line,
* repair reason,
* retry result.

### Explain

Should teach shader thinking.

Good explanation:

* visual idea,
* GLSL structure,
* key functions,
* animation logic,
* performance risks,
* how to modify.

Bad explanation:

* generic code summary,
* tutorial fluff,
* unexplained math dump.

### Optimize

Should preserve appearance whenever possible.

Optimization should report:

* what changed,
* what visual quality was preserved,
* what quality may be reduced,
* expected performance improvement.

## RAG and Knowledge Design

RAG should not feel like document search.

It should feel like the AI is drawing from a shader spellbook.

Knowledge results should be translated into usable creative techniques:

* “Use polar coordinates for accretion disk structure.”
* “Use FBM with domain warp for nebula density.”
* “Use signed distance fields for crisp procedural geometry.”
* “Use exponential falloff for glow.”
* “Use normal approximation for lighting.”
* “Use capped raymarch steps for performance.”

Do not show raw knowledge unless it helps the user.

## Aesthetic Categories

ShaderForge should support strong visual categories:

### Cosmic

Black holes, nebulae, star fields, gravitational lensing, accretion disks, galaxies, cosmic dust.

Techniques:

* polar coordinates,
* radial distortion,
* FBM density,
* raymarch fog,
* star hash,
* lensing approximation.

### Liquid

Ink, water, plasma, mercury, lava, membrane, fluid fields.

Techniques:

* domain warp,
* noise advection,
* normal perturbation,
* ripple functions,
* smoothstep layering.

### Crystalline

Gems, glass tunnels, faceted light, holographic prisms.

Techniques:

* SDF repetition,
* sharp normals,
* Fresnel-like edge glow,
* palette splitting,
* angular symmetry.

### Biological

Cells, veins, tissue, organic membranes, spores, growth fields.

Techniques:

* Voronoi,
* reaction-diffusion-inspired patterns,
* branching noise,
* soft pulsing,
* organic color gradients.

### Architectural

Infinite corridors, impossible rooms, sci-fi structures, recursive spaces.

Techniques:

* raymarching,
* domain repetition,
* SDF boxes,
* camera path,
* fog depth.

### Energy

Lightning, fields, aura, particles, magnetic flow, plasma ribbons.

Techniques:

* curl-like noise,
* line fields,
* additive glow,
* particle hashes,
* temporal modulation.

## Quality Rubric

When reviewing the product or shader output, use this scorecard:

| Area             | Excellent                              | Weak                     |
| ---------------- | -------------------------------------- | ------------------------ |
| Prompt alignment | Matches subject, mood, motion, palette | Only loosely related     |
| Composition      | Clear focal point and depth            | Random full-screen noise |
| Motion           | Purposeful, rhythmic, alive            | Jitter, spin, flicker    |
| Color            | Controlled, mood-specific              | Default rainbow or muddy |
| Material         | Feels like a thing                     | Abstract mush            |
| Detail           | Layered and intentional                | Flat or noisy            |
| Performance      | Stable and bounded                     | Freezes or stutters      |
| Editability      | Organized, modifiable                  | Monolithic code blob     |
| Originality      | Distinct visual identity               | Template repetition      |
| UX               | Creative flow is clear                 | User feels lost          |

## Visual QA Expectations

For any serious visual feature, verify through at least one of:

* live preview inspection,
* screenshot comparison,
* vision-agent critique,
* shader compile result,
* performance check,
* dedicated demo route or state,
* manual reproduction steps.

Do not claim visual success without a way to see or evaluate it.

## Design Modes

### Creation Mode

User is generating from scratch.

Prioritize:

* prompt input,
* intent understanding,
* preview anticipation,
* pipeline status,
* generated visual quality.

### Refinement Mode

User is improving output.

Prioritize:

* preserve current good parts,
* visual delta clarity,
* comparison,
* fast iteration,
* modification target.

### Debug Mode

User is fixing broken shader.

Prioritize:

* compile error clarity,
* line-level focus,
* safe repair,
* minimal visual disruption.

### Critique Mode

User wants better aesthetics.

Prioritize:

* reference or output analysis,
* concrete visual flaws,
* ranked fixes,
* shader technique recommendations.

### Learning Mode

User wants explanation.

Prioritize:

* visual idea,
* math intuition,
* code structure,
* editable parameters,
* common pitfalls.

## Accessibility and Usability

Even a wild shader studio must remain usable.

Requirements:

* readable contrast,
* keyboard-friendly controls,
* clear focus states,
* safe preview fallback,
* reduced-motion preference respected for UI animation,
* errors readable without color alone,
* no essential control hidden behind hover only,
* avoid text over busy preview without dark scrim.

## Implementation Guidance

Prefer design primitives that scale:

* theme tokens,
* status tokens,
* panel primitives,
* preview overlay primitives,
* pipeline state components,
* shader quality metadata,
* visual critique structures,
* reusable prompt chips,
* technique tags,
* performance indicators.

Avoid:

* one-off visual hacks,
* CSS decorations unrelated to state,
* hardcoded prompts scattered in components,
* fake pipeline states,
* fake quality scoring,
* components that cannot survive future agent loop upgrades.

## When Full Design Is Too Large

If a complete feature is too large, implement:

* the correct state model,
* the visible prototype,
* the demo path,
* the fallback,
* the next-step marker.

Do not reduce ambitious features into bland UI.

Example:

Instead of a fake “Visual Critique” button that only opens text, create a critique panel structure with sections for composition, color, motion, material, performance, and concrete GLSL fixes, even if the first data source is mocked or manually triggered.

## Do

* make Preview visually dominant,
* make AI feel like a creative collaborator,
* expose pipeline state enough to build trust,
* judge shader quality visually, not only technically,
* preserve performance safety,
* support reference-driven creation,
* make modifications preserve what works,
* create high-impact prompt examples,
* use dark technical beauty,
* make the app feel like a creative graphics instrument.

## Don’t

* make it a plain Monaco editor with chat,
* make it a generic dashboard,
* celebrate compile success as final success,
* use keyword matching as the main brain,
* generate the same noise field repeatedly,
* hide visual critique,
* ignore reference images,
* let performance hazards freeze the browser,
* overuse corporate SaaS cards,
* replace creative ambition with “simple enough.”

## Definition of Visual Done

A design or visual task is done only when:

* it improves the creative shader workflow,
* it is visible in the app or clearly testable,
* it supports prompt-to-visual creation,
* it respects performance safety,
* it avoids generic UI patterns,
* it helps users create, refine, understand, or judge shader art,
* and it moves ShaderForge closer to an AI-native visual creation studio.

The target is not “clean UI.”

The target is a machine for making impossible light.
