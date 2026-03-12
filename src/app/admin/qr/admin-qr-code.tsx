"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useT } from "@/lib/i18n-context";

interface AdminQRCodeProps {
  cars: { id: string; name: string; licensePlate: string | null }[];
  initialCarId?: string;
}

export default function AdminQRCode({ cars, initialCarId }: AdminQRCodeProps) {
  const { t } = useT();
  const defaultCar = initialCarId && cars.some((c) => c.id === initialCarId) ? initialCarId : cars[0]?.id ?? "";
  const [selectedCarId, setSelectedCarId] = useState(defaultCar);
  const [copied, setCopied] = useState(false);

  const selectedCar = cars.find((c) => c.id === selectedCarId);
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const tapUrl = `${baseUrl}/api/tap?carId=${selectedCarId}`;

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm shadow-sm transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none sm:py-2.5";

  return (
    <div className="space-y-6">
      {/* Car selector */}
      {cars.length > 1 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t.selectCar}
          </label>
          <select
            value={selectedCarId}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className={inputClass}
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.name}
                {car.licensePlate ? ` (${car.licensePlate})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* QR Code display */}
      <div className="flex flex-col items-center overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="rounded-2xl border-4 border-gray-100 bg-white p-3 sm:p-4">
          <QRCodeSVG value={tapUrl} size={220} level="H" className="h-auto w-full max-w-[220px] sm:max-w-[256px]" />
        </div>

        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {selectedCar?.name}
          </p>
          {selectedCar?.licensePlate && (
            <p className="text-sm text-gray-500">
              {selectedCar.licensePlate}
            </p>
          )}
        </div>

        <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-gray-500">
          {t.qrScanInstructions}
        </p>
      </div>

      {/* URL preview */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 hover:underline">
          {t.viewTapUrl}
        </summary>
        <div className="mt-2 flex items-start gap-2">
          <code className="min-w-0 flex-1 break-all rounded-xl bg-gray-100 p-3 text-xs">
            {tapUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(tapUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700"
            title="Copy URL"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            )}
          </button>
        </div>
      </details>
    </div>
  );
}
