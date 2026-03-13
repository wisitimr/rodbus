"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useT } from "@/lib/i18n-context";

interface QRTabProps {
  cars: { id: string; name: string; licensePlate: string | null }[];
}

export default function QRTab({ cars }: QRTabProps) {
  const { t } = useT();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  function handleCopy(url: string, carId: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(carId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (cars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">{t.noCarsRegistered}</p>
    );
  }

  return (
    <div className="space-y-6">
      {cars.map((car) => {
        const tapUrl = `${baseUrl}/api/tap?carId=${car.id}`;
        return (
          <div
            key={car.id}
            className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <p className="text-lg font-semibold text-gray-900">{car.name}</p>
            {car.licensePlate && (
              <p className="text-sm text-gray-500">{car.licensePlate}</p>
            )}

            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <QRCodeSVG
                value={tapUrl}
                size={200}
                level="H"
                className="h-auto w-full max-w-[200px]"
              />
            </div>

            <div className="mt-4 flex w-full items-center gap-2 rounded-xl bg-gray-50 px-4 py-2">
              <code className="min-w-0 flex-1 truncate text-xs text-gray-500">
                {tapUrl.replace(/^https?:\/\//, "")}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(tapUrl, car.id)}
                className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:text-gray-600"
              >
                {copiedId === car.id ? (
                  <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
