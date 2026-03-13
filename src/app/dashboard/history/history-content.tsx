"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateCheckInDate, deleteCheckIn } from "@/lib/trip-actions";
import TripBreakdownCard from "@/components/trip-breakdown-card";

type Tab = "trips" | "payments" | "summary";
type SummaryPeriod = "day" | "month" | "year";

interface Trip {
  id: string;
  carName: string;
  licensePlate?: string | null;
  date: string;
  dateISO: string;
  time: string;
  gasCost: number;
  parkingCost: number;
  riderCount: number;
  tripNumber: number;
}

interface PaymentRecord {
  id: string;
  userId: string;
  userName: string | null;
  carName: string;
  date: string;
  dateISO: string;
  paidAt: string;
  amount: number;
  note: string | null;
}

interface BreakdownEntry {
  date: string; // ISO date
  carId: string;
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
  time?: string;
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
  entries: { userId: string; userName: string | null; totalDebt: number; totalPaid: number; pendingDebt: number; gasTotal: number; parkingTotal: number }[];
}

interface HistoryContentProps {
  checkIns: Trip[];
  allDebts: DebtWithBreakdown[];
  allPayments: PaymentRecord[];
  currentUserId: string;
  isAdmin?: boolean;
  locale: string;
  t: {
    trips: string;
    payments: string;
    summary: string;
    day: string;
    month: string;
    year: string;
    noCheckInHistory: string;
    noPayments: string;
    noData: string;
    date: string;
    time: string;
    car: string;
    note: string;
    amount: string;
    gas: string;
    parking: string;
    viewCostBreakdown: string;
    accrued: string;
    paid: string;
    pending: string;
    you: string;
    onlyMe: string;
    trip: string;
    people: string;
    splitAmong: string;
    passenger: string;
    paidDate: string;
    tripNumber: string;
    editCheckIn?: string;
    deleteCheckIn?: string;
    confirmDeleteCheckIn?: string;
    save?: string;
    cancel?: string;
  };
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string, locale: string) {
  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
  return new Date(iso + "T00:00:00").toLocaleDateString(loc);
}

