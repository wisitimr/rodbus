export default function HistoryLoading() {
  return (
    <main className="mx-auto max-w-lg space-y-3 p-4">
      {/* Tab bar shimmer */}
      <div className="flex border-b border-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent pb-2.5 pt-1">
            <div className="h-4 w-4 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Trip list shimmer — grouped by date */}
      {[1, 2].map((g) => (
        <div key={g} className="space-y-2">
          {/* Date header */}
          <div className="h-3 w-24 animate-pulse rounded bg-muted/50" />
          {/* Trip rows */}
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted/40" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-12 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
