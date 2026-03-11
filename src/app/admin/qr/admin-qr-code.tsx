"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface AdminQRCodeProps {
  cars: { id: string; name: string; licensePlate: string | null }[];
}

export default function AdminQRCode({ cars }: AdminQRCodeProps) {
  const [selectedCarId, setSelectedCarId] = useState(cars[0]?.id ?? "");

  const selectedCar = cars.find((c) => c.id === selectedCarId);
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const tapUrl = `${baseUrl}/api/tap?carId=${selectedCarId}`;

  return (
    <div className="space-y-6">
      {/* Car selector */}
      {cars.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-medium">Select Car</label>
          <select
            value={selectedCarId}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
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
      <div className="flex flex-col items-center rounded-lg bg-white p-8 shadow">
        <div className="rounded-lg border-4 border-gray-100 bg-white p-4">
          <QRCodeSVG value={tapUrl} size={256} level="H" />
        </div>

        <div className="mt-4 text-center">
          <p className="text-lg font-semibold">
            {selectedCar?.name}
          </p>
          {selectedCar?.licensePlate && (
            <p className="text-sm text-gray-500">
              {selectedCar.licensePlate}
            </p>
          )}
        </div>

        <p className="mt-4 max-w-xs text-center text-sm text-gray-500">
          Passengers scan this code with their phone camera to check in.
          It works exactly like the NFC sticker.
        </p>
      </div>

      {/* URL preview */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 hover:underline">
          View tap URL
        </summary>
        <code className="mt-1 block break-all rounded bg-gray-100 p-2 text-xs">
          {tapUrl}
        </code>
      </details>
    </div>
  );
}
