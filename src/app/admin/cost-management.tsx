"use client";

import { useState, useTransition } from "react";
import { updateDailyCost } from "@/lib/admin-actions";

interface CostManagementProps {
  cars: { id: string; name: string }[];
}

export default function CostManagement({ cars }: CostManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [gasCost, setGasCost] = useState("");
  const [parkingCost, setParkingCost] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateDailyCost(
          carId,
          date,
          parseFloat(gasCost) || 0,
          parseFloat(parkingCost) || 0
        );
        setStatus("saved");
        setGasCost("");
        setParkingCost("");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    });
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Car
          </label>
          <select
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
            className={inputClass}
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Gas ($)
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
            Parking ($)
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
        disabled={isPending}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2.5"
      >
        {isPending ? "Saving..." : status === "saved" ? "Saved!" : "Save Costs"}
      </button>

      {status === "error" && (
        <p className="text-sm font-medium text-red-600">Failed to save. Please try again.</p>
      )}
    </form>
  );
}
