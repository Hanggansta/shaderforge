# Primitive & Template Authoring Guide

> **The only bar that matters:** would a person who knows shaders say *"this is worth existing"*?
> Not "it compiles", not "it works", not "it's neat". It has to be the kind of code that, on first read, makes you want to riff on it.

This directory is the product's shader DNA. Every primitive and every template here is something the LLM will reach for by default. If it's mediocre, every generated shader will be mediocre. If it's sharp, every generated shader can become sharp.

## TL;DR — three rules

1. **One idea per file.** A primitive does *one* thing excellently. A template expresses *one* concept excellently.
2. **Parametric, not freeform.** Everything the LLM is meant to *adjust* lives at the top as a `#define` or named parameter. Everything else is fixed.
3. **Compile-test in the actual preview before merging.** `npm test` covers structure; only a real WebGL frame covers visual correctness.

---

## Adding a primitive

A primitive is a self-contained GLSL function. It is referenced by the LLM as a building block. Primitives must:

- Compile in WebGL2 with no warnings (check browser console).
- Be 5-20 lines. If it's longer, split it.
- Have 1-4 tunable parameters. The LLM adjusts parameters; it does not rewrite the function.
- Be self-contained. If it needs `fbm`, it can call `fbm`, but it must declare that in `dependsOn`.
- Have a name that is the **canonical Shadertoy / IQ / BooksOfShaders convention** when one exists. Invented names break search.

### When to add a new primitive

Add one when:

- The LLM keeps reaching for a 10-line inline implementation of the same thing in many shaders.
- You find a math primitive that *changes the aesthetic* of what's possible (e.g. a new noise flavor, a new SDF op).
- You have a primitive that is *parametric in a way the existing ones are not*.

Do **not** add a primitive just because it's "useful". If it does the same job as an existing one with different parameter names, extend the existing one.

### Where to put it

`src/ai/knowledge/primitives/<category>.glsl`. Categories: `noise | sdf | lighting | motion | color | utility`.

### Metadata to fill in (`primitives/index.ts`)

```ts
{
  id: 'category/function-name',         // e.g. 'motion/flowField'
  name: 'function-name',                // matches the GLSL function name
  category: 'motion',
  summary: 'One-line description.',     // < 80 chars
  when: 'When the LLM should reach for it. Concrete, not vague.',
  glsl: '...',                          // pasted from the .glsl file via extractFn
  params: [
    { name: 'p', purpose: 'Sample position' },
    ...
  ],
  dependsOn: ['noise/fbm', ...],       // IDs of primitives this calls
}
```

### The "I would riff on this" test

Before adding a primitive, read it in isolation and ask: *if I saw this in someone else's shader, would I copy it into mine?* If the answer is no, don't add it. The directory is meant to be a *gallery of good ideas*, not a toolbox of adequate ones.

---

## Adding a template

A template is a complete, compilable `mainImage` shader. It is the *starting point* the LLM copies and then varies.

Templates must:

- Be 50-100 lines. Longer is fine if every line earns its place, but 200 lines is almost always wrong.
- Have **one clear concept** ("domain-warped nebula", "truchet knot", "8-fold mandala"). Not "abstract pattern", not "geometric effect". Be specific.
- Have **obvious knobs** at the top — `#define`s the LLM can tune. Group them under a `// Knobs` comment.
- Compile and produce a *visually arresting* frame in the first second. (Compiling is not enough.)
- Not use `sampler2D`, `iChannel`, or any texture. Pure math.
- Use `iTime`, `iResolution` only. No other auto-uniforms.

### When to add a new template

Add one when:

- You have a visual concept the existing 15 do not cover and that you'd want to see at least once a week.
- You can express it in 50-100 lines *without* it being a strip-mined Shadertoy submission.
- It belongs to a *recognizable aesthetic category* — not "neat shader", but "vibrant IQ palette on a single FBM" or "8-fold truchet with hot rim".

Do **not** add a template that is "the same idea with a different palette". A palette change is a knob on the existing template.

### Where to put it

`src/ai/knowledge/templates/<NN>-<name>.glsl` (numbered prefix keeps lexicographic order). Then register it in `templates/index.ts` with the metadata.

### Metadata to fill in (`templates/index.ts`)

```ts
{
  id: 'kebab-case-name',               // matches the GLSL comment header
  name: 'display name',
  sceneType: 'mandala',                // from ShaderSpec SceneType
  moods: ['premium', 'ethereal'],      // moods this works well with
  motions: ['rotate'],                 // motion types that suit it
  techniques: ['mandala_symmetry'],    // technique tags from TechniquePlan
  glsl: '...',                         // imported with ?raw
  summary: 'One-line pitch. Why does this exist?',
  knobs: ['FOLD', 'LAYERS', 'ROTATION_SPEED'],
  tags: ['truchet', 'radial', ...],    // for retrieval
}
```

### The "would I post this on Shadertoy" test

Look at your template output, screen-cap it at t=0 and t=2.0. Ask:

- Would a stranger scrolling Shadertoy stop on it?
- Does it have *one thing* that is recognizable from across the room?
- If I changed nothing but the palette, would the underlying form still be interesting?

If you can swap the palette and the form becomes nothing, the form is not strong enough.

### Things that are *not* the template's job

- **Reusability.** Templates are starting points. The LLM is expected to edit them. Don't engineer for reuse.
- **Coverage.** A template is for one concept. If you want three variations, write three templates.
- **Comment density.** One short header comment is enough. The GLSL is the artifact.

---

## Quality bar (compiled)

For a primitive or template to merge, it must:

| Check | Tool |
|---|---|
| Compiles in WebGL2 | Open the dev server, paste into the editor, watch for compile errors |
| Has balanced braces | `npm test` covers this for all registered entries |
| Has no `sampler2D` / `iChannel` | `npm test` covers this for all templates |
| Has the right `void mainImage` signature | `npm test` covers this for all templates |
| Passes the lightweight `validateShaderCode` | `npm test` covers this for all templates |
| **Visually arresting** | Your eyes, in a real browser |

The first five are automated. The last one is yours.

## What to do when in doubt

If you have a primitive or template that you suspect is mediocre:

- **Delete it.** The directory is small and intentional. Better to have 10 great entries than 30 mixed ones.
- If you think it's the only entry for a *category* and you need something, write a *minimal* placeholder and add a `// TODO: quality` comment. The LLM will still work, and you can replace it later.
- If a primitive only has one use site (only ever appears in one template), inline it. Don't make it a primitive.

## Reviewing someone else's contribution

Three questions:

1. **Could I delete it and the system still work for the scenes it covers?** If yes, delete it.
2. **Does it have one idea I can name in 5 words or less?** If no, rewrite it.
3. **Does it teach me something when I read it?** If no, it's a generic implementation. Generic implementations belong in a search engine, not in this directory.

---

## The aesthetic north star

Read these before adding anything:

- [xordev's Shadertoy profile](https://www.shadertoy.com/user/xordev) — the gold standard. Short, geometric, single-trick shaders with strong color discipline.
- [IQ's articles](https://iquilezles.org/articles/) — the math canon. Cosine palette, smooth min, raymarching.
- [Books of Shaders gallery](https://thebookofshaders.com/) — the gallery of GLSL idioms.

If a new template would not look at home next to those, it doesn't belong here.
