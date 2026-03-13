"use client";

import { useState } from "react";
import { markAsSettled } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface BreakdownItem {
  carName: string;
  date: string;
  share: number;
  gasShare: number;
  gasOutbound: number;
  gasReturn: number;
  gasCost: number;
  outboundHeadcount: number;
  returnHeadcount: number;
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
  carId: string;
}

export default function DebtSettlement({ debts, carId }: DebtSettlementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function handleClearFull(userId: string) {
    const user = debts.find((d) => d.userId === userId);
    const summary = `${t.markAsSettled}?\n\n${user?.userName ?? "Unknown"}\n${t.pending}: ฿${user?.pendingDebt.toFixed(2)}`;
    if (!confirm(summary)) return;
    setLoadingAction(`clear-${userId}`);
    try {
      await markAsSettled(userId, carId);
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
          gasOutbound: Math.round(entry.gasOutbound * ratio * 100) / 100,
          gasReturn: Math.round(entry.gasReturn * ratio * 100) / 100,
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
        const isAnyLoading = loadingAction !== null;
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
                {pendingBreakdown.length > 0 && (() => {
                  const limit = visibleCounts[d.userId] ?? 5;
                  const visible = pendingBreakdown.slice(0, limit);
                  const hasMore = limit < pendingBreakdown.length;
                  return (
                    <>
                      <ul className="divide-y divide-gray-100 text-sm">
                        {visible.map((b, i) => (
                          <li key={i} className="py-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-xs text-gray-600">
                                {b.carName} &mdash; {b.date} ({b.passengerCount} {t.people})
                              </span>
                              <span className="shrink-0 text-xs font-medium text-gray-900">
                                ฿{b.share.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-0.5 space-y-0.5 text-xs text-gray-400">
                              {b.gasOutbound > 0 && (
                                <div className="flex justify-between">
                                  <span>{t.gas} ({t.outbound})</span>
                                  <span className="text-gray-700">฿{(b.gasCost / 2).toFixed(2)} ÷ {b.outboundHeadcount} {t.people} = ฿{b.gasOutbound.toFixed(2)}</span>
                                </div>
                              )}
                              {b.gasReturn > 0 && (
                                <div className="flex justify-between">
                                  <span>{t.gas} ({t.return})</span>
                                  <span className="text-gray-700">฿{(b.gasCost / 2).toFixed(2)} ÷ {b.returnHeadcount} {t.people} = ฿{b.gasReturn.toFixed(2)}</span>
                                </div>
                              )}
                              {b.parkingShare > 0 && (
                                <div className="flex justify-between">
                                  <span>{t.parking}</span>
                                  <span className="text-gray-700">฿{(b.parkingShare * b.passengerCount).toFixed(2)} ÷ {b.passengerCount} {t.people} = ฿{b.parkingShare.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setVisibleCounts((prev) => ({ ...prev, [d.userId]: limit + 5 }))}
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                          {t.loadMore}
                        </button>
                      )}
                    </>
                  );
                })()}

                {/* Actions */}
                <div className="mt-3">
                  <button
                    onClick={() => handleClearFull(d.userId)}
                    disabled={isAnyLoading}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
                  >
                    {t.markAsSettled}{isClearLoading && "..."}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
