"use client";

import { useTransition } from "react";
import { setSystemPaused } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";

interface SystemPauseToggleProps {
  isPaused: boolean;
}

export default function SystemPauseToggle({ isPaused }: SystemPauseToggleProps) {
  const { t } = useT();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await setSystemPaused(!isPaused);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">
          {t.nfcTapSystem}:{" "}
          <span className={isPaused ? "text-red-600" : "text-green-600"}>
            {isPaused ? t.paused : t.active}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {isPaused ? t.systemPausedDesc : t.systemActiveDesc}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`w-full shrink-0 rounded-xl px-6 py-3 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-2 ${
          isPaused
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {isPending ? "..." : isPaused ? t.resumeSystem : t.pauseSystem}
      </button>
    </div>
  );
}
