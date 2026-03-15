"use client";

import { ChevronDown, ChevronUp, Users, Fuel, ParkingCircle, Link2, CircleCheck, CircleAlert } from "lucide-react";

export interface SharedParkingEntry {
  carName: string;
  date: string;
  parkingCost: number;
  headcount: number;
}

export interface SharedParkingInfo {
  trips: SharedParkingEntry[];
  uniqueNames: string[];
  totalParking: number;
  parkingHeadcount: number;
}

export interface BreakdownCardEntry {
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
  parkingHeadcount?: number;
  tripNumber: number;
  passengerNames: string[];
  driverName: string | null;
  time?: string;
  sharedParking?: SharedParkingInfo | null;
  paidAmount?: number;
}

interface TripBreakdownCardProps {
  entry: BreakdownCardEntry;
  isExpanded: boolean;
  onToggle: () => void;
  status?: "pending" | "paid";
  compact?: boolean;
  t: {
    pending: string;
    paid?: string;
    tripNumber: string;
    people: string;
    gas: string;
    parking: string;
    total: string;
    driver?: string;
    sharedParking?: string;
    sharedParkingAcross?: string;
    uniquePeople?: string;
  };
}

export default function TripBreakdownCard({
  entry,
  isExpanded,
  onToggle,
  status = "pending",
  compact = false,
  t,
}: TripBreakdownCardProps) {
  const plateLabel = entry.licensePlate ? ` (${entry.licensePlate})` : "";
  const isPending = status === "pending";

  const sp = entry.sharedParking;
  const hasSharedParking = sp != null && sp.trips.length > 0;

  // Build display list: passengers + driver
  const allNames = [...entry.passengerNames];
  if (entry.driverName && !allNames.includes(entry.driverName)) {
    allNames.push(entry.driverName);
  }

  return (
    <div className={
      compact
        ? "rounded-xl border border-border/60 bg-card p-3"
        : "animate-fade-in rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    }>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-0.5 text-left"
      >
        {/* Row 1: date + badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`font-medium text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            {entry.date}{entry.time ? ` · ${entry.time}` : ""}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${compact ? "text-[10px]" : "text-xs"} ${
              isPending
                ? "bg-debt/10 text-debt"
                : "bg-settled/10 text-settled"
            }`}
          >
            {isPending ? <CircleAlert className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
            {isPending ? t.pending : (t.paid ?? "Paid")}
          </span>
          {hasSharedParking && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <Link2 className="h-2.5 w-2.5" />
              {t.sharedParking ?? "Shared"}
            </span>
          )}
        </div>
        {/* Row 2: car name + trip # | price + chevron */}
        <div className="flex items-center justify-between gap-2">
          <p className={`min-w-0 font-semibold text-foreground ${compact ? "text-sm" : ""}`}>
            {entry.carName}
            {plateLabel && (
              <span className={`font-normal text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>{plateLabel}</span>
            )}
            <span className={`ml-1.5 font-medium text-primary ${compact ? "text-[10px]" : "text-xs"}`}>
              {t.tripNumber} #{entry.tripNumber}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`font-bold ${isPending ? "text-debt" : "text-settled"} ${compact ? "text-base" : "text-lg"}`}>
              &#3647;{entry.share.toFixed(2)}
            </span>
            {isExpanded ? (
              <ChevronUp className={`text-muted-foreground ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
            ) : (
              <ChevronDown className={`text-muted-foreground ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className={`animate-fade-in rounded-xl bg-accent/50 ${compact ? "mt-2 space-y-1.5 p-2" : "mt-3 space-y-2 p-3"}`}>
          {/* People */}
          <div className={`flex items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            <Users className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            <span className="font-medium">{entry.headcount} {t.people}</span>
          </div>
          <div className={`ml-6 space-y-0.5 text-muted-foreground ${compact ? "text-[11px]" : "text-xs"}`}>
            {allNames.map((n, i) => (
              <span key={i}>
                {n === entry.driverName ? `${n} (${t.driver ?? "Driver"})` : n}
                {i < allNames.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>

          {/* Cost breakdown */}
          <div className={`space-y-1.5 border-t border-border/50 ${compact ? "mt-1.5 pt-1.5" : "mt-2 pt-2"}`}>
            {entry.gasShare > 0 && (
              <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
                <Fuel className={`text-primary ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                <span className="text-muted-foreground">{t.gas}</span>
                <span className="ml-auto font-mono text-foreground">
                  &#3647;{entry.gasCost.toFixed(2)} / {entry.headcount} = <strong>&#3647;{entry.gasShare.toFixed(2)}</strong>
                </span>
              </div>
            )}
            {(entry.parkingShare > 0 || hasSharedParking) && (
              <>
                <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
                  <ParkingCircle className={`text-primary ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                  <span className="text-muted-foreground">{t.parking}</span>
                  {hasSharedParking ? (
                    <span className="ml-auto font-mono text-foreground">
                      &#3647;{sp!.totalParking.toFixed(2)} / {sp!.parkingHeadcount} = <strong>&#3647;{entry.parkingShare.toFixed(2)}</strong>
                    </span>
                  ) : (
                    <span className="ml-auto font-mono text-foreground">
                      &#3647;{entry.parkingCost.toFixed(2)} / {entry.parkingHeadcount ?? entry.headcount} = <strong>&#3647;{entry.parkingShare.toFixed(2)}</strong>
                    </span>
                  )}
                </div>
                {hasSharedParking && (
                  <div className={`ml-6 space-y-1 rounded-lg bg-primary/5 ${compact ? "p-1.5" : "p-2"}`}>
                    <div className={`flex items-center gap-1.5 font-medium text-primary ${compact ? "text-[10px]" : "text-xs"}`}>
                      <Link2 className="h-3 w-3" />
                      {t.sharedParkingAcross ?? "Shared parking across"} {sp!.trips.length} {t.tripNumber?.toLowerCase() ?? "trips"}
                    </div>
                    {sp!.trips.map((detail, i) => (
                      <div key={i} className={`flex items-center justify-between text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
                        <span>{detail.carName} · {detail.date}</span>
                        <span className="font-mono">&#3647;{detail.parkingCost.toFixed(2)} · {detail.headcount} {t.people}</span>
                      </div>
                    ))}
                    {sp!.uniqueNames.length > 0 && (
                      <div className={`mt-1 border-t border-border/30 pt-1 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
                        <span className="font-medium text-foreground">
                          {sp!.uniqueNames.length} {t.uniquePeople ?? "unique people"}:
                        </span>{" "}
                        {sp!.uniqueNames.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Total */}
          <div className={`border-t border-border/50 ${compact ? "pt-1.5" : "pt-2"}`}>
            <div className={`flex items-center justify-between font-bold ${compact ? "text-xs" : "text-sm"}`}>
              <span className="text-foreground">{t.total}</span>
              {entry.paidAmount != null && entry.paidAmount > 0 ? (
                <span className="font-mono text-foreground">
                  <span className="line-through text-muted-foreground font-normal">&#3647;{(entry.share + entry.paidAmount).toFixed(2)}</span>
                  {" "}-&#3647;{entry.paidAmount.toFixed(2)} = <strong>&#3647;{entry.share.toFixed(2)}</strong>
                </span>
              ) : (
                <span className="font-mono text-foreground">&#3647;{entry.share.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
