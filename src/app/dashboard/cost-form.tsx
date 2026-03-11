"use client";

import { useState } from "react";

interface CostFormProps {
  cars: { id: string; name: string }[];
}

export default function CostForm({ cars }: CostFormProps) {
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [gasCost, setGasCost] = useState("");
  const [parkingCost, setParkingCost] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Car</label>
          <select
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Gas Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={gasCost}
            onChange={(e) => setGasCost(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Parking Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={parkingCost}
            onChange={(e) => setParkingCost(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save Costs"}
      </button>

      {status === "error" && (
        <p className="text-sm text-red-600">Failed to save. Please try again.</p>
      )}
    </form>
  );
}
