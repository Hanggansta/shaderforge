import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RELOAD_KEY = 'sf-chunk-reload';

/**
 * After a deploy, browsers may still reference old hashed chunk URLs.
 * Reload once so index.html picks up the new asset manifest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError =
        message.includes('Failed to fetch dynamically imported module')
        || message.includes('Importing a module script failed')
        || message.includes('error loading dynamically imported module');

      if (isChunkError && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {
          // hang until reload completes
        });
      }

      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      throw error;
    }),
  );
}