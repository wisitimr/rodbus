"use client";

import { useState, useTransition } from "react";
import { recordPayment, clearFullBalance } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface DebtEntry {
  userId: string;
  userName: string | null;
  pendingDebt: number;
  totalDebt: number;
  totalPaid: number;
}

interface DebtSettlementProps {
  debts: DebtEntry[];
  cars: { id: string; name: string }[];
}

export default function DebtSettlement({ debts, cars }: DebtSettlementProps) {
  const { t } = useT();
  const [isPending, startTransition] = useTransition();
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [selectedCars, setSelectedCars] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const d of debts) {
      defaults[d.userId] = cars[0]?.id ?? "";
    }
    return defaults;
  });

  function handleClearFull(userId: string) {
    const carId = selectedCars[userId];
    if (!carId) return;
    const user = debts.find((d) => d.userId === userId);
    const carName = cars.find((c) => c.id === carId)?.name ?? "";
    const summary = `${t.clearFullBalance}?\n\n${user?.userName ?? "Unknown"}\n${t.pending}: ฿${user?.pendingDebt.toFixed(2)}\n${t.car}: ${carName}`;
    if (!confirm(summary)) return;
    startTransition(async () => {
      await clearFullBalance(userId, carId);
    });
  }

  function handleRecordCustom(userId: string) {
    const carId = selectedCars[userId];
    const amount = parseFloat(customAmounts[userId] || "0");
    if (!carId || amount <= 0) return;
    const user = debts.find((d) => d.userId === userId);
    const carName = cars.find((c) => c.id === carId)?.name ?? "";
    const summary = `${t.recordPayment}?\n\n${user?.userName ?? "Unknown"}\n${t.amount}: ฿${amount.toFixed(2)}\n${t.car}: ${carName}`;
    if (!confirm(summary)) return;
    startTransition(async () => {
      await recordPayment(userId, carId, amount);
      setCustomAmounts((prev) => ({ ...prev, [userId]: "" }));
    });
  }

  const usersWithDebt = debts.filter((d) => d.pendingDebt > 0);

  if (usersWithDebt.length === 0) {
    return <p className="text-sm text-gray-500">{t.allBalancesCleared}</p>;
  }

  return (
    <div className="space-y-4">
      {usersWithDebt.map((d) => (
        <div
          key={d.userId}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{d.userName ?? "Unknown"}</p>
              <p className="text-sm text-gray-500">
                {t.accrued}: ฿{d.totalDebt.toFixed(2)} &middot; {t.paid}:{" "}
                ฿{d.totalPaid.toFixed(2)}
              </p>
              <p className="text-lg font-bold text-red-600">
                {t.pending}: ฿{d.pendingDebt.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => handleClearFull(d.userId)}
              disabled={isPending}
              className="w-full shrink-0 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2"
            >
              {t.clearFullBalance}
            </button>
          </div>

          {/* Custom partial payment */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
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
                {t.customAmount}
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
                isPending ||
                !customAmounts[d.userId] ||
                parseFloat(customAmounts[d.userId] || "0") <= 0
              }
              className="w-full shrink-0 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-1.5"
            >
              {t.recordPayment}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
