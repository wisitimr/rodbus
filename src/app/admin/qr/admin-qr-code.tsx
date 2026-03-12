"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useT } from "@/lib/i18n-context";

interface AdminQRCodeProps {
  car: { id: string; name: string; licensePlate: string | null };
}

export default function AdminQRCode({ car }: AdminQRCodeProps) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const tapUrl = `${baseUrl}/api/tap?carId=${car.id}`;

  return (
    <div className="space-y-6">
      {/* QR Code display */}
      <div className="flex flex-col items-center overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="rounded-2xl border-4 border-gray-100 bg-white p-3 sm:p-4">
          <QRCodeSVG value={tapUrl} size={220} level="H" className="h-auto w-full max-w-[220px] sm:max-w-[256px]" />
        </div>

        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {car.name}
          </p>
          {car.licensePlate && (
            <p className="text-sm text-gray-500">
              {car.licensePlate}
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
        <div className="relative mt-2">
          <input
            type="text"
            readOnly
            value={tapUrl}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-3.5 pr-10 text-xs text-gray-700 shadow-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(tapUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
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
