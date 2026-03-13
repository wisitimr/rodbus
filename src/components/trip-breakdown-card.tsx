"use client";

export interface BreakdownCardEntry {
  date: string;
  carName: string;
  licensePlate: string | null;
  share: number;
  gasShare: number;
  gasCost: number;
  parkingShare: number;
  parkingCost: number;
  totalCost: number;
  headcount: number;
  tripNumber: number;
  passengerNames: string[];
  driverName: string | null;
}

interface TripBreakdownCardProps {
  entry: BreakdownCardEntry;
  isExpanded: boolean;
  onToggle: () => void;
  status?: "pending" | "paid";
  t: {
    pending: string;
    paid?: string;
    tripNumber: string;
    people: string;
    gas: string;
    parking: string;
    total: string;
    driver?: string;
  };
}

export default function TripBreakdownCard({
  entry,
  isExpanded,
  onToggle,
  status = "pending",
  t,
}: TripBreakdownCardProps) {
  const plateLabel = entry.licensePlate ? ` (${entry.licensePlate})` : "";
  const isPending = status === "pending";
  const amountColor = isPending ? "text-red-600" : "text-green-600";

  const allNames = [...entry.passengerNames];
  if (entry.driverName && !allNames.includes(entry.driverName)) {
    allNames.push(entry.driverName);
  }
  const nameList = allNames
    .map((n) => (n === entry.driverName ? `${n} (${t.driver ?? "Driver"})` : n))
    .join(", ");

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{entry.date}</span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                isPending
                  ? "bg-red-50 text-red-600 ring-red-500/20"
                  : "bg-green-50 text-green-600 ring-green-500/20"
              }`}
            >
              {isPending ? t.pending : (t.paid ?? "Paid")}
            </span>
          </div>
          <p className="mt-1 font-semibold text-gray-900">
            {entry.carName}
            {plateLabel && (
              <span className="ml-1 font-normal text-gray-400">{plateLabel}</span>
            )}
            <span className="ml-2 text-sm font-normal text-blue-500">
              {t.tripNumber} #{entry.tripNumber}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-3">
          <span className={`text-lg font-bold ${amountColor}`}>
            &#3647;{entry.share.toFixed(2)}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {/* People */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <span className="font-medium">{entry.headcount} {t.people}</span>
            </div>
            <p className="mt-0.5 pl-5.5 text-xs text-gray-400">{nameList}</p>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-2 text-sm">
            {entry.gasShare > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  {t.gas}
                </div>
                <span className="text-gray-700">
                  <span className="line-through text-gray-300">&#3647;{entry.gasCost.toFixed(2)}</span>
                  {" "}/ {entry.headcount} = <span className="font-semibold text-gray-900">&#3647;{entry.gasShare.toFixed(2)}</span>
                </span>
              </div>
            )}
            {entry.parkingShare > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0-8.25a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 0115 6.75v0A2.25 2.25 0 0112.75 9h-1.5A2.25 2.25 0 019 6.75zM9 15v3.75m0 0h6m-6 0H6" />
                  </svg>
                  {t.parking}
                </div>
                <span className="text-gray-700">
                  <span className="line-through text-gray-300">&#3647;{entry.parkingCost.toFixed(2)}</span>
                  {" "}/ {entry.headcount} = <span className="font-semibold text-gray-900">&#3647;{entry.parkingShare.toFixed(2)}</span>
                </span>
              </div>
            )}
            {/* Total */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-2 font-semibold">
              <span className="text-gray-700">{t.total}</span>
              <span className="text-gray-700">
                <span className="line-through font-normal text-gray-300">&#3647;{entry.totalCost.toFixed(2)}</span>
                {" "}/ {entry.headcount} = <span className="text-gray-900">&#3647;{entry.share.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
