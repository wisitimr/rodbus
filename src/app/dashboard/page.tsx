import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateMedium } from "@/lib/i18n";
import ProfileMenu from "./profile-menu";
import DashboardContent from "./dashboard-content";
import BottomNav from "./bottom-nav";
import { startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const isAdmin = user.role === Role.ADMIN;

  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();

  const [debts, recentTrips] = await Promise.all([
    calculateDebts(startOfMonth, endOfMonth),
    prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        car: { select: { name: true, licensePlate: true } },
        checkIns: { select: { id: true } },
      },
    }),
  ]);

  const myDebt = debts.find((d) => d.userId === userId);

  // Compute pending breakdown entries
  const pendingEntries = (() => {
    if (!myDebt || myDebt.pendingDebt <= 0) return [];
    const sorted = [...myDebt.breakdown].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
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
    date: formatDateMedium(b.date, locale),
    carName: b.carName,
    licensePlate: b.licensePlate,
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
  }));

  // Compute trip numbers for each trip within same car+date
  const tripNumberMap = new Map<string, number>();
  const seen = new Set<string>();
  const carDateTrips = new Map<string, string[]>();
  for (const trip of recentTrips) {
    const cdKey = `${trip.carId}-${trip.date.toISOString().split("T")[0]}`;
    if (!seen.has(cdKey)) {
      seen.add(cdKey);
      const all = await prisma.trip.findMany({
        where: { carId: trip.carId, date: trip.date },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      carDateTrips.set(cdKey, all.map((t) => t.id));
    }
    const idx = (carDateTrips.get(cdKey) ?? []).indexOf(trip.id);
    if (idx >= 0) tripNumberMap.set(trip.id, idx + 1);
  }

  // Format recent trips for client component
  const formattedRecentTrips = recentTrips.map((trip) => ({
    id: trip.id,
    date: formatDateMedium(trip.date, locale),
    time: trip.createdAt.toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }),
    carName: trip.car.name,
    licensePlate: trip.car.licensePlate,
    gasCost: trip.gasCost,
    parkingCost: trip.parkingCost,
    riderCount: trip.checkIns.length + 1,
    tripNumber: tripNumberMap.get(trip.id) ?? 1,
  }));

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
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

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
