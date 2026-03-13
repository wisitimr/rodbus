"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n-context";

interface BreakdownEntry {
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
  outboundCount: number;
  returnCount: number;
  totalCost: number;
  passengerCount: number;
}

interface PendingBreakdownProps {
  entries: BreakdownEntry[];
}

export default function PendingBreakdown({ entries }: PendingBreakdownProps) {
  const { t } = useT();
  const [visibleCount, setVisibleCount] = useState(5);

  if (entries.length === 0) return null;

  const visible = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <details className="mt-4" open>
      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
        {t.viewCostBreakdown}
      </summary>
      <div className="mt-3 space-y-2 text-sm">
        {visible.map((b, i) => {
          const tripCount = b.outboundCount + b.returnCount;
          const parkingTotal = b.parkingShare * b.passengerCount;
          return (
            <details key={i} className="group rounded-xl bg-gray-50">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{b.carName}</p>
                  <p className="text-xs text-gray-500">{b.date}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-gray-900">฿{b.share.toFixed(2)}</span>
                  <svg
                    className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </summary>
              <div className="space-y-1 border-t border-gray-100 px-4 pb-3 pt-2 text-xs text-gray-500">
                {tripCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span>{t.trips}:</span>
                    {b.outboundCount > 0 && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-600">{b.outboundCount} {t.outbound}</span>
                    )}
                    {b.returnCount > 0 && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600">{b.returnCount} {t.return}</span>
                    )}
                  </div>
                )}
                {b.gasOutbound > 0 && (
                  <div className="flex justify-between">
                    <span>{t.gas} ({t.outbound}):</span>
                    <span className="text-gray-700">฿{(b.gasCost / 2).toFixed(2)} ÷ {b.outboundHeadcount} {t.people} = ฿{b.gasOutbound.toFixed(2)}</span>
                  </div>
                )}
                {b.gasReturn > 0 && (
                  <div className="flex justify-between">
                    <span>{t.gas} ({t.return}):</span>
                    <span className="text-gray-700">฿{(b.gasCost / 2).toFixed(2)} ÷ {b.returnHeadcount} {t.people} = ฿{b.gasReturn.toFixed(2)}</span>
                  </div>
                )}
                {b.parkingShare > 0 && (
                  <div className="flex justify-between">
                    <span>{t.parking}:</span>
                    <span className="text-gray-700">฿{parkingTotal.toFixed(2)} ÷ {b.passengerCount} {t.people} = ฿{b.parkingShare.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </details>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 5)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {t.loadMore}
          </button>
        )}
      </div>
    </details>
  );
}
