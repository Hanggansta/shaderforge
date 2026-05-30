/**
 * Centralized quality label formatting for user-facing display.
 * Maps internal diagnostic enums to friendly labels.
 */

/** Known quality categories → user-friendly labels */
const FRIENDLY: Record<string, string> = {
  // Deterministic signal names (from deriveQualitySignals)
  too_dark: 'Too dark',
  too_bright: 'Too bright',
  low_contrast: 'Low contrast',
  low_saturation: 'Low color',
  flat_color: 'Flat colors',
  no_visible_motion: 'No motion',
  excessive_flicker: 'Flickering',
  unbalanced_composition: 'Unbalanced',
  healthy: 'Looks good',
  // Common LLM-generated categories
  complete_render_failure: 'Render issue',
  render_output_black: 'Render issue',
  render_failure_black_output: 'Render issue',
  rendering_failure: 'Render issue',
  no_visible_output: 'Render issue',
  total_darkness: 'Too dark',
  no_color: 'No color',
  no_motion: 'No motion',
  color_generation_failure: 'Color issue',
  missing_motion: 'No motion',
  brightness: 'Brightness',
  contrast: 'Contrast',
  saturation: 'Saturation',
  color_variance: 'Color issue',
  motion: 'Motion',
  no_op: 'No repair needed',
};

/**
 * Convert an internal quality category to a user-friendly label.
 * Falls back to converting snake_case to Title Case for unknown values.
 */
export function friendlyQualityLabel(raw?: string): string {
  if (!raw) return '';
  return FRIENDLY[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
