/**
 * Reference Selector (Tool 1)
 *
 * V1 simplified: knowledge table is removed. We pick 0-2 golden shader
 * examples based on VisualCard + ShaderPlan. We return empty cards list
 * when no goldens match. The patch agent still works with just the
 * spec + plan + golden examples, no knowledge table needed.
 */

import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ReferenceCard } from '../schemas/reference-card';
import { selectGoldenExamples } from './select-golden-examples';
import type { GoldenShaderExample } from './golden-shader';

function goldenToReferenceCard(g: GoldenShaderExample): ReferenceCard {
  return {
    id: g.id,
    kind: 'golden',
    title: g.title,
    summary: g.notes,
    when: `scenes=${g.sceneTypes.join(', ')} | moods=${g.moods.join(', ')} | palettes=${g.palettes.join(', ')}`,
    body: g.code,
    tags: g.tags,
  };
}

export interface ReferenceSelectorOutput {
  cards: ReferenceCard[];
  primaryTemplate: ReferenceCard | null;
}

export function selectReferences(
  visualCard: VisualCard,
  shaderPlan: ShaderPlan
): ReferenceSelectorOutput {
  const goldens = selectGoldenExamples(visualCard, shaderPlan, 2);
  const cards = goldens.map(goldenToReferenceCard);
  return {
    cards,
    primaryTemplate: cards[0] ?? null,
  };
}
