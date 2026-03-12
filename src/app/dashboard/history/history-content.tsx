"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tab = "trips" | "payments" | "summary";
type SummaryPeriod = "day" | "month" | "year";

interface Trip {
  id: string;
  carName: string;
  date: string;
  dateISO: string;
  time: string;
  type: "OUTBOUND" | "RETURN";
}

interface PaymentRecord {
  id: string;
  userId: string;
  carName: string;
  date: string;
  dateISO: string;
  amount: number;
  note: string | null;
}

interface BreakdownEntry {
  date: string; // ISO date
  share: number;
}

interface DebtWithBreakdown {
  userId: string;
  userName: string | null;
  totalDebt: number;
  totalPaid: number;
  pendingDebt: number;
  breakdown: BreakdownEntry[];
}

interface GroupedPeriod {
  key: string; // ISO date, YYYY-MM, or YYYY
  label: string;
  entries: { userId: string; userName: string | null; totalDebt: number; totalPaid: number; pendingDebt: number }[];
}

interface HistoryContentProps {
  trips: Trip[];
  allDebts: DebtWithBreakdown[];
  allPayments: PaymentRecord[];
  currentUserId: string;
  t: {
    trips: string;
    payments: string;
    summary: string;
    day: string;
    month: string;
    year: string;
    noTripHistory: string;
    noPayments: string;
    noData: string;
    date: string;
    time: string;
    car: string;
    type: string;
    outbound: string;
    return: string;
    note: string;
    amount: string;
    accrued: string;
    paid: string;
    pending: string;
    you: string;
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
  const firstDay = new Date(year, month, 1).getDay();
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

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {dayNames.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

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

function SummaryTable({
  entries,
  currentUserId,
  label,
  isDaily,
  t,
}: {
  entries: GroupedPeriod["entries"];
  currentUserId: string;
  label: string;
  isDaily: boolean;
  t: HistoryContentProps["t"];
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium text-gray-500">{label}</p>
      <div className="space-y-2">
        {entries.map((d) => {
          const isMe = d.userId === currentUserId;
          return (
            <div
              key={d.userId}
              className={`rounded-xl px-4 py-3 ${
                isMe
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">
                  {d.userName ?? "Unknown"}
                  {isMe && (
                    <span className="ml-1.5 text-xs font-normal text-blue-500">
                      ({t.you})
                    </span>
                  )}
                </p>
                {isDaily ? (
                  <p className="font-bold text-gray-800">
                    ฿{d.totalDebt.toFixed(2)}
                  </p>
                ) : (
                  <p className={`font-bold ${d.pendingDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                    ฿{Math.abs(d.pendingDebt).toFixed(2)}
                    {d.pendingDebt <= 0 && (
                      <svg className="ml-1 inline h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    )}
                  </p>
                )}
              </div>
              {!isDaily && (
                <div className="mt-1 flex gap-3 text-xs text-gray-500">
                  <span>{t.accrued}: ฿{d.totalDebt.toFixed(2)}</span>
                  <span className="text-green-600">
                    {t.paid}: ฿{d.totalPaid.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateFilterBar({
  show,
  onToggle,
  dateFrom,
  dateTo,
  hasFilter,
  onFromChange,
  onToChange,
  onClear,
  onCalendarSelect,
  dateLabel,
}: {
  show: boolean;
  onToggle: () => void;
  dateFrom: string;
  dateTo: string;
  hasFilter: boolean;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  onCalendarSelect: (iso: string) => void;
  dateLabel: string;
}) {
  return (
    <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            hasFilter
              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          {dateLabel}
        </button>
        {hasFilter && (
          <span className="text-xs text-gray-500">
            {dateFrom}{dateTo && dateTo !== dateFrom ? ` — ${dateTo}` : ""}
          </span>
        )}
        {hasFilter && (
          <button
            onClick={onClear}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        )}
      </div>

      {show && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Start</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onFromChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">End</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => onToChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <Calendar
            dateFrom={dateFrom}
            dateTo={dateTo || dateFrom}
            onSelect={onCalendarSelect}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Group all-time debt breakdown + payments by period (day/month/year).
 * Day: shows cost share only. Month/Year: shows accrued, paid, pending.
 */
function groupByPeriod(
  allDebts: DebtWithBreakdown[],
  allPayments: PaymentRecord[],
  period: SummaryPeriod
): GroupedPeriod[] {
  function getKey(isoDate: string): string {
    if (period === "day") return isoDate;
    if (period === "month") return isoDate.slice(0, 7);
    return isoDate.slice(0, 4);
  }

  const periodKeys = new Set<string>();
  const userPeriodDebt = new Map<string, Map<string, number>>();

  for (const debt of allDebts) {
    for (const b of debt.breakdown) {
      const key = getKey(b.date);
      periodKeys.add(key);

      if (!userPeriodDebt.has(debt.userId)) {
        userPeriodDebt.set(debt.userId, new Map());
      }
      const periodMap = userPeriodDebt.get(debt.userId)!;
      periodMap.set(key, (periodMap.get(key) ?? 0) + b.share);
    }
  }

  const userPeriodPaid = new Map<string, Map<string, number>>();
  for (const p of allPayments) {
    const key = getKey(p.dateISO);
    periodKeys.add(key);

    if (!userPeriodPaid.has(p.userId)) {
      userPeriodPaid.set(p.userId, new Map());
    }
    const periodMap = userPeriodPaid.get(p.userId)!;
    periodMap.set(key, (periodMap.get(key) ?? 0) + p.amount);
  }

  const userNames = new Map<string, string | null>();
  for (const d of allDebts) {
    userNames.set(d.userId, d.userName);
  }

  const groups: GroupedPeriod[] = [];

  for (const key of periodKeys) {
    const userIds = new Set<string>();
    for (const [uid, pm] of userPeriodDebt) {
      if (pm.has(key)) userIds.add(uid);
    }
    for (const [uid, pm] of userPeriodPaid) {
      if (pm.has(key)) userIds.add(uid);
    }

    const entries: GroupedPeriod["entries"] = [];
    for (const uid of userIds) {
      const totalDebt = Math.round((userPeriodDebt.get(uid)?.get(key) ?? 0) * 100) / 100;
      const totalPaid = Math.round((userPeriodPaid.get(uid)?.get(key) ?? 0) * 100) / 100;
      entries.push({
        userId: uid,
        userName: userNames.get(uid) ?? null,
        totalDebt,
        totalPaid,
        pendingDebt: Math.round((totalDebt - totalPaid) * 100) / 100,
      });
    }

    entries.sort((a, b) => b.pendingDebt - a.pendingDebt);

    let label = key;
    if (period === "month") {
      const [y, m] = key.split("-");
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      label = d.toLocaleString("default", { month: "long", year: "numeric" });
    }

    groups.push({ key, label, entries });
  }

  groups.sort((a, b) => b.key.localeCompare(a.key));
  return groups;
}

export default function HistoryContent({
  trips,
  allDebts,
  allPayments,
  currentUserId,
  t,
}: HistoryContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trips");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("month");

  // Trip filter state
  const [showTripFilter, setShowTripFilter] = useState(false);
  const [tripDateFrom, setTripDateFrom] = useState("");
  const [tripDateTo, setTripDateTo] = useState("");
  const [, setTripRangeStep] = useState<"from" | "to">("from");

  // Payment filter state
  const [showPaymentFilter, setShowPaymentFilter] = useState(false);
  const [payDateFrom, setPayDateFrom] = useState("");
  const [payDateTo, setPayDateTo] = useState("");
  const [, setPayRangeStep] = useState<"from" | "to">("from");

  // Expanded payment details
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const togglePayment = (id: string) => {
    setExpandedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasTripFilter = tripDateFrom !== "" || tripDateTo !== "";
  const hasPaymentFilter = payDateFrom !== "" || payDateTo !== "";

  function makeCalendarSelect(
    setFrom: (v: string) => void,
    setTo: (v: string) => void,
    setStep: (v: "from" | "to") => void,
    from: string
  ) {
    return (iso: string) => {
      if (from === "" || iso < from) {
        setFrom(iso);
        setTo("");
        setStep("to");
      } else if (from && iso >= from) {
        setTo(iso);
        setStep("from");
      }
    };
  }

  const handleTripCalendarSelect = useMemo(
    () => makeCalendarSelect(setTripDateFrom, setTripDateTo, setTripRangeStep, tripDateFrom),
    [tripDateFrom]
  );

  const handlePayCalendarSelect = useMemo(
    () => makeCalendarSelect(setPayDateFrom, setPayDateTo, setPayRangeStep, payDateFrom),
    [payDateFrom]
  );

  function clearTripFilter() {
    setTripDateFrom("");
    setTripDateTo("");
    setTripRangeStep("from");
  }

  function clearPaymentFilter() {
    setPayDateFrom("");
    setPayDateTo("");
    setPayRangeStep("from");
  }

  const filteredTrips = useMemo(() => {
    if (!tripDateFrom && !tripDateTo) return trips;
    const from = tripDateFrom;
    const to = tripDateTo || tripDateFrom;
    return trips.filter((trip) => {
      if (from && trip.dateISO < from) return false;
      if (to && trip.dateISO > to) return false;
      return true;
    });
  }, [trips, tripDateFrom, tripDateTo]);

  const filteredPayments = useMemo(() => {
    if (!payDateFrom && !payDateTo) return allPayments;
    const from = payDateFrom;
    const to = payDateTo || payDateFrom;
    return allPayments.filter((p) => {
      if (from && p.dateISO < from) return false;
      if (to && p.dateISO > to) return false;
      return true;
    });
  }, [allPayments, payDateFrom, payDateTo]);

  const tripScroll = useInfiniteScroll(filteredTrips);
  const paymentScroll = useInfiniteScroll(filteredPayments);

  // Group summary data by period
  const summaryGroups = useMemo(
    () => groupByPeriod(allDebts, allPayments, summaryPeriod),
    [allDebts, allPayments, summaryPeriod]
  );

  const summaryScroll = useInfiniteScroll(summaryGroups);

  const tabs: { key: Tab; label: string }[] = [
    { key: "trips", label: t.trips },
    { key: "payments", label: t.payments },
    { key: "summary", label: t.summary },
  ];

  const summaryPeriods: { key: SummaryPeriod; label: string }[] = [
    { key: "day", label: t.day },
    { key: "month", label: t.month },
    { key: "year", label: t.year },
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
          <DateFilterBar
            show={showTripFilter}
            onToggle={() => setShowTripFilter(!showTripFilter)}
            dateFrom={tripDateFrom}
            dateTo={tripDateTo}
            hasFilter={hasTripFilter}
            onFromChange={(v) => { setTripDateFrom(v); if (tripDateTo && v > tripDateTo) setTripDateTo(""); setTripRangeStep("to"); }}
            onToChange={(v) => { setTripDateTo(v); setTripRangeStep("from"); }}
            onClear={clearTripFilter}
            onCalendarSelect={handleTripCalendarSelect}
            dateLabel={t.date}
          />

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
                          trip.type === "OUTBOUND"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {trip.type === "OUTBOUND" ? t.outbound : t.return}
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
                                trip.type === "OUTBOUND"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {trip.type === "OUTBOUND" ? t.outbound : t.return}
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
          <DateFilterBar
            show={showPaymentFilter}
            onToggle={() => setShowPaymentFilter(!showPaymentFilter)}
            dateFrom={payDateFrom}
            dateTo={payDateTo}
            hasFilter={hasPaymentFilter}
            onFromChange={(v) => { setPayDateFrom(v); if (payDateTo && v > payDateTo) setPayDateTo(""); setPayRangeStep("to"); }}
            onToChange={(v) => { setPayDateTo(v); setPayRangeStep("from"); }}
            onClear={clearPaymentFilter}
            onCalendarSelect={handlePayCalendarSelect}
            dateLabel={t.date}
          />
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {filteredPayments.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noPayments}</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 sm:hidden">
                  {paymentScroll.visible.map((p) => {
                    const isExpanded = expandedPayments.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl bg-gray-50"
                      >
                        <button
                          type="button"
                          onClick={() => togglePayment(p.id)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800">{p.carName}</p>
                            <p className="text-xs text-gray-500">{p.date}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-semibold text-green-600">
                              ฿{p.amount.toFixed(2)}
                            </span>
                            <svg
                              className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 pb-3 pt-2 text-xs text-gray-500">
                            <div className="flex justify-between">
                              <span>{t.car}</span>
                              <span className="text-gray-700">{p.carName}</span>
                            </div>
                            <div className="mt-1 flex justify-between">
                              <span>{t.amount}</span>
                              <span className="font-medium text-green-600">฿{p.amount.toFixed(2)}</span>
                            </div>
                            {p.note && (
                              <div className="mt-1 flex justify-between">
                                <span>{t.note}</span>
                                <span className="text-gray-700">{p.note}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="w-6 pb-3"></th>
                        <th className="pb-3 font-semibold">{t.date}</th>
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 text-right font-semibold">{t.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paymentScroll.visible.map((p) => {
                        const isExpanded = expandedPayments.has(p.id);
                        return (
                          <Fragment key={p.id}>
                            <tr
                              className="cursor-pointer hover:bg-gray-50/50"
                              onClick={() => togglePayment(p.id)}
                            >
                              <td className="py-3 text-gray-400">
                                <svg
                                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              </td>
                              <td className="py-3 text-gray-700">{p.date}</td>
                              <td className="py-3 font-medium text-gray-800">{p.carName}</td>
                              <td className="py-3 text-right font-semibold text-green-600">
                                ฿{p.amount.toFixed(2)}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="pb-3 pt-0">
                                  <div className="rounded-lg bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                                    <span className="font-medium text-gray-600">{t.note}:</span>{" "}
                                    {p.note ?? <span className="italic text-gray-400">&mdash;</span>}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
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
            {summaryGroups.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noData}</p>
            ) : (
              <div className="space-y-6">
                {summaryScroll.visible.map((group) => (
                  <SummaryTable
                    key={group.key}
                    entries={group.entries}
                    currentUserId={currentUserId}
                    label={group.label}
                    isDaily={summaryPeriod === "day"}
                    t={t}
                  />
                ))}
                {summaryScroll.hasMore && (
                  <div ref={summaryScroll.sentinelRef} className="py-4 text-center text-sm text-gray-400">
                    Loading...
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
