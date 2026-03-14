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

      {/* New Trip card shimmer */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
        {/* Title */}
        <div className="h-3.5 w-28 animate-pulse rounded bg-muted/50" />

        {/* Car selector */}
        <div>
          <div className="mb-1 h-3 w-16 animate-pulse rounded bg-muted/40" />
          <div className="h-10 w-full animate-pulse rounded-xl border border-input bg-muted/30" />
        </div>

        {/* Gas & Parking (2-column grid) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 h-3 w-16 animate-pulse rounded bg-muted/40" />
            <div className="h-10 w-full animate-pulse rounded-xl border border-input bg-muted/30" />
          </div>
          <div>
            <div className="mb-1 h-3 w-20 animate-pulse rounded bg-muted/40" />
            <div className="h-10 w-full animate-pulse rounded-xl border border-input bg-muted/30" />
          </div>
        </div>

        {/* Submit button */}
        <div className="h-11 w-full animate-pulse rounded-xl bg-muted/40" />
      </div>
    </main>
  );
}
