import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateShort } from "@/lib/i18n";
import HistoryContent from "./history-content";
import BottomNav from "../bottom-nav";

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
      include: {
        car: true,
        checkIns: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    calculateDebts(allTimeStart, allTimeEnd),
    prisma.payment.findMany({
      include: { car: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Compute trip numbers per car+date
  const tripNumSeen = new Set<string>();
  const carDateTripIds = new Map<string, string[]>();
  for (const trip of recentTrips) {
    const cdKey = `${trip.carId}-${trip.date.toISOString().split("T")[0]}`;
    if (!tripNumSeen.has(cdKey)) {
      tripNumSeen.add(cdKey);
      const all = await prisma.trip.findMany({
        where: { carId: trip.carId, date: trip.date },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      carDateTripIds.set(cdKey, all.map((t) => t.id));
    }
  }

  const trips = recentTrips.map((trip) => {
    const cdKey = `${trip.carId}-${trip.date.toISOString().split("T")[0]}`;
    const idx = (carDateTripIds.get(cdKey) ?? []).indexOf(trip.id);
    return {
      id: trip.id,
      carName: trip.car.name,
      licensePlate: trip.car.licensePlate ?? null,
      date: formatDateShort(trip.date, locale),
      dateISO: trip.date.toISOString().split("T")[0],
      time: trip.createdAt.toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      }),
      gasCost: trip.gasCost,
      parkingCost: trip.parkingCost,
      riderCount: trip.checkIns.length + 1,
      tripNumber: idx >= 0 ? idx + 1 : 1,
    };
  });

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
      time: b.createdAt.toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      }),
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
    <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <header className="animate-fade-in sticky top-0 z-40 -mx-4 mb-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              {t.history}
            </h1>
            <p className="text-xs text-gray-500">{t.trips}, {t.payments} &amp; {t.summary}</p>
          </div>
        </div>
      </header>

      <HistoryContent
        checkIns={trips}
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
          noCheckInHistory: t.noCheckInHistory,
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
          editCheckIn: t.editCheckIn,
          deleteCheckIn: t.deleteCheckIn,
          confirmDeleteCheckIn: t.confirmDeleteCheckIn,
          save: t.save,
          cancel: t.cancel,
        }}
      />

      <BottomNav isAdmin={isAdmin} />
    </main>
  );
}
