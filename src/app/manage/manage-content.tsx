"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet, Fuel, ParkingCircle, Car, CheckCircle2, ChevronDown, ChevronUp, Link2, Check, Loader2 } from "lucide-react";
import { markAsSettled } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";
import TripBreakdownCard from "@/components/trip-breakdown-card";

type Tab = "newTrip" | "settleDebts";

interface BreakdownItem {
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
  passengerNames: string[];
  driverName: string | null;
  paidAmount?: number;
  sharedParking?: {
    trips: { carName: string; date: string; parkingCost: number; headcount: number }[];
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

interface ManageContentProps {
  cars: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }[];
  debts: DebtEntry[];
  carId: string;
  locale: string;
  recentTrips: RecentTrip[];
  partyGroupId: string;
}

const VISIBLE_TRIPS = 2;

export default function ManageContent({ cars, debts, carId, locale, recentTrips, partyGroupId }: ManageContentProps) {
  const { t } = useT();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("newTrip");

  // --- New Trip form state ---
  const [selectedCarId, setSelectedCarId] = useState(cars[0]?.id ?? "");
  const car = cars.find((c) => c.id === selectedCarId);
  const [gasCost, setGasCost] = useState(() => car?.defaultGasCost ? car.defaultGasCost.toString() : "");
  const [parkingCost, setParkingCost] = useState("0");
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "error">("idle");
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>(
    recentTrips.length > 0 ? [recentTrips[0].id] : []
  );
  const [tripsExpanded, setTripsExpanded] = useState(false);

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
      setGasCost(car?.defaultGasCost ? car.defaultGasCost.toString() : "");
      setParkingCost("0");
      setFormStatus("idle");
      router.push("/dashboard");
    } catch {
      setFormStatus("error");
    }
  }

  const totalCost = (parseFloat(gasCost) || 0) + (parseFloat(parkingCost) || 0);

  // --- Settle Debts state ---
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);

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

  async function handleSettle(userId: string) {
    setLoadingAction(`settle-${userId}`);
    try {
      await markAsSettled(userId, carId, partyGroupId);
      setConfirmingUserId(null);
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  const usersWithDebt = debts.filter((d) => d.pendingDebt > 0);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "newTrip",
      label: t.newTrip,
      icon: <Plus className="h-4 w-4" />,
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

      {/* New Trip tab */}
      {activeTab === "newTrip" && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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
                    setParkingCost("0");
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
                    <Fuel className="mr-1 inline h-3 w-3" /> {t.gasCost}
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
                    <ParkingCircle className="mr-1 inline h-3 w-3" /> {t.parkingCost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={parkingCost}
                    onChange={(e) => setParkingCost(e.target.value)}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={formStatus === "saving"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {formStatus === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> {t.create}
                  </>
                )}
              </button>
              {formStatus === "error" && (
                <p className="text-sm font-medium text-debt">{t.failedToSave}</p>
              )}
            </form>
        </div>
      )}

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
                const isSettleLoading = loadingAction === `settle-${d.userId}`;
                const initial = (d.userName ?? "?")[0].toUpperCase();

                return (
                  <div key={d.userId} className={`rounded-2xl border border-border bg-card p-4 shadow-sm animate-fade-in transition-opacity ${isSettleLoading ? "animate-pulse opacity-50 pointer-events-none" : ""}`}>
                    {/* User header */}
                    <button
                      type="button"
                      onClick={() => setExpandedUsers((prev) => toggleSet(prev, d.userId))}
                      className="flex w-full items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
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
                    {isUserExpanded && (
                      <div className="mt-3 space-y-2 animate-fade-in">
                        {pendingBreakdown.map((b, i) => {
                          const entryKey = `${d.userId}_${b.dateISO ?? b.date}_${i}`;
                          const isEntryExpanded = expandedEntries.has(entryKey);
                          const dateLabel = b.dateISO
                            ? new Date(b.dateISO + "T00:00:00").toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })
                            : b.date;

                          return (
                            <TripBreakdownCard
                              key={entryKey}
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
                                passengerNames: b.passengerNames,
                                driverName: b.driverName,
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
                          );
                        })}

                        {/* Mark as Settled / Confirm */}
                        {!isConfirming ? (
                          <button
                            type="button"
                            onClick={() => setConfirmingUserId(d.userId)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-settled px-4 py-3 text-sm font-semibold text-white transition hover:bg-settled/90 active:scale-[0.98]"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {t.markAsSettled}
                          </button>
                        ) : (
                          <div className="rounded-xl border-2 border-settled bg-settled/5 p-3 text-center animate-fade-in">
                            <p className="mb-3 text-sm font-medium text-foreground">
                              {t.confirmSettlement} ฿{d.pendingDebt.toFixed(2)} {t.confirmSettlementFor} {d.userName}?
                            </p>
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
                                onClick={() => handleSettle(d.userId)}
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
                    )}
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
