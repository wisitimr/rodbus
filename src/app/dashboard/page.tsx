import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { SignOutButton } from "@clerk/nextjs";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import CostForm from "./cost-form";
import CostReminderBanner from "./cost-reminder-banner";
import { todayBangkok, startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";

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

  const today = todayBangkok();

  const [myCars, todaysTrips, recentTrips, debts] =
    await Promise.all([
      prisma.car.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, defaultGasCost: true },
      }),
      prisma.trip.findMany({
        where: { userId, date: today },
        include: { car: true },
      }),
      prisma.trip.findMany({
        where: { userId },
        include: { car: true },
        orderBy: { tappedAt: "desc" },
        take: 5,
      }),
      calculateDebts(startOfMonth, endOfMonth),
    ]);

  const carIds = myCars.map((c) => c.id);

  // Find dates with trips for my cars but missing cost entries
  const [tripsForMyCars, costsThisMonth, todayCosts] = myCars.length > 0
    ? await Promise.all([
        prisma.trip.findMany({
          where: {
            carId: { in: carIds },
            date: { gte: startOfMonth, lte: today },
          },
          select: { carId: true, date: true },
        }),
        prisma.dailyCost.findMany({
          where: {
            carId: { in: carIds },
            date: { gte: startOfMonth, lte: today },
          },
          select: { carId: true, date: true },
        }),
        prisma.dailyCost.findMany({
          where: {
            carId: { in: carIds },
            date: today,
          },
        }),
      ])
    : [[], [], []];

  // Build set of carId+date that have costs
  const costSet = new Set(
    costsThisMonth.map((c) => `${c.carId}_${c.date.toISOString().split("T")[0]}`)
  );
  // Find unique carId+date combos from trips that are missing costs
  const missingCostDates = [
    ...new Set(
      tripsForMyCars
        .filter((tr) => !costSet.has(`${tr.carId}_${tr.date.toISOString().split("T")[0]}`))
        .map((tr) => tr.date.toISOString().split("T")[0])
    ),
  ].sort();

  const myDebt = debts.find((d) => d.userId === userId);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      {/* Header */}
      <header className="animate-fade-in mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {t.dashboard}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {t.welcome}, {user.name ?? user.email}
              {isAdmin && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-500/20 ring-inset">
                  {t.admin}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {isAdmin && (
              <a
                href="/admin"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md sm:px-4"
              >
                {t.configure}
              </a>
            )}
            <SignOutButton>
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:shadow-md sm:px-4">
                {t.signOut}
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {myCars.length > 0 && (
        <CostReminderBanner initialMissingDates={missingCostDates} />
      )}

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
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                  <span>
                    {t.accrued}{" "}
                    <span className="font-medium text-gray-700">
                      ฿{myDebt.totalDebt.toFixed(2)}
                    </span>
                  </span>
                  <span>&middot;</span>
                  <span>
                    {t.paid}{" "}
                    <span className="font-medium text-green-600">
                      ฿{myDebt.totalPaid.toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-green-600 sm:text-3xl">
                ฿0.00
                <span className="ml-2 text-base font-normal text-gray-400">
                  {t.allClear}
                </span>
              </p>
            )}

            {myDebt && myDebt.breakdown.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                  {t.viewCostBreakdown}
                </summary>
                <ul className="mt-3 divide-y divide-gray-100 text-sm">
                  {myDebt.breakdown.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-gray-600">
                        {b.carName} &mdash;{" "}
                        {b.date.toLocaleDateString(locale)} ({b.passengerCount} {t.riders})
                      </span>
                      <span className="shrink-0 font-medium text-gray-900">
                        ฿{b.share.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>

        {/* Today's Rides */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.todaysRides}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {todaysTrips.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noRidesToday}</p>
            ) : (
              <ul className="space-y-2">
                {todaysTrips.map((trip) => (
                  <li
                    key={trip.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <span className="font-medium text-gray-800">
                      {trip.car.name}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        trip.type === "MORNING"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 ring-inset"
                          : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 ring-inset"
                      }`}
                    >
                      {trip.type === "MORNING" ? t.morningIn : t.eveningOut}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* History Preview */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.recent}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {recentTrips.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noTripHistory}</p>
            ) : (
              <div className="space-y-2">
                {recentTrips.slice(0, 5).map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">
                        {trip.car.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {trip.date.toLocaleDateString(locale)} &middot;{" "}
                        {trip.tappedAt.toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        trip.type === "MORNING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {trip.type === "MORNING" ? t.morningIn : t.eveningOut}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <a
                href="/dashboard/recent"
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
              >
                {t.viewAll}
              </a>
            </div>
          </div>
        </section>

        {/* Driver: Enter Costs */}
        {myCars.length > 0 && (
          <section id="enter-daily-costs" className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
                {t.enterDailyCosts}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <CostForm
                cars={myCars.map((c) => ({ id: c.id, name: c.name, defaultGasCost: c.defaultGasCost }))}
                existingCosts={todayCosts.map((tc) => ({ carId: tc.carId, gasCost: tc.gasCost, parkingCost: tc.parkingCost }))}
                missingCostDates={missingCostDates}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
