/**
 * Reference Card — a single piece of technique knowledge handed to Agent 3.
 *
 * In V1 we have a single source: golden shader examples. There are no
 * primitives/templates/knowledge tables. The Reference Selector returns
 * 0-2 ReferenceCards of kind 'golden'.
 */

export type ReferenceKind = 'golden';

export interface ReferenceCard {
  id: string;
  kind: ReferenceKind;
  title: string;
  summary: string;
  when: string;
  body: string;
  tags: string[];
}
