export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
      </header>

      {/* Skeleton cards */}
      {[1, 2, 3].map((i) => (
        <section key={i} className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        </section>
      ))}
    </main>
  );
}
