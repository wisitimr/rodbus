"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n-context";

interface DebtEntry {
  date: string;
  carName: string;
  licensePlate: string | null;
  share: number;
  gasShare: number;
  gasCost: number;
  parkingShare: number;
  parkingCost: number;
  totalCost: number;
  headcount: number;
  tripNumber: number;
  passengerNames: string[];
  driverName: string | null;
}

interface RecentTrip {
  id: string;
  carName: string;
  date: string;
  time: string;
  tripNumber: number;
}

interface DashboardContentProps {
  pendingDebt: number;
  pendingCount: number;
  debtEntries: DebtEntry[];
  recentTrips: RecentTrip[];
}

export default function DashboardContent({
  pendingDebt,
  pendingCount,
  debtEntries,
  recentTrips,
}: DashboardContentProps) {
  const { t } = useT();
  const [debtOpen, setDebtOpen] = useState(true);
  const [tripsOpen, setTripsOpen] = useState(true);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(5);

  const visible = debtEntries.slice(0, visibleCount);
  const hasMore = visibleCount < debtEntries.length;
  const isExpanded = visibleCount > 5 && !hasMore;

  function toggleExpanded(idx: number) {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Pending Debt Card */}
      <section className="overflow-hidden rounded-2xl border-2 border-red-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-5 sm:px-6">
          <div>
            <p className="text-sm font-medium text-gray-500">{t.yourPendingDebt}</p>
            {pendingDebt > 0 ? (
              <>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-red-600 sm:text-4xl">
                  ฿{pendingDebt.toFixed(2)}
                </p>
                <p className="mt-0.5 text-sm text-gray-400">
                  {pendingCount} {t.pendingItems}
                </p>
              </>
            ) : (
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-green-600 sm:text-3xl">
                ฿0.00
                <span className="ml-2 text-base font-normal text-gray-400">{t.allClear}</span>
              </p>
            )}
          </div>
          {pendingDebt > 0 && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-50">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
              </svg>
            </div>
          )}
        </div>
      </section>

      {/* Debt Breakdown */}
      {debtEntries.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setDebtOpen(!debtOpen)}
            className="flex w-full items-center justify-between py-2"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {t.debtBreakdown}
            </h2>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${debtOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {debtOpen && (
            <div className="mt-2 space-y-3">
              {visible.map((entry, idx) => {
                const isItemExpanded = expandedSet.has(idx);
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(idx)}
                      className="flex w-full items-start justify-between px-4 py-3.5 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{entry.date}</span>
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-500/20">
                            {t.pending}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-gray-900">
                          {entry.carName}
                          {entry.licensePlate && (
                            <span className="ml-1 font-normal text-gray-400">
                              ({entry.licensePlate})
                            </span>
                          )}
                          <span className="ml-2 text-sm font-normal text-blue-500">
                            {t.tripNumber} #{entry.tripNumber}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 pl-3">
                        <span className="text-lg font-bold text-red-600">
                          ฿{entry.share.toFixed(2)}
                        </span>
                        <svg
                          className={`h-4 w-4 text-gray-400 transition-transform ${isItemExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>

                    {isItemExpanded && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                        {/* People */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                            <span className="font-medium">{entry.headcount} {t.people}</span>
                          </div>
                          <p className="mt-0.5 pl-5.5 text-xs text-gray-400">
                            {[
                              ...entry.passengerNames,
                              ...(entry.driverName ? [`${entry.driverName} (${t.driver})`] : []),
                            ].join(", ")}
                          </p>
                        </div>

                        {/* Cost breakdown */}
                        <div className="space-y-2 text-sm">
                          {entry.gasShare > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                                </svg>
                                {t.gas}
                              </div>
                              <span className="text-gray-700">
                                <span className="line-through text-gray-300">฿{entry.gasCost.toFixed(2)}</span>
                                {" "}/ {entry.headcount} = <span className="font-semibold text-gray-900">฿{entry.gasShare.toFixed(2)}</span>
                              </span>
                            </div>
                          )}
                          {entry.parkingShare > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0-8.25a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 0115 6.75v0A2.25 2.25 0 0112.75 9h-1.5A2.25 2.25 0 019 6.75zM9 15v3.75m0 0h6m-6 0H6" />
                                </svg>
                                {t.parking}
                              </div>
                              <span className="text-gray-700">
                                <span className="line-through text-gray-300">฿{entry.parkingCost.toFixed(2)}</span>
                                {" "}/ {entry.headcount} = <span className="font-semibold text-gray-900">฿{entry.parkingShare.toFixed(2)}</span>
                              </span>
                            </div>
                          )}
                          {/* Total */}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-2 font-semibold">
                            <span className="text-gray-700">{t.total}</span>
                            <span className="text-gray-700">
                              <span className="line-through font-normal text-gray-300">฿{entry.totalCost.toFixed(2)}</span>
                              {" "}/ {entry.headcount} = <span className="text-gray-900">฿{entry.share.toFixed(2)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load More / Show Less */}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + 5)}
                  className="flex w-full items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  {t.loadMore}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              )}
              {isExpanded && (
                <button
                  type="button"
                  onClick={() => { setVisibleCount(5); setExpandedSet(new Set()); }}
                  className="flex w-full items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  {t.showLess}
                  <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setTripsOpen(!tripsOpen)}
            className="flex w-full items-center justify-between py-2"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {t.recentTrips}
            </h2>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${tripsOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {tripsOpen && (
            <div className="mt-2 space-y-3">
              {recentTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm transition hover:border-gray-200"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{trip.carName}</p>
                    <p className="text-xs text-gray-400">{trip.date}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {trip.time}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-blue-500">
                      {t.tripNumber} #{trip.tripNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
