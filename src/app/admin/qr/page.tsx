import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import AdminQRCode from "./admin-qr-code";

export default async function QRPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const myCars = await prisma.car.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, licensePlate: true },
  });

  return (
    <main className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:p-6 sm:pt-8">
      <header className="animate-fade-in mb-6 flex items-start justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            QR Code Check-in
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Show this QR code to passengers who cannot tap NFC
          </p>
        </div>
        <a
          href="/admin"
          className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 sm:px-4"
        >
          Back
        </a>
      </header>

      <div className="animate-fade-in-up">
        {myCars.length === 0 ? (
          <p className="text-gray-500">You have no cars registered.</p>
        ) : (
          <AdminQRCode
            cars={myCars.map((c) => ({
              id: c.id,
              name: c.name,
              licensePlate: c.licensePlate,
            }))}
          />
        )}
      </div>
    </main>
  );
}
