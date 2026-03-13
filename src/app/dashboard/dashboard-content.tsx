"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n-context";
import TripBreakdownCard, { type BreakdownCardEntry } from "@/components/trip-breakdown-card";

interface RecentTrip {
  id: string;
  date: string;
  time: string;
  carName: string;
  licensePlate: string | null;
  gasCost: number;
  parkingCost: number;
  riderCount: number;
  tripNumber: number;
}

interface DashboardContentProps {
  pendingDebt: number;
  pendingCount: number;
  debtEntries: BreakdownCardEntry[];
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
  const [recentOpen, setRecentOpen] = useState(true);
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
              {visible.map((entry, idx) => (
                <TripBreakdownCard
                  key={idx}
                  entry={entry}
                  isExpanded={expandedSet.has(idx)}
                  onToggle={() => toggleExpanded(idx)}
                  status="pending"
                  t={{
                    pending: t.pending,
                    tripNumber: t.tripNumber,
                    people: t.people,
                    gas: t.gas,
                    parking: t.parking,
                    total: t.total,
                    driver: t.driver,
                  }}
                />
              ))}

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
      <section>
        <button
          type="button"
          onClick={() => setRecentOpen(!recentOpen)}
          className="flex w-full items-center justify-between py-2"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            {t.recentTrips}
          </h2>
          <div className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${recentOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>

        {recentOpen && (
          <>
            {recentTrips.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">{t.noCheckInHistory}</p>
            ) : (
              <div className="mt-1 space-y-2">
                {recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {trip.carName}
                        {trip.licensePlate && <span className="ml-1 font-normal text-gray-400">({trip.licensePlate})</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {trip.date} &middot; {trip.riderCount} {t.people}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-sm font-semibold text-gray-900">฿{(trip.gasCost + trip.parkingCost).toFixed(0)}</span>
                      <span className="text-xs font-medium text-blue-500">
                        {t.tripNumber} #{trip.tripNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
