/**
 * Build Knowledge Index from MiniMax templates + Golden shaders
 * Run: node scripts/build-knowledge-index.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Static Analysis (simplified inline version) ──────────────────────────

function analyzeShader(code) {
  const techniques = [];
  const evidence = {};

  const patterns = [
    ['fbm', /fbm\s*\(/i, 0.9],
    ['domain_warped_fbm', /fbm\s*\([^)]*fbm/, 0.95],
    ['value_noise', /float\s+noise\s*\(/, 0.8],
    ['sdf_sphere', /sdSphere\s*\(/, 0.9],
    ['sdf_box', /sdBox\s*\(/, 0.85],
    ['sdf_plane', /sdPlane\s*\(/, 0.8],
    ['raymarching', /ro\s*\+\s*rd\s*\*\s*d/, 0.9],
    ['voronoi', /voronoi|min_dist/i, 0.9],
    ['fractal', /mandelbrot|julia|z\s*=\s*z\s*\*\s*z/, 0.9],
    ['phong', /specular.*pow\s*\(/i, 0.85],
    ['fresnel', /fresnel|pow\s*\(\s*1\.0\s*-\s*max/i, 0.9],
    ['pbr', /pbr|metallic|roughness|GGX/i, 0.9],
    ['vignette', /smoothstep.*length.*uv/i, 0.85],
    ['bloom', /bloom|glow.*blur/i, 0.8],
    ['gamma_correction', /pow.*col.*0\.45/i, 0.9],
    ['cosine_palette', /0\.5\s*\+\s*0\.5\s*\*\s*cos.*6\.28/i, 0.9],
    ['domain_warping', /domain.*warp|q\s*=\s*vec2.*fbm/i, 0.9],
    ['particles', /particle|hash.*glow/i, 0.8],
    ['waves', /sin.*uv.*time|wave/i, 0.7],
    ['polar', /atan.*length|polar/i, 0.8],
    ['ambient_occlusion', /ambientOcclusion|ao\s*\(/i, 0.85],
    ['soft_shadows', /softShadow/i, 0.85],
    ['tone_mapping', /tone.*map|aces|reinhard/i, 0.85],
    ['time_drift', /iTime\s*\*\s*0\.\d+/, 0.7],
    ['rotation', /mat2\s*\(\s*cos/i, 0.8],
  ];

  for (const [name, pattern, weight] of patterns) {
    const match = code.match(pattern);
    if (match) {
      techniques.push({ name, confidence: weight, evidence: match[0] });
    }
  }

  const webgl2Compatible = !(/sampler2D|texture\s*\(|gl_FragColor|#version/i.test(code)) &&
    (code.includes('mainImage') || code.includes('void mainImage'));
  const hasTextures = /sampler2D|texture\s*\(/i.test(code);
  const functionCount = (code.match(/(?:float|vec[234]|void|int|mat[234])\s+\w+\s*\(/g) || []).length;
  const lineCount = code.split('\n').length;

  return { techniques, webgl2Compatible, hasTextures, functionCount, lineCount };
}

function computeQuality(analysis) {
  const techDiversity = Math.min(1, analysis.techniques.length / 6);
  const complexity = Math.min(1, (analysis.functionCount * 0.1 + analysis.lineCount * 0.002));
  const overall = techDiversity * 0.5 + complexity * 0.5;
  return { techniqueDiversity: techDiversity, codeComplexity: complexity, overallScore: overall };
}

// ─── Parse MiniMax Templates ──────────────────────────────────────────────

function parseMinimaxTemplates() {
  const dir = path.join(ROOT, 'data', 'minimax-templates');
  if (!fs.existsSync(dir)) {
    console.log('MiniMax templates not found, skipping');
    return [];
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'SKILL.md');
  const entries = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const name = file.replace('.md', '');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : name;

    // Extract description
    const descMatch = content.match(/^#\s+.+\n\n(.+?)(?:\n\n|\n#)/ms);
    const description = descMatch ? descMatch[1].replace(/\n/g, ' ').substring(0, 300) : '';

    // Extract GLSL code blocks
    const codeBlocks = [];
    const regex = /```glsl\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push(match[1].trim());
    }

    // Create one entry per code block (include fragments, not just complete shaders)
    for (let i = 0; i < codeBlocks.length; i++) {
      const code = codeBlocks[i];
      if (code.length < 20) continue; // Skip very tiny snippets

      const analysis = analyzeShader(code);
      const quality = computeQuality(analysis);

      entries.push({
        id: `minimax-${name}-${i}`,
        code,
        visualDescription: `${title}: ${description}`,
        technicalDescription: `Technique: ${name}. Functions: ${analysis.functionCount}. Lines: ${analysis.lineCount}.`,
        parameterDescription: `Techniques detected: ${analysis.techniques.map(t => t.name).join(', ')}`,
        author: 'MiniMax',
        license: 'MIT',
        source: 'minimax',
        tags: [name, ...analysis.techniques.map(t => t.name)],
        sceneTypes: inferSceneTypes(name, code),
        techniques: analysis.techniques.length > 0 ? analysis.techniques.map(t => t.name) : [name],
        moods: [],
        palettes: [],
        quality: { ...quality, overallScore: Math.max(quality.overallScore, 0.2) }, // Minimum score for templates
        webgl2Compatible: analysis.webgl2Compatible,
        hasTextures: analysis.hasTextures,
        hasMultipass: false,
        estimatedFps: 60,
        embedding: null,
      });
    }
  }

  return entries;
}

function inferSceneTypes(techniqueName, code) {
  const scenes = [];
  const lower = techniqueName + ' ' + code.toLowerCase();

  if (/nebula|cloud|gas|cosmic/.test(lower)) scenes.push('nebula');
  if (/ocean|water|wave|sea|caustic/.test(lower)) scenes.push('ocean');
  if (/fire|flame|heat|ember/.test(lower)) scenes.push('fire');
  if (/sphere|ball|sdf.*3d|raymarch/.test(lower)) scenes.push('sphere');
  if (/particle|point|star|dot/.test(lower)) scenes.push('particles');
  if (/tunnel|polar.*repeat/.test(lower)) scenes.push('tunnel');
  if (/terrain|height|landscape|mountain/.test(lower)) scenes.push('terrain');
  if (/mandala|symmetry|kaleidoscope/.test(lower)) scenes.push('mandala');
  if (/fractal|mandelbrot|julia/.test(lower)) scenes.push('fractal');
  if (/abstract|flow|generative/.test(lower)) scenes.push('abstract');
  if (/voronoi|cell/.test(lower)) scenes.push('abstract');
  if (/voxel|minecraft/.test(lower)) scenes.push('abstract');
  if (/cloud|volumetric/.test(lower)) scenes.push('nebula');

  return scenes.length > 0 ? scenes : ['abstract'];
}

// ─── Parse Golden Shaders ─────────────────────────────────────────────────

// ─── Parse shaders21k ─────────────────────────────────────────────────────

function parseShaders21k() {
  const codesDir = path.join(ROOT, 'data', 'shaders21k', 'shader_codes');
  if (!fs.existsSync(codesDir)) {
    console.log('shaders21k not found, skipping');
    return [];
  }

  const entries = [];

  // Read Shadertoy shaders
  const shadertoyDir = path.join(codesDir, 'shadertoy');
  if (fs.existsSync(shadertoyDir)) {
    const subdirs = fs.readdirSync(shadertoyDir);
    for (const subdir of subdirs) {
      const subPath = path.join(shadertoyDir, subdir);
      if (!fs.statSync(subPath).isDirectory()) continue;
      const files = fs.readdirSync(subPath).filter(f => f.endsWith('.fragment'));
      for (const file of files) {
        const code = fs.readFileSync(path.join(subPath, file), 'utf-8');
        const id = file.replace('.fragment', '');
        processShader(entries, id, code, 'shadertoy');
      }
    }
  }

  // Read TwiGL shaders
  const twiglDir = path.join(codesDir, 'twigl', 'codes');
  if (fs.existsSync(twiglDir)) {
    const files = fs.readdirSync(twiglDir).filter(f => f.endsWith('.fragment'));
    for (const file of files) {
      const code = fs.readFileSync(path.join(twiglDir, file), 'utf-8');
      const id = file.replace('.fragment', '').substring(0, 12);
      processShader(entries, id, code, 'twigl');
    }
  }

  return entries;
}

function processShader(entries, id, code, source) {
  if (code.length < 50) return; // Skip trivially short shaders

  const analysis = analyzeShader(code);

  // Skip shaders with textures (not WebGL2 compatible for our use case)
  if (analysis.hasTextures) return;

  // Skip shaders without mainImage (not Shadertoy-compatible)
  if (!code.includes('mainImage')) return;

  const quality = computeQuality(analysis);

  // Extract comments as rough description
  const commentMatch = code.match(/\/\/\s*(.+?)(?:\n|$)/);
  const comment = commentMatch ? commentMatch[1].substring(0, 200) : '';

  entries.push({
    id: `${source}-${id}`,
    code,
    visualDescription: comment || `${source} shader: ${analysis.techniques.map(t => t.name).join(', ')}`,
    technicalDescription: `Source: ${source}. ${analysis.functionCount} functions, ${analysis.lineCount} lines. Techniques: ${analysis.techniques.map(t => t.name).join(', ')}.`,
    parameterDescription: `Complexity: ${(analysis.estimatedComplexity * 100).toFixed(0)}%. WebGL2 compatible: ${analysis.webgl2Compatible}.`,
    author: source,
    license: 'varies',
    source,
    tags: analysis.techniques.map(t => t.name),
    sceneTypes: inferSceneTypes('', code),
    techniques: analysis.techniques.map(t => t.name),
    moods: [],
    palettes: [],
    quality,
    webgl2Compatible: analysis.webgl2Compatible,
    hasTextures: analysis.hasTextures,
    hasMultipass: false,
    estimatedFps: 60,
    embedding: null,
  });
}

// ─── Parse Golden Shaders ─────────────────────────────────────────────────

function parseGoldenShaders() {
  const goldenPath = path.join(ROOT, 'src', 'ai', 'library', 'golden-shaders.ts');
  if (!fs.existsSync(goldenPath)) {
    console.log('golden-shaders.ts not found, skipping');
    return [];
  }

  const content = fs.readFileSync(goldenPath, 'utf-8');
  const entries = [];

  // Parse each golden shader entry
  const entryRegex = /\{\s*id:\s*'([^']+)'[\s\S]*?code:\s*`([\s\S]*?)`/g;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const id = match[1];
    const code = match[2].trim();

    const analysis = analyzeShader(code);
    const quality = computeQuality(analysis);

    // Extract metadata from the golden shader definition
    const sceneMatch = content.match(new RegExp(`id:\\s*'${id}'[\\s\\S]*?sceneTypes:\\s*\\[([^\\]]+)\\]`));
    const techniqueMatch = content.match(new RegExp(`id:\\s*'${id}'[\\s\\S]*?baseTechniques:\\s*\\[([^\\]]+)\\]`));
    const moodMatch = content.match(new RegExp(`id:\\s*'${id}'[\\s\\S]*?moods:\\s*\\[([^\\]]+)\\]`));
    const notesMatch = content.match(new RegExp(`id:\\s*'${id}'[\\s\\S]*?notes:\\s*'([^']+)'`));

    const sceneTypes = sceneMatch ? sceneMatch[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
    const techniques = techniqueMatch ? techniqueMatch[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
    const moods = moodMatch ? moodMatch[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
    const notes = notesMatch ? notesMatch[1] : '';

    entries.push({
      id: `golden-${id}`,
      code,
      visualDescription: notes,
      technicalDescription: `Techniques: ${techniques.join(', ')}. ${analysis.functionCount} functions, ${analysis.lineCount} lines.`,
      parameterDescription: `Detected: ${analysis.techniques.map(t => t.name).join(', ')}`,
      author: 'ShaderForge',
      license: 'original',
      source: 'golden',
      tags: [...sceneTypes, ...techniques],
      sceneTypes,
      techniques: [...techniques, ...analysis.techniques.map(t => t.name)],
      moods,
      palettes: [],
      quality,
      webgl2Compatible: analysis.webgl2Compatible,
      hasTextures: analysis.hasTextures,
      hasMultipass: false,
      estimatedFps: 60,
      embedding: null,
    });
  }

  return entries;
}

// ─── Extract Code Blocks ──────────────────────────────────────────────────

function extractCodeBlocks(entries) {
  const blocks = [];
  const seen = new Set();

  for (const entry of entries) {
    // Try multiple function patterns
    const funcRegex = /((?:float|vec[234]|void|int|mat[234]|bool)\s+(\w+)\s*\([^)]*\)\s*\{)/g;
    let match;
    while ((match = funcRegex.exec(entry.code)) !== null) {
      const funcName = match[2];
      const key = `${funcName}-${entry.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let depth = 0;
      let end = match.index;
      for (let i = match.index; i < entry.code.length; i++) {
        if (entry.code[i] === '{') depth++;
        if (entry.code[i] === '}') depth--;
        if (depth === 0) { end = i + 1; break; }
      }

      const code = entry.code.substring(match.index, end);
      if (code.length < 20) continue;

      const lower = (funcName + ' ' + code).toLowerCase();
      let type = 'utility';
      if (/noise|hash|snoise/.test(lower)) type = 'noise';
      else if (/sd[A-Z]|sdf|distance/.test(lower)) type = 'sdf';
      else if (/light|shadow|phong|fresnel/.test(lower)) type = 'lighting';
      else if (/vignette|bloom|gamma|tone/.test(lower)) type = 'postprocess';
      else if (/drift|pulse|rotate|time/.test(lower)) type = 'animation';
      else if (/color|palette|mix|gradient/.test(lower)) type = 'color';

      blocks.push({
        id: `block-${funcName}-${entry.id}`,
        type,
        name: funcName,
        code: code.substring(0, 2000), // Cap at 2000 chars
        description: `${funcName} from ${entry.id}`,
        techniques: entry.techniques.slice(0, 3),
        params: {},
      });
    }

    // Also extract standalone code patterns (not in functions)
    const patternRegexes = [
      ['fbm-pattern', /float\s+\w*\s*=\s*0\.0[\s\S]{20,300}fbm/i],
      ['noise-pattern', /float\s+\w*\s*noise\s*\([\s\S]{20,500}\}/i],
      ['sdf-pattern', /float\s+\w*sd\w*\s*\([\s\S]{20,500}\}/i],
    ];

    for (const [name, pattern] of patternRegexes) {
      const pMatch = entry.code.match(pattern);
      if (pMatch && pMatch[0].length >= 20) {
        const key = `${name}-${entry.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          blocks.push({
            id: `block-${name}-${entry.id}`,
            type: 'complete',
            name,
            code: pMatch[0].substring(0, 2000),
            description: `${name} pattern from ${entry.id}`,
            techniques: entry.techniques.slice(0, 3),
            params: {},
          });
        }
      }
    }
  }

  return blocks;
}

// ─── Build Compositions ──────────────────────────────────────────────────

function buildCompositions(entries) {
  const compMap = new Map();

  for (const entry of entries) {
    const key = [...new Set(entry.techniques)].sort().join('+');
    if (!compMap.has(key)) {
      compMap.set(key, {
        id: `comp-${compMap.size}`,
        techniques: entry.techniques,
        sceneTypes: entry.sceneTypes,
        description: `${entry.techniques.join(' + ')} → ${entry.sceneTypes.join('/')}`,
        exampleShaderIds: [],
        visualOutcome: entry.visualDescription.substring(0, 100),
      });
    }
    const comp = compMap.get(key);
    comp.exampleShaderIds.push(entry.id);
    for (const st of entry.sceneTypes) {
      if (!comp.sceneTypes.includes(st)) comp.sceneTypes.push(st);
    }
  }

  return [...compMap.values()].filter(c => c.exampleShaderIds.length >= 1);
}

// ─── Main ─────────────────────────────────────────────────────────────────

console.log('=== Building Shader Knowledge Index ===\n');

console.log('Step 1: Parsing MiniMax templates...');
const minimaxEntries = parseMinimaxTemplates();
console.log(`  ${minimaxEntries.length} entries from MiniMax`);

console.log('\nStep 2: Parsing shaders21k...');
const shaders21kEntries = parseShaders21k();
console.log(`  ${shaders21kEntries.length} entries from shaders21k`);

console.log('\nStep 3: Parsing golden shaders...');
const goldenEntries = parseGoldenShaders();
console.log(`  ${goldenEntries.length} entries from golden shaders`);

const allEntries = [...minimaxEntries, ...shaders21kEntries, ...goldenEntries];
console.log(`\nTotal entries: ${allEntries.length}`);

console.log('\nStep 4: Extracting code blocks...');
const codeBlocks = extractCodeBlocks(allEntries);
console.log(`  ${codeBlocks.length} code blocks extracted`);

console.log('\nStep 5: Building compositions...');
const compositions = buildCompositions(allEntries);
console.log(`  ${compositions.length} compositions built`);

console.log('\nStep 6: Saving index...');
const index = {
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  totalShaders: allEntries.length,
  totalCodeBlocks: codeBlocks.length,
  totalCompositions: compositions.length,
  embeddingDimension: 0,
  embeddingModel: 'none',
  entries: allEntries,
  codeBlocks,
  compositions,
};

const outPath = path.join(ROOT, 'public', 'shader-index.json');
fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(index));
const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
console.log(`  Saved to ${outPath} (${sizeMB} MB)`);

console.log('\n=== Done ===');
console.log(`  ${allEntries.length} shader entries`);
console.log(`  ${codeBlocks.length} code blocks`);
console.log(`  ${compositions.length} technique compositions`);
