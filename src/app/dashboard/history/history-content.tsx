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

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Calendar({
  dateFrom,
  dateTo,
  onSelect,
}: {
  dateFrom: string;
  dateTo: string;
  onSelect: (iso: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    if (dateFrom) return new Date(dateFrom + "T00:00:00");
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="w-full">
      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {viewDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={nextMonth} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {dayNames.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 text-center text-sm">
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const iso = toISO(new Date(year, month, day));
          const isFrom = iso === dateFrom;
          const isTo = iso === dateTo;
          const inRange = dateFrom && dateTo && iso >= dateFrom && iso <= dateTo;
          const isEndpoint = isFrom || isTo;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`py-1.5 text-sm transition ${
                isEndpoint
                  ? "rounded-lg bg-blue-600 font-semibold text-white"
                  : inRange
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 rounded-lg"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [showFilter, setShowFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rangeStep, setRangeStep] = useState<"from" | "to">("from");

  const hasFilter = dateFrom !== "" || dateTo !== "";

  function handleCalendarSelect(iso: string) {
    if (rangeStep === "from") {
      setDateFrom(iso);
      setDateTo("");
      setRangeStep("to");
    } else {
      if (iso < dateFrom) {
        setDateFrom(iso);
        setDateTo("");
        setRangeStep("to");
      } else {
        setDateTo(iso);
        setRangeStep("from");
      }
    }
  }

  function clearFilter() {
    setDateFrom("");
    setDateTo("");
    setRangeStep("from");
  }

  const filteredTrips = useMemo(() => {
    if (!dateFrom && !dateTo) return trips;
    const from = dateFrom;
    const to = dateTo || dateFrom;
    return trips.filter((trip) => {
      if (from && trip.dateISO < from) return false;
      if (to && trip.dateISO > to) return false;
      return true;
    });
  }, [trips, dateFrom, dateTo]);

  const tripScroll = useInfiniteScroll(filteredTrips);

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
          {/* Date filter toggle */}
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  hasFilter
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                {t.date}
              </button>
              {hasFilter && (
                <span className="text-xs text-gray-500">
                  {dateFrom}{dateTo && dateTo !== dateFrom ? ` — ${dateTo}` : ""}
                </span>
              )}
              {hasFilter && (
                <button
                  onClick={clearFilter}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              )}
            </div>

            {showFilter && (
              <div className="mt-3 space-y-3">
                {/* Start / End date inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Start</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        if (dateTo && e.target.value > dateTo) setDateTo("");
                        setRangeStep("to");
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">End</label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setRangeStep("from");
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Calendar */}
                <Calendar
                  dateFrom={dateFrom}
                  dateTo={dateTo || dateFrom}
                  onSelect={handleCalendarSelect}
                />
              </div>
            )}
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
