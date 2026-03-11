"use client";

import { useTransition } from "react";
import { setSystemPaused } from "@/lib/admin-actions";

interface SystemPauseToggleProps {
  isPaused: boolean;
}

export default function SystemPauseToggle({ isPaused }: SystemPauseToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await setSystemPaused(!isPaused);
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">
          NFC Tap System:{" "}
          <span className={isPaused ? "text-red-600" : "text-green-600"}>
            {isPaused ? "PAUSED" : "ACTIVE"}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          {isPaused
            ? "The system is completely paused. No NFC taps will be recorded."
            : "The system is running normally. NFC taps are being recorded."}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`rounded px-6 py-2 text-sm font-medium text-white disabled:opacity-50 ${
          isPaused
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {isPending ? "..." : isPaused ? "Resume System" : "Pause System"}
      </button>
    </div>
  );
}
