import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { SignOutButton } from "@clerk/nextjs";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import CostForm from "./cost-form";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const isAdmin = user.role === Role.ADMIN;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [myCars, todaysTrips, recentTrips, debts, myPayments] =
    await Promise.all([
      prisma.car.findMany({ where: { ownerId: userId } }),
      prisma.trip.findMany({
        where: { userId, date: today },
        include: { car: true },
      }),
      prisma.trip.findMany({
        where: { userId },
        include: { car: true },
        orderBy: { tappedAt: "desc" },
        take: 20,
      }),
      calculateDebts(startOfMonth, endOfMonth),
      prisma.payment.findMany({
        where: { userId },
        include: { car: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

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
                className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md sm:px-4"
              >
                {t.admin}
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
                  ${myDebt.pendingDebt.toFixed(2)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                  <span>
                    {t.accrued}{" "}
                    <span className="font-medium text-gray-700">
                      ${myDebt.totalDebt.toFixed(2)}
                    </span>
                  </span>
                  <span>&middot;</span>
                  <span>
                    {t.paid}{" "}
                    <span className="font-medium text-green-600">
                      ${myDebt.totalPaid.toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-green-600 sm:text-3xl">
                $0.00
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
                        ${b.share.toFixed(2)}
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

        {/* Recent Trips */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.recentTrips}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {recentTrips.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noTripHistory}</p>
            ) : (
              <>
                {/* Mobile: card layout */}
                <div className="space-y-2 sm:hidden">
                  {recentTrips.map((trip) => (
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
                        {trip.type === "MORNING" ? "AM" : "PM"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop: table layout */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">{t.date}</th>
                        <th className="pb-3 font-semibold">{t.time}</th>
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 text-right font-semibold">{t.type}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentTrips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-gray-50/50">
                          <td className="py-3 text-gray-700">
                            {trip.date.toLocaleDateString(locale)}
                          </td>
                          <td className="py-3 text-gray-500">
                            {trip.tappedAt.toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 font-medium text-gray-800">
                            {trip.car.name}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                trip.type === "MORNING"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {trip.type === "MORNING" ? t.morning : t.evening}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Payment History */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.paymentHistory}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {myPayments.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noPayments}</p>
            ) : (
              <>
                {/* Mobile: card layout */}
                <div className="space-y-2 sm:hidden">
                  {myPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">
                          {p.car.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.date.toLocaleDateString(locale)}
                          {p.note && <> &middot; {p.note}</>}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-green-600">
                        ${p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop: table layout */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">{t.date}</th>
                        <th className="pb-3 font-semibold">{t.car}</th>
                        <th className="pb-3 font-semibold">{t.note}</th>
                        <th className="pb-3 text-right font-semibold">{t.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="py-3 text-gray-700">
                            {p.date.toLocaleDateString(locale)}
                          </td>
                          <td className="py-3 font-medium text-gray-800">
                            {p.car.name}
                          </td>
                          <td className="py-3 text-gray-400">
                            {p.note ?? "\u2014"}
                          </td>
                          <td className="py-3 text-right font-semibold text-green-600">
                            ${p.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Monthly Summary */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
              {t.monthlySummary} &mdash;{" "}
              {now.toLocaleString(locale, { month: "long" })}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {debts.length === 0 ? (
              <p className="text-sm text-gray-400">
                {t.noCostsThisMonth}
              </p>
            ) : (
              <>
                {/* Mobile: card layout */}
                <div className="space-y-2 sm:hidden">
                  {debts.map((d) => (
                    <div
                      key={d.userId}
                      className={`rounded-xl px-4 py-3 ${
                        d.userId === userId
                          ? "bg-blue-50 ring-1 ring-blue-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          {d.userName ?? "Unknown"}
                          {d.userId === userId && (
                            <span className="ml-1.5 text-xs font-normal text-blue-500">
                              ({t.you})
                            </span>
                          )}
                        </p>
                        <p className="font-bold text-red-600">
                          ${d.pendingDebt.toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-gray-500">
                        <span>{t.accrued}: ${d.totalDebt.toFixed(2)}</span>
                        <span className="text-green-600">
                          {t.paid}: ${d.totalPaid.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table layout */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">{t.passenger}</th>
                        <th className="pb-3 text-right font-semibold">{t.accrued}</th>
                        <th className="pb-3 text-right font-semibold">{t.paid}</th>
                        <th className="pb-3 text-right font-semibold">{t.pending}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {debts.map((d) => (
                        <tr
                          key={d.userId}
                          className={`${d.userId === userId ? "bg-blue-50/60 font-semibold" : "hover:bg-gray-50/50"}`}
                        >
                          <td className="py-3 text-gray-800">
                            {d.userName ?? "Unknown"}
                            {d.userId === userId && (
                              <span className="ml-1.5 text-xs font-normal text-blue-500">
                                ({t.you})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right text-gray-700">
                            ${d.totalDebt.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-green-600">
                            ${d.totalPaid.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-red-600">
                            ${d.pendingDebt.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Driver: Enter Costs */}
        {myCars.length > 0 && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:text-sm">
                {t.enterDailyCosts}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <CostForm cars={myCars.map((c) => ({ id: c.id, name: c.name }))} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
