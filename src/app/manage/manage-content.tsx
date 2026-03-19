"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet, Fuel, ParkingCircle, Car, CheckCircle2, ChevronDown, ChevronUp, Link2, Check, Loader2, Bus, Pencil, Trash2, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { markAsSettled } from "@/lib/admin-actions";
import { updateTrip, deleteTrip } from "@/lib/trip-actions";
import { useT } from "@/lib/i18n-context";
import TripBreakdownCard from "@/components/trip-breakdown-card";
import ConfirmModal from "@/components/confirm-modal";

type Tab = "trips" | "settleDebts";

interface BreakdownItem {
  tripId: string;
  carName: string;
  licensePlate: string | null;
  date: string;
  dateISO: string;
  share: number;
  gasShare: number;
  gasCost: number;
  parkingShare: number;
  parkingCost: number;
  totalCost: number;
  headcount: number;
  parkingHeadcount: number;
  tripNumber: number;
  passengers: { id: string; name: string }[];
  driver: { id: string; name: string };
  paidAmount?: number;
  sharedParking?: {
    trips: { carName: string; date: string; parkingCost: number; headcount: number; tripNumber: number }[];
    uniqueNames: string[];
    totalParking: number;
    parkingHeadcount: number;
  } | null;
}

interface DebtEntry {
  userId: string;
  userName: string | null;
  userImage: string | null;
  pendingDebt: number;
  totalDebt: number;
  totalPaid: number;
  breakdown: BreakdownItem[];
}

interface RecentTrip {
  id: string;
  carName: string;
  licensePlate: string | null;
  date: string;
  gasCost: number;
  parkingCost: number;
  headcount: number;
  tripNumber: number;
}

interface TripListItem {
  id: string;
  carId: string;
  carName: string;
  licensePlate: string | null;
  date: string;
  gasCost: number;
  parkingCost: number;
  headcount: number;
  tripNumber: number;
  sharedParkingTripIds: string[];
}

interface ManageContentProps {
  cars: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }[];
  debts: DebtEntry[];
  carId: string;
  locale: string;
  recentTrips: RecentTrip[];
  allTrips: TripListItem[];
  partyGroupId: string;
}

const VISIBLE_TRIPS = 2;

