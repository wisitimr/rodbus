"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
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
    <div className="space-y-4">
      {/* QR Code display */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="rounded-2xl border-2 border-border bg-card p-3">
          <QRCodeSVG value={tapUrl} size={220} level="H" className="h-auto w-full max-w-[220px]" />
        </div>

        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-foreground">
            {car.name}
          </p>
          {car.licensePlate && (
            <p className="text-sm text-muted-foreground">
              {car.licensePlate}
            </p>
          )}
        </div>

        <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          {t.qrScanInstructions}
        </p>
      </div>

      {/* URL preview */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:underline">
          {t.viewTapUrl}
        </summary>
        <div className="relative mt-2">
          <input
            type="text"
            readOnly
            value={tapUrl}
            className="w-full rounded-xl border border-border bg-muted py-3 pl-3.5 pr-10 text-xs text-foreground focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(tapUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            title="Copy URL"
          >
            {copied ? (
              <Check className="h-4 w-4 text-settled" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </details>
    </div>
  );
}
