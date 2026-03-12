"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tab = "trips" | "summary";
type SummaryPeriod = "day" | "month" | "year";

interface Trip {
  id: string;
  carName: string;
  date: string;
  dateISO: string;
  time: string;
  type: "MORNING" | "EVENING";
}

interface PaymentRecord {
  id: string;
  userId: string;
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
  dayDebts: DebtSummary[];
  monthDebts: DebtSummary[];
  yearDebts: DebtSummary[];
  dayPayments: PaymentRecord[];
  monthPayments: PaymentRecord[];
  yearPayments: PaymentRecord[];
  currentUserId: string;
  todayLabel: string;
  monthLabel: string;
  yearLabel: string;
  t: {
    trips: string;
    summary: string;
    day: string;
    month: string;
    year: string;
    noTripHistory: string;
    noPayments: string;
    noCostsToday: string;
    noCostsThisMonth: string;
    noCostsThisYear: string;
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
    paymentHistory: string;
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

function DebtTable({
  debts,
  payments,
  currentUserId,
  emptyMessage,
  label,
  t,
}: {
  debts: DebtSummary[];
  payments: PaymentRecord[];
  currentUserId: string;
  emptyMessage: string;
  label: string;
  t: HistoryContentProps["t"];
}) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const paymentsByUser = useMemo(() => {
    const map = new Map<string, PaymentRecord[]>();
    for (const p of payments) {
      const list = map.get(p.userId) || [];
      list.push(p);
      map.set(p.userId, list);
    }
    return map;
  }, [payments]);

  if (debts.length === 0) {
    return <p className="text-sm text-gray-400">{emptyMessage}</p>;
  }

  return (
    <>
      <p className="mb-3 text-xs font-medium text-gray-500">{label}</p>
      <div className="space-y-2">
        {debts.map((d) => {
          const isMe = d.userId === currentUserId;
          const isExpanded = expandedUser === d.userId;
          const userPayments = paymentsByUser.get(d.userId) || [];
          const hasPayments = userPayments.length > 0;

          return (
            <div key={d.userId}>
              <button
                onClick={() => hasPayments && setExpandedUser(isExpanded ? null : d.userId)}
                className={`w-full rounded-xl px-4 py-3 text-left transition ${
                  isMe
                    ? "bg-blue-50 ring-1 ring-blue-200"
                    : "bg-gray-50 hover:bg-gray-100"
                } ${hasPayments ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasPayments && (
                      <span className={`text-xs text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                        &#9654;
                      </span>
                    )}
                    <p className="font-medium text-gray-800">
                      {d.userName ?? "Unknown"}
                      {isMe && (
                        <span className="ml-1.5 text-xs font-normal text-blue-500">
                          ({t.you})
                        </span>
                      )}
                    </p>
                  </div>
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
              </button>

              {/* Expanded payment details */}
              {isExpanded && userPayments.length > 0 && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-green-200 pl-3">
                  <p className="py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t.paymentHistory}
                  </p>
                  {userPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-gray-700">{p.carName}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {p.date}
                          {p.note && <> &middot; {p.note}</>}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold text-green-600">
                        ฿{p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function HistoryContent({
  trips,
  dayDebts,
  monthDebts,
  yearDebts,
  dayPayments,
  monthPayments,
  yearPayments,
  currentUserId,
  todayLabel,
  monthLabel,
  yearLabel,
  t,
}: HistoryContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trips");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("month");
  const [dateFilter, setDateFilter] = useState("");

  const filteredTrips = useMemo(() => {
    if (!dateFilter) return trips;
    return trips.filter((trip) => trip.dateISO === dateFilter);
  }, [trips, dateFilter]);

  const tripScroll = useInfiniteScroll(filteredTrips);

  const uniqueDates = useMemo(() => {
    const dates = [...new Set(trips.map((t) => t.dateISO))].sort().reverse();
    return dates;
  }, [trips]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "trips", label: t.trips },
    { key: "summary", label: t.summary },
  ];

  const summaryPeriods: { key: SummaryPeriod; label: string }[] = [
    { key: "day", label: t.day },
    { key: "month", label: t.month },
    { key: "year", label: t.year },
  ];

  const summaryData = {
    day: { debts: dayDebts, payments: dayPayments, empty: t.noCostsToday, label: todayLabel },
    month: { debts: monthDebts, payments: monthPayments, empty: t.noCostsThisMonth, label: monthLabel },
    year: { debts: yearDebts, payments: yearPayments, empty: t.noCostsThisYear, label: yearLabel },
  };

  const current = summaryData[summaryPeriod];

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
          {/* Date filter */}
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-auto"
            >
              <option value="">{t.date}: —</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {filteredTrips.length === 0 ? (
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

      {/* Summary tab */}
      {activeTab === "summary" && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <div className="flex gap-1.5">
              {summaryPeriods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSummaryPeriod(p.key)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    summaryPeriod === p.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <DebtTable
              debts={current.debts}
              payments={current.payments}
              currentUserId={currentUserId}
              emptyMessage={current.empty}
              label={current.label}
              t={t}
            />
          </div>
        </section>
      )}
    </div>
  );
}
