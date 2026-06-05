/**
 * Shader Presets
 * One-click starter shaders the user can pick to kick off generation.
 */

export interface ShaderPreset {
  id: string;
  title: string;
  description: string;
  prompt: string;
  tags: string[];
}

export const PRESETS: ShaderPreset[] = [
  {
    id: 'dreamy-nebula',
    title: 'Dreamy Purple Nebula',
    description: 'Swirling cosmic clouds with soft glow',
    prompt: 'A dreamy purple nebula with slowly swirling stars and soft glowing dust clouds',
    tags: ['space', 'purple', 'glow'],
  },
  {
    id: 'neon-particles',
    title: 'Neon Cyber Particles',
    description: 'Electric particles in a dark tunnel',
    prompt: 'Neon cyber particles flying through a dark grid tunnel with electric blue and pink trails',
    tags: ['neon', 'particles', 'fast'],
  },
  {
    id: 'liquid-wave',
    title: 'Liquid Wave Background',
    description: 'Smooth pastel fabric-like waves',
    prompt: 'Smooth liquid wave animation with pastel colors flowing like silk fabric',
    tags: ['wave', 'pastel', 'smooth'],
  },
  {
    id: 'polar-tunnel',
    title: 'Polar Neon Tunnel',
    description: 'Pulsing concentric rings in cyan and magenta',
    prompt: 'A polar neon tunnel with concentric rings pulsing outward in cyan and magenta',
    tags: ['tunnel', 'rings', 'pulse'],
  },
  {
    id: 'mono-field',
    title: 'Minimal Monochrome Field',
    description: 'Gentle floating dots in grayscale',
    prompt: 'Minimal monochrome particle field with gentle floating dots and subtle motion',
    tags: ['minimal', 'mono', 'calm'],
  },
  {
    id: 'fire-flow',
    title: 'Warm Fire Flow',
    description: 'Dancing flames with rising embers',
    prompt: 'Warm fire flow with orange and red flames dancing upward, ember particles rising',
    tags: ['fire', 'warm', 'organic'],
  },
  {
    id: 'mandala-pulse',
    title: 'Mandala Pulse',
    description: 'Rotating symmetric geometric pattern',
    prompt: 'Geometric mandala pattern pulsing and rotating with intricate symmetric shapes',
    tags: ['geometric', 'symmetric', 'pulse'],
  },
  {
    id: 'gradient-motion',
    title: 'Premium Gradient Motion',
    description: 'Elegant color transitions in blue and gold',
    prompt: 'Premium gradient motion with smooth color transitions between deep blue and gold',
    tags: ['gradient', 'elegant', 'smooth'],
  },
  {
    id: 'ocean-surface',
    title: 'Ocean Surface',
    description: 'Realistic waves with caustic light',
    prompt: 'Realistic ocean surface with gentle waves, caustic light patterns, and deep blue water',
    tags: ['water', 'realistic', 'calm'],
  },
  {
    id: 'organic-flow',
    title: 'Organic Abstract Flow',
    description: 'Morphing biological cell-like shapes',
    prompt: 'Organic abstract flow with morphing shapes and color transitions like biological cells',
    tags: ['organic', 'abstract', 'morph'],
  },
];
