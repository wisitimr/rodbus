"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface QRTabProps {
  cars: { id: string; name: string; licensePlate: string | null }[];
}

export default function QRTab({ cars }: QRTabProps) {
  const { t } = useT();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  function handleCopy(url: string, carId: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(carId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleToggle(carId: string) {
    setExpandedId((prev) => (prev === carId ? null : carId));
  }

  if (cars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t.noCarsRegistered}</p>
    );
  }

  return (
    <div className="space-y-3">
      {cars.map((car) => {
        const tapUrl = `${baseUrl}/api/tap?carId=${car.id}`;
        const isExpanded = expandedId === car.id;
        return (
          <div
            key={car.id}
            className="rounded-2xl border border-border bg-card shadow-sm animate-fade-in"
          >
            {/* Header — always visible */}
            <button
              type="button"
              onClick={() => handleToggle(car.id)}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{car.name}</p>
                  {car.licensePlate && (
                    <p className="text-xs text-muted-foreground">{car.licensePlate}</p>
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Expanded content — QR code + copy link */}
            {isExpanded && (
              <div className="px-4 pb-5 text-center animate-fade-in">
                <div className="mx-auto rounded-xl border-2 border-dashed border-border bg-muted p-4">
                  <QRCodeSVG
                    value={tapUrl}
                    size={200}
                    level="H"
                    className="mx-auto h-auto w-full max-w-[200px]"
                  />
                </div>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
