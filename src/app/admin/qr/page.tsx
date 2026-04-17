import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupRole } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import AdminQRCode from "./admin-qr-code";

export default async function QRPage({
  searchParams,
}: {
  searchParams: Promise<{ carId?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeMembership) redirect("/join");
  if (ctx.activeMembership.role !== GroupRole.ADMIN) redirect("/dashboard");

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
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <a
            href="/admin"
            className="shrink-0 rounded-xl bg-foreground p-2 text-background shadow-sm transition hover:bg-foreground/90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <h1 className="flex-1 text-center text-lg font-bold text-foreground">
            {t.qrCodeCheckin}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <AdminQRCode car={car} />
      </main>
    </div>
  );
}
