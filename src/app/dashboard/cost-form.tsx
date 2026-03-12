"use client";

import { useState, useCallback, useEffect } from "react";
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
            {missingDates.slice(0, 5).map((d) => (
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
            {missingDates.length > 5 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
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
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={inputClass}
        />
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
