"use client";

import { useState, useTransition } from "react";
import { disableDate, enableDate } from "@/lib/admin-actions";

interface DateManagementProps {
  disabledDates: { id: string; date: string; reason: string | null }[];
}

export default function DateManagement({ disabledDates }: DateManagementProps) {
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleDisable} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Public holiday"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending || !date}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Disable Date
        </button>
      </form>

      {disabledDates.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">
            Disabled Dates (upcoming)
          </h3>
          <ul className="space-y-2">
            {disabledDates.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md bg-red-50 px-4 py-2"
              >
                <div>
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
                  className="rounded border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  Re-enable
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {disabledDates.length === 0 && (
        <p className="text-sm text-gray-500">
          No upcoming dates are disabled. The system is operating normally.
        </p>
      )}
    </div>
  );
}
