"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Tab = "trips" | "payments" | "summary";

interface Trip {
  id: string;
  carName: string;
  date: string;
  time: string;
  type: "MORNING" | "EVENING";
}

interface Payment {
  id: string;
  carName: string;
  date: string;
  amount: number;
  note: string | null;
}

interface DebtSummary {
  userId: string;
  userName: string | null;
  totalDebt: number;
  totalPaid: number;
  pendingDebt: number;
}

interface HistoryContentProps {
  trips: Trip[];
  payments: Payment[];
  debts: DebtSummary[];
  currentUserId: string;
  monthLabel: string;
  t: {
    trips: string;
    payments: string;
    monthlySummary: string;
    noTripHistory: string;
    noPayments: string;
    noCostsThisMonth: string;
    date: string;
    time: string;
    car: string;
    type: string;
    morning: string;
    evening: string;
    note: string;
    amount: string;
    passenger: string;
    accrued: string;
    paid: string;
    pending: string;
    you: string;
  };
}

const PAGE_SIZE = 10;

function useInfiniteScroll<T>(items: T[]) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, items.length));
  }, [items.length]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [items]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return {
    visible: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    sentinelRef,
  };
}

export default function HistoryContent({
  trips,
  payments,
  debts,
  currentUserId,
  monthLabel,
  t,
}: HistoryContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trips");
  const tripScroll = useInfiniteScroll(trips);
  const paymentScroll = useInfiniteScroll(payments);

  const tabs: { key: Tab; label: string }[] = [
    { key: "trips", label: t.trips },
    { key: "payments", label: t.payments },
    { key: "summary", label: t.monthlySummary },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Badge filter row */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips tab */}
      {activeTab === "trips" && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {trips.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noTripHistory}</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 sm:hidden">
                  {tripScroll.visible.map((trip) => (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{trip.carName}</p>
                        <p className="text-xs text-gray-500">
                          {trip.date} &middot; {trip.time}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          trip.type === "MORNING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {trip.type === "MORNING" ? "AM" : "PM"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">{t.date}</th>
                        <th className="pb-3 font-semibold">{t.time}</th>
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 text-right font-semibold">{t.type}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tripScroll.visible.map((trip) => (
                        <tr key={trip.id} className="hover:bg-gray-50/50">
                          <td className="py-3 text-gray-700">{trip.date}</td>
                          <td className="py-3 text-gray-500">{trip.time}</td>
                          <td className="py-3 font-medium text-gray-800">{trip.carName}</td>
                          <td className="py-3 text-right">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                trip.type === "MORNING"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {trip.type === "MORNING" ? t.morning : t.evening}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tripScroll.hasMore && (
                  <div ref={tripScroll.sentinelRef} className="py-4 text-center text-sm text-gray-400">
                    Loading...
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noPayments}</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 sm:hidden">
                  {paymentScroll.visible.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{p.carName}</p>
                        <p className="text-xs text-gray-500">
                          {p.date}
                          {p.note && <> &middot; {p.note}</>}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-green-600">
                        ฿{p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">{t.date}</th>
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 font-semibold">{t.note}</th>
                        <th className="pb-3 text-right font-semibold">{t.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paymentScroll.visible.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="py-3 text-gray-700">{p.date}</td>
                          <td className="py-3 font-medium text-gray-800">{p.carName}</td>
                          <td className="py-3 text-gray-400">{p.note ?? "\u2014"}</td>
                          <td className="py-3 text-right font-semibold text-green-600">
                            ฿{p.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paymentScroll.hasMore && (
                  <div ref={paymentScroll.sentinelRef} className="py-4 text-center text-sm text-gray-400">
                    Loading...
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Monthly Summary tab */}
      {activeTab === "summary" && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.monthlySummary} &mdash; {monthLabel}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {debts.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noCostsThisMonth}</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 sm:hidden">
                  {debts.map((d) => (
                    <div
                      key={d.userId}
                      className={`rounded-xl px-4 py-3 ${
                        d.userId === currentUserId
                          ? "bg-blue-50 ring-1 ring-blue-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          {d.userName ?? "Unknown"}
                          {d.userId === currentUserId && (
                            <span className="ml-1.5 text-xs font-normal text-blue-500">
                              ({t.you})
                            </span>
                          )}
                        </p>
                        <p className="font-bold text-red-600">
                          ฿{d.pendingDebt.toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-gray-500">
                        <span>{t.accrued}: ฿{d.totalDebt.toFixed(2)}</span>
                        <span className="text-green-600">
                          {t.paid}: ฿{d.totalPaid.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">{t.passenger}</th>
                        <th className="pb-3 text-right font-semibold">{t.accrued}</th>
                        <th className="pb-3 text-right font-semibold">{t.paid}</th>
                        <th className="pb-3 text-right font-semibold">{t.pending}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {debts.map((d) => (
                        <tr
                          key={d.userId}
                          className={`${d.userId === currentUserId ? "bg-blue-50/60 font-semibold" : "hover:bg-gray-50/50"}`}
                        >
                          <td className="py-3 text-gray-800">
                            {d.userName ?? "Unknown"}
                            {d.userId === currentUserId && (
                              <span className="ml-1.5 text-xs font-normal text-blue-500">
                                ({t.you})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right text-gray-700">
                            ฿{d.totalDebt.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-green-600">
                            ฿{d.totalPaid.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-red-600">
                            ฿{d.pendingDebt.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
