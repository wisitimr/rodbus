import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateShort, formatDateMedium } from "@/lib/i18n";
import { ClipboardList } from "lucide-react";
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

  const [allCars, debts, recentTripsRaw] = await Promise.all([
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
      orderBy: { name: "asc" },
    }),
    calculateDebts(startOfMonth, endOfMonth),
    prisma.trip.findMany({
      where: {
        car: { ownerId: userId },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        car: { select: { name: true, licensePlate: true } },
        checkIns: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
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
          parkingHeadcount: b.parkingHeadcount,
          tripNumber: b.tripNumber,
          passengerNames: b.passengerNames,
          driverName: b.driverName,
          sharedParkingTripIds: b.sharedParkingTripIds,
          sharedParkingNames: b.sharedParkingNames,
        })),
      };
    })
    .filter((d) => d.breakdown.length > 0);

  const recentTripsForSharing = recentTripsRaw.map((trip) => ({
    id: trip.id,
    carName: trip.car.name,
    licensePlate: trip.car.licensePlate,
    date: formatDateMedium(trip.date, locale),
    gasCost: trip.gasCost,
    parkingCost: trip.parkingCost,
    headcount: trip.checkIns.length + 1,
  }));

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t.manageTrips}
            </h1>
            <p className="text-xs text-muted-foreground">{t.createTripsAndSettle}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
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
        recentTrips={recentTripsForSharing}
      />
      </main>

      <BottomNav isAdmin={true} />
    </div>
  );
}
