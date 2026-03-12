import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import HistoryContent from "./history-content";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;

  // Fetch all-time data for summary (breakdown has per-date granularity)
  const allTimeStart = new Date(2000, 0, 1);
  const allTimeEnd = new Date(2099, 11, 31);

  const [recentTrips, allDebts, allPayments] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      include: { car: true },
      orderBy: { tappedAt: "desc" },
      take: 100,
    }),
    calculateDebts(allTimeStart, allTimeEnd),
    prisma.payment.findMany({
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
    type: trip.type as "OUTBOUND" | "RETURN",
  }));

  // Serialize debts with breakdown dates as ISO strings
  const serializedDebts = allDebts.map((d) => ({
    userId: d.userId,
    userName: d.userName,
    totalDebt: d.totalDebt,
    totalPaid: d.totalPaid,
    pendingDebt: d.pendingDebt,
    breakdown: d.breakdown.map((b) => ({
      date: b.date.toISOString().split("T")[0],
      share: b.share,
      gasShare: b.gasShare,
      parkingShare: b.parkingShare,
      outboundCount: b.outboundCount,
      returnCount: b.returnCount,
    })),
  }));

  const serializedPayments = allPayments.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: p.user.name,
    carName: p.car.name,
    date: p.date.toLocaleDateString(locale),
    dateISO: p.date.toISOString().split("T")[0],
    amount: p.amount,
    note: p.note,
  }));

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
        allDebts={serializedDebts}
        allPayments={serializedPayments}
        currentUserId={userId}
        t={{
          trips: t.trips,
          payments: t.payments,
          summary: t.summary,
          day: t.day,
          month: t.month,
          year: t.year,
          noTripHistory: t.noTripHistory,
          noPayments: t.noPayments,
          noData: t.noData,
          date: t.date,
          time: t.time,
          car: t.car,
          type: t.type,
          outbound: t.outbound,
          return: t.return,
          note: t.note,
          gas: t.gas,
          parking: t.parking,
          viewCostBreakdown: t.viewCostBreakdown,
          amount: t.amount,
          accrued: t.accrued,
          paid: t.paid,
          pending: t.pending,
          you: t.you,
        }}
      />
    </main>
  );
}
