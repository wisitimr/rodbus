"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bus, Pencil, Trash2, Fuel, ParkingCircle, Loader2, CircleCheck, CircleAlert } from "lucide-react";
import { updateTrip, deleteTrip } from "@/lib/trip-actions";

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
  isOwner: boolean;
  paymentStatus: "paid" | "pending";
}

interface RecentTripsSectionProps {
  recentTrips: RecentTrip[];
  t: {
    people: string;
    tripNumber: string;
    paid: string;
    pending: string;
    editTrip: string;
    edit: string;
    editing: string;
    cancel: string;
    car: string;
    gasCost: string;
    parkingCost: string;
    total: string;
    confirmDeleteTrip: string;
  };
}

export default function RecentTripsSection({ recentTrips, t }: RecentTripsSectionProps) {
  const [, startTransition] = useTransition();

  // Swipe state
  const [swipedTripId, setSwipedTripId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeOffsetRef = useRef<number>(0);
  const swipeCardRef = useRef<HTMLDivElement | null>(null);

  // Edit modal state
  const [editModalTrip, setEditModalTrip] = useState<RecentTrip | null>(null);
  const [editGasCost, setEditGasCost] = useState("");
  const [editParkingCost, setEditParkingCost] = useState("");
  const [editStatus, setEditStatus] = useState<"idle" | "saving">("idle");

  const SWIPE_THRESHOLD = 40;
  const ACTION_WIDTH = 92;

  function handleSwipeTouchStart(e: React.TouchEvent, tripId: string) {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeOffsetRef.current = swipedTripId === tripId ? -ACTION_WIDTH : 0;
  }

  function handleSwipeTouchMove(e: React.TouchEvent, tripId: string, cardEl: HTMLDivElement | null) {
    if (!swipeStartRef.current || !cardEl) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = e.touches[0].clientY - swipeStartRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) return;
    const offset = Math.min(0, Math.max(-ACTION_WIDTH, swipeOffsetRef.current + dx));
    cardEl.style.transition = "none";
    cardEl.style.transform = `translateX(${offset}px)`;
  }

  function handleSwipeTouchEnd(e: React.TouchEvent, tripId: string, cardEl: HTMLDivElement | null) {
    if (!swipeStartRef.current || !cardEl) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const finalOffset = swipeOffsetRef.current + dx;
    cardEl.style.transition = "transform 0.2s ease-out";
    if (finalOffset < -SWIPE_THRESHOLD) {
      cardEl.style.transform = `translateX(-${ACTION_WIDTH}px)`;
      setSwipedTripId(tripId);
    } else {
      cardEl.style.transform = "translateX(0)";
      setSwipedTripId(null);
    }
    swipeStartRef.current = null;
  }

  function closeSwipe() {
    setSwipedTripId(null);
  }

  function handleTripEditStart(trip: RecentTrip) {
    setEditModalTrip(trip);
    setEditGasCost(trip.gasCost.toString());
    setEditParkingCost(trip.parkingCost.toString());
    setEditStatus("idle");
    closeSwipe();
  }

  function handleTripEditCancel() {
    setEditModalTrip(null);
  }

  function handleTripEditSave() {
    if (!editModalTrip) return;
    setEditStatus("saving");
    startTransition(async () => {
      try {
        await updateTrip(editModalTrip.id, {
          gasCost: parseFloat(editGasCost) || 0,
          parkingCost: parseFloat(editParkingCost) || 0,
        });
        setEditModalTrip(null);
      } catch { /* ignore */ }
      setEditStatus("idle");
    });
  }

  function handleTripDelete(trip: RecentTrip) {
    if (!confirm(t.confirmDeleteTrip)) return;
    closeSwipe();
    startTransition(async () => {
      try {
        await deleteTrip(trip.id);
      } catch { /* ignore */ }
    });
  }

  // Close swipe when tapping outside
  useEffect(() => {
    if (!swipedTripId) return;
    function handleTap(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-swipe-id="${swipedTripId}"]`)) {
        setSwipedTripId(null);
      }
    }
    document.addEventListener("touchstart", handleTap);
    return () => document.removeEventListener("touchstart", handleTap);
  }, [swipedTripId]);

  return (
    <>
      <div className="mt-2 space-y-2">
        {recentTrips.map((trip) => {
          const isSwiped = swipedTripId === trip.id;
          return (
            <div
              key={trip.id}
              data-swipe-id={trip.id}
              className="relative overflow-hidden rounded-xl bg-secondary animate-fade-in"
            >
              {/* Action buttons behind the card */}
              {trip.isOwner && (
                <div className="absolute inset-y-0 right-0 flex w-[92px] items-center justify-evenly">
                  <button
                    onClick={() => handleTripEditStart(trip)}
                    className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTripDelete(trip)}
                    className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Sliding card */}
              <div
                ref={(el) => { if (isSwiped || swipeStartRef.current) swipeCardRef.current = el; }}
                className="relative rounded-xl border border-border bg-card p-3"
                style={{
                  transform: isSwiped ? `translateX(-${ACTION_WIDTH}px)` : "translateX(0)",
                  transition: "transform 0.2s ease-out",
                }}
                onTouchStart={trip.isOwner ? (e) => handleSwipeTouchStart(e, trip.id) : undefined}
                onTouchMove={trip.isOwner ? (e) => {
                  const cardEl = e.currentTarget as HTMLDivElement;
                  handleSwipeTouchMove(e, trip.id, cardEl);
                } : undefined}
                onTouchEnd={trip.isOwner ? (e) => {
                  const cardEl = e.currentTarget as HTMLDivElement;
                  handleSwipeTouchEnd(e, trip.id, cardEl);
                } : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {trip.carName}
                      {trip.licensePlate && <span className="ml-1 font-normal text-muted-foreground">({trip.licensePlate})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trip.riderCount} {t.people} &middot; ฿{(trip.gasCost + trip.parkingCost).toFixed(0)}
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
                      {trip.paymentStatus === "paid" ? (
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
            </div>
          );
        })}
      </div>

      {/* Edit Trip Modal */}
      {editModalTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleTripEditCancel(); }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-lg animate-scale-in">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t.editTrip}
            </h3>

            <form
              onSubmit={(e) => { e.preventDefault(); handleTripEditSave(); }}
              className="space-y-3"
            >
              {/* Car (read-only) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  <Bus className="mr-1 inline h-3 w-3" /> {t.car}
                </label>
                <div className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground">
                  {editModalTrip.carName}
                  {editModalTrip.licensePlate && ` (${editModalTrip.licensePlate})`}
                </div>
              </div>

              {/* Gas & Parking */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    <Fuel className="mr-1 inline h-3 w-3" /> {t.gasCost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editGasCost}
                    onChange={(e) => setEditGasCost(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    <ParkingCircle className="mr-1 inline h-3 w-3" /> {t.parkingCost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editParkingCost}
                    onChange={(e) => setEditParkingCost(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Total */}
              {((parseFloat(editGasCost) || 0) + (parseFloat(editParkingCost) || 0)) > 0 && (
                <div className="rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
                  {t.total}: <strong className="text-foreground">฿{((parseFloat(editGasCost) || 0) + (parseFloat(editParkingCost) || 0)).toFixed(2)}</strong>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editStatus === "saving"}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                >
                  {editStatus === "saving" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t.editing}</>
                  ) : (
                    <><Pencil className="h-4 w-4" /> {t.edit}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleTripEditCancel}
                  className="flex-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
