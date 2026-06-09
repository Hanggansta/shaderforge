import { lazy, Suspense } from 'react';
import { RouteFallback } from '../RouteFallback';

const MonacoEditor = lazy(() =>
  import('./MonacoEditor').then((m) => ({ default: m.MonacoEditor })),
);

export function MonacoEditorLazy() {
  return (
    <Suspense fallback={<div className="panel-skeleton" aria-label="Loading editor"><RouteFallback label="Loading GLSL editor…" /></div>}>
      <MonacoEditor />
    </Suspense>
  );
}