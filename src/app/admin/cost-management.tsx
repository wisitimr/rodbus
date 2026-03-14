"use client";

import { useState } from "react";
import { updateDefaultGasCost } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface CostManagementProps {
  cars: { id: string; name: string; defaultGasCost: number }[];
}

export default function CostManagement({ cars }: CostManagementProps) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [gasCost, setGasCost] = useState(
    () => cars[0]?.defaultGasCost?.toString() ?? ""
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function handleCarChange(newCarId: string) {
    setCarId(newCarId);
    const car = cars.find((c) => c.id === newCarId);
    setGasCost(car?.defaultGasCost?.toString() ?? "");
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDefaultGasCost(carId, parseFloat(gasCost) || 0);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cars.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.defaultGasCost}
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
      >
        {status === "saved" ? t.saved : t.saveCosts}{loading && "..."}
      </button>

      {status === "error" && (
        <p className="text-sm font-medium text-debt">{t.failedToSave}</p>
      )}
    </form>
  );
}
