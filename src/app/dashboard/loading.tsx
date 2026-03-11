export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="h-6 w-28 animate-pulse rounded-lg bg-gray-200 sm:h-7 sm:w-36" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-100 sm:w-52" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-16 animate-pulse rounded-xl bg-gray-200 sm:w-20" />
          </div>
        </div>
      </header>

      <div className="space-y-4 sm:space-y-6">
        {[1, 2, 3].map((i) => (
          <section
            key={i}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
          >
            <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200 sm:h-3.5 sm:w-32" />
            </div>
            <div className="space-y-3 px-5 py-4 sm:px-6 sm:py-5">
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-50" />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
