import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { nowBangkok, startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const now = nowBangkok();
  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();

  const [recentTrips, debts, myPayments] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      include: { car: true },
      orderBy: { tappedAt: "desc" },
      take: 50,
    }),
    calculateDebts(startOfMonth, endOfMonth),
    prisma.payment.findMany({
      where: { userId },
      include: { car: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      {/* Header */}
      <header className="animate-fade-in mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
          >
            {t.back}
          </a>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {t.history}
          </h1>
        </div>
      </header>

      <div className="stagger-children space-y-4 sm:space-y-6">
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
                        ฿{p.amount.toFixed(2)}
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
                            ฿{p.amount.toFixed(2)}
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
                        d.userId === user.id
                          ? "bg-blue-50 ring-1 ring-blue-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          {d.userName ?? "Unknown"}
                          {d.userId === user.id && (
                            <span className="ml-1.5 text-xs font-normal text-blue-500">
                              ({t.you})
                            </span>
                          )}
                        </p>
                        <p className="font-bold text-red-600">
                          ฿{d.pendingDebt.toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-gray-500">
                        <span>{t.accrued}: ฿{d.totalDebt.toFixed(2)}</span>
                        <span className="text-green-600">
                          {t.paid}: ฿{d.totalPaid.toFixed(2)}
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
                          className={`${d.userId === user.id ? "bg-blue-50/60 font-semibold" : "hover:bg-gray-50/50"}`}
                        >
                          <td className="py-3 text-gray-800">
                            {d.userName ?? "Unknown"}
                            {d.userId === user.id && (
                              <span className="ml-1.5 text-xs font-normal text-blue-500">
                                ({t.you})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right text-gray-700">
                            ฿{d.totalDebt.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-green-600">
                            ฿{d.totalPaid.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-red-600">
                            ฿{d.pendingDebt.toFixed(2)}
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
      </div>
    </main>
  );
}
