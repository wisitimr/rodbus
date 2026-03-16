"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bus, Pencil, Trash2, Fuel, ParkingCircle, Loader2, CircleCheck, CircleAlert, Link2, Check } from "lucide-react";
import { updateTrip, deleteTrip } from "@/lib/trip-actions";
import ConfirmModal from "@/components/confirm-modal";

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
  ownerName: string | null;
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
    editTrip: string;
    edit: string;
    editing: string;
    cancel: string;
    car: string;
    gasCost: string;
    parkingCost: string;
    total: string;
    gas: string;
    parking: string;
    shareParkingWithTrips: string;
    confirmDeleteTrip: string;
    confirmDeleteAction: string;
  };
}

export default function RecentTripsSection({ recentTrips, t }: RecentTripsSectionProps) {
  const [, startTransition] = useTransition();

  // Swipe state
  const [swipedTripId, setSwipedTripId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeOffsetRef = useRef<number>(0);
  const swipeCardRef = useRef<HTMLDivElement | null>(null);

  // Delete loading state
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  // Edit modal state
  const [editModalTrip, setEditModalTrip] = useState<RecentTrip | null>(null);
  const [editGasCost, setEditGasCost] = useState("");
  const [editParkingCost, setEditParkingCost] = useState("");
  const [editSharedParkingIds, setEditSharedParkingIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<"idle" | "saving">("idle");
  const [confirmDeleteTrip, setConfirmDeleteTrip] = useState<RecentTrip | null>(null);

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
    setEditSharedParkingIds(trip.sharedParkingTripIds);
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
          sharedParkingTripIds: editSharedParkingIds,
        });
        setEditModalTrip(null);
      } catch { /* ignore */ }
      setEditStatus("idle");
    });
  }

  function handleTripDelete(trip: RecentTrip) {
    closeSwipe();
    setDeletingTripId(trip.id);
    startTransition(async () => {
      try {
        await deleteTrip(trip.id);
      } catch { /* ignore */ }
      setDeletingTripId(null);
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
          const isDeleting = deletingTripId === trip.id;
          return (
            <div
              key={trip.id}
              data-swipe-id={trip.id}
              className={`relative overflow-hidden rounded-xl bg-secondary animate-fade-in transition-opacity ${isDeleting ? "animate-pulse opacity-50 pointer-events-none" : ""}`}
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
                    onClick={() => setConfirmDeleteTrip(trip)}
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
                      {trip.ownerName && <>{trip.ownerName} &middot; </>}{trip.riderCount} {t.people} &middot; ฿{(trip.gasCost + trip.parkingCost).toFixed(2)}
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
            </div>
          );
        })}
      </div>

      {/* Edit Trip Modal */}
      {editModalTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleTripEditCancel(); }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-scale-in">
            {/* Header */}
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t.editTrip}
              </h3>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleTripEditSave(); }}
            >
              <div className="space-y-3 px-6 py-4">
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

              {/* Share Parking with Other Trips */}
              {(parseFloat(editParkingCost) || 0) > 0 && (() => {
                const otherTrips = recentTrips.filter((tr) => tr.id !== editModalTrip.id && tr.isOwner);
                if (otherTrips.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {t.shareParkingWithTrips}
                      </span>
                    </div>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-accent/30 p-2.5">
                      {otherTrips.map((tr) => {
                        const isSelected = editSharedParkingIds.includes(tr.id);
                        return (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => {
                              setEditSharedParkingIds((prev) =>
                                isSelected ? prev.filter((id) => id !== tr.id) : [...prev, tr.id]
                              );
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-foreground"
                                : "text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-background"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground truncate">{tr.carName}</span>
                                <span className="text-[10px] font-medium text-primary whitespace-nowrap">
                                  {t.tripNumber} #{tr.tripNumber}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {tr.date}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tr.riderCount} {t.people} · {t.gas} ฿{tr.gasCost.toFixed(2)}
                                {tr.parkingCost > 0 && ` · ${t.parking} ฿${tr.parkingCost.toFixed(2)}`}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Total */}
              {((parseFloat(editGasCost) || 0) + (parseFloat(editParkingCost) || 0)) > 0 && (
                <div className="rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
                  {t.total}: <strong className="text-foreground">฿{((parseFloat(editGasCost) || 0) + (parseFloat(editParkingCost) || 0)).toFixed(2)}</strong>
                </div>
              )}

              </div>

              {/* Footer */}
              <div className="flex gap-2 border-t border-border px-6 py-4">
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
                  className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-accent"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteTrip}
        title={t.confirmDeleteAction}
        message={t.confirmDeleteTrip}
        confirmLabel={t.confirmDeleteAction}
        cancelLabel={t.cancel}
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteTrip) handleTripDelete(confirmDeleteTrip);
          setConfirmDeleteTrip(null);
        }}
        onCancel={() => setConfirmDeleteTrip(null)}
      />
    </>
  );
}
