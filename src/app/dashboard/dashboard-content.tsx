"use client";

import { useState } from "react";
import { TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import TripBreakdownCard, { type BreakdownCardEntry } from "@/components/trip-breakdown-card";
import RecentTripsSection from "@/app/dashboard/recent-trips-section";

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
  sharedParkingTripIds: string[];
  isOwner: boolean;
  paymentStatus: "paid" | "pending" | "no_passengers";
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
    <>
      {/* Total Debt Card */}
      <div className="animate-scale-in rounded-2xl border border-debt/20 bg-card p-5 shadow-lg shadow-debt/5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t.yourPendingDebt}</p>
            {pendingDebt > 0 ? (
              <>
                <p className="mt-1 text-4xl font-black tracking-tight text-debt">
                  ฿{pendingDebt.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingCount} {t.pendingItems}
                </p>
              </>
            ) : (
              <p className="mt-1 text-4xl font-black tracking-tight text-settled">
                ฿0.00
                <span className="ml-2 text-base font-normal text-muted-foreground">{t.allClear}</span>
              </p>
            )}
          </div>
          {pendingDebt > 0 && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-debt/10">
              <TrendingDown className="h-6 w-6 text-debt" />
            </div>
          )}
        </div>
      </div>

      {/* Debt Breakdown */}
      {debtEntries.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setDebtOpen(!debtOpen)}
            className="flex w-full items-center justify-between py-1"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t.debtBreakdown}
            </h3>
            {debtOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {debtOpen && (
            <div className="mt-2 space-y-2">
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
                    sharedParking: t.sharedParking,
                    sharedParkingAcross: t.sharedParkingAcross,
                    uniquePeople: t.uniquePeople,
                  }}
                />
              ))}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + 5)}
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
                >
                  {t.loadMore}
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
              {isExpanded && (
                <button
                  type="button"
                  onClick={() => { setVisibleCount(5); setExpandedSet(new Set()); }}
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  {t.showLess}
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Trips */}
      <div>
        <button
          type="button"
          onClick={() => setTripsOpen(!tripsOpen)}
          className="flex w-full items-center justify-between py-1"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t.recentTrips}
          </h3>
          {tripsOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {tripsOpen && (
          <>
            {recentTrips.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t.noCheckInHistory}</p>
            ) : (
              <RecentTripsSection
                recentTrips={recentTrips}
                t={{
                  people: t.people,
                  tripNumber: t.tripNumber,
                  paid: t.paid,
                  pending: t.pending,
                  noPassengers: t.noPassengers,
                  editTrip: t.editTrip,
                  edit: t.edit,
                  editing: t.editing,
                  cancel: t.cancel,
                  car: t.car,
                  gasCost: t.gasCost,
                  parkingCost: t.parkingCost,
                  total: t.total,
                  gas: t.gas,
                  parking: t.parking,
                  shareParkingWithTrips: t.shareParkingWithTrips,
                  confirmDeleteTrip: t.confirmDeleteTrip,
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
