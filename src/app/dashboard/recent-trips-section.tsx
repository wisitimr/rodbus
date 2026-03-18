"use client";

import { useState } from "react";
import { Bus, Crown, Fuel, ParkingCircle, CircleCheck, CircleAlert, Link2, Users, X } from "lucide-react";

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
  passengers: { id: string; name: string }[];
  driverName: string;
  sharedParking?: {
    trips: { carName: string; date: string; parkingCost: number; headcount: number; tripNumber: number }[];
    uniqueNames: string[];
    totalParking: number;
    parkingHeadcount: number;
  } | null;
  paymentStatus: "paid" | "pending" | "no_passengers";
}

interface RecentTripsSectionProps {
  recentTrips: RecentTrip[];
  t: {
    people: string;
    tripNumber: string;
    paid: string;
    pending: string;
    noPassengers: string;
    total: string;
    gas: string;
    parking: string;
    driver: string;
    sharedParkingAcross?: string;
    uniquePeople?: string;
  };
}

export default function RecentTripsSection({ recentTrips, t }: RecentTripsSectionProps) {
  const [detailTrip, setDetailTrip] = useState<RecentTrip | null>(null);

  return (
    <>
      <div className="mt-2 space-y-2">
        {recentTrips.map((trip) => (
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
                  {trip.riderCount} {t.people} &middot; ฿{(trip.gasCost + trip.parkingCost).toFixed(2)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {trip.date} &middot; {trip.time}
                </p>
                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <span className="text-xs font-medium text-primary">
                    {t.tripNumber} #{trip.tripNumber}
                  </span>
                  {trip.paymentStatus === "no_passengers" ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                      {t.noPassengers}
                    </span>
                  ) : trip.paymentStatus === "paid" ? (
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
        ))}
      </div>

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
                {detailTrip.driverName} ({t.driver})
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
                <span className="text-foreground">{t.total}</span>
                <span className="font-mono text-foreground">&#3647;{(detailTrip.gasCost + detailTrip.parkingCost).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
