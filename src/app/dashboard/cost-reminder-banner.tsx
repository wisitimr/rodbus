"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-context";

export default function CostReminderBanner({ initialMissingDates }: { initialMissingDates: string[] }) {
  const { t } = useT();
  const [missingDates, setMissingDates] = useState(initialMissingDates);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail;
      setMissingDates(detail);
    }
    window.addEventListener("missing-dates-update", handler);
    return () => window.removeEventListener("missing-dates-update", handler);
  }, []);

  if (missingDates.length === 0) return null;

  return (
    <a
      href="#enter-daily-costs"
      className="animate-fade-in mb-4 block rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 shadow-sm transition hover:bg-amber-100 sm:mb-6"
    >
      <p className="font-medium">{t.costReminderBanner}</p>
      <p className="mt-1 text-xs text-amber-600">
        {t.missingDates}: {missingDates.length <= 3
          ? missingDates.join(", ")
          : `${missingDates.slice(0, 3).join(", ")} ...+${missingDates.length - 3}`}
      </p>
    </a>
  );
}
