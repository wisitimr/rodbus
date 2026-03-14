export default function ManageLoading() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      {/* Tab bar shimmer (New Trip / Settle Debts) */}
      <div className="flex border-b border-border">
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent pb-2.5 pt-1">
            <div className="h-4 w-4 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Car selector shimmer */}
      <div className="h-10 w-full animate-pulse rounded-xl border border-border bg-muted/30" />

      {/* Form fields shimmer */}
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 h-3.5 w-16 animate-pulse rounded bg-muted/50" />
          <div className="h-10 w-full animate-pulse rounded-xl border border-border bg-muted/30" />
        </div>
        <div>
          <div className="mb-1.5 h-3.5 w-20 animate-pulse rounded bg-muted/50" />
          <div className="h-10 w-full animate-pulse rounded-xl border border-border bg-muted/30" />
        </div>
      </div>

      {/* Shared parking section shimmer */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted/50" />
        <div className="mt-2 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
              <div className="h-4 w-4 animate-pulse rounded bg-muted/40" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit button shimmer */}
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted/40" />
    </main>
  );
}
