"use client";

import { useState } from "react";
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
      await addCar(name, licensePlate || null);
      const gasVal = parseFloat(defaultGas) || 0;
      // After adding, we need to update gas cost if non-zero
      // The car will be created with default 0, we'll update after
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
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Add New Car Button / Form */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 active:scale-[0.98]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t.addNewCar}
        </button>
      ) : (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900">{t.addNewCar}</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t.carName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Toyota HiAce"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                {t.licensePlate}
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
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                {t.defaultGasCost} ({t.optional})
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
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAnyLoading || !name.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t.add}
                {loadingAction === "add" && "..."}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setName(""); setLicensePlate(""); setDefaultGas("0"); setStatus("idle"); }}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {t.cancel}
              </button>
            </div>
            {status === "error" && (
              <p className="text-sm font-medium text-red-600">{t.failedToSave}</p>
            )}
          </form>
        </div>
      )}

      {/* Car list */}
      {cars.map((car) => (
        <div
          key={car.id}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{car.name}</p>
              {car.licensePlate && (
                <p className="text-sm text-gray-500">{car.licensePlate}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(car.id)}
              disabled={isAnyLoading}
              className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>

          {/* Gas cost row */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            <span className="text-sm text-gray-500">{t.gas}:</span>
            {editingGasId === car.id ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-gray-300 bg-white px-2">
                  <span className="text-sm text-gray-500">฿</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editGasValue}
                    onChange={(e) => setEditGasValue(e.target.value)}
                    className="w-20 border-0 bg-transparent py-1.5 text-sm focus:ring-0 focus:outline-none"
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
                  className="rounded-full bg-blue-500 p-1 text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={cancelEditGas}
                  className="rounded-full p-1 text-gray-400 transition hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  ฿{car.defaultGasCost.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => startEditGas(car.id, car.defaultGasCost)}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {cars.length === 0 && !showAddForm && (
        <p className="text-center text-sm text-gray-500">{t.noCars}</p>
      )}
    </div>
  );
}
