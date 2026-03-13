"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  tripNumber: number;
  passengerNames: string[];
  driverName: string | null;
}

interface DebtEntry {
  userId: string;
  userName: string | null;
  pendingDebt: number;
  totalDebt: number;
  totalPaid: number;
  breakdown: BreakdownItem[];
}

interface ManageContentProps {
  cars: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }[];
  debts: DebtEntry[];
  carId: string;
  locale: string;
}

export default function ManageContent({ cars, debts, carId, locale }: ManageContentProps) {
  const { t } = useT();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("newTrip");

  // --- New Trip form state ---
  const [selectedCarId, setSelectedCarId] = useState(cars[0]?.id ?? "");
  const car = cars.find((c) => c.id === selectedCarId);
  const [gasCost, setGasCost] = useState(() => car?.defaultGasCost ? car.defaultGasCost.toString() : "");
  const [parkingCost, setParkingCost] = useState("0");
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault();
    setFormStatus("saving");
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
      .toISOString().split("T")[0];
    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: selectedCarId,
          date: today,
          gasCost: parseFloat(gasCost) || 0,
          parkingCost: parseFloat(parkingCost) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setGasCost(car?.defaultGasCost ? car.defaultGasCost.toString() : "");
      setParkingCost("0");
      setFormStatus("idle");
      router.refresh();
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
        const ratio = (entry.share - remaining) / entry.share;
        pending.push({
          ...entry,
          share: Math.round((entry.share - remaining) * 100) / 100,
          gasShare: Math.round(entry.gasShare * ratio * 100) / 100,
          parkingShare: Math.round(entry.parkingShare * ratio * 100) / 100,
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
      await markAsSettled(userId, carId);
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
      label: `+ ${t.newTrip}`,
      icon: null,
    },
    {
      key: "settleDebts",
      label: t.settleDebts,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
  ];

  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* New Trip tab */}
      {activeTab === "newTrip" && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="px-5 py-5 sm:px-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              {t.newTrip}
            </h3>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              {/* Gas & Parking */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                    {t.gasCost}
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
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" strokeWidth={0}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7.5 7.5A.5.5 0 018 7h2.5a2.5 2.5 0 010 5H8.5v1a.5.5 0 01-1 0v-5a.5.5 0 010-.5zm1 1v2H10.5a1.5 1.5 0 000-3H8.5z" clipRule="evenodd" fill="currentColor" />
                    </svg>
                    {t.parkingCost}
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

              {/* Total */}
              <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
                Total: <span className="font-bold text-gray-900">฿{totalCost.toFixed(2)}</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={formStatus === "saving"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create{formStatus === "saving" && "..."}
              </button>
              {formStatus === "error" && (
                <p className="text-sm font-medium text-red-600">{t.failedToSave}</p>
              )}
            </form>
          </div>
        </section>
      )}

      {/* Settle Debts tab */}
      {activeTab === "settleDebts" && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            {t.pending} {t.debtSettlement.toLowerCase()} by user
          </h3>

          {usersWithDebt.length === 0 ? (
            <p className="text-sm text-gray-400">{t.allBalancesCleared}</p>
          ) : (
            <div className="space-y-3">
              {usersWithDebt.map((d) => {
                const isUserExpanded = expandedUsers.has(d.userId);
                const pendingBreakdown = getPendingBreakdown(d);
                const isConfirming = confirmingUserId === d.userId;
                const isSettleLoading = loadingAction === `settle-${d.userId}`;
                const initial = (d.userName ?? "?")[0].toUpperCase();

                return (
                  <div key={d.userId} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                    {/* User header */}
                    <button
                      type="button"
                      onClick={() => setExpandedUsers((prev) => toggleSet(prev, d.userId))}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-500">
                        {initial}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-gray-900">{d.userName ?? "Unknown"}</p>
                        <p className="text-xs text-gray-400">{pendingBreakdown.length} {t.pendingItems}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-base font-bold text-red-500">฿{d.pendingDebt.toFixed(2)}</span>
                        <svg
                          className={`h-4 w-4 text-gray-400 transition-transform ${isUserExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded: breakdown entries */}
                    {isUserExpanded && (
                      <div className="space-y-2 px-4 pb-4">
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
                                tripNumber: b.tripNumber,
                                passengerNames: b.passengerNames,
                                driverName: b.driverName,
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
                              }}
                            />
                          );
                        })}

                        {/* Mark as Settled / Confirm */}
                        {!isConfirming ? (
                          <button
                            type="button"
                            onClick={() => setConfirmingUserId(d.userId)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-[0.98]"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t.markAsSettled}
                          </button>
                        ) : (
                          <div className="rounded-xl border-2 border-green-500 bg-green-50 px-4 py-4">
                            <p className="mb-3 text-center text-sm font-medium text-gray-800">
                              {t.confirmSettlement} ฿{d.pendingDebt.toFixed(2)} {t.confirmSettlementFor} {d.userName}?
                            </p>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setConfirmingUserId(null)}
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                              >
                                {t.cancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSettle(d.userId)}
                                disabled={isSettleLoading}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
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
        </section>
      )}
    </div>
  );
}
