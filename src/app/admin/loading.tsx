export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-lg p-4">
      {/* Tab bar shimmer (Users / Cars / QR) */}
      <div className="flex border-b border-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent pb-2.5 pt-1">
            <div className="h-4 w-4 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* User list shimmer */}
      <div className="space-y-2 pt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted/40" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted/40" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-lg bg-muted/30" />
          </div>
        ))}
      </div>
    </main>
  );
}
