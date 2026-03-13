"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n-context";

interface BreakdownEntry {
  carName: string;
  date: string;
  share: number;
  gasShare: number;
  gasCost: number;
  parkingShare: number;
  parkingCost: number;
  totalCost: number;
  headcount: number;
}

interface PendingBreakdownProps {
  entries: BreakdownEntry[];
}

export default function PendingBreakdown({ entries }: PendingBreakdownProps) {
  const { t } = useT();
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Group by date and assign trip numbers
  const grouped = useMemo(() => {
    const groups: { date: string; items: (BreakdownEntry & { tripNum: number; idx: number })[] }[] = [];
    const map = new Map<string, (typeof groups)[number]>();
    let idx = 0;
    for (const b of entries) {
      let group = map.get(b.date);
      if (!group) {
        group = { date: b.date, items: [] };
        map.set(b.date, group);
        groups.push(group);
      }
      group.items.push({ ...b, tripNum: group.items.length + 1, idx });
      idx++;
    }
    return groups;
  }, [entries]);

  if (entries.length === 0) return null;

  // Flatten for pagination
  const allItems = grouped.flatMap((g) => g.items);
  const visible = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  // Re-group visible items by date
  const visibleGrouped = useMemo(() => {
    const groups: { date: string; items: typeof visible }[] = [];
    const map = new Map<string, (typeof groups)[number]>();
    for (const item of visible) {
      let group = map.get(item.date);
      if (!group) {
        group = { date: item.date, items: [] };
        map.set(item.date, group);
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [visible]);

  function toggleExpanded(idx: number) {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
      >
        {t.viewCostBreakdown}
      </button>

      {showBreakdown && (
        <div className="mt-3 space-y-5">
          {visibleGrouped.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{group.date}</span>
                <span className="text-xs text-gray-300">&middot; {group.items.length} {group.items.length === 1 ? t.trip : t.trips}</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {/* Trip cards */}
              <div className="space-y-2">
                {group.items.map((b) => {
                  const isExpanded = expandedSet.has(b.idx);
                  return (
                    <div
                      key={b.idx}
                      className="overflow-hidden rounded-xl border border-gray-100 bg-white transition hover:border-gray-200 hover:shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(b.idx)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {t.tripNumber} #{b.tripNum} <span className="font-normal text-gray-400">&middot;</span> <span className="font-normal text-gray-500">{b.carName}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {b.date}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">฿{b.share.toFixed(2)}</span>
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
                        <div className="space-y-1 border-t border-gray-100 px-4 pb-3 pt-2 text-xs text-gray-500">
                          {b.gasShare > 0 && (
                            <div className="flex justify-between">
                              <span>{t.gas}:</span>
                              <span className="text-gray-700">฿{b.gasCost.toFixed(2)} ÷ {b.headcount} {t.people} = ฿{b.gasShare.toFixed(2)}</span>
                            </div>
                          )}
                          {b.parkingShare > 0 && (
                            <div className="flex justify-between">
                              <span>{t.parking}:</span>
                              <span className="text-gray-700">฿{b.parkingCost.toFixed(2)} ÷ {b.headcount} {t.people} = ฿{b.parkingShare.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 5)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {t.loadMore}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
