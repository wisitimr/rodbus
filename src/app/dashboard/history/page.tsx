import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateShort } from "@/lib/i18n";
import HistoryContent from "./history-content";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const isAdmin = user.role === Role.ADMIN;

  // Fetch all-time data for summary (breakdown has per-date granularity)
  const allTimeStart = new Date(2000, 0, 1);
  const allTimeEnd = new Date(2099, 11, 31);

  const [recentTrips, allDebts, allPayments] = await Promise.all([
    prisma.trip.findMany({
      ...(isAdmin ? {} : { where: { userId } }),
      include: { car: true, user: { select: { name: true } } },
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
    userId: trip.userId,
    carName: trip.car.name,
    licensePlate: trip.car.licensePlate ?? null,
    userName: trip.user?.name ?? null,
    date: formatDateShort(trip.date, locale),
    dateISO: trip.date.toISOString().split("T")[0],
    time: trip.tappedAt.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }),
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
      carId: b.carId,
      carName: b.carName,
      licensePlate: b.licensePlate ?? null,
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
    })),
  }));

  const serializedPayments = allPayments.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: p.user.name,
    carName: p.car.name,
    date: formatDateShort(p.date, locale),
    dateISO: p.date.toISOString().split("T")[0],
    paidAt: formatDateShort(p.createdAt, locale),
    amount: p.amount,
    note: p.note,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
      <header className="animate-fade-in mb-6 flex items-center gap-3 px-1 pt-4 sm:mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-400 text-blue-500">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {t.history}
          </h1>
          <p className="text-sm text-gray-400">{t.trips}, {t.payments} &amp; {t.summary}</p>
        </div>
      </header>

      <HistoryContent
        trips={trips}
        allDebts={serializedDebts}
        allPayments={serializedPayments}
        currentUserId={userId}
        isAdmin={isAdmin}
        locale={locale}
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
          note: t.note,
          gas: t.gas,
          parking: t.parking,
          viewCostBreakdown: t.viewCostBreakdown,
          amount: t.amount,
          accrued: t.accrued,
          paid: t.paid,
          pending: t.pending,
          you: t.you,
          onlyMe: t.onlyMe,
          trip: t.trip,
          people: t.people,
          splitAmong: t.splitAmong,
          passenger: t.passenger,
          paidDate: t.paidDate,
          tripNumber: t.tripNumber,
          editTrip: t.editTrip,
          deleteTrip: t.deleteTrip,
          confirmDeleteTrip: t.confirmDeleteTrip,
          save: t.save,
          cancel: t.cancel,
        }}
      />
    </main>
  );
}
