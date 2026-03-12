"use client";

import { useState, useCallback } from "react";
import { useT } from "@/lib/i18n-context";

interface ExistingCost {
  carId: string;
  gasCost: number;
  parkingCost: number;
}

interface CostFormProps {
  cars: { id: string; name: string; defaultGasCost: number }[];
  existingCosts: ExistingCost[];
  missingCostDates?: string[];
}

function getBangkokToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return d.toISOString().split("T")[0];
}

export default function CostForm({ cars, existingCosts: initialCosts, missingCostDates: initialMissingDates = [] }: CostFormProps) {
  const { t } = useT();
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [date, setDate] = useState(getBangkokToday);
  const [existingCosts, setExistingCosts] = useState<ExistingCost[]>(initialCosts);
  const [missingDates, setMissingDates] = useState<string[]>(initialMissingDates);

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
    const summary = `${t.confirmSaveCostsTitle}\n\n${t.car}: ${carName}\n${t.date}: ${date}\n${t.gasCost}: ฿${parseFloat(gasCost) || 0}\n${t.parkingCost}: ฿${parseFloat(parkingCost) || 0}`;
    if (!confirm(summary)) return;

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
      // Remove date from missing if all cars now have costs
      const allCarsHaveCosts = cars.every((car) => updatedCosts.some((c) => c.carId === car.id));
      if (allCarsHaveCosts) {
        setMissingDates((prev) => prev.filter((d) => d !== date));
      }
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-4">
      {/* Missing dates chips */}
      {missingDates.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-amber-600">
            {t.missingDates}
          </label>
          <div className="flex flex-wrap gap-2">
            {missingDates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDateChange(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  date === d
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t.date}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Car selector */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t.car}
          </label>
          {existingForCar && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200 ring-inset">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {t.costsSaved}
            </span>
          )}
        </div>
        <select
          value={carId}
          onChange={(e) => handleCarChange(e.target.value)}
          className={inputClass}
        >
          {cars.map((car) => {
            const hasCost = existingCosts.some((c) => c.carId === car.id);
            return (
              <option key={car.id} value={car.id}>
                {hasCost ? "\u2713 " : ""}{car.name}
              </option>
            );
          })}
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
              value={parkingCost}
              onChange={(e) => setParkingCost(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          {status === "saving" ? t.saving : status === "saved" ? t.saved : t.saveCosts}
        </button>

        {status === "error" && (
          <p className="text-sm font-medium text-red-600">
            {t.failedToSave}
          </p>
        )}
      </form>
    </div>
  );
}
