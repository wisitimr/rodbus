"use client";

import { useState, useTransition } from "react";
import { disableDate, enableDate } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface DateManagementProps {
  disabledDates: { id: string; date: string; reason: string | null }[];
}

export default function DateManagement({ disabledDates }: DateManagementProps) {
  const { t } = useT();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;

    startTransition(async () => {
      await disableDate(date, reason || undefined);
      setDate("");
      setReason("");
    });
  }

  function handleEnable(dateStr: string) {
    startTransition(async () => {
      await enableDate(dateStr);
    });
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-6">
      <form onSubmit={handleDisable} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.date}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t.reason}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Public holiday"
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending || !date}
          className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {t.disableDate}
        </button>
      </form>

      {disabledDates.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">
            {t.disabledDatesUpcoming}
          </h3>
          <ul className="space-y-2">
            {disabledDates.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="font-medium">{d.date}</span>
                  {d.reason && (
                    <span className="ml-2 text-sm text-gray-500">
                      — {d.reason}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleEnable(d.date)}
                  disabled={isPending}
                  className="shrink-0 rounded-lg border border-green-600 px-3 py-1.5 text-sm text-green-700 transition hover:bg-green-50 active:scale-[0.98] disabled:opacity-50"
                >
                  {t.reEnable}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {disabledDates.length === 0 && (
        <p className="text-sm text-gray-500">
          {t.noDisabledDates}
        </p>
      )}
    </div>
  );
}