function Calendar({
  dateFrom,
  dateTo,
  onSelect,
  locale,
}: {
  dateFrom: string;
  dateTo: string;
  onSelect: (iso: string) => void;
  locale: string;
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
          {viewDate.toLocaleDateString(locale === "th" ? "th-TH-u-ca-buddhist" : "en-US", { month: "long", year: "numeric" })}
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

/** Wrapper that formats date and delegates to shared TripBreakdownCard */
function SummaryEntryCard({
  entry,
  settled,
  isExpanded,
  onToggle,
  locale,
  t,
}: {
  entry: BreakdownEntry;
  settled: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  locale: string;
  t: HistoryContentProps["t"];
}) {
  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
  const dateLabel = new Date(entry.date + "T00:00:00").toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" });

  return (
    <TripBreakdownCard
      entry={{ ...entry, date: dateLabel, totalCost: entry.gasCost + entry.parkingCost, time: entry.time }}
      isExpanded={isExpanded}
      onToggle={onToggle}
      status={settled ? "paid" : "pending"}
      t={{
        pending: t.pending,
        paid: t.paid,
        tripNumber: t.tripNumber,
        people: t.people,
        gas: t.gas,
        parking: t.parking,
        total: "Total",
      }}
    />
  );
}

function SummaryCard({
  group,
  period,
  isExpanded,
  onToggle,
  dayBreakdownMap,
  expandedSubPeriods,
  toggleSubPeriod,
  settledDays,
  isAdmin,
  currentUserId,
  locale,
  t,
}: {
  group: GroupedPeriod;
  period: SummaryPeriod;
  isExpanded: boolean;
  onToggle: () => void;
  dayBreakdownMap: Map<string, BreakdownEntry[]>;
  expandedSubPeriods: Set<string>;
  toggleSubPeriod: (key: string) => void;
  settledDays: Set<string>;
  isAdmin: boolean;
  currentUserId: string;
  locale: string;
  t: HistoryContentProps["t"];
}) {
  const entry = group.entries[0];
  const totalDebt = isAdmin ? group.entries.reduce((s, e) => s + e.totalDebt, 0) : entry?.totalDebt ?? 0;
  const totalPaid = isAdmin ? group.entries.reduce((s, e) => s + e.totalPaid, 0) : entry?.totalPaid ?? 0;
  const pendingDebt = isAdmin ? group.entries.reduce((s, e) => s + e.pendingDebt, 0) : entry?.pendingDebt ?? 0;

  // Compute grand total (total trip costs before splitting) for this period
  const grandTotal = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    const prefix = group.key;
    for (const [dateISO, entries] of dayBreakdownMap) {
      if (!dateISO.startsWith(prefix)) continue;
      for (const e of entries) {
        const key = `${e.carId}-${e.date}-${e.tripNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          total += e.totalCost;
        }
      }
    }
    return Math.round(total * 100) / 100;
  }, [group.key, dayBreakdownMap]);

  // Collect all breakdown entries for expanded view (deduplicated by trip)
  const allEntries = useMemo(() => {
    if (!isExpanded) return [];
    const seen = new Set<string>();
    const entries: BreakdownEntry[] = [];
    const prefix = group.key;
    for (const [dateISO, dayEntries] of dayBreakdownMap) {
      if (dateISO.startsWith(prefix)) {
        for (const e of dayEntries) {
          const key = `${e.carId}-${e.date}-${e.tripNumber}`;
          if (!seen.has(key)) {
            seen.add(key);
            entries.push(e);
          }
        }
      }
    }
    // Sort by date descending
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }, [isExpanded, group.key, dayBreakdownMap]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      {/* Card header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-4 text-left"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{group.label}</h3>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Grand Total: <span className="font-bold text-gray-900">฿{grandTotal.toFixed(2)}</span>
        </p>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <span className="text-red-500">{t.pending}: <span className="font-medium">฿{pendingDebt.toFixed(2)}</span></span>
          <span className="text-green-600">{t.paid}: <span className="font-medium">฿{totalPaid.toFixed(2)}</span></span>
          <span className="ml-auto text-gray-700">Total: <span className="font-bold">฿{totalDebt.toFixed(2)}</span></span>
        </div>
      </button>

      {/* Expanded: individual entry cards */}
      {isExpanded && allEntries.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 px-4 py-3">
          {allEntries.map((entry, i) => {
            const entryKey = `${group.key}_${entry.date}_${entry.carId}_${entry.tripNumber}`;
            const entrySettled = settledDays.has(entry.date);
            return (
              <SummaryEntryCard
                key={entryKey}
                entry={entry}
                settled={entrySettled}
                isExpanded={expandedSubPeriods.has(entryKey)}
                onToggle={() => toggleSubPeriod(entryKey)}
                locale={locale}
                t={t}
              />
            );
          })}
        </div>
      )}
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
  locale,
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
  locale: string;
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
            {fmtDate(dateFrom, locale)}{dateTo && dateTo !== dateFrom ? ` — ${fmtDate(dateTo, locale)}` : ""}
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
              <div className="relative">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onFromChange(e.target.value)}
                  className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                />
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700">
                  {dateFrom ? fmtDate(dateFrom, locale) : "\u00A0"}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">End</label>
              <div className="relative">
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => onToChange(e.target.value)}
                  className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                />
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700">
                  {dateTo ? fmtDate(dateTo, locale) : "\u00A0"}
                </div>
              </div>
            </div>
          </div>

          <Calendar
            dateFrom={dateFrom}
            dateTo={dateTo || dateFrom}
            onSelect={onCalendarSelect}
            locale={locale}
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
  period: SummaryPeriod,
  locale: string
): GroupedPeriod[] {
  function getKey(isoDate: string): string {
    if (period === "day") return isoDate;
    if (period === "month") return isoDate.slice(0, 7);
    return isoDate.slice(0, 4);
  }

  const periodKeys = new Set<string>();
  const userPeriodDebt = new Map<string, Map<string, number>>();
  const userPeriodGas = new Map<string, Map<string, number>>();
  const userPeriodParking = new Map<string, Map<string, number>>();

  for (const debt of allDebts) {
    for (const b of debt.breakdown) {
      const key = getKey(b.date);
      periodKeys.add(key);

      for (const [map, val] of [
        [userPeriodDebt, b.share],
        [userPeriodGas, b.gasShare],
        [userPeriodParking, b.parkingShare],
      ] as [Map<string, Map<string, number>>, number][]) {
        if (!map.has(debt.userId)) map.set(debt.userId, new Map());
        const pm = map.get(debt.userId)!;
        pm.set(key, (pm.get(key) ?? 0) + val);
      }
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
        gasTotal: Math.round((userPeriodGas.get(uid)?.get(key) ?? 0) * 100) / 100,
        parkingTotal: Math.round((userPeriodParking.get(uid)?.get(key) ?? 0) * 100) / 100,
      });
    }

    entries.sort((a, b) => b.pendingDebt - a.pendingDebt);

    let label = key;
    const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
    if (period === "day") {
      const d = new Date(key + "T00:00:00");
      label = d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } else if (period === "month") {
      const [y, m] = key.split("-");
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      label = d.toLocaleDateString(loc, { month: "long", year: "numeric" });
    } else {
      const d = new Date(parseInt(key), 0, 1);
      label = d.toLocaleDateString(loc, { year: "numeric" });
    }

    groups.push({ key, label, entries });
  }

  groups.sort((a, b) => b.key.localeCompare(a.key));
  return groups;
}

export default function HistoryContent({
  checkIns: trips,
  allDebts,
  allPayments,
  currentUserId,
  isAdmin = false,
  locale,
  t,
}: HistoryContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trips");
  const summaryPeriod: SummaryPeriod = "month";

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

  // Admin: filter to own data only
  const [onlyMe, setOnlyMe] = useState(false);

  // Trip edit/delete state
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEditStart(trip: Trip) {
    setEditingTripId(trip.id);
    setEditDate(trip.dateISO);
  }

  function handleEditCancel() {
    setEditingTripId(null);
    setEditDate("");
  }

  function handleEditSave(checkInId: string) {
    startTransition(async () => {
      try {
        await updateCheckInDate(checkInId, editDate);
        setEditingTripId(null);
        setEditDate("");
      } catch { /* ignore */ }
    });
  }

  function handleDelete(checkInId: string) {
    if (!confirm(t.confirmDeleteCheckIn)) return;
    startTransition(async () => {
      try {
        await deleteCheckIn(checkInId);
      } catch { /* ignore */ }
    });
  }

  // Expanded payment details
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());

  // Expanded summary cards — auto-expand all
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string> | "all">("all");
  const isSummaryExpanded = (key: string) =>
    expandedSummaries === "all" || expandedSummaries.has(key);

  const toggleSummary = (key: string) => {
    setExpandedSummaries((prev) => {
      if (prev === "all") {
        // Collapse this one: expand all others
        const next = new Set(summaryGroups.map((g) => g.key));
        next.delete(key);
        return next;
      }
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Expanded sub-period cards (for month/year drill-down)
  const [expandedSubPeriods, setExpandedSubPeriods] = useState<Set<string>>(new Set());
  const toggleSubPeriod = useCallback((key: string) => {
    setExpandedSubPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Map<dateISO, BreakdownEntry[]> — raw per-car entries for each day, filtered to current user (admins see all unless onlyMe)
  const dayBreakdownMap = useMemo(() => {
    const map = new Map<string, BreakdownEntry[]>();
    for (const debt of allDebts) {
      if ((!isAdmin || onlyMe) && debt.userId !== currentUserId) continue;
      for (const b of debt.breakdown) {
        const list = map.get(b.date) ?? [];
        list.push(b);
        map.set(b.date, list);
      }
    }
    return map;
  }, [allDebts, currentUserId, isAdmin, onlyMe]);

  // Set of settled day keys — days where pendingDebt <= 0
  const settledDays = useMemo(() => {
    const dayGroups = groupByPeriod(allDebts, allPayments, "day", locale);
    const settled = new Set<string>();
    for (const g of dayGroups) {
      if (isAdmin && !onlyMe) {
        if (g.entries.every((e) => e.pendingDebt <= 0)) settled.add(g.key);
      } else {
        const e = g.entries.find((e) => e.userId === currentUserId);
        if (e && e.pendingDebt <= 0) settled.add(g.key);
      }
    }
    return settled;
  }, [allDebts, allPayments, locale, currentUserId, isAdmin, onlyMe]);
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
    const base = isAdmin && !onlyMe ? allPayments : allPayments.filter((p) => p.userId === currentUserId);
    if (!payDateFrom && !payDateTo) return base;
    const from = payDateFrom;
    const to = payDateTo || payDateFrom;
    return base.filter((p) => {
      if (from && p.dateISO < from) return false;
      if (to && p.dateISO > to) return false;
      return true;
    });
  }, [allPayments, payDateFrom, payDateTo, isAdmin, currentUserId, onlyMe]);

  const tripScroll = useInfiniteScroll(filteredTrips);

  // Group visible trips by date for display
  const visibleGroupedTrips = useMemo(() => {
    const groups: { dateISO: string; dateLabel: string; trips: (typeof filteredTrips[number])[] }[] = [];
    const map = new Map<string, (typeof groups)[number]>();
    for (const trip of tripScroll.visible) {
      let group = map.get(trip.dateISO);
      if (!group) {
        group = { dateISO: trip.dateISO, dateLabel: fmtDate(trip.dateISO, locale), trips: [] };
        map.set(trip.dateISO, group);
        groups.push(group);
      }
      group.trips.push(trip);
    }
    return groups;
  }, [tripScroll.visible, locale]);
  const paymentScroll = useInfiniteScroll(filteredPayments);

  // Group summary data by period, filtered to current user only (admins see all unless onlyMe)
  const summaryGroups = useMemo(() => {
    const groups = groupByPeriod(allDebts, allPayments, summaryPeriod, locale);
    if (isAdmin && !onlyMe) return groups.filter((g) => g.entries.length > 0);
    return groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) => e.userId === currentUserId),
      }))
      .filter((g) => g.entries.length > 0);
  }, [allDebts, allPayments, summaryPeriod, locale, currentUserId, isAdmin, onlyMe]);

  const summaryScroll = useInfiniteScroll(summaryGroups);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "trips",
      label: t.trips,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
    },
    {
      key: "payments",
      label: t.payments,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    {
      key: "summary",
      label: t.summary,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips tab */}
      {activeTab === "trips" && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {filteredTrips.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noCheckInHistory}</p>
            ) : (
              <>
                <div className="space-y-6">
                  {visibleGroupedTrips.map((group) => (
                    <div key={group.dateISO}>
                      {/* Date header */}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{group.dateLabel}</span>
                        <span className="text-xs text-gray-300">&middot; {group.trips.length} {group.trips.length === 1 ? t.trip : t.trips}</span>
                        <div className="h-px flex-1 bg-gray-100" />
                      </div>

                      {/* Trip cards */}
                      <div className="space-y-2">
                        {group.trips.map((trip) => {
                          const totalCost = trip.gasCost + trip.parkingCost;
                          return (
                            <div
                              key={trip.id}
                              className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition hover:border-gray-200 hover:shadow-sm"
                            >
                              {/* Bus icon */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                </svg>
                              </div>

                              {/* Trip info */}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-800">
                                  {trip.carName}
                                  {trip.licensePlate && <span className="ml-1 font-normal text-gray-400">({trip.licensePlate})</span>}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                  {trip.riderCount} {t.people} &middot; ฿{totalCost.toFixed(0)}
                                </p>
                              </div>

                              {/* Time & trip number */}
                              <div className="shrink-0 text-right">
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {trip.time}
                                </div>
                                <p className="mt-0.5 text-xs font-medium text-blue-600">
                                  {t.tripNumber} #{trip.tripNumber}
                                </p>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
            {filteredPayments.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noPayments}</p>
            ) : (
              <>
                <div className="space-y-2">
                  {paymentScroll.visible.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition hover:border-gray-200 hover:shadow-sm"
                    >
                      {/* Payment icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-500">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                      </div>

                      {/* Payment info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800">
                          {p.userName}
                          {isAdmin && p.userId === currentUserId && <span className="font-normal text-gray-400"> ({t.you})</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {p.carName} &middot; {t.paid} {p.paidAt}
                        </p>
                      </div>

                      {/* Amount */}
                      <span className="shrink-0 text-sm font-semibold text-green-600">
                        ฿{p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
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
        <section>
          {summaryGroups.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noData}</p>
          ) : (
            <div className="space-y-4">
              {summaryScroll.visible.map((group) => (
                <SummaryCard
                  key={group.key}
                  group={group}
                  period={summaryPeriod}
                  isExpanded={isSummaryExpanded(group.key)}
                  onToggle={() => toggleSummary(group.key)}
                  dayBreakdownMap={dayBreakdownMap}
                  expandedSubPeriods={expandedSubPeriods}
                  toggleSubPeriod={toggleSubPeriod}
                  settledDays={settledDays}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  locale={locale}
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
        </section>
      )}
    </div>
  );
}
