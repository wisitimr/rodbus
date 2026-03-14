"use client";

import { Bus, Clock } from "lucide-react";
import { useT } from "@/lib/i18n-context";

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
}

export default function RecentTripsSection({ recentTrips }: { recentTrips: RecentTrip[] }) {
  const { t } = useT();

  return (
    <div className="mt-2 space-y-2">
      {recentTrips.map((trip) => (
        <div
          key={trip.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 animate-fade-in"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bus className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {trip.carName}
              {trip.licensePlate && <span className="ml-1 font-normal text-muted-foreground">({trip.licensePlate})</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {trip.date} &middot; {trip.riderCount} {t.people}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {trip.time}
            </div>
            <p className="text-xs font-medium text-primary">
              {t.tripNumber} #{trip.tripNumber}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
