import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { nowBangkok, startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";
import HistoryContent from "./history-content";

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

  const trips = recentTrips.map((trip) => ({
    id: trip.id,
    carName: trip.car.name,
    date: trip.date.toLocaleDateString(locale),
    time: trip.tappedAt.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    type: trip.type as "MORNING" | "EVENING",
  }));

  const payments = myPayments.map((p) => ({
    id: p.id,
    carName: p.car.name,
    date: p.date.toLocaleDateString(locale),
    amount: p.amount,
    note: p.note,
  }));

  const debtData = debts.map((d) => ({
    userId: d.userId,
    userName: d.userName,
    totalDebt: d.totalDebt,
    totalPaid: d.totalPaid,
    pendingDebt: d.pendingDebt,
  }));

  const monthLabel = now.toLocaleString(locale, { month: "long" });

  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      <header className="animate-fade-in relative mb-6 flex items-center justify-center sm:mb-8">
        <a
          href="/dashboard"
          className="absolute left-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 sm:px-4"
        >
          {t.back}
        </a>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          {t.history}
        </h1>
      </header>

      <HistoryContent
        trips={trips}
        payments={payments}
        debts={debtData}
        currentUserId={userId}
        monthLabel={monthLabel}
        t={{
          trips: t.trips,
          payments: t.payments,
          monthlySummary: t.monthlySummary,
          noTripHistory: t.noTripHistory,
          noPayments: t.noPayments,
          noCostsThisMonth: t.noCostsThisMonth,
          date: t.date,
          time: t.time,
          car: t.car,
          type: t.type,
          morning: t.morning,
          evening: t.evening,
          note: t.note,
          amount: t.amount,
          passenger: t.passenger,
          accrued: t.accrued,
          paid: t.paid,
          pending: t.pending,
          you: t.you,
        }}
      />
    </main>
  );
}
