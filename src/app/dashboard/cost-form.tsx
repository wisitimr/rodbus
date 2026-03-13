"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-context";

function fmtDate(iso: string, locale: string) {
  if (!iso) return "";
  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
  return new Date(iso + "T00:00:00").toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
}

interface ExistingCost {
  carId: string;
  gasCost: number;
  parkingCost: number;
}

interface MissingEntry {
  carId: string;
  date: string;
}

interface CostFormProps {
  cars: { id: string; name: string; defaultGasCost: number }[];
  existingCosts: ExistingCost[];
  missingCostDates?: MissingEntry[];
}

function getBangkokToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return d.toISOString().split("T")[0];
}

export default function CostForm({ cars, existingCosts: initialCosts, missingCostDates: initialMissingDates = [] }: CostFormProps) {
  const { t, locale } = useT();
  const router = useRouter();

  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [date, setDate] = useState(getBangkokToday);
  const [existingCosts, setExistingCosts] = useState<ExistingCost[]>(initialCosts);
  const [missingDates, setMissingDates] = useState<MissingEntry[]>(initialMissingDates);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("missing-dates-update", { detail: missingDates }));
  }, [missingDates]);

  const existingForCar = existingCosts.find((c) => c.carId === carId);

  const [gasCost, setGasCost] = useState(() => {
    if (existingForCar) return existingForCar.gasCost.toString();
    const car = cars.find((c) => c.id === cars[0]?.id);
    return car?.defaultGasCost ? car.defaultGasCost.toString() : "";
  });
  const [parkingCost, setParkingCost] = useState(
    () => existingForCar?.parkingCost?.toString() ?? ""
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmData, setConfirmData] = useState<{ carName: string; date: string; gas: string; parking: string } | null>(null);
  const confirmResolve = useRef<((ok: boolean) => void) | null>(null);

  const applyExistingCosts = useCallback((costs: ExistingCost[], selectedCarId: string) => {
    const existing = costs.find((c) => c.carId === selectedCarId);
    if (existing) {
      setGasCost(existing.gasCost.toString());
      setParkingCost(existing.parkingCost.toString());
    } else {
      const car = cars.find((c) => c.id === selectedCarId);
      setGasCost(car?.defaultGasCost ? car.defaultGasCost.toString() : "");
      setParkingCost("");
    }
    setStatus("idle");
  }, [cars]);

  async function fetchCostsForDate(newDate: string) {
    try {
      const carIds = cars.map((c) => c.id).join(",");
      const res = await fetch(`/api/costs?date=${newDate}&carIds=${carIds}`);
      if (res.ok) {
        const costs: ExistingCost[] = await res.json();
        setExistingCosts(costs);
        return costs;
      }
    } catch { /* ignore */ }
    setExistingCosts([]);
    return [];
  }

  async function handleDateChange(newDate: string) {
    setDate(newDate);
    const costs = await fetchCostsForDate(newDate);
    applyExistingCosts(costs, carId);
  }

  function handleCarChange(newCarId: string) {
    setCarId(newCarId);
    applyExistingCosts(existingCosts, newCarId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const carName = cars.find((c) => c.id === carId)?.name ?? "";
    const ok = await new Promise<boolean>((resolve) => {
      confirmResolve.current = resolve;
      setConfirmData({
        carName,
        date: fmtDate(date, locale),
        gas: (parseFloat(gasCost) || 0).toFixed(2),
        parking: (parseFloat(parkingCost) || 0).toFixed(2),
      });
    });
    if (!ok) return;

    setStatus("saving");

    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          date,
          gasCost: parseFloat(gasCost) || 0,
          parkingCost: parseFloat(parkingCost) || 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
      // Update local existing costs
      const updatedCosts = [
        ...existingCosts.filter((c) => c.carId !== carId),
        { carId, gasCost: parseFloat(gasCost) || 0, parkingCost: parseFloat(parkingCost) || 0 },
      ];
      setExistingCosts(updatedCosts);
      // Remove the specific car+date entry from missing
      setMissingDates((prev) => prev.filter((e) => !(e.carId === carId && e.date === date)));
      // Refresh server data so debt settlement updates
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  function resolveConfirm(ok: boolean) {
    confirmResolve.current?.(ok);
    confirmResolve.current = null;
    setConfirmData(null);
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-4">
      {/* Confirm modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => resolveConfirm(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t.confirmSaveCostsTitle}</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t.car}</dt>
                <dd className="font-medium text-gray-900">{confirmData.carName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t.date}</dt>
                <dd className="font-medium text-gray-900">{confirmData.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t.gasCost}</dt>
                <dd className="font-medium text-gray-900">{confirmData.gas}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t.parkingCost}</dt>
                <dd className="font-medium text-gray-900">{confirmData.parking}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => resolveConfirm(true)}
                className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98]"
              >
                {t.saveCosts}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Missing dates chips */}
      {missingDates.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-amber-600">
            {t.missingDates}
          </label>
          <div className="flex flex-wrap gap-2">
            {missingDates.slice(0, 5).map((entry) => {
              const carName = cars.find((c) => c.id === entry.carId)?.name ?? "";
              const isActive = date === entry.date && carId === entry.carId;
              return (
                <button
                  key={`${entry.carId}_${entry.date}`}
                  type="button"
                  onClick={async () => {
                    setCarId(entry.carId);
                    setDate(entry.date);
                    const costs = await fetchCostsForDate(entry.date);
                    applyExistingCosts(costs, entry.carId);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    isActive
                      ? "bg-amber-500 text-white"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {entry.date} &middot; {carName}
                </button>
              );
            })}
            {missingDates.length > 5 && (
              <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                ...+{missingDates.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Date selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t.date}
        </label>
        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className={`${inputClass} absolute inset-0 z-10 cursor-pointer opacity-0`}
          />
          <div className={`${inputClass} text-left`}>
            {fmtDate(date, locale)}
          </div>
        </div>
      </div>

      {/* Car selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t.car}
        </label>
        <select
          value={carId}
          onChange={(e) => handleCarChange(e.target.value)}
          className={inputClass}
        >
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.gasCost}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={gasCost}
              onChange={(e) => setGasCost(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.parkingCost}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={parkingCost}
              onChange={(e) => setParkingCost(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={status === "saving"}
            className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2.5"
          >
            {t.saveCosts}{status === "saving" && "..."}
          </button>

          {existingForCar && status === "idle" && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {t.costsSaved}
            </span>
          )}

          {status === "saved" && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {t.saved}
            </span>
          )}

          {status === "error" && (
            <p className="text-sm font-medium text-red-600">
              {t.failedToSave}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
