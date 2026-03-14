"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { markAsSettled } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface BreakdownItem {
  carName: string;
  date: string;
  share: number;
  gasShare: number;
  gasCost: number;
  parkingShare: number;
  parkingCost: number;
  headcount: number;
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
    return <p className="text-sm text-muted-foreground">{t.allBalancesCleared}</p>;
  }

  return (
    <div className="space-y-2">
      {usersWithDebt.map((d) => {
        const isExpanded = expandedUsers.has(d.userId);
        const isClearLoading = loadingAction === `clear-${d.userId}`;
        const isAnyLoading = loadingAction !== null;
        const pendingBreakdown = getPendingBreakdown(d);
        const initial = (d.userName ?? "?")[0].toUpperCase();

        return (
          <div key={d.userId} className="rounded-2xl border border-border bg-card p-4 shadow-sm animate-fade-in">
            <button
              type="button"
              onClick={() => setExpandedUsers((prev) => toggle(prev, d.userId))}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-debt/10 text-sm font-bold text-debt">
                  {initial}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{d.userName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{pendingBreakdown.length} {t.pendingItems ?? "pending items"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-debt">
                  &#3647;{d.pendingDebt.toFixed(2)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {pendingBreakdown.length > 0 && (() => {
                  const limit = visibleCounts[d.userId] ?? 5;
                  const visible = pendingBreakdown.slice(0, limit);
                  const hasMore = limit < pendingBreakdown.length;
                  return (
                    <>
                      {visible.map((b, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm text-muted-foreground">
                              {b.carName} &mdash; {b.date}
                            </span>
                            <span className="shrink-0 text-sm font-semibold font-mono text-foreground">
                              &#3647;{b.share.toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {b.gasShare > 0 && (
                              <div className="flex justify-between">
                                <span>{t.gas}:</span>
                                <span className="font-mono text-foreground">&#3647;{b.gasCost.toFixed(2)} / {b.headcount} = &#3647;{b.gasShare.toFixed(2)}</span>
                              </div>
                            )}
                            {b.parkingShare > 0 && (
                              <div className="flex justify-between">
                                <span>{t.parking}:</span>
                                <span className="font-mono text-foreground">&#3647;{b.parkingCost.toFixed(2)} / {b.headcount} = &#3647;{b.parkingShare.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setVisibleCounts((prev) => ({ ...prev, [d.userId]: limit + 5 }))}
                          className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-primary transition hover:bg-accent"
                        >
                          {t.loadMore}
                        </button>
                      )}
                    </>
                  );
                })()}

                {/* Actions */}
                <button
                  onClick={() => handleClearFull(d.userId)}
                  disabled={isAnyLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-settled px-4 py-3 text-sm font-semibold text-white transition hover:bg-settled/90 active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t.markAsSettled}{isClearLoading && "..."}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
