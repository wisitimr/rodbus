"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bus, Car, Crown, Clock, CreditCard, BarChart3, ChevronDown, ChevronUp, Fuel, ParkingCircle, Loader2, CircleCheck, CircleAlert, Link2, Check, Users, X } from "lucide-react";
import { deleteCheckIn } from "@/lib/trip-actions";
import TripBreakdownCard from "@/components/trip-breakdown-card";
import ConfirmModal from "@/components/confirm-modal";
import { formatDateMedium, type Locale } from "@/lib/i18n";

type Tab = "trips" | "payments" | "summary";
type SummaryPeriod = "day" | "month" | "year";

interface Trip {
  id: string;
  carId: string;
  carName: string;
  licensePlate?: string | null;
  date: string;
  dateISO: string;
  time: string;
  gasCost: number;
  parkingCost: number;
  riderCount: number;
  tripNumber: number;
  sharedParkingTripIds: string[];
  isOwner: boolean;
  isMyTrip: boolean;
  passengers: { id: string; name: string }[];
  driverName: string;
  sharedParking?: {
    trips: { carName: string; date: string; parkingCost: number; headcount: number; tripNumber: number }[];
    uniqueNames: string[];
    totalParking: number;
    parkingHeadcount: number;
  } | null;
}

interface PaymentRecord {
  id: string;
  userId: string;
  userName: string | null;
  carName: string;
  licensePlate: string | null;
  date: string;
  dateISO: string;
  paidAt: string;
  amount: number;
  note: string | null;
  tripNumber: number;
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
  parkingHeadcount?: number;
  tripNumber: number;
  passengers: { id: string; name: string }[];
  driver: { id: string; name: string };
  time?: string;
  sharedParking?: {
    trips: { carName: string; date: string; parkingCost: number; headcount: number; tripNumber: number }[];
    uniqueNames: string[];
    totalParking: number;
    parkingHeadcount: number;
  } | null;
}

interface DebtWithBreakdown {
  userId: string;
  userName: string | null;
  userImage: string | null;
  totalDebt: number;
  totalPaid: number;
  pendingDebt: number;
  breakdown: BreakdownEntry[];
}

interface GroupedPeriod {
  key: string; // ISO date, YYYY-MM, or YYYY
  label: string;
  entries: { userId: string; userName: string | null; userImage: string | null; totalDebt: number; totalPaid: number; pendingDebt: number; gasTotal: number; parkingTotal: number }[];
}

