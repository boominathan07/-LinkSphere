/** Skeletons and empty/error UI for dashboard charts (no Framer Motion). */

export function ChartSkeleton({ className = "" }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      <div className="h-4 w-1/3 rounded bg-white/10" />
      <div className="h-48 w-full rounded-xl bg-white/5" />
      <div className="flex gap-2">
        <div className="h-3 flex-1 rounded bg-white/10" />
        <div className="h-3 flex-1 rounded bg-white/10" />
        <div className="h-3 flex-1 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function ChartError({ message = "Failed to load.", onRetry }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-accent-rose/30 bg-accent-rose/5 px-4 py-8 text-center">
      <p className="text-sm text-text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white/10"
        >
          Retry?
        </button>
      ) : null}
    </div>
  );
}

export function ChartEmpty({ title = "No data yet", description = "Activity will show up here once visitors engage." }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
      <div className="text-4xl opacity-40" aria-hidden>
        📊
      </div>
      <p className="font-medium text-text-primary">{title}</p>
      <p className="max-w-xs text-sm text-text-muted">{description}</p>
    </div>
  );
}
