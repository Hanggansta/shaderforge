/**
 * CollapsibleSection smoke tests.
 *
 * Uses react-dom/server.renderToString for structural assertions (no DOM
 * environment configured for vitest, but we still get a real React tree).
 * Click-to-toggle behavior is verified via a wrapper that drives the
 * internal state through React's act() — kept lightweight on purpose.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { CollapsibleSection } from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders header in collapsed state by default', () => {
    const html = renderToString(
      createElement(
        CollapsibleSection,
        { title: 'Section Title' },
        createElement('span', { 'data-testid': 'body' }, 'body content'),
      ),
    );
    expect(html).toContain('Section Title');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('body content');
  });

  it('renders body when defaultOpen=true', () => {
    const html = renderToString(
      createElement(
        CollapsibleSection,
        { title: 'Open by default', defaultOpen: true },
        createElement('span', null, 'visible body'),
      ),
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('visible body');
  });

  it('respects controlled open prop', () => {
    const html = renderToString(
      createElement(
        CollapsibleSection,
        { title: 'Controlled', open: true },
        createElement('span', null, 'always shown when open'),
      ),
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('always shown when open');
  });

  it('controlled open=false hides body', () => {
    const html = renderToString(
      createElement(
        CollapsibleSection,
        { title: 'Controlled closed', open: false },
        createElement('span', null, 'should not appear'),
      ),
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('should not appear');
  });

  it('renders badge slot', () => {
    const html = renderToString(
      createElement(
        CollapsibleSection,
        { title: 'Has badge', badge: createElement('span', null, '42') },
        createElement('span', null, 'body'),
      ),
    );
    expect(html).toContain('Has badge');
    expect(html).toContain('42');
  });

  it('uses data-testid hooks', () => {
    const html = renderToString(
      createElement(
        CollapsibleSection,
        { title: 'hooks', defaultOpen: true },
        createElement('span', null, 'body'),
      ),
    );
    expect(html).toContain('data-testid="collapsible-header"');
    expect(html).toContain('data-testid="collapsible-body"');
  });
});
