import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateShort } from "@/lib/i18n";
import ManageContent from "./manage-content";
import BottomNav from "@/app/dashboard/bottom-nav";
import { startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";

export default async function ManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;

  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();

  const [allCars, debts] = await Promise.all([
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
      orderBy: { name: "asc" },
    }),
    calculateDebts(startOfMonth, endOfMonth),
  ]);

  const carIds = allCars.map((c) => c.id);
  const ownedCarId = allCars[0]?.id ?? "";

  const serializedDebts = debts
    .map((d) => {
      const myCarBreakdown = d.breakdown.filter((b) => carIds.includes(b.carId));
      const myCarDebt = Math.round(myCarBreakdown.reduce((s, b) => s + b.share, 0) * 100) / 100;
      return {
        userId: d.userId,
        userName: d.userName,
        pendingDebt: Math.round((myCarDebt - d.totalPaid) * 100) / 100,
        totalDebt: myCarDebt,
        totalPaid: d.totalPaid,
        breakdown: myCarBreakdown.map((b) => ({
          carName: b.carName,
          licensePlate: b.licensePlate,
          date: formatDateShort(b.date, locale),
          dateISO: b.date.toISOString().split("T")[0],
          share: b.share,
          gasShare: b.gasShare,
          gasCost: b.gasCost,
          parkingShare: b.parkingShare,
          parkingCost: b.parkingCost,
          totalCost: b.totalCost,
          headcount: b.headcount,
          tripNumber: b.tripNumber,
          passengerNames: b.passengerNames,
          driverName: b.driverName,
        })),
      };
    })
    .filter((d) => d.breakdown.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <header className="animate-fade-in sticky top-0 z-40 -mx-4 mb-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              {t.manageTrips}
            </h1>
            <p className="text-xs text-gray-500">{t.createTripsAndSettle}</p>
          </div>
        </div>
      </header>

      <ManageContent
        cars={allCars.map((c) => ({
          id: c.id,
          name: c.name,
          licensePlate: c.licensePlate,
          defaultGasCost: c.defaultGasCost,
        }))}
        debts={serializedDebts}
        carId={ownedCarId}
        locale={locale}
      />

      <BottomNav isAdmin={true} />
    </main>
  );
}
