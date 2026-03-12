"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n-context";

interface ExistingCost {
  carId: string;
  gasCost: number;
  parkingCost: number;
}

interface CostFormProps {
  cars: { id: string; name: string; defaultGasCost: number }[];
  existingCosts: ExistingCost[];
}

export default function CostForm({ cars, existingCosts }: CostFormProps) {
  const { t } = useT();
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [date] = useState(() => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    return d.toISOString().split("T")[0];
  });

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
  const [editing, setEditing] = useState(!existingForCar);

  function handleCarChange(newCarId: string) {
    setCarId(newCarId);
    const existing = existingCosts.find((c) => c.carId === newCarId);
    if (existing) {
      setGasCost(existing.gasCost.toString());
      setParkingCost(existing.parkingCost.toString());
      setEditing(false);
      setStatus("idle");
    } else {
      const car = cars.find((c) => c.id === newCarId);
      setGasCost(car?.defaultGasCost ? car.defaultGasCost.toString() : "");
      setParkingCost("");
      setEditing(true);
      setStatus("idle");
    }
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
      setEditing(false);
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  const savedGas = parseFloat(gasCost) || 0;
  const savedParking = parseFloat(parkingCost) || 0;

  return (
    <div className="space-y-4">
      {/* Car selector — always visible */}
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

      {!editing ? (
        /* Saved summary */
        <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-200">
          <div>
            <p className="text-sm font-medium text-green-800">
              {t.costsSaved}
            </p>
            <p className="mt-0.5 text-xs text-green-600">
              {t.gasCost}: ฿{savedGas.toFixed(2)} &middot; {t.parkingCost}: ฿{savedParking.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition hover:bg-green-50"
          >
            {t.editCosts}
          </button>
        </div>
      ) : (
        /* Edit form */
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
            {status === "saving" ? t.saving : t.saveCosts}
          </button>

          {status === "error" && (
            <p className="text-sm font-medium text-red-600">
              {t.failedToSave}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
