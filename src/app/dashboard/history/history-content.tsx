"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateTripDate, deleteTrip } from "@/lib/trip-actions";

type Tab = "trips" | "payments" | "summary";
type SummaryPeriod = "day" | "month" | "year";

interface Trip {
  id: string;
  userId: string;
  carName: string;
  userName?: string | null;
  date: string;
  dateISO: string;
  time: string;
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
  share: number;
  gasShare: number;
  gasCost: number;
  parkingShare: number;
  parkingCost: number;
  totalCost: number;
  headcount: number;
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
  trips: Trip[];
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
    noTripHistory: string;
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
    editTrip: string;
    deleteTrip: string;
    confirmDeleteTrip: string;
    save: string;
    cancel: string;
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

/** Render per-car calculation detail for a single day's breakdown entries */
function DayBreakdownDetail({
  entries,
  t,
}: {
  entries: BreakdownEntry[];
  t: HistoryContentProps["t"];
}) {
  return (
    <ul className="divide-y divide-gray-100 text-sm">
      {entries.map((b, i) => {
        return (
          <li key={`${b.carId}-${i}`} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-gray-600">{b.carName}</span>
              <span className="shrink-0 font-medium text-gray-900">฿{b.share.toFixed(2)}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-gray-400">
              {b.gasShare > 0 && (
                <div className="flex justify-between">
                  <span>{t.gas}:</span>
                  <span className="text-gray-700">฿{b.gasCost.toFixed(2)} ÷ {b.headcount} {t.people} = ฿{b.gasShare.toFixed(2)}</span>
                </div>
              )}
              {b.parkingShare > 0 && (
                <div className="flex justify-between">
                  <span>{t.parking}:</span>
                  <span className="text-gray-700">฿{b.parkingCost.toFixed(2)} ÷ {b.headcount} {t.people} = ฿{b.parkingShare.toFixed(2)}</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Small checkmark icon for settled periods */
function SettledIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Small clock icon for pending (not yet paid) periods */
function PendingIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Collapsible sub-period row — flat style, no nested card borders */
function SubPeriodRow({
  label,
  total,
  isExpanded,
  onToggle,
  children,
  depth = 0,
  settled = false,
}: {
  label: string;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  depth?: number;
  settled?: boolean;
}) {
  return (
    <div className={depth === 0 ? "border-b border-gray-100 last:border-b-0" : ""}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between py-2 text-left ${depth > 0 ? "pl-3" : ""}`}
      >
        <div className="flex items-center gap-1.5">
          {settled ? <SettledIcon /> : <PendingIcon />}
          <p className={`text-xs font-medium ${depth === 0 ? "text-gray-600" : "text-gray-500"}`}>{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className={`text-xs font-semibold ${settled ? "text-green-600" : "text-amber-600"}`}>฿{total.toFixed(2)}</p>
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
        <div className={`pb-2 ${depth > 0 ? "pl-3" : ""}`}>
          {children}
        </div>
      )}
    </div>
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
  const totalDebt = isAdmin ? group.entries.reduce((s, e) => s + e.totalDebt, 0) : entry.totalDebt;
  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";

  // Check if this period is fully settled
  const isSettled = useMemo(() => {
    if (period === "day") return settledDays.has(group.key);
    // For month/year: settled if all days with breakdown data within the period are settled
    const prefix = group.key; // "YYYY-MM" or "YYYY"
    for (const dateISO of dayBreakdownMap.keys()) {
      if (dateISO.startsWith(prefix) && !settledDays.has(dateISO)) return false;
    }
    return true;
  }, [period, group.key, settledDays, dayBreakdownMap]);

  // Build sub-period data when expanded
  const subData = useMemo(() => {
    if (!isExpanded) return null;

    if (period === "day") {
      // Day view: show raw breakdown entries for this date
      return dayBreakdownMap.get(group.key) ?? [];
    }

    if (period === "month") {
      // Month view: group day entries within this month
      const days: { dateISO: string; label: string; entries: BreakdownEntry[]; total: number }[] = [];
      for (const [dateISO, entries] of dayBreakdownMap) {
        if (dateISO.slice(0, 7) === group.key) {
          const d = new Date(dateISO + "T00:00:00");
          days.push({
            dateISO,
            label: d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" }),
            entries,
            total: entries.reduce((s, e) => s + e.share, 0),
          });
        }
      }
      days.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      return days;
    }

    if (period === "year") {
      // Year view: group into months, each with their day entries
      const monthMap = new Map<string, { dateISO: string; label: string; entries: BreakdownEntry[]; total: number }[]>();
      for (const [dateISO, entries] of dayBreakdownMap) {
        if (dateISO.slice(0, 4) === group.key) {
          const monthKey = dateISO.slice(0, 7);
          if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
          const d = new Date(dateISO + "T00:00:00");
          monthMap.get(monthKey)!.push({
            dateISO,
            label: d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" }),
            entries,
            total: entries.reduce((s, e) => s + e.share, 0),
          });
        }
      }
      const months: { monthKey: string; label: string; days: typeof monthMap extends Map<string, infer V> ? V : never; total: number }[] = [];
      for (const [monthKey, days] of monthMap) {
        days.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
        const d = new Date(parseInt(monthKey.slice(0, 4)), parseInt(monthKey.slice(5, 7)) - 1, 1);
        months.push({
          monthKey,
          label: d.toLocaleDateString(loc, { month: "long", year: "numeric" }),
          days,
          total: days.reduce((s, day) => s + day.total, 0),
        });
      }
      months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      return months;
    }

    return null;
  }, [isExpanded, period, group.key, dayBreakdownMap, loc]);

  return (
    <div className="rounded-xl bg-gray-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {isSettled ? <SettledIcon /> : <PendingIcon />}
          <p className="text-xs font-medium text-gray-500">{group.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className={`font-bold ${isSettled ? "text-green-600" : "text-amber-600"}`}>
            ฿{totalDebt.toFixed(2)}
          </p>
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
        <div className="border-t border-gray-100 px-4 pb-3">
          {/* Admin: per-user list */}
          {isAdmin && group.entries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {group.entries.map((e) => (
                <span key={e.userId}>
                  {e.userName ?? e.userId}
                  {e.userId === currentUserId && (
                    <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{t.you}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {/* Day view: per-car detail */}
          {period === "day" && Array.isArray(subData) && (subData as BreakdownEntry[]).length > 0 && (
            <DayBreakdownDetail entries={subData as BreakdownEntry[]} t={t} />
          )}

          {/* Month view: day rows */}
          {period === "month" && Array.isArray(subData) && (subData as { dateISO: string; label: string; entries: BreakdownEntry[]; total: number }[]).length > 0 && (
            <div className="mt-1 rounded-lg bg-white px-3 pt-1">
              {(subData as { dateISO: string; label: string; entries: BreakdownEntry[]; total: number }[]).map((day) => (
                <SubPeriodRow
                  key={day.dateISO}
                  label={day.label}
                  total={day.total}
                  settled={settledDays.has(day.dateISO)}
                  isExpanded={expandedSubPeriods.has(`${group.key}_${day.dateISO}`)}
                  onToggle={() => toggleSubPeriod(`${group.key}_${day.dateISO}`)}
                >
                  <DayBreakdownDetail entries={day.entries} t={t} />
                </SubPeriodRow>
              ))}
            </div>
          )}

          {/* Year view: month rows, each with day rows */}
          {period === "year" && Array.isArray(subData) && (subData as { monthKey: string; label: string; days: { dateISO: string; label: string; entries: BreakdownEntry[]; total: number }[]; total: number }[]).length > 0 && (
            <div className="mt-1 rounded-lg bg-white px-3 pt-1">
              {(subData as { monthKey: string; label: string; days: { dateISO: string; label: string; entries: BreakdownEntry[]; total: number }[]; total: number }[]).map((month) => {
                const monthSettled = month.days.every((day) => settledDays.has(day.dateISO));
                return (
                  <SubPeriodRow
                    key={month.monthKey}
                    label={month.label}
                    total={month.total}
                    settled={monthSettled}
                    isExpanded={!expandedSubPeriods.has(`${group.key}_${month.monthKey}`)}
                    onToggle={() => toggleSubPeriod(`${group.key}_${month.monthKey}`)}
                  >
                    {month.days.map((day) => (
                      <SubPeriodRow
                        key={day.dateISO}
                        label={day.label}
                        total={day.total}
                        settled={settledDays.has(day.dateISO)}
                        depth={1}
                        isExpanded={expandedSubPeriods.has(`${group.key}_${month.monthKey}_${day.dateISO}`)}
                        onToggle={() => toggleSubPeriod(`${group.key}_${month.monthKey}_${day.dateISO}`)}
                      >
                        <DayBreakdownDetail entries={day.entries} t={t} />
                      </SubPeriodRow>
                    ))}
                  </SubPeriodRow>
                );
              })}
            </div>
          )}
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
  trips,
  allDebts,
  allPayments,
  currentUserId,
  isAdmin = false,
  locale,
  t,
}: HistoryContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trips");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("day");

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
  const [isPending, startTransition] = useTransition();

  function handleEditStart(trip: Trip) {
    setEditingTripId(trip.id);
    setEditDate(trip.dateISO);
  }

  function handleEditCancel() {
    setEditingTripId(null);
    setEditDate("");
  }

  function handleEditSave(tripId: string) {
    startTransition(async () => {
      try {
        await updateTripDate(tripId, editDate);
        setEditingTripId(null);
        setEditDate("");
      } catch { /* ignore */ }
    });
  }

  function handleDelete(tripId: string) {
    if (!confirm(t.confirmDeleteTrip)) return;
    startTransition(async () => {
      try {
        await deleteTrip(tripId);
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
    const base = isAdmin && onlyMe ? trips.filter((t) => t.userId === currentUserId) : trips;
    if (!tripDateFrom && !tripDateTo) return base;
    const from = tripDateFrom;
    const to = tripDateTo || tripDateFrom;
    return base.filter((trip) => {
      if (from && trip.dateISO < from) return false;
      if (to && trip.dateISO > to) return false;
      return true;
    });
  }, [trips, tripDateFrom, tripDateTo, isAdmin, onlyMe, currentUserId]);

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
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {isAdmin && (
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={onlyMe}
              onChange={(e) => setOnlyMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
            {t.onlyMe}
          </label>
        )}
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
            locale={locale}
          />

          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {filteredTrips.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noTripHistory}</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 sm:hidden">
                  {tripScroll.visible.map((trip) => {
                    const canEdit = trip.userId === currentUserId || isAdmin;
                    const isEditing = editingTripId === trip.id;
                    return (
                      <div
                        key={trip.id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800">{trip.carName}</p>
                          {isEditing ? (
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleEditSave(trip.id)}
                                disabled={isPending}
                                className="rounded-lg bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                              >
                                {t.save}
                              </button>
                              <button
                                type="button"
                                onClick={handleEditCancel}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600"
                              >
                                {t.cancel}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">
                              {isAdmin && trip.userName && (
                                <span className="font-medium text-gray-600">{trip.userName} &middot; </span>
                              )}
                              {fmtDate(trip.dateISO, locale)} &middot; {trip.time}
                            </p>
                          )}
                        </div>
                        {canEdit && !isEditing && (
                          <div className="ml-2 flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditStart(trip)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                              title={t.editTrip}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(trip.id)}
                              disabled={isPending}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                              title={t.deleteTrip}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
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
                        <th className="pb-3 font-semibold">{t.date}</th>
                        <th className="pb-3 font-semibold">{t.time}</th>
                        {isAdmin && <th className="pb-3 font-semibold">{t.passenger}</th>}
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tripScroll.visible.map((trip) => {
                        const canEdit = trip.userId === currentUserId || isAdmin;
                        const isEditing = editingTripId === trip.id;
                        return (
                          <tr key={trip.id} className="hover:bg-gray-50/50">
                            <td className="py-3 text-gray-700">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleEditSave(trip.id)}
                                    disabled={isPending}
                                    className="rounded-lg bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                                  >
                                    {t.save}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleEditCancel}
                                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600"
                                  >
                                    {t.cancel}
                                  </button>
                                </div>
                              ) : (
                                fmtDate(trip.dateISO, locale)
                              )}
                            </td>
                            <td className="py-3 text-gray-500">{trip.time}</td>
                            {isAdmin && <td className="py-3 text-gray-600">{trip.userName ?? "—"}</td>}
                            <td className="py-3 font-medium text-gray-800">{trip.carName}</td>
                            <td className="py-3 text-right">
                              {canEdit && !isEditing && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditStart(trip)}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    title={t.editTrip}
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(trip.id)}
                                    disabled={isPending}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                                    title={t.deleteTrip}
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
            locale={locale}
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
                            <p className="text-xs text-gray-500">
                              {fmtDate(p.dateISO, locale)}
                              {isAdmin && p.userName && (
                                <>
                                  {" · "}{p.userName}
                                  {p.userId === currentUserId && (
                                    <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{t.you}</span>
                                  )}
                                </>
                              )}
                            </p>
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
                            <div className="mt-1 flex justify-between">
                              <span>{t.paidDate}</span>
                              <span className="text-gray-700">{p.paidAt}</span>
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
                        {isAdmin && <th className="pb-3 font-semibold">{t.passenger}</th>}
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 font-semibold">{t.paidDate}</th>
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
                              <td className="py-3 text-gray-700">{fmtDate(p.dateISO, locale)}</td>
                              {isAdmin && (
                                <td className="py-3 text-gray-600">
                                  {p.userName ?? "—"}
                                  {p.userId === currentUserId && (
                                    <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{t.you}</span>
                                  )}
                                </td>
                              )}
                              <td className="py-3 font-medium text-gray-800">{p.carName}</td>
                              <td className="py-3 text-gray-500">{p.paidAt}</td>
                              <td className="py-3 text-right font-semibold text-green-600">
                                ฿{p.amount.toFixed(2)}
                              </td>
                            </tr>
                            {isExpanded && p.note && (
                                <tr>
                                  <td colSpan={isAdmin ? 6 : 5} className="pb-3 pt-0">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                                      <span>
                                        <span className="font-medium text-gray-600">{t.note}:</span> {p.note}
                                      </span>
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
          </div>
        </section>
      )}
    </div>
  );
}
