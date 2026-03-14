export default function DashboardLoading() {
  return (
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
  );
}