export default function ManageContent({ cars, debts, carId, locale, recentTrips, allTrips, partyGroupId }: ManageContentProps) {
  const { t } = useT();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("trips");

  // --- New Trip form state ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState(cars[0]?.id ?? "");
  const car = cars.find((c) => c.id === selectedCarId);
  const [gasCost, setGasCost] = useState(() => car?.defaultGasCost ? car.defaultGasCost.toString() : "");
  const [parkingCost, setParkingCost] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "error">("idle");
  const [pendingNewTripId, setPendingNewTripId] = useState<string | null>(null);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>(
    recentTrips.length > 0 ? [recentTrips[0].id] : []
  );
  const [tripsExpanded, setTripsExpanded] = useState(false);

  // Once new trip arrives in props: hide form, clear loading
  const pendingArrived = !!pendingNewTripId && allTrips.some((t) => t.id === pendingNewTripId);
  useEffect(() => {
    if (pendingArrived) {
      setPendingNewTripId(null);
      setFormStatus("idle");
      setShowAddForm(false);
      setGasCost(car?.defaultGasCost ? car.defaultGasCost.toString() : "");
      setParkingCost("");
      setSelectedTripIds(recentTrips.length > 0 ? [recentTrips[0].id] : []);
    }
  }, [pendingArrived]);

  // Sync selectedTripIds when recentTrips changes (e.g. after trip deletion)
  useEffect(() => {
    setSelectedTripIds((prev) => {
      const validIds = prev.filter((id) => recentTrips.some((t) => t.id === id));
      if (validIds.length > 0) return validIds;
      return recentTrips.length > 0 ? [recentTrips[0].id] : [];
    });
  }, [recentTrips]);

  // Derived: still creating while API call in progress OR waiting for new trip data
  const isCreating = formStatus === "saving" || (!!pendingNewTripId && !pendingArrived);

  // --- Trip list state ---
  const [expandedQrId, setExpandedQrId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // --- Trip list swipe state ---
  const [swipedTripId, setSwipedTripId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeOffsetRef = useRef<number>(0);
  const swipeCardRef = useRef<HTMLDivElement | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [confirmDeleteTripItem, setConfirmDeleteTripItem] = useState<TripListItem | null>(null);

  // Clear deletingTripId when trip is removed from list
  useEffect(() => {
    if (deletingTripId && !allTrips.some((t) => t.id === deletingTripId)) {
      setDeletingTripId(null);
    }
  }, [allTrips, deletingTripId]);

  // --- Trip list inline edit state ---
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editGasCost, setEditGasCost] = useState("");
  const [editParkingCost, setEditParkingCost] = useState("");
  const [editSharedParkingIds, setEditSharedParkingIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<"idle" | "saving">("idle");
  const [pendingEditTripId, setPendingEditTripId] = useState<string | null>(null);
  const prevTripsRef = useRef<TripListItem[]>(allTrips);
  const [, startEditTransition] = useTransition();

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
      setExpandedQrId(null);
    } else {
      cardEl.style.transform = "translateX(0)";
      setSwipedTripId(null);
    }
    swipeStartRef.current = null;
  }

  function closeSwipe() {
    setSwipedTripId(null);
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

  // Clear edit mode after revalidation delivers updated trip data
  useEffect(() => {
    if (pendingEditTripId) {
      const prev = prevTripsRef.current.find((t) => t.id === pendingEditTripId);
      const curr = allTrips.find((t) => t.id === pendingEditTripId);
      if (prev && curr && (prev.gasCost !== curr.gasCost || prev.parkingCost !== curr.parkingCost || JSON.stringify(prev.sharedParkingTripIds) !== JSON.stringify(curr.sharedParkingTripIds))) {
        setEditingTripId(null);
        setPendingEditTripId(null);
        setEditStatus("idle");
      }
    }
    prevTripsRef.current = allTrips;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTrips]);

  function handleTripEditStart(trip: TripListItem) {
    setEditingTripId(trip.id);
    setEditGasCost(trip.gasCost.toString());
    setEditParkingCost(trip.parkingCost ? trip.parkingCost.toString() : "");
    setEditSharedParkingIds(trip.sharedParkingTripIds);
    setEditStatus("idle");
    closeSwipe();
  }

  function handleTripEditCancel() {
    setEditingTripId(null);
  }

  function handleTripEditSave() {
    if (!editingTripId) return;
    setEditStatus("saving");
    startEditTransition(async () => {
      try {
        await updateTrip(editingTripId, {
          gasCost: parseFloat(editGasCost) || 0,
          parkingCost: parseFloat(editParkingCost) || 0,
          sharedParkingTripIds: editSharedParkingIds,
        });
        // Don't exit edit mode — wait for revalidation
        setPendingEditTripId(editingTripId);
      } catch {
        setEditStatus("idle");
      }
    });
  }

  async function handleTripDelete(trip: TripListItem) {
    closeSwipe();
    setDeletingTripId(trip.id);
    try {
      await deleteTrip(trip.id);
    } catch {
      setDeletingTripId(null);
    }
  }

  function handleCopy(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const toggleTripSelection = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault();
    setFormStatus("saving");
    const bkk = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const today = `${bkk.getFullYear()}-${String(bkk.getMonth() + 1).padStart(2, "0")}-${String(bkk.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: selectedCarId,
          date: today,
          gasCost: parseFloat(gasCost) || 0,
          parkingCost: parseFloat(parkingCost) || 0,
          sharedParkingTripIds: (parseFloat(parkingCost) || 0) > 0 ? selectedTripIds : [],
          partyGroupId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const newTrip = await res.json();
      setExpandedQrId(newTrip.id);
      setPendingNewTripId(newTrip.id);
      startEditTransition(() => { router.refresh(); });
    } catch {
      setFormStatus("error");
    }
  }

  const totalCost = (parseFloat(gasCost) || 0) + (parseFloat(parkingCost) || 0);

  // --- Settle Debts state ---
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [settlingTripIds, setSettlingTripIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);
  const [settleNote, setSettleNote] = useState("");
  const [selectedSettleTripIds, setSelectedSettleTripIds] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    setConfirmingUserId(null);
    setSettleNote("");
    setLoadingAction(null);
    setSettlingTripIds(new Set());
    setSelectedSettleTripIds(new Map());
  }, [debts]);

  function toggleSet(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function getPendingBreakdown(d: DebtEntry): BreakdownItem[] {
    const sorted = [...d.breakdown];
    let remaining = d.totalPaid;
    const pending: BreakdownItem[] = [];
    for (const entry of sorted) {
      if (remaining >= entry.share) {
        remaining = Math.round((remaining - entry.share) * 100) / 100;
      } else if (remaining > 0) {
        pending.push({
          ...entry,
          share: Math.round((entry.share - remaining) * 100) / 100,
          paidAmount: remaining,
        });
        remaining = 0;
      } else {
        pending.push(entry);
      }
    }
    pending.reverse();
    return pending;
  }

  function getSelectedTrips(userId: string, pendingBreakdown: BreakdownItem[]): Set<string> {
    return selectedSettleTripIds.get(userId) ?? new Set(pendingBreakdown.map((b) => b.tripId));
  }

  function toggleSettleTrip(userId: string, tripId: string, pendingBreakdown: BreakdownItem[]) {
    setSelectedSettleTripIds((prev) => {
      const next = new Map(prev);
      const current = next.get(userId) ?? new Set(pendingBreakdown.map((b) => b.tripId));
      const updated = new Set(current);
      if (updated.has(tripId)) updated.delete(tripId);
      else updated.add(tripId);
      next.set(userId, updated);
      return next;
    });
  }

  function toggleAllSettleTrips(userId: string, pendingBreakdown: BreakdownItem[]) {
    setSelectedSettleTripIds((prev) => {
      const next = new Map(prev);
      const current = next.get(userId) ?? new Set(pendingBreakdown.map((b) => b.tripId));
      const allSelected = current.size === pendingBreakdown.length;
      next.set(userId, allSelected ? new Set() : new Set(pendingBreakdown.map((b) => b.tripId)));
      return next;
    });
  }

  function handleSettle(userId: string, tripIds?: string[]) {
    setLoadingAction(`settle-${userId}`);
    if (tripIds) setSettlingTripIds(new Set(tripIds));
    startTransition(async () => {
      try {
        await markAsSettled(userId, carId, partyGroupId, settleNote.trim() || undefined, tripIds);
      } catch {
        setLoadingAction(null);
        setSettlingTripIds(new Set());
      }
    });
  }

  const usersWithDebt = debts.filter((d) => d.pendingDebt > 0);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "trips",
      label: t.trips,
      icon: <Bus className="h-4 w-4" />,
    },
    {
      key: "settleDebts",
      label: t.settleDebts,
      icon: <Wallet className="h-4 w-4" />,
    },
  ];

  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium";

  return (
    <div className="space-y-4">
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
          {/* Add New Trip button / Form */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              {t.addNewTrip}
            </button>
          ) : (
            <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm animate-fade-in">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t.newTrip}
              </h3>

              <form onSubmit={handleCreateTrip} className="space-y-3">
                {/* Car selection */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    <Car className="mr-1 inline h-3 w-3" /> {t.selectCar}
                  </label>
                  <select
                    value={selectedCarId}
                    onChange={(e) => {
                      setSelectedCarId(e.target.value);
                      const c = cars.find((c) => c.id === e.target.value);
                      setGasCost(c?.defaultGasCost ? c.defaultGasCost.toString() : "");
                      setParkingCost("");
                    }}
                    className={inputClass}
                  >
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.name}{car.licensePlate ? ` (${car.licensePlate})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gas & Parking */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      <Fuel className="mr-1 inline h-3 w-3" /> {t.gasCost} <span className="text-debt">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={gasCost}
                      onChange={(e) => setGasCost(e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      <ParkingCircle className="mr-1 inline h-3 w-3" /> {t.parkingCost} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={parkingCost}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParkingCost(val);
                        if ((parseFloat(val) || 0) > 0 && selectedTripIds.length === 0 && recentTrips.length > 0) {
                          setSelectedTripIds([recentTrips[0].id]);
                        }
                      }}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Share Parking with Previous Trips */}
                {(parseFloat(parkingCost) || 0) > 0 && recentTrips.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {t.shareParkingWithTrips}
                      </span>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-border bg-accent/30 p-2.5">
                      {(tripsExpanded ? recentTrips : recentTrips.slice(0, VISIBLE_TRIPS)).map((trip) => {
                        const isSelected = selectedTripIds.includes(trip.id);
                        return (
                          <button
                            key={trip.id}
                            type="button"
                            onClick={() => toggleTripSelection(trip.id)}
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
                                <span className="font-medium text-foreground truncate">{trip.carName}</span>
                                <span className="text-[10px] font-medium text-primary whitespace-nowrap">
                                  {t.tripNumber} #{trip.tripNumber}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {trip.date}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {trip.headcount} {t.people} · {t.gas} ฿{trip.gasCost.toFixed(2)}
                                {trip.parkingCost > 0 && ` · ${t.parking} ฿${trip.parkingCost.toFixed(2)}`}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {recentTrips.length > VISIBLE_TRIPS && (
                        <button
                          type="button"
                          onClick={() => setTripsExpanded(!tripsExpanded)}
                          className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {tripsExpanded ? t.showLessTrips : `+${recentTrips.length - VISIBLE_TRIPS} ${t.moreTrips}`}
                          <ChevronDown className={`h-3 w-3 transition-transform ${tripsExpanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Total */}
                {totalCost > 0 && (
                  <div className="rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
                    {t.total}: <strong className="text-foreground">฿{totalCost.toFixed(2)}</strong>
                  </div>
                )}

                {/* Buttons: Create + Cancel */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formStatus === "saving"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {formStatus === "saving" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t.creating}</>
                    ) : (
                      <><Plus className="h-4 w-4" /> {t.create}</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={formStatus === "saving"}
                    className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-50"
                  >
                    {t.cancel}
                  </button>
                </div>
                {formStatus === "error" && (
                  <p className="text-sm font-medium text-debt">{t.failedToSave}</p>
                )}
              </form>
            </div>
          )}

          {/* Trip list with accordion QR */}
          {allTrips.length > 0 && (
            <div className="space-y-2">
              {allTrips.slice(0, visibleCount).map((trip) => {
                const tapUrl = `${baseUrl}/api/tap?tripId=${trip.id}`;
                const isQrOpen = expandedQrId === trip.id;
                const isSwiped = swipedTripId === trip.id;
                const isDeleting = deletingTripId === trip.id;
                const isEditing = editingTripId === trip.id;
                const isTripLoading = isEditing && editStatus === "saving";
                const tripTotal = trip.gasCost + trip.parkingCost;

                return (
                  <div
                    key={trip.id}
                    data-swipe-id={trip.id}
                    className={`relative overflow-hidden rounded-2xl bg-secondary animate-fade-in transition-opacity ${isDeleting || isTripLoading ? "animate-pulse opacity-50 pointer-events-none" : ""}`}
                  >
                    {/* Action buttons behind the card */}
                    <div className="absolute inset-y-0 right-0 flex w-[92px] items-center justify-evenly">
                      <button
                        onClick={() => handleTripEditStart(trip)}
                        className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTripItem(trip)}
                        className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Sliding card */}
                    <div
                      ref={(el) => { if (isSwiped || swipeStartRef.current) swipeCardRef.current = el; }}
                      className="relative rounded-2xl border border-border bg-card shadow-sm"
                      style={{
                        transform: isSwiped ? `translateX(-${ACTION_WIDTH}px)` : "translateX(0)",
                        transition: "transform 0.2s ease-out",
                      }}
                      onTouchStart={!isEditing ? (e) => handleSwipeTouchStart(e, trip.id) : undefined}
                      onTouchMove={!isEditing ? (e) => {
                        const cardEl = e.currentTarget as HTMLDivElement;
                        handleSwipeTouchMove(e, trip.id, cardEl);
                      } : undefined}
                      onTouchEnd={!isEditing ? (e) => {
                        const cardEl = e.currentTarget as HTMLDivElement;
                        handleSwipeTouchEnd(e, trip.id, cardEl);
                      } : undefined}
                    >
                      {isEditing ? (
                        /* Inline edit form */
                        <div className="p-4 space-y-3 animate-fade-in">
                          <h3 className="text-sm font-semibold text-foreground">
                            {t.editTrip}
                          </h3>
                          <form onSubmit={(e) => { e.preventDefault(); handleTripEditSave(); }} className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                <Bus className="mr-1 inline h-3 w-3" /> {t.car}
                              </label>
                              <div className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground">
                                {trip.carName}
                                {trip.licensePlate && ` (${trip.licensePlate})`}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                  <Fuel className="mr-1 inline h-3 w-3" /> {t.gasCost} <span className="text-debt">*</span>
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={editGasCost}
                                  onChange={(e) => setEditGasCost(e.target.value)}
                                  placeholder="0"
                                  className={inputClass}
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                  <ParkingCircle className="mr-1 inline h-3 w-3" /> {t.parkingCost} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editParkingCost}
                                  onChange={(e) => setEditParkingCost(e.target.value)}
                                  placeholder="0"
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            {/* Share Parking with Other Trips */}
                            {(parseFloat(editParkingCost) || 0) > 0 && (() => {
                              const otherTrips = allTrips.filter((tr) => tr.id !== trip.id);
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
                                              {tr.headcount} {t.people} · {t.gas} ฿{tr.gasCost.toFixed(2)}
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

                            {((parseFloat(editGasCost) || 0) + (parseFloat(editParkingCost) || 0)) > 0 && (
                              <div className="rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
                                {t.total}: <strong className="text-foreground">฿{((parseFloat(editGasCost) || 0) + (parseFloat(editParkingCost) || 0)).toFixed(2)}</strong>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={editStatus === "saving" || ((parseFloat(editGasCost) || 0) === trip.gasCost && (parseFloat(editParkingCost) || 0) === trip.parkingCost && JSON.stringify(editSharedParkingIds) === JSON.stringify(trip.sharedParkingTripIds))}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                                {t.save}
                                {editStatus === "saving" && "..."}
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
                      ) : (
                        /* Trip header — clickable to toggle QR */
                        <button
                          type="button"
                          onClick={() => { if (!swipedTripId) setExpandedQrId(isQrOpen ? null : trip.id); }}
                          className="flex w-full items-center gap-3 p-4 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Bus className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate">{trip.carName}</span>
                              {trip.licensePlate && <span className="text-xs font-normal text-muted-foreground">({trip.licensePlate})</span>}
                              <span className="text-[10px] font-medium text-primary whitespace-nowrap">
                                {t.tripNumber} #{trip.tripNumber}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {trip.date} · {trip.headcount} {t.people} · ฿{tripTotal.toFixed(2)}
                            </div>
                          </div>
                          {isQrOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      )}

                      {/* QR Code content */}
                      {isQrOpen && !isEditing && (
                        <div className="px-4 pb-5 text-center animate-fade-in">
                          <div className="mx-auto rounded-xl border-2 border-dashed border-border bg-muted p-4">
                            <QRCodeSVG
                              value={tapUrl}
                              size={200}
                              level="H"
                              className="mx-auto h-auto w-full max-w-[200px]"
                            />
                          </div>

                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                            <code className="text-xs text-muted-foreground select-all break-all">
                              {tapUrl}
                            </code>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopy(tapUrl, trip.id); }}
                              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              {copiedId === trip.id ? (
                                <Check className="h-3.5 w-3.5 text-settled" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Load More / Show Less */}
              {allTrips.length > 5 && (
                <div className="flex justify-center gap-4 pt-2">
                  {visibleCount < allTrips.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((v) => v + 5)}
                      className="flex items-center gap-1 text-sm font-medium text-primary"
                    >
                      {t.loadMore}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}
                  {visibleCount > 5 && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(5)}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
                    >
                      {t.showLess}
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteTripItem}
        title={t.confirmDeleteAction}
        message={t.confirmDeleteTrip}
        confirmLabel={t.confirmDeleteAction}
        cancelLabel={t.cancel}
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteTripItem) handleTripDelete(confirmDeleteTripItem);
          setConfirmDeleteTripItem(null);
        }}
        onCancel={() => setConfirmDeleteTripItem(null)}
      />

      {/* Settle Debts tab */}
      {activeTab === "settleDebts" && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t.pendingDebtsByUser}
          </h3>

          {usersWithDebt.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.allBalancesCleared}</p>
          ) : (
            <div className="space-y-2">
              {usersWithDebt.map((d) => {
                const isUserExpanded = expandedUsers.has(d.userId);
                const pendingBreakdown = getPendingBreakdown(d);
                const isConfirming = confirmingUserId === d.userId;
                const isSettleLoading = isPending && loadingAction === `settle-${d.userId}`;
                const initial = (d.userName ?? "?")[0].toUpperCase();

                return (
                  <div key={d.userId} className="rounded-2xl border border-border bg-card p-4 shadow-sm animate-fade-in transition-opacity">
                    {/* User header */}
                    <button
                      type="button"
                      onClick={() => setExpandedUsers((prev) => toggleSet(prev, d.userId))}
                      className="flex w-full items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-debt/10 text-sm font-bold text-debt">
                          {d.userImage ? (
                            <img src={d.userImage} alt={d.userName ?? ""} className="h-full w-full object-cover" />
                          ) : (
                            initial
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{d.userName ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{pendingBreakdown.length} {t.pendingItems}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-debt">฿{d.pendingDebt.toFixed(2)}</span>
                        {isUserExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded: breakdown entries */}
                    {isUserExpanded && (() => {
                      const selected = getSelectedTrips(d.userId, pendingBreakdown);
                      const allSelected = selected.size === pendingBreakdown.length;
                      const selectedAmount = pendingBreakdown
                        .filter((b) => selected.has(b.tripId))
                        .reduce((sum, b) => sum + b.share, 0);

                      return (
                      <div className="mt-3 space-y-2 animate-fade-in">
                        {pendingBreakdown.length > 1 && (
                          <button
                            type="button"
                            disabled={isSettleLoading}
                            onClick={() => toggleAllSettleTrips(d.userId, pendingBreakdown)}
                            className="flex items-center gap-3 py-1 pl-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              allSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                            }`}>
                              {allSelected && <Check className="h-3 w-3" />}
                            </div>
                            {t.selectAll}
                          </button>
                        )}

                        {pendingBreakdown.map((b, i) => {
                          const entryKey = `${d.userId}_${b.dateISO ?? b.date}_${i}`;
                          const isEntryExpanded = expandedEntries.has(entryKey);
                          const isChecked = selected.has(b.tripId);
                          const isTripSettling = isSettleLoading && settlingTripIds.has(b.tripId);
                          const dateLabel = b.dateISO
                            ? new Date(b.dateISO + "T00:00:00").toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })
                            : b.date;

                          return (
                            <div key={entryKey} className={`transition-opacity ${isTripSettling ? "animate-pulse opacity-50 pointer-events-none" : ""}`}>
                                <TripBreakdownCard
                                  leading={pendingBreakdown.length > 1 ? (
                                    <button
                                      type="button"
                                      disabled={isSettleLoading}
                                      onClick={(e) => { e.stopPropagation(); toggleSettleTrip(d.userId, b.tripId, pendingBreakdown); }}
                                      className="shrink-0 disabled:opacity-50"
                                    >
                                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                        isChecked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                                      }`}>
                                        {isChecked && <Check className="h-3 w-3" />}
                                      </div>
                                    </button>
                                  ) : undefined}
                                  entry={{
                                    date: dateLabel,
                                    carName: b.carName,
                                    licensePlate: b.licensePlate,
                                    share: b.share,
                                    gasShare: b.gasShare,
                                    gasCost: b.gasCost,
                                    parkingShare: b.parkingShare,
                                    parkingCost: b.parkingCost,
                                    totalCost: b.totalCost,
                                    headcount: b.headcount,
                                    parkingHeadcount: b.parkingHeadcount,
                                    tripNumber: b.tripNumber,
                                    passengers: b.passengers,
                                    driver: b.driver,
                                    sharedParking: b.sharedParking ?? null,
                                    paidAmount: b.paidAmount,
                                  }}
                                  isExpanded={isEntryExpanded}
                                  onToggle={() => setExpandedEntries((prev) => toggleSet(prev, entryKey))}
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
                            </div>
                          );
                        })}

                        {/* Mark as Settled / Confirm */}
                        {!isConfirming ? (
                          <button
                            type="button"
                            onClick={() => { setConfirmingUserId(d.userId); setSettleNote(""); }}
                            disabled={selected.size === 0}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-settled px-4 py-3 text-sm font-semibold text-white transition hover:bg-settled/90 active:scale-[0.98] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {t.markAsSettled} {selected.size < pendingBreakdown.length ? `(${selected.size}/${pendingBreakdown.length})` : ""} ฿{Math.round(selectedAmount * 100 / 100).toFixed(2)}
                          </button>
                        ) : (
                          <div className="rounded-xl border-2 border-settled bg-settled/5 p-3 animate-fade-in">
                            <p className="mb-3 text-center text-sm font-medium text-foreground">
                              {t.confirmSettlement} ฿{selectedAmount.toFixed(2)} {t.confirmSettlementFor} {d.userName}?
                            </p>
                            <div className="mb-3 text-left">
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                {t.settlementNote} ({t.optional})
                              </label>
                              <input
                                type="text"
                                value={settleNote}
                                onChange={(e) => setSettleNote(e.target.value)}
                                maxLength={30}
                                placeholder={t.settlementNotePlaceholder}
                                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setConfirmingUserId(null)}
                                className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
                              >
                                {t.cancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSettle(d.userId, Array.from(selected))}
                                disabled={isSettleLoading}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-settled px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-settled/90 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {t.confirm}{isSettleLoading && "..."}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
