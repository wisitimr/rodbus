"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check } from "lucide-react";
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
      <p className="py-8 text-center text-sm text-muted-foreground">{t.noCarsRegistered}</p>
    );
  }

  return (
    <div className="space-y-4">
      {cars.map((car) => {
        const tapUrl = `${baseUrl}/api/tap?carId=${car.id}`;
        return (
          <div
            key={car.id}
            className="rounded-2xl border border-border bg-card p-5 text-center animate-fade-in"
          >
            <p className="font-semibold text-foreground">{car.name}</p>
            {car.licensePlate && (
              <p className="text-sm text-muted-foreground">{car.licensePlate}</p>
            )}

            <div className="mx-auto my-4 rounded-xl border-2 border-dashed border-border bg-muted p-4">
              <QRCodeSVG
                value={tapUrl}
                size={200}
                level="H"
                className="mx-auto h-auto w-full max-w-[200px]"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
              <code className="text-xs text-muted-foreground select-all">
                {tapUrl.replace(/^https?:\/\//, "")}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(tapUrl, car.id)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Copy link"
              >
                {copiedId === car.id ? (
                  <Check className="h-3.5 w-3.5 text-settled" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
