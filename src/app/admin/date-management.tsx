"use client";

import { useState } from "react";
import { disableDate, enableDate } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

function fmtDate(iso: string, locale: string) {
  if (!iso) return "";
  const loc = locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
  return new Date(iso + "T00:00:00").toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
}

interface DateManagementProps {
  disabledDates: { id: string; date: string; reason: string | null }[];
}

export default function DateManagement({ disabledDates }: DateManagementProps) {
  const { t, locale } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const isAnyLoading = loadingAction !== null;

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;

    setLoadingAction("disable");
    try {
      await disableDate(date, reason || undefined);
      setDate("");
      setReason("");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleEnable(dateStr: string) {
    setLoadingAction(`enable-${dateStr}`);
    try {
      await enableDate(dateStr);
    } finally {
      setLoadingAction(null);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm";

  return (
    <div className="space-y-4">
      <form onSubmit={handleDisable} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.date}
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} absolute inset-0 z-10 cursor-pointer opacity-0`}
                required
              />
              <div className={inputClass}>
                {date ? fmtDate(date, locale) : <span className="text-muted-foreground">{t.selectDate}</span>}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
          disabled={isAnyLoading || !date}
          className="w-full rounded-xl bg-debt px-4 py-3 text-sm font-medium text-white transition hover:bg-debt/90 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
        >
          {t.disableDate}{loadingAction === "disable" && "..."}
        </button>
      </form>

      {disabledDates.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t.disabledDatesUpcoming}
          </h3>
          <ul className="space-y-2">
            {disabledDates.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-debt/5 border border-debt/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{fmtDate(d.date, locale)}</span>
                  {d.reason && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      — {d.reason}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleEnable(d.date)}
                  disabled={isAnyLoading}
                  className="shrink-0 rounded-lg border border-settled px-3 py-1.5 text-sm text-settled transition hover:bg-settled/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {t.reEnable}{loadingAction === `enable-${d.date}` && "..."}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {disabledDates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t.noDisabledDates}
        </p>
      )}
    </div>
  );
}
