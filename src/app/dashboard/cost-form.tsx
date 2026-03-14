"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fuel, ParkingCircle, Car, Plus } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface CostFormProps {
  cars: { id: string; name: string; defaultGasCost: number }[];
}

export default function CostForm({ cars }: CostFormProps) {
  const { t } = useT();
  const router = useRouter();

  const [carId, setCarId] = useState(cars[0]?.id ?? "");

  const car = cars.find((c) => c.id === carId);
  const [gasCost, setGasCost] = useState(() => car?.defaultGasCost ? car.defaultGasCost.toString() : "");
  const [parkingCost, setParkingCost] = useState("0");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  function resetForm() {
    const firstCar = cars[0];
    setCarId(firstCar?.id ?? "");
    setGasCost(firstCar?.defaultGasCost ? firstCar.defaultGasCost.toString() : "");
    setParkingCost("0");
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
      resetForm();
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  const totalCost = (parseFloat(gasCost) || 0) + (parseFloat(parkingCost) || 0);

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium";

  return (
    <div className="space-y-3">
      {/* Car selector */}
      {cars.length > 1 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            <Car className="mr-1 inline h-3 w-3" /> {t.car}
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

      {/* Cost form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              <Fuel className="mr-1 inline h-3 w-3" /> {t.gasCost} (&#3647;)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={gasCost}
              onChange={(e) => setGasCost(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              <ParkingCircle className="mr-1 inline h-3 w-3" /> {t.parkingCost} (&#3647;)
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

        {/* Total */}
        {totalCost > 0 && (
          <div className="rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
            Total: <strong className="text-foreground">&#3647;{totalCost.toFixed(2)}</strong>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t.saveCosts}{status === "saving" && "..."}
        </button>
        {status === "error" && (
          <p className="text-sm font-medium text-debt">
            {t.failedToSave}
          </p>
        )}
      </form>
    </div>
  );
}
