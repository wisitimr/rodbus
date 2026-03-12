import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import AdminQRCode from "./admin-qr-code";

export default async function QRPage({
  searchParams,
}: {
  searchParams: Promise<{ carId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const { carId } = await searchParams;

  const allCars = await prisma.car.findMany({
    select: { id: true, name: true, licensePlate: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:p-6 sm:pt-8">
      <header className="animate-fade-in relative mb-6 flex items-center justify-center sm:mb-8">
        <a
          href="/admin"
          className="absolute left-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 sm:px-4"
        >
          {t.back}
        </a>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          {t.qrCodeCheckin}
        </h1>
      </header>

      <div className="animate-fade-in-up">
        {allCars.length === 0 ? (
          <p className="text-gray-500">{t.noCarsRegistered}</p>
        ) : (
          <AdminQRCode
            cars={allCars.map((c) => ({
              id: c.id,
              name: c.name,
              licensePlate: c.licensePlate,
            }))}
            initialCarId={carId}
          />
        )}
      </div>
    </main>
  );
}
