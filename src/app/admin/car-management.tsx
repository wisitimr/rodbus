"use client";

import { useState, useTransition } from "react";
import { addCar, deleteCar } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface CarManagementProps {
  cars: { id: string; name: string; licensePlate: string | null; ownerName: string | null }[];
  users: { id: string; name: string | null; email: string }[];
}

export default function CarManagement({ cars, users }: CarManagementProps) {
  const { t } = useT();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "error">("idle");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ownerId) return;

    startTransition(async () => {
      try {
        await addCar(name, licensePlate || null, ownerId);
        setName("");
        setLicensePlate("");
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    });
  }

  function handleDelete(carId: string) {
    if (!confirm(t.confirmDeleteCar)) return;
    startTransition(async () => {
      await deleteCar(carId);
    });
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-6">
      {/* Add car form */}
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.owner}
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={inputClass}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          {isPending ? t.adding : t.addCar}
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
                <p className="truncate text-xs text-gray-500">
                  {t.owner}: {car.ownerName ?? "Unknown"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(car.id)}
                disabled={isPending}
                className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
              >
                {t.deleteCar}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
