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

  if (!carId) redirect("/admin");

  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: { id: true, name: true, licensePlate: true },
  });

  if (!car) redirect("/admin");

  return (
    <main className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:p-6 sm:pt-8">
      <header className="animate-fade-in sticky top-0 z-50 -mx-4 mb-6 flex items-center bg-gray-50/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:mb-8 sm:px-6">
        <a
          href="/admin"
          className="shrink-0 rounded-xl bg-gray-900 p-2 text-white shadow-sm transition hover:bg-gray-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </a>
        <h1 className="flex-1 text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          {t.qrCodeCheckin}
        </h1>
        <div className="w-9" />
      </header>

      <div className="animate-fade-in-up">
        <AdminQRCode car={car} />
      </div>
    </main>
  );
}
