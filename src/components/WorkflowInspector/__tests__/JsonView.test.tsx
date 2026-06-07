/**
 * JsonView smoke tests — verify structural rendering for primitives,
 * arrays, and nested objects.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { JsonView } from '../JsonView';

describe('JsonView', () => {
  it('renders primitive string with quotes', () => {
    const html = renderToString(createElement(JsonView, { value: 'hello' }));
    expect(html).toContain('hello');
    expect(html).toContain('&quot;');
  });

  it('renders number without quotes', () => {
    const html = renderToString(createElement(JsonView, { value: 42 }));
    expect(html).toContain('>42<');
    expect(html).not.toContain('&quot;42&quot;');
  });

  it('renders boolean italicized', () => {
    const html = renderToString(createElement(JsonView, { value: true }));
    expect(html).toContain('>true<');
  });

  it('renders null', () => {
    const html = renderToString(createElement(JsonView, { value: null }));
    expect(html).toContain('>null<');
  });

  it('renders top-level object open by default with key/value visible', () => {
    const html = renderToString(
      createElement(JsonView, { value: { a: 1, b: 'two' } }),
    );
    expect(html).toContain('a');
    expect(html).toContain('b');
    expect(html).toContain('>1<');
    expect(html).toContain('two');
  });

  it('truncates long strings', () => {
    const long = 'x'.repeat(200);
    const html = renderToString(
      createElement(JsonView, { value: { s: long }, maxStringPreview: 30 }),
    );
    expect(html).toContain('… (+170 chars)');
    expect(html).not.toContain('x'.repeat(200));
  });

  it('renders nested array open by default with elements', () => {
    const html = renderToString(
      createElement(JsonView, { value: { items: [1, 2, 3] } }),
    );
    expect(html).toContain('items');
    expect(html).toContain('>1<');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
  });

  it('shows summary when object is collapsed (initialOpen=false)', () => {
    const html = renderToString(
      createElement(JsonView, { value: { a: 1, b: 2 }, initialOpen: false }),
    );
    expect(html).toContain('Object{2}');
  });

  it('honors rootLabel', () => {
    const html = renderToString(
      createElement(JsonView, { value: { foo: 'bar' }, rootLabel: 'config' }),
    );
    expect(html).toContain('>config<');
  });
});
