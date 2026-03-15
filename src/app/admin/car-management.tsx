"use client";

import { useState } from "react";
import { Plus, Fuel, Pencil, Check, Trash2 } from "lucide-react";
import { addCar, deleteCar, updateDefaultGasCost } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface CarManagementProps {
  cars: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }[];
}

export default function CarManagement({ cars }: CarManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [defaultGas, setDefaultGas] = useState("0");
  const [status, setStatus] = useState<"idle" | "error">("idle");

  // Inline gas cost editing
  const [editingGasId, setEditingGasId] = useState<string | null>(null);
  const [editGasValue, setEditGasValue] = useState("");

  const isAnyLoading = loadingAction !== null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoadingAction("add");
    try {
      await addCar(name, licensePlate || null, parseFloat(defaultGas) || 0);
      setName("");
      setLicensePlate("");
      setDefaultGas("0");
      setShowAddForm(false);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete(carId: string) {
    if (!confirm(t.confirmDeleteCar)) return;
    setLoadingAction(`delete-${carId}`);
    try {
      await deleteCar(carId);
    } finally {
      setLoadingAction(null);
    }
  }

  function startEditGas(carId: string, currentCost: number) {
    setEditingGasId(carId);
    setEditGasValue(currentCost.toString());
  }

  async function saveGasCost(carId: string) {
    setLoadingAction(`gas-${carId}`);
    try {
      await updateDefaultGasCost(carId, parseFloat(editGasValue) || 0);
      setEditingGasId(null);
    } catch {
      // keep editing
    } finally {
      setLoadingAction(null);
    }
  }

  function cancelEditGas() {
    setEditingGasId(null);
    setEditGasValue("");
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm";

  return (
    <div className="space-y-3">
      {/* Add New Car Button / Form */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {t.addNewCar}
        </button>
      ) : (
        <div className="rounded-xl border-2 border-primary/30 bg-card p-4 space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">{t.addNewCar}</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.carName} <span className="text-debt">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Toyota HiAce"
                className={inputClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.licensePlate} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g. กก-1234"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.defaultGasCost} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultGas}
                onChange={(e) => setDefaultGas(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAnyLoading || !name.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t.add}
                {loadingAction === "add" && "..."}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setName(""); setLicensePlate(""); setDefaultGas("0"); setStatus("idle"); }}
                className="flex-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                {t.cancel}
              </button>
            </div>
            {status === "error" && (
              <p className="text-sm font-medium text-debt">{t.failedToSave}</p>
            )}
          </form>
        </div>
      )}

      {/* Car list */}
      {cars.map((car) => (
        <div
          key={car.id}
          className="rounded-xl border border-border bg-card p-4 animate-fade-in"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">{car.name}</p>
              {car.licensePlate && (
                <p className="text-sm text-muted-foreground">{car.licensePlate}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(car.id)}
              disabled={isAnyLoading}
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Gas cost row */}
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
            <Fuel className="h-3 w-3 shrink-0" />
            <span>{t.gas}:</span>
            {editingGasId === car.id ? (
              <div className="flex flex-1 items-center gap-1.5">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&#3647;</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editGasValue}
                    onChange={(e) => setEditGasValue(e.target.value)}
                    className="w-20 rounded-lg border border-primary/30 bg-background py-1 pl-6 pr-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveGasCost(car.id);
                      if (e.key === "Escape") cancelEditGas();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => saveGasCost(car.id)}
                  disabled={isAnyLoading}
                  className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={cancelEditGas}
                  className="rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <span className="font-bold text-foreground">&#3647;{car.defaultGasCost.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => startEditGas(car.id, car.defaultGasCost)}
                  className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {cars.length === 0 && !showAddForm && (
        <p className="text-center text-sm text-muted-foreground">{t.noCars}</p>
      )}
    </div>
  );
}
