import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateShort } from "@/lib/i18n";
import CostForm from "./cost-form";
import ProfileMenu from "./profile-menu";
import DebtSettlement from "./debt-settlement";
import PendingBreakdown from "./pending-breakdown";
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

  const [allCars, ownedCar, recentTrips, debts] =
    await Promise.all([
      prisma.car.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, defaultGasCost: true },
        orderBy: { name: "asc" },
      }),
      prisma.car.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      }),
      prisma.trip.findMany({
        ...(isAdmin ? {} : { where: { userId } }),
        include: { car: true, user: { select: { name: true } } },
        orderBy: { tappedAt: "desc" },
        take: 5,
      }),
      calculateDebts(startOfMonth, endOfMonth),
    ]);

  const carIds = allCars.map((c) => c.id);

  const myDebt = debts.find((d) => d.userId === userId);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
      {/* Header */}
      <header className="animate-fade-in sticky top-0 z-50 -mx-4 mb-6 bg-gray-50 px-4 py-3 sm:-mx-6 sm:mb-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {t.dashboard}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {t.welcome}, {user.name ?? user.email}
            </p>
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

      <div className="stagger-children space-y-4 sm:space-y-6">
        {/* Debt Card */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.yourPendingDebt}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {myDebt && myDebt.pendingDebt > 0 ? (
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-red-600 sm:text-4xl">
                  ฿{myDebt.pendingDebt.toFixed(2)}
                </p>

                {(() => {
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
                  if (pending.length === 0) return null;
                  return (
                    <PendingBreakdown
                      entries={pending.map((b) => ({
                        carName: b.carName,
                        date: formatDateShort(b.date, locale),
                        share: b.share,
                        gasShare: b.gasShare,
                        gasCost: b.gasCost,
                        parkingShare: b.parkingShare,
                        parkingCost: b.parkingCost,
                        totalCost: b.totalCost,
                        headcount: b.headcount,
                      }))}
                    />
                  );
                })()}
              </div>
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-green-600 sm:text-3xl">
                ฿0.00
                <span className="ml-2 text-base font-normal text-gray-400">
                  {t.allClear}
                </span>
              </p>
            )}
          </div>
        </section>

        {/* Recent */}
        {recentTrips.length > 0 && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
                {t.recent}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                {(() => {
                  const recent = recentTrips.slice(0, 5);
                  const countByDate = new Map<string, number>();
                  return recent.map((trip) => {
                    const dateKey = trip.date.toISOString().split("T")[0];
                    const num = (countByDate.get(dateKey) ?? 0) + 1;
                    countByDate.set(dateKey, num);
                    return (
                      <div
                        key={trip.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition hover:border-gray-200 hover:shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800">
                            {t.tripNumber} #{num} <span className="font-normal text-gray-400">&middot;</span> <span className="font-normal text-gray-500">{trip.car.name}</span>
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                            <span>
                              {formatDateShort(trip.date, locale)} &middot;{" "}
                              {trip.tappedAt.toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isAdmin && trip.user?.name && (
                              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">
                                {trip.user.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="mt-4">
                <a
                  href="/dashboard/history"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
                >
                  {t.viewAll}
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Driver: New Trip */}
        {ownedCar && allCars.length > 0 && (
          <section id="enter-daily-costs" className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
                {t.newTrip}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <CostForm
                cars={allCars.map((c) => ({ id: c.id, name: c.name, defaultGasCost: c.defaultGasCost }))}
              />
            </div>
          </section>
        )}

        {/* Debt Settlement (admin only) */}
        {isAdmin && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
                {t.debtSettlement}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <DebtSettlement
                debts={debts
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
                        date: formatDateShort(b.date, locale),
                        share: b.share,
                        gasShare: b.gasShare,
                        gasCost: b.gasCost,
                        parkingShare: b.parkingShare,
                        parkingCost: b.parkingCost,
                        headcount: b.headcount,
                      })),
                    };
                  })
                  .filter((d) => d.breakdown.length > 0)}
                carId={ownedCar?.id ?? allCars[0]?.id ?? ""}
              />
            </div>
          </section>
        )}
      </div>

    </main>
  );
}
