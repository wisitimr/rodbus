export default function HistoryLoading() {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
          <div>
            <div className="h-5 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="mt-1 h-3 w-40 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
