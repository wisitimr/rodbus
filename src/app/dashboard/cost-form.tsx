"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-context";

interface TripCostEntry {
  id: string;
  carId: string;
  gasCost: number;
  parkingCost: number;
  label: string | null;
  passengerCount: number;
}

interface CostFormProps {
  cars: { id: string; name: string; defaultGasCost: number }[];
  todayTrips: TripCostEntry[];
}

export default function CostForm({ cars, todayTrips: initialTrips }: CostFormProps) {
  const { t } = useT();
  const router = useRouter();

  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [todayTrips, setTodayTrips] = useState<TripCostEntry[]>(initialTrips);
  const [showForm, setShowForm] = useState(false);

  const car = cars.find((c) => c.id === carId);
  const [gasCost, setGasCost] = useState(() => car?.defaultGasCost ? car.defaultGasCost.toString() : "");
  const [parkingCost, setParkingCost] = useState("0");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  // Update trips when car changes
  useEffect(() => {
    async function fetchTrips() {
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
        .toISOString().split("T")[0];
      try {
        const res = await fetch(`/api/costs?date=${today}&carIds=${carId}`);
        if (res.ok) {
          const data: TripCostEntry[] = await res.json();
          setTodayTrips(data);
        }
      } catch { /* ignore */ }
    }
    if (carId) fetchTrips();
  }, [carId]);

  function resetForm() {
    const c = cars.find((c) => c.id === carId);
    setGasCost(c?.defaultGasCost ? c.defaultGasCost.toString() : "");
    setParkingCost("0");
    setShowForm(false);
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
      .toISOString().split("T")[0];

    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          date: today,
          gasCost: parseFloat(gasCost) || 0,
          parkingCost: parseFloat(parkingCost) || 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      const newCost = await res.json();
      setTodayTrips((prev) => [...prev, { id: newCost.id, carId, gasCost: newCost.gasCost, parkingCost: newCost.parkingCost, label: newCost.label, passengerCount: 0 }]);
      resetForm();
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  const tripsForCar = todayTrips.filter((tc) => tc.carId === carId);

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-4">
      {/* Car selector */}
      {cars.length > 1 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t.car}
          </label>
          <select
            value={carId}
            onChange={(e) => {
              setCarId(e.target.value);
              const c = cars.find((c) => c.id === e.target.value);
              setGasCost(c?.defaultGasCost ? c.defaultGasCost.toString() : "");
              setParkingCost("0");
            }}
            className={inputClass}
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Today's trips list */}
      {tripsForCar.length > 0 && (
        <div className="space-y-2">
          {tripsForCar.map((tc, i) => (
            <div
              key={tc.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {t.tripNumber} #{i + 1}
                  {tc.label && <span className="ml-2 text-gray-500">{tc.label}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {t.gas}: ฿{tc.gasCost}
                  {tc.parkingCost > 0 && <> &middot; {t.parking}: ฿{tc.parkingCost}</>}
                  {tc.passengerCount > 0 && <> &middot; {tc.passengerCount} {t.people}</>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Trip button / form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] sm:w-auto sm:py-2.5"
        >
          + {t.newTrip}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t.gasCost} <span className="text-red-500">*</span>
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
                {t.parkingCost} <span className="normal-case tracking-normal font-normal text-gray-400">({t.optional})</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={parkingCost}
                onChange={(e) => setParkingCost(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 sm:py-2.5"
            >
              {t.saveCosts}{status === "saving" && "..."}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98] sm:py-2.5"
            >
              {t.cancel}
            </button>
            {status === "error" && (
              <p className="text-sm font-medium text-red-600">
                {t.failedToSave}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
