import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { nowBangkok, todayBangkok, startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";
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
  const today = todayBangkok();
  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  const [
    recentTrips,
    dayDebts,
    monthDebts,
    yearDebts,
    dayPayments,
    monthPayments,
    yearPayments,
  ] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      include: { car: true },
      orderBy: { tappedAt: "desc" },
      take: 100,
    }),
    calculateDebts(today, today),
    calculateDebts(startOfMonth, endOfMonth),
    calculateDebts(startOfYear, endOfYear),
    prisma.payment.findMany({
      where: { date: today },
      include: { car: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { car: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { date: { gte: startOfYear, lte: endOfYear } },
      include: { car: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const trips = recentTrips.map((trip) => ({
    id: trip.id,
    carName: trip.car.name,
    date: trip.date.toLocaleDateString(locale),
    dateISO: trip.date.toISOString().split("T")[0],
    time: trip.tappedAt.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    type: trip.type as "MORNING" | "EVENING",
  }));

  const serializeDebts = (debts: typeof dayDebts) =>
    debts.map((d) => ({
      userId: d.userId,
      userName: d.userName,
      totalDebt: d.totalDebt,
      totalPaid: d.totalPaid,
      pendingDebt: d.pendingDebt,
    }));

  const serializePayments = (payments: typeof dayPayments) =>
    payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      carName: p.car.name,
      date: p.date.toLocaleDateString(locale),
      amount: p.amount,
      note: p.note,
    }));

  const monthLabel = now.toLocaleString(locale, { month: "long" });
  const todayLabel = today.toLocaleDateString(locale);
  const yearLabel = String(now.getFullYear());

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
        dayDebts={serializeDebts(dayDebts)}
        monthDebts={serializeDebts(monthDebts)}
        yearDebts={serializeDebts(yearDebts)}
        dayPayments={serializePayments(dayPayments)}
        monthPayments={serializePayments(monthPayments)}
        yearPayments={serializePayments(yearPayments)}
        currentUserId={userId}
        todayLabel={todayLabel}
        monthLabel={monthLabel}
        yearLabel={yearLabel}
        t={{
          trips: t.trips,
          summary: t.summary,
          day: t.day,
          month: t.month,
          year: t.year,
          noTripHistory: t.noTripHistory,
          noPayments: t.noPayments,
          noCostsToday: t.noCostsToday,
          noCostsThisMonth: t.noCostsThisMonth,
          noCostsThisYear: t.noCostsThisYear,
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
          paymentHistory: t.paymentHistory,
        }}
      />
    </main>
  );
}
