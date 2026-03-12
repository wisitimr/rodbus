"use client";

import { useState } from "react";
import { recordPayment, clearFullBalance } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface BreakdownItem {
  carName: string;
  date: string;
  share: number;
  gasShare: number;
  parkingShare: number;
  passengerCount: number;
}

interface DebtEntry {
  userId: string;
  userName: string | null;
  pendingDebt: number;
  totalDebt: number;
  totalPaid: number;
  breakdown: BreakdownItem[];
}

interface DebtSettlementProps {
  debts: DebtEntry[];
  cars: { id: string; name: string }[];
}

export default function DebtSettlement({ debts, cars }: DebtSettlementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [showCustom, setShowCustom] = useState<Set<string>>(new Set());
  const [selectedCars, setSelectedCars] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const d of debts) {
      defaults[d.userId] = cars[0]?.id ?? "";
    }
    return defaults;
  });

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function handleClearFull(userId: string) {
    const carId = selectedCars[userId];
    if (!carId) return;
    const user = debts.find((d) => d.userId === userId);
    const carName = cars.find((c) => c.id === carId)?.name ?? "";
    const summary = `${t.clearFullBalance}?\n\n${user?.userName ?? "Unknown"}\n${t.pending}: ฿${user?.pendingDebt.toFixed(2)}\n${t.car}: ${carName}`;
    if (!confirm(summary)) return;
    setLoadingAction(`clear-${userId}`);
    try {
      await clearFullBalance(userId, carId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRecordCustom(userId: string) {
    const carId = selectedCars[userId];
    const amount = parseFloat(customAmounts[userId] || "0");
    if (!carId || amount <= 0) return;
    const user = debts.find((d) => d.userId === userId);
    const carName = cars.find((c) => c.id === carId)?.name ?? "";
    const summary = `${t.recordPayment}?\n\n${user?.userName ?? "Unknown"}\n${t.amount}: ฿${amount.toFixed(2)}\n${t.car}: ${carName}`;
    if (!confirm(summary)) return;
    setLoadingAction(`record-${userId}`);
    try {
      await recordPayment(userId, carId, amount);
      setCustomAmounts((prev) => ({ ...prev, [userId]: "" }));
    } finally {
      setLoadingAction(null);
    }
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

  const usersWithDebt = debts.filter((d) => d.pendingDebt > 0);

  if (usersWithDebt.length === 0) {
    return <p className="text-sm text-gray-500">{t.allBalancesCleared}</p>;
  }

  return (
    <div className="space-y-2">
      {usersWithDebt.map((d) => {
        const isExpanded = expandedUsers.has(d.userId);
        const isClearLoading = loadingAction === `clear-${d.userId}`;
        const isRecordLoading = loadingAction === `record-${d.userId}`;
        const isAnyLoading = loadingAction !== null;
        const isCustomOpen = showCustom.has(d.userId);
        const pendingBreakdown = getPendingBreakdown(d);
        return (
          <div key={d.userId} className="rounded-xl bg-gray-50">
            <button
              type="button"
              onClick={() => setExpandedUsers((prev) => toggle(prev, d.userId))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{d.userName ?? "Unknown"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-bold text-red-600">
                  ฿{d.pendingDebt.toFixed(2)}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-4 pb-3 pt-2">
                {/* Cost breakdown */}
                {pendingBreakdown.length > 0 && (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {pendingBreakdown.map((b, i) => (
                      <li key={i} className="py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-xs text-gray-600">
                            {b.carName} &mdash; {b.date} ({b.passengerCount} {t.riders})
                          </span>
                          <span className="shrink-0 text-xs font-medium text-gray-900">
                            ฿{b.share.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex gap-3 text-xs text-gray-400">
                          {b.gasShare > 0 && (
                            <span>{t.gas}: ฿{b.gasShare.toFixed(2)}</span>
                          )}
                          {b.parkingShare > 0 && (
                            <span>{t.parking}: ฿{b.parkingShare.toFixed(2)}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Actions */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => handleClearFull(d.userId)}
                    disabled={isAnyLoading}
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
                  >
                    {t.clearFullBalance}{isClearLoading && "..."}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustom((prev) => toggle(prev, d.userId))}
                    className="inline-flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {t.customAmount}
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${isCustomOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>

                {/* Custom amount form */}
                {isCustomOpen && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-end">
                    {cars.length > 1 && (
                      <div className="sm:shrink-0">
                        <label className="mb-1 block text-xs text-gray-500">{t.car}</label>
                        <select
                          value={selectedCars[d.userId] || ""}
                          onChange={(e) =>
                            setSelectedCars((prev) => ({
                              ...prev,
                              [d.userId]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm sm:w-auto sm:py-1.5"
                        >
                          {cars.map((car) => (
                            <option key={car.id} value={car.id}>
                              {car.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-500">
                        {t.amount}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customAmounts[d.userId] || ""}
                        onChange={(e) =>
                          setCustomAmounts((prev) => ({
                            ...prev,
                            [d.userId]: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:py-1.5"
                      />
                    </div>
                    <button
                      onClick={() => handleRecordCustom(d.userId)}
                      disabled={
                        isAnyLoading ||
                        !customAmounts[d.userId] ||
                        parseFloat(customAmounts[d.userId] || "0") <= 0
                      }
                      className="w-full shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-1.5"
                    >
                      {t.recordPayment}{isRecordLoading && "..."}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
