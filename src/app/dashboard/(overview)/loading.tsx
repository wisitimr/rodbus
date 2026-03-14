export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      {/* Debt card shimmer */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-10 w-36 animate-pulse rounded-lg bg-muted/60" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>

      {/* Debt breakdown section */}
      <div>
        <div className="flex items-center justify-between py-1">
          <div className="h-3.5 w-32 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-4 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="mt-2 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted/50" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent trips section */}
      <div>
        <div className="flex items-center justify-between py-1">
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-4 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="mt-2 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted/40" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-12 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