interface CarPeriodSummary {
  carId: string;
  carName: string;
  licensePlate: string | null;
  tripCount: number;
  totalGasCost: number;
  totalParkingCost: number;
  totalCost: number;
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
    carSummary?: string;
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
    noPassengers: string;
    you: string;
    onlyMe: string;
    allData: string;
    trip: string;
    people: string;
    splitAmong: string;
    passenger: string;
    paidDate: string;
    tripNumber: string;
    sharedParking?: string;
    sharedParkingAcross?: string;
    uniquePeople?: string;
    editCheckIn?: string;
    deleteCheckIn?: string;
    confirmDeleteCheckIn?: string;
    save?: string;
    cancel?: string;
    editTrip?: string;
    edit?: string;
    editing?: string;
    confirmDeleteTrip?: string;
    confirmDeleteAction?: string;
    gasCost?: string;
    parkingCost?: string;
    total?: string;
    shareParkingWithTrips?: string;
    loadMore?: string;
    driver?: string;
  };
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string, locale: string) {
  return formatDateMedium(new Date(iso + "T00:00:00"), locale as Locale);
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
        <button type="button" onClick={prevMonth} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <span className="text-sm font-semibold text-foreground">
          {viewDate.toLocaleDateString(locale === "th" ? "th-TH-u-ca-buddhist" : "en-US", { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={nextMonth} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
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
                  ? "rounded-lg bg-primary font-semibold text-primary-foreground"
                  : inRange
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent rounded-lg"
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
  paidAmount,
  isExpanded,
  onToggle,
  locale,
  t,
}: {
  entry: BreakdownEntry;
  settled: boolean;
  paidAmount?: number;
  isExpanded: boolean;
  onToggle: () => void;
  locale: string;
  t: HistoryContentProps["t"];
}) {
  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
  const dateLabel = new Date(entry.date + "T00:00:00").toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" });

  // When partially paid, TripBreakdownCard expects share = remaining (not full share)
  const adjustedShare = paidAmount != null && paidAmount > 0 && paidAmount < entry.share
    ? Math.round((entry.share - paidAmount) * 100) / 100
    : entry.share;

  return (
    <TripBreakdownCard
      entry={{ ...entry, date: dateLabel, totalCost: entry.gasCost + entry.parkingCost, time: entry.time, paidAmount, share: adjustedShare }}
      isExpanded={isExpanded}
      onToggle={onToggle}
      status={settled ? "paid" : "pending"}
      compact
      t={{
        pending: t.pending,
        paid: t.paid,
        tripNumber: t.tripNumber,
        people: t.people,
        gas: t.gas,
        parking: t.parking,
        total: "Total",
        sharedParking: t.sharedParking,
        sharedParkingAcross: t.sharedParkingAcross,
        uniquePeople: t.uniquePeople,
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
  isAdmin,
  paidTripKeys,
  perUserPaidKeys,
  perUserPaidAmounts,
  locale,
  t,
  allDebts,
  carSummaries,
}: {
  group: GroupedPeriod;
  period: SummaryPeriod;
  isExpanded: boolean;
  onToggle: () => void;
  dayBreakdownMap: Map<string, BreakdownEntry[]>;
  expandedSubPeriods: Set<string>;
  toggleSubPeriod: (key: string) => void;
  paidTripKeys: Set<string>;
  perUserPaidKeys: Map<string, Set<string>>;
  perUserPaidAmounts: Map<string, Map<string, number>>;
  locale: string;
  t: HistoryContentProps["t"];
  allDebts?: DebtWithBreakdown[];
  isAdmin?: boolean;
  carSummaries?: CarPeriodSummary[];
}) {
  const totalDebt = group.entries.reduce((sum, e) => sum + e.totalDebt, 0);
  const totalPaid = group.entries.reduce((sum, e) => sum + e.totalPaid, 0);
  const pendingDebt = group.entries.reduce((sum, e) => sum + e.pendingDebt, 0);


  // Track which users are expanded (for multi-user / admin view)
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const toggleUser = (userId: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Build per-user breakdown entries
  const userEntriesMap = useMemo(() => {
    if (!allDebts) return new Map<string, BreakdownEntry[]>();
    const map = new Map<string, BreakdownEntry[]>();
    const prefix = group.key;
    for (const debt of allDebts) {
      const entries: BreakdownEntry[] = [];
      const seen = new Set<string>();
      for (const b of debt.breakdown) {
        if (b.date.startsWith(prefix)) {
          const key = `${b.carId}-${b.date}-${b.tripNumber}`;
          if (!seen.has(key)) {
            seen.add(key);
            entries.push(b);
          }
        }
      }
      if (entries.length > 0) {
        entries.sort((a, b) => b.date.localeCompare(a.date) || b.tripNumber - a.tripNumber);
        map.set(debt.userId, entries);
      }
    }
    return map;
  }, [allDebts, group.key]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Card header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="flex-1 font-semibold text-foreground">{group.label}</p>
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold">
          {totalPaid > 0 && <span className="text-settled">฿{totalPaid.toFixed(2)}</span>}
          {pendingDebt > 0 && <span className="text-debt">฿{pendingDebt.toFixed(2)}</span>}
          <span className="text-muted-foreground">฿{totalDebt.toFixed(2)}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {/* Car Summary Section */}
          {carSummaries && carSummaries.length > 0 && (
            <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Car className="h-3.5 w-3.5" />
                {t.carSummary ?? "By Car"}
              </div>
              {carSummaries.map((car) => (
                <div key={car.carId} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">{car.carName}</span>
                    {car.licensePlate && (
                      <span className="ml-1 text-xs text-muted-foreground">({car.licensePlate})</span>
                    )}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {car.tripCount} {t.trip}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    {car.totalGasCost > 0 && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <Fuel className="h-3 w-3" />
                        ฿{car.totalGasCost.toFixed(2)}
                      </span>
                    )}
                    {car.totalParkingCost > 0 && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <ParkingCircle className="h-3 w-3" />
                        ฿{car.totalParkingCost.toFixed(2)}
                      </span>
                    )}
                    <span className="font-bold text-foreground">฿{car.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {group.entries.length === 1 && !isAdmin ? (
            /* Single user: show trip entries directly without user header */
            (userEntriesMap.get(group.entries[0].userId) ?? []).map((entry) => {
              const e = group.entries[0];
              const entryKey = `${group.key}_${e.userId}_${entry.date}_${entry.carId}_${entry.tripNumber}`;
              const tripKey = `${entry.carId}-${entry.date}-${entry.tripNumber}`;
              const userPaid = perUserPaidKeys.get(e.userId);
              const entrySettled = userPaid ? userPaid.has(tripKey) : false;
              const entryPaidAmount = entrySettled ? undefined : perUserPaidAmounts.get(e.userId)?.get(tripKey);
              return (
                <SummaryEntryCard
                  key={entryKey}
                  entry={entry}
                  settled={entrySettled}
                  paidAmount={entryPaidAmount}
                  isExpanded={expandedSubPeriods.has(entryKey)}
                  onToggle={() => toggleSubPeriod(entryKey)}
                  locale={locale}
                  t={t}
                />
              );
            })
          ) : (
            /* Multi-user: show user headers with expandable details */
            group.entries.map((e) => {
              const isUserOpen = expandedUserIds.has(e.userId);
              const userEntries = userEntriesMap.get(e.userId) ?? [];
              const initial = (e.userName ?? "?")[0].toUpperCase();
              return (
                <div key={e.userId} className="rounded-xl border border-border bg-accent/30 overflow-hidden">
                  {/* User header - clickable */}
                  <button
                    type="button"
                    onClick={() => toggleUser(e.userId)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {e.userImage ? (
                        <img src={e.userImage} alt={e.userName ?? ""} className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{e.userName ?? "—"}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
                      {e.totalPaid > 0 && <span className="text-settled">฿{e.totalPaid.toFixed(2)}</span>}
                      {e.pendingDebt > 0 && <span className="text-debt">฿{e.pendingDebt.toFixed(2)}</span>}
                    </span>
                    {isUserOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {/* User expanded details */}
                  {isUserOpen && (
                    <div className="border-t border-border px-3 pb-3 pt-2 space-y-2 animate-fade-in">
                      {userEntries.map((entry) => {
                        const entryKey = `${group.key}_${e.userId}_${entry.date}_${entry.carId}_${entry.tripNumber}`;
                        const tripKey = `${entry.carId}-${entry.date}-${entry.tripNumber}`;
                        const userPaid = perUserPaidKeys.get(e.userId);
                        const entrySettled = userPaid ? userPaid.has(tripKey) : false;
                        const entryPaidAmount = entrySettled ? undefined : perUserPaidAmounts.get(e.userId)?.get(tripKey);
                        return (
                          <SummaryEntryCard
                            key={entryKey}
                            entry={entry}
                            settled={entrySettled}
                            paidAmount={entryPaidAmount}
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
            })
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
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            hasFilter
              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          {dateLabel}
        </button>
        {hasFilter && (
          <span className="text-xs text-muted-foreground">
            {fmtDate(dateFrom, locale)}{dateTo && dateTo !== dateFrom ? ` — ${fmtDate(dateTo, locale)}` : ""}
          </span>
        )}
        {hasFilter && (
          <button
            onClick={onClear}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        )}
      </div>

      {show && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Start</label>
              <div className="relative">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onFromChange(e.target.value)}
                  className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                />
                <div className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground">
                  {dateFrom ? fmtDate(dateFrom, locale) : "\u00A0"}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">End</label>
              <div className="relative">
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => onToChange(e.target.value)}
                  className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                />
                <div className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground">
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
  const userImages = new Map<string, string | null>();
  for (const d of allDebts) {
    userNames.set(d.userId, d.userName);
    userImages.set(d.userId, d.userImage);
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
        userImage: userImages.get(uid) ?? null,
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

function groupCarsByPeriod(
  allDebts: DebtWithBreakdown[],
  period: SummaryPeriod
): Map<string, CarPeriodSummary[]> {
  function getKey(isoDate: string): string {
    if (period === "day") return isoDate;
    if (period === "month") return isoDate.slice(0, 7);
    return isoDate.slice(0, 4);
  }

  const periodCarMap = new Map<string, Map<string, {
    carName: string;
    licensePlate: string | null;
    tripCount: number;
    totalGasCost: number;
    totalParkingCost: number;
    seenTrips: Set<string>;
  }>>();

  for (const debt of allDebts) {
    for (const b of debt.breakdown) {
      const periodKey = getKey(b.date);
      const tripKey = `${b.carId}-${b.date}-${b.tripNumber}`;

      if (!periodCarMap.has(periodKey)) periodCarMap.set(periodKey, new Map());
      const carMap = periodCarMap.get(periodKey)!;

      if (!carMap.has(b.carId)) {
        carMap.set(b.carId, {
          carName: b.carName,
          licensePlate: b.licensePlate,
          tripCount: 0,
          totalGasCost: 0,
          totalParkingCost: 0,
          seenTrips: new Set(),
        });
      }

      const acc = carMap.get(b.carId)!;
      if (!acc.seenTrips.has(tripKey)) {
        acc.seenTrips.add(tripKey);
        acc.tripCount++;
        acc.totalGasCost += b.gasCost;
        acc.totalParkingCost += b.parkingCost;
      }
    }
  }

  const result = new Map<string, CarPeriodSummary[]>();
  for (const [periodKey, carMap] of periodCarMap) {
    const summaries: CarPeriodSummary[] = [];
    for (const [carId, acc] of carMap) {
      summaries.push({
        carId,
        carName: acc.carName,
        licensePlate: acc.licensePlate,
        tripCount: acc.tripCount,
        totalGasCost: Math.round(acc.totalGasCost * 100) / 100,
        totalParkingCost: Math.round(acc.totalParkingCost * 100) / 100,
        totalCost: Math.round((acc.totalGasCost + acc.totalParkingCost) * 100) / 100,
      });
    }
    summaries.sort((a, b) => b.totalCost - a.totalCost);
    result.set(periodKey, summaries);
  }

  return result;
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

  // Compute which trips are paid vs pending (oldest-first payment allocation)
  // Per-user paid trip keys (oldest-first allocation)
  // perUserPaidKeys: fully-paid trip keys
  // perUserPaidAmounts: partial payment amount per trip key (only for the partially-paid entry)
  const { perUserPaidKeys, perUserPaidAmounts } = useMemo(() => {
    const keyMap = new Map<string, Set<string>>();
    const amtMap = new Map<string, Map<string, number>>();
    for (const debt of allDebts) {
      const keys = new Set<string>();
      const amounts = new Map<string, number>();
      const sorted = [...debt.breakdown].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let remaining = debt.totalPaid;
      for (const entry of sorted) {
        const tripKey = `${entry.carId}-${entry.date}-${entry.tripNumber}`;
        if (remaining >= entry.share) {
          remaining = Math.round((remaining - entry.share) * 100) / 100;
          keys.add(tripKey);
        } else if (remaining > 0) {
          amounts.set(tripKey, remaining);
          remaining = 0;
          break;
        } else {
          break;
        }
      }
      keyMap.set(debt.userId, keys);
      amtMap.set(debt.userId, amounts);
    }
    return { perUserPaidKeys: keyMap, perUserPaidAmounts: amtMap };
  }, [allDebts]);

  const paidTripKeys = useMemo(() => perUserPaidKeys.get(currentUserId) ?? new Set<string>(), [perUserPaidKeys, currentUserId]);

  // For owner trips: check if ALL users who owe on that trip have paid
  const { fullySettledTripKeys, tripDebtors } = useMemo(() => {
    const debtors = new Map<string, string[]>();
    for (const debt of allDebts) {
      for (const b of debt.breakdown) {
        const key = `${b.carId}-${b.date}-${b.tripNumber}`;
        const list = debtors.get(key) ?? [];
        list.push(debt.userId);
        debtors.set(key, list);
      }
    }
    const settled = new Set<string>();
    for (const [tripKey, userIds] of debtors) {
      if (userIds.every((uid) => perUserPaidKeys.get(uid)?.has(tripKey))) {
        settled.add(tripKey);
      }
    }
    return { fullySettledTripKeys: settled, tripDebtors: debtors };
  }, [allDebts, perUserPaidKeys]);

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

  const [isPending, startTransition] = useTransition();

  const [confirmDeleteCheckInId, setConfirmDeleteCheckInId] = useState<string | null>(null);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

  function handleDelete(checkInId: string) {
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

  // Map<dateISO, BreakdownEntry[]> — raw per-car entries (admin sees all unless onlyMe, user sees own)
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
    const base = isAdmin && onlyMe ? trips.filter((t) => t.isMyTrip) : trips;
    if (!tripDateFrom && !tripDateTo) return base;
    const from = tripDateFrom;
    const to = tripDateTo || tripDateFrom;
    return base.filter((trip) => {
      if (from && trip.dateISO < from) return false;
      if (to && trip.dateISO > to) return false;
      return true;
    });
  }, [trips, tripDateFrom, tripDateTo, isAdmin, onlyMe]);

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

  // Group summary data by period (admin sees all users unless onlyMe, user sees own only)
  const summaryGroups = useMemo(() => {
    const groups = groupByPeriod(allDebts, allPayments, summaryPeriod, locale);
    if (isAdmin && !onlyMe) {
      return groups.filter((g) => g.entries.length > 0);
    }
    return groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) => e.userId === currentUserId),
      }))
      .filter((g) => g.entries.length > 0);
  }, [allDebts, allPayments, summaryPeriod, locale, currentUserId, isAdmin, onlyMe]);

  const carSummaryByPeriod = useMemo(() => {
    const debtsToUse = isAdmin && !onlyMe ? allDebts : allDebts.filter((d) => d.userId === currentUserId);
    return groupCarsByPeriod(debtsToUse, summaryPeriod);
  }, [allDebts, summaryPeriod, currentUserId, isAdmin, onlyMe]);

  const SUMMARY_PAGE_SIZE = 3;
  const [summaryVisibleCount, setSummaryVisibleCount] = useState(SUMMARY_PAGE_SIZE);
  // Reset visible count when summaryGroups changes
  useEffect(() => {
    setSummaryVisibleCount(SUMMARY_PAGE_SIZE);
  }, [summaryGroups]);
  const visibleSummaryGroups = summaryGroups.slice(0, summaryVisibleCount);
  const hasSummaryMore = summaryVisibleCount < summaryGroups.length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "trips",
      label: t.trips,
      icon: <Bus className="h-4 w-4" />,
    },
    {
      key: "payments",
      label: t.payments,
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      key: "summary",
      label: t.summary,
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ];


  return (
    <div className="space-y-3">
      {/* Admin: All / My Data toggle */}
      {isAdmin && (
        <div className="flex">
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => setOnlyMe(false)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                !onlyMe
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.allData}
            </button>
            <button
              onClick={() => setOnlyMe(true)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                onlyMe
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.onlyMe}
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips tab */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          {filteredTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noCheckInHistory}</p>
          ) : (
            <>
              {visibleGroupedTrips.map((group) => (
                <div key={group.dateISO}>
                  {/* Date header */}
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.dateLabel}
                  </h3>

                  {/* Trip cards */}
                  <div className="space-y-2">
                    {group.trips.map((trip) => {
                      const totalCost = trip.gasCost + trip.parkingCost;
                      return (
                        <div
                          key={trip.id}
                          onClick={() => setDetailTrip(trip)}
                          className="rounded-xl border border-border bg-card p-3 animate-fade-in"
                        >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${trip.isOwner ? "bg-amber-500/10" : "bg-primary/10"}`}>
                                {trip.isOwner ? <Crown className="h-5 w-5 text-amber-500" /> : <Bus className="h-5 w-5 text-primary" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">
                                  {trip.carName}
                                  {trip.licensePlate && <span className="ml-1 font-normal text-muted-foreground">({trip.licensePlate})</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {trip.riderCount} {t.people} &middot; ฿{totalCost.toFixed(2)}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {trip.time}
                                </div>
                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <span className="text-xs font-medium text-primary">
                                    {t.tripNumber} #{trip.tripNumber}
                                  </span>
                                  {trip.riderCount <= 1 ? (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                                      {t.noPassengers}
                                    </span>
                                  ) : (trip.isOwner
                                    ? (!tripDebtors.has(`${trip.carId}-${trip.dateISO}-${trip.tripNumber}`) || fullySettledTripKeys.has(`${trip.carId}-${trip.dateISO}-${trip.tripNumber}`))
                                    : paidTripKeys.has(`${trip.carId}-${trip.dateISO}-${trip.tripNumber}`)
                                  ) ? (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-settled">
                                      <CircleCheck className="h-3 w-3" />
                                      {t.paid}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-debt">
                                      <CircleAlert className="h-3 w-3" />
                                      {t.pending}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {tripScroll.hasMore && (
                <div ref={tripScroll.sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <div className="space-y-2">
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noPayments}</p>
          ) : (
            <>
              {paymentScroll.visible.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 animate-fade-in"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-settled/10">
                    <CreditCard className="h-4 w-4 text-settled" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.userName}
                        {isAdmin && p.userId === currentUserId && <span className="font-normal text-muted-foreground"> ({t.you})</span>}
                        {p.note && <span className="ml-1 font-normal text-muted-foreground">&middot; {p.note}</span>}
                      </p>
                      <span className="shrink-0 text-sm font-bold text-settled">
                        ฿{p.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {p.carName} &middot; {p.date} &middot; <span className="font-medium text-primary">{t.tripNumber} #{p.tripNumber}</span>
                      </p>
                      <p className="shrink-0 text-[11px] text-muted-foreground">
                        {t.paid} {p.paidAt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {paymentScroll.hasMore && (
                <div ref={paymentScroll.sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div>
          {summaryGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <div className="space-y-3">
              {visibleSummaryGroups.map((group) => (
                <SummaryCard
                  key={group.key}
                  group={group}
                  period={summaryPeriod}
                  isExpanded={isSummaryExpanded(group.key)}
                  onToggle={() => toggleSummary(group.key)}
                  dayBreakdownMap={dayBreakdownMap}
                  expandedSubPeriods={expandedSubPeriods}
                  toggleSubPeriod={toggleSubPeriod}
                  paidTripKeys={paidTripKeys}
                  perUserPaidKeys={perUserPaidKeys}
                  perUserPaidAmounts={perUserPaidAmounts}
                  locale={locale}
                  t={t}
                  allDebts={isAdmin && !onlyMe ? allDebts : allDebts.filter((d) => d.userId === currentUserId)}
                  isAdmin={isAdmin && !onlyMe}
                  carSummaries={carSummaryByPeriod.get(group.key) ?? []}
                />
              ))}
              {hasSummaryMore && (
                <button
                  type="button"
                  onClick={() => setSummaryVisibleCount((c) => c + SUMMARY_PAGE_SIZE)}
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
                >
                  {t.loadMore ?? "Load More"}
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trip Detail Modal */}
      {detailTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailTrip(null); }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-scale-in">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {detailTrip.carName}
                  {detailTrip.licensePlate && <span className="ml-1 font-normal text-muted-foreground">({detailTrip.licensePlate})</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detailTrip.date} · {detailTrip.time} · <span className="font-medium text-primary">{t.tripNumber} #{detailTrip.tripNumber}</span>
                </p>
              </div>
              <button onClick={() => setDetailTrip(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {/* People */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="font-medium">{detailTrip.riderCount} {t.people}</span>
              </div>
              <div className="ml-6 text-xs text-muted-foreground">
                {detailTrip.driverName} ({t.driver ?? "Driver"})
                {detailTrip.passengers.length > 0 && `, ${detailTrip.passengers.map((p) => p.name).join(", ")}`}
              </div>

              {/* Costs */}
              <div className="space-y-1.5 border-t border-border/50 pt-3">
                {detailTrip.gasCost > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Fuel className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{t.gas}</span>
                    <span className="ml-auto font-mono text-foreground">&#3647;{detailTrip.gasCost.toFixed(2)}</span>
                  </div>
                )}
                {detailTrip.parkingCost > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <ParkingCircle className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{t.parking}</span>
                    <span className="ml-auto font-mono text-foreground">&#3647;{detailTrip.parkingCost.toFixed(2)}</span>
                  </div>
                )}
                {detailTrip.sharedParking && detailTrip.sharedParking.trips.length > 0 && (
                  <div className="space-y-1 rounded-lg bg-primary/5 p-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Link2 className="h-3 w-3" />
                      {t.sharedParkingAcross ?? "Shared parking across"} {detailTrip.sharedParking.trips.length} {t.tripNumber.toLowerCase()}
                    </div>
                    {detailTrip.sharedParking.trips.map((detail, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{detail.carName} · {detail.date} · {t.tripNumber} #{detail.tripNumber}</span>
                        <span className="font-mono">&#3647;{detail.parkingCost.toFixed(2)} · {detail.headcount} {t.people}</span>
                      </div>
                    ))}
                    {detailTrip.sharedParking.uniqueNames.length > 0 && (
                      <div className="mt-1 border-t border-border/30 pt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {detailTrip.sharedParking.uniqueNames.length} {t.uniquePeople ?? "unique people"}:
                        </span>{" "}
                        {detailTrip.sharedParking.uniqueNames.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm font-bold">
                <span className="text-foreground">{t.total ?? "Total"}</span>
                <span className="font-mono text-foreground">&#3647;{(detailTrip.gasCost + detailTrip.parkingCost).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteCheckInId}
        title={t.confirmDeleteAction ?? "Confirm Delete"}
        message={t.confirmDeleteCheckIn ?? ""}
        confirmLabel={t.confirmDeleteAction ?? "Confirm Delete"}
        cancelLabel={t.cancel ?? "Cancel"}
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteCheckInId) handleDelete(confirmDeleteCheckInId);
          setConfirmDeleteCheckInId(null);
        }}
        onCancel={() => setConfirmDeleteCheckInId(null)}
      />
    </div>
  );
}
