interface RouteFallbackProps {
  label?: string;
}

export function RouteFallback({ label = 'Loading…' }: RouteFallbackProps) {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <div className="route-fallback-mark" aria-hidden="true" />
      <p className="route-fallback-label">{label}</p>
      <div className="route-fallback-bar" aria-hidden="true">
        <div className="route-fallback-bar-fill" />
      </div>
    </div>
  );
}