import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateMedium, type Locale } from "@/lib/i18n";
import { Home } from "lucide-react";
import ProfileMenu from "./profile-menu";
import DashboardContent from "./dashboard-content";
import { startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";
import { unstable_cache } from "next/cache";

async function fetchDashboardData(userId: string, isAdmin: boolean) {
  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();

  const [debts, recentTrips] = await Promise.all([
    calculateDebts(startOfMonth, endOfMonth),
    prisma.trip.findMany({
      where: isAdmin
        ? {}
        : { checkIns: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        car: { select: { name: true, licensePlate: true } },
        checkIns: { select: { id: true } },
      },
    }),
  ]);

  // Compute trip numbers for each trip within same car+date (batch query)
  const carDatePairs = [...new Map(
    recentTrips.map(t => [`${t.carId}-${t.date.toISOString().split("T")[0]}`, { carId: t.carId, date: t.date }])
  ).values()];

  const allRelatedTrips = carDatePairs.length > 0
    ? await prisma.trip.findMany({
        where: { OR: carDatePairs.map(p => ({ carId: p.carId, date: p.date })) },
        orderBy: { createdAt: "asc" },
        select: { id: true, carId: true, date: true },
      })
    : [];

  const carDateTrips = new Map<string, string[]>();
  for (const t of allRelatedTrips) {
    const key = `${t.carId}-${t.date.toISOString().split("T")[0]}`;
    if (!carDateTrips.has(key)) carDateTrips.set(key, []);
    carDateTrips.get(key)!.push(t.id);
  }

  const tripNumbers: Record<string, number> = {};
  for (const trip of recentTrips) {
    const cdKey = `${trip.carId}-${trip.date.toISOString().split("T")[0]}`;
    const idx = (carDateTrips.get(cdKey) ?? []).indexOf(trip.id);
    if (idx >= 0) tripNumbers[trip.id] = idx + 1;
  }

  return { debts, recentTrips, tripNumbers };
}

const getCachedDashboardData = unstable_cache(
  fetchDashboardData,
  ["dashboard-data"],
  { tags: ["dashboard"], revalidate: 60 }
);

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const isAdmin = user.role === Role.ADMIN;

  const { debts, recentTrips, tripNumbers } = await getCachedDashboardData(userId, isAdmin);

  const myDebt = debts.find((d) => d.userId === userId);

  // Compute pending breakdown entries
  const pendingEntries = (() => {
    if (!myDebt || myDebt.pendingDebt <= 0) return [];
    const sorted = [...myDebt.breakdown].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let remaining = myDebt.totalPaid;
    const pending: typeof sorted = [];
    for (const entry of sorted) {
      if (remaining >= entry.share) {
        remaining = Math.round((remaining - entry.share) * 100) / 100;
      } else if (remaining > 0) {
        const ratio = (entry.share - remaining) / entry.share;
        pending.push({
          ...entry,
          share: Math.round((entry.share - remaining) * 100) / 100,
          gasShare: Math.round(entry.gasShare * ratio * 100) / 100,
          parkingShare: Math.round(entry.parkingShare * ratio * 100) / 100,
        });
        remaining = 0;
      } else {
        pending.push(entry);
      }
    }
    pending.reverse();
    return pending;
  })();

  // Format debt entries for client component
  const debtEntries = pendingEntries.map((b) => ({
    date: formatDateMedium(new Date(b.date), locale),
    carName: b.carName,
    licensePlate: b.licensePlate,
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
    sharedParking: b.sharedParking ? {
      trips: b.sharedParking.trips.map((d) => ({
        carName: d.carName,
        date: formatDateMedium(new Date(d.date), locale as Locale),
        parkingCost: d.parkingCost,
        headcount: d.headcount,
      })),
      uniqueNames: b.sharedParking.uniqueNames,
      totalParking: b.sharedParking.totalParking,
      parkingHeadcount: b.sharedParking.parkingHeadcount,
    } : null,
  }));

  // Format recent trips for client component
  const formattedRecentTrips = recentTrips.map((trip) => ({
    id: trip.id,
    date: formatDateMedium(new Date(trip.date), locale),
    time: new Date(trip.createdAt).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }),
    carName: trip.car.name,
    licensePlate: trip.car.licensePlate,
    gasCost: trip.gasCost,
    parkingCost: trip.parkingCost,
    riderCount: trip.checkIns.length + 1,
    tripNumber: tripNumbers[trip.id] ?? 1,
  }));

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                RodBus
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.welcome}, {user.name ?? user.email}
              </p>
            </div>
          </div>
          <ProfileMenu
            image={user.image}
            name={user.name}
            email={user.email}
            role={user.role}
            isAdmin={isAdmin}
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <DashboardContent
          pendingDebt={myDebt?.pendingDebt ?? 0}
          pendingCount={pendingEntries.length}
          debtEntries={debtEntries}
          recentTrips={formattedRecentTrips}
        />
      </main>
    </>
  );
}
