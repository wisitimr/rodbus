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
    <main className="mx-auto max-w-xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QR Code Check-in</h1>
          <p className="text-sm text-gray-500">
            Show this QR code to passengers who cannot tap NFC
          </p>
        </div>
        <a
          href="/admin"
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          Back
        </a>
      </header>

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
    </main>
  );
}
