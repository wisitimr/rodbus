import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateShort, formatDateMedium, type Locale } from "@/lib/i18n";
import HistoryContent from "./history-content";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";

export default async function HistoryPage() {
  const user = (await getCurrentUser())!;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const activeGroupId = await getActiveGroupOrRedirect();
  const role = await getGroupRole(user.id, activeGroupId);
  const isAdmin = role === GroupRole.ADMIN;

  // Fetch data scoped to 1 year back for summary
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setDate(1);
  const farFuture = new Date(2099, 11, 31);

  const [recentTrips, allDebts, allPayments] = await Promise.all([
    prisma.trip.findMany({
      where: isAdmin
        ? { partyGroupId: activeGroupId }
        : { partyGroupId: activeGroupId, checkIns: { some: { userId } } },
      include: {
        car: { select: { name: true, licensePlate: true, ownerId: true } },
        checkIns: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    calculateDebts(oneYearAgo, farFuture, activeGroupId),
    prisma.payment.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        user: { select: { name: true } },
        trip: {
          select: {
            id: true, carId: true, date: true, createdAt: true,
            car: { select: { name: true, licensePlate: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  // Batch: compute trip numbers per car+date in a single query
  const carDatePairs = [...new Map(
    recentTrips.map(t => [`${t.carId}-${t.date.toISOString().split("T")[0]}`, { carId: t.carId, date: t.date }])
  ).values()];

  const allRelatedTrips = carDatePairs.length > 0
    ? await prisma.trip.findMany({
        where: { OR: carDatePairs.map(p => ({ carId: p.carId, date: p.date })) },
        orderBy: { createdAt: "asc" },
        select: { id: true, carId: true, date: true },
      })
    : [];

  const carDateTripIds = new Map<string, string[]>();
  for (const t of allRelatedTrips) {
    const key = `${t.carId}-${t.date.toISOString().split("T")[0]}`;
    if (!carDateTripIds.has(key)) carDateTripIds.set(key, []);
    carDateTripIds.get(key)!.push(t.id);
  }

  const trips = recentTrips.map((trip) => {
    const cdKey = `${trip.carId}-${trip.date.toISOString().split("T")[0]}`;
    const idx = (carDateTripIds.get(cdKey) ?? []).indexOf(trip.id);
    return {
      id: trip.id,
      carId: trip.carId,
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
      sharedParkingTripIds: trip.sharedParkingTripIds,
      isOwner: trip.car.ownerId === userId,
      isMyTrip: trip.car.ownerId === userId || trip.checkIns.some((c) => c.userId === userId),
    };
  });

  // Filter debts: member sees only own data, admin sees all
  const filteredDebts = isAdmin ? allDebts : allDebts.filter((d) => d.userId === userId);

  // Serialize debts with breakdown dates as ISO strings
  const serializedDebts = filteredDebts.map((d) => ({
    userId: d.userId,
    userName: d.userName,
    userImage: d.userImage,
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
      parkingHeadcount: b.parkingHeadcount,
      tripNumber: b.tripNumber,
      passengers: b.passengers,
      driver: b.driver,
      sharedParking: b.sharedParking ? {
        trips: b.sharedParking.trips.map((d) => ({
          carName: d.carName,
          date: formatDateMedium(d.date, locale as Locale),
          parkingCost: d.parkingCost,
          headcount: d.headcount,
        })),
        uniqueNames: b.sharedParking.uniqueNames,
        totalParking: b.sharedParking.totalParking,
        parkingHeadcount: b.sharedParking.parkingHeadcount,
      } : null,
      time: b.createdAt.toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      }),
    })),
  }));

  // Compute trip number for each payment from its linked trip
  // Fetch trip order data for payment trips not already in carDateTripIds
  const paymentTripCarDatePairs = [...new Map(
    allPayments
      .filter(p => !carDateTripIds.has(`${p.trip.carId}-${p.trip.date.toISOString().split("T")[0]}`))
      .map(p => [`${p.trip.carId}-${p.trip.date.toISOString().split("T")[0]}`, { carId: p.trip.carId, date: p.trip.date }])
  ).values()];

  const extraTripOrders = paymentTripCarDatePairs.length > 0
    ? await prisma.trip.findMany({
        where: { OR: paymentTripCarDatePairs.map(p => ({ carId: p.carId, date: p.date })) },
        orderBy: { createdAt: "asc" },
        select: { id: true, carId: true, date: true },
      })
    : [];

  for (const t of extraTripOrders) {
    const key = `${t.carId}-${t.date.toISOString().split("T")[0]}`;
    if (!carDateTripIds.has(key)) carDateTripIds.set(key, []);
    carDateTripIds.get(key)!.push(t.id);
  }

  const serializedPayments = allPayments.map((p) => {
    const cdKey = `${p.trip.carId}-${p.trip.date.toISOString().split("T")[0]}`;
    const tripIds = carDateTripIds.get(cdKey) ?? [];
    const tripNumber = Math.max(1, tripIds.indexOf(p.tripId) + 1);
    return {
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      carName: p.trip.car.name,
      licensePlate: p.trip.car.licensePlate ?? null,
      date: formatDateShort(p.trip.date, locale),
      dateISO: p.trip.date.toISOString().split("T")[0],
      paidAt: formatDateShort(p.createdAt, locale),
      amount: p.amount,
      note: p.note,
      tripNumber,
    };
  });

  return (
    <main className="mx-auto max-w-lg space-y-3 p-4">
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
          noPassengers: t.noPassengers,
          you: t.you,
          onlyMe: t.onlyMe,
          allData: t.allData,
          trip: t.trip,
          people: t.people,
          splitAmong: t.splitAmong,
          passenger: t.member,
          paidDate: t.paidDate,
          tripNumber: t.tripNumber,
          sharedParking: t.sharedParking,
          sharedParkingAcross: t.sharedParkingAcross,
          uniquePeople: t.uniquePeople,
          editCheckIn: t.editCheckIn,
          deleteCheckIn: t.deleteCheckIn,
          confirmDeleteCheckIn: t.confirmDeleteCheckIn,
          save: t.save,
          cancel: t.cancel,
          editTrip: t.editTrip,
          edit: t.edit,
          editing: t.editing,
          confirmDeleteTrip: t.confirmDeleteTrip,
          confirmDeleteAction: t.confirmDeleteAction,
          gasCost: t.gasCost,
          parkingCost: t.parkingCost,
          total: t.total,
          shareParkingWithTrips: t.shareParkingWithTrips,
          loadMore: t.loadMore,
        }}
      />
    </main>
  );
}
