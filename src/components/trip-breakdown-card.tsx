"use client";

import { ChevronDown, ChevronUp, Users, Fuel, ParkingCircle } from "lucide-react";

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
  sharedParkingTripIds?: string[];
  sharedParkingNames?: string[];
}

interface TripBreakdownCardProps {
  entry: BreakdownCardEntry;
  isExpanded: boolean;
  onToggle: () => void;
  status?: "pending" | "paid";
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
  };
}

export default function TripBreakdownCard({
  entry,
  isExpanded,
  onToggle,
  status = "pending",
  t,
}: TripBreakdownCardProps) {
  const plateLabel = entry.licensePlate ? ` (${entry.licensePlate})` : "";
  const isPending = status === "pending";

  // Build display list: passengers + driver
  const allNames = [...entry.passengerNames];
  if (entry.driverName && !allNames.includes(entry.driverName)) {
    allNames.push(entry.driverName);
  }
  const nameList = allNames
    .map((n) => (n === entry.driverName ? `${n} (${t.driver ?? "Driver"})` : n))
    .join(", ");

  return (
    <div className="animate-fade-in rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {entry.date}{entry.time ? ` · ${entry.time}` : ""}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                isPending
                  ? "bg-debt/10 text-debt"
                  : "bg-settled/10 text-settled"
              }`}
            >
              {isPending ? t.pending : (t.paid ?? "Paid")}
            </span>
          </div>
          <p className="mt-0.5 font-semibold text-foreground">
            {entry.carName}
            {plateLabel && (
              <span className="text-sm font-normal text-muted-foreground">{plateLabel}</span>
            )}
            <span className="ml-1.5 text-xs font-medium text-primary">
              {t.tripNumber} #{entry.tripNumber}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${isPending ? "text-debt" : "text-settled"}`}>
            &#3647;{entry.share.toFixed(2)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 animate-fade-in space-y-2 rounded-xl bg-accent/50 p-3">
          {/* People */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-medium">{entry.headcount} {t.people}</span>
          </div>
          <div className="ml-6 space-y-0.5 text-xs text-muted-foreground">
            {allNames.map((n, i) => (
              <span key={i}>
                {n === entry.driverName ? `${n} (${t.driver ?? "Driver"})` : n}
                {i < allNames.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>

          {/* Cost breakdown */}
          <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
            {entry.gasShare > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Fuel className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t.gas}</span>
                <span className="ml-auto font-mono text-foreground">
                  &#3647;{entry.gasCost.toFixed(2)} / {entry.headcount} = <strong>&#3647;{entry.gasShare.toFixed(2)}</strong>
                </span>
              </div>
            )}
            {entry.parkingShare > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <ParkingCircle className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    {t.parking}
                    {(entry.sharedParkingTripIds?.length ?? 0) > 0 && entry.parkingHeadcount && entry.parkingHeadcount !== entry.headcount && (
                      <span className="ml-1 text-xs text-primary">({t.sharedParking ?? "Shared"})</span>
                    )}
                  </span>
                  <span className="ml-auto font-mono text-foreground">
                    &#3647;{entry.parkingCost.toFixed(2)} / {entry.parkingHeadcount ?? entry.headcount} = <strong>&#3647;{entry.parkingShare.toFixed(2)}</strong>
                  </span>
                </div>
                {(entry.sharedParkingTripIds?.length ?? 0) > 0 && entry.sharedParkingNames && entry.sharedParkingNames.length > 0 && (
                  <div className="ml-6 text-xs text-muted-foreground">
                    {entry.sharedParkingNames.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-border/50 pt-2">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">{t.total}</span>
              <span className="font-mono text-foreground">
                &#3647;{entry.share.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
