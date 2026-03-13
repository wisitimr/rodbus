"use client";

import { useState } from "react";
import { addCar, deleteCar } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface CarManagementProps {
  cars: { id: string; name: string; licensePlate: string | null }[];
}

export default function CarManagement({ cars }: CarManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [status, setStatus] = useState<"idle" | "error">("idle");

  const isAnyLoading = loadingAction !== null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoadingAction("add");
    try {
      await addCar(name, licensePlate || null);
      setName("");
      setLicensePlate("");
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

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-6">
      {/* Add car form */}
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.carName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Honda Civic"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.licensePlate}
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g., กข 1234"
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isAnyLoading || !name.trim()}
          className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          {t.addCar}{loadingAction === "add" && "..."}
        </button>
        {status === "error" && (
          <p className="text-sm font-medium text-red-600">{t.failedToSave}</p>
        )}
      </form>

      {/* Car list */}
      {cars.length === 0 ? (
        <p className="text-sm text-gray-500">{t.noCars}</p>
      ) : (
        <ul className="space-y-2">
          {cars.map((car) => (
            <li
              key={car.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">
                  {car.name}
                  {car.licensePlate && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({car.licensePlate})
                    </span>
                  )}
                </p>
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === car.id ? null : car.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                  </svg>
                </button>
                {openMenuId === car.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                      <a
                        href={`/admin/qr?carId=${car.id}`}
                        onClick={() => setOpenMenuId(null)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                        </svg>
                        {t.qrCode}
                      </a>
                      <button
                        type="button"
                        onClick={() => { setOpenMenuId(null); handleDelete(car.id); }}
                        disabled={isAnyLoading}
                        className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        {t.deleteCar}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
