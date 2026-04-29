import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { headers } from "next/headers";
import { detectLocale, formatDateMedium, type Locale } from "@/lib/i18n";
import ManageContent from "./manage-content";
import { startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";
import { MemberStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";

async function fetchManageData(userId: string, activeGroupId: string) {
  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();

  // Pending debts span 1 year back through far future (matches the history page)
  // so unpaid debts from previous months still surface in the Manage list.
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setDate(1);
  const farFuture = new Date(2099, 11, 31);

  const [allCars, debts, recentTripsRaw, groupMembersRaw, myCarPayments] = await Promise.all([
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
      orderBy: { name: "asc" },
    }),
    calculateDebts(oneYearAgo, farFuture, activeGroupId),
    prisma.trip.findMany({
      where: {
        car: { ownerId: userId },
        partyGroupId: activeGroupId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        car: { select: { name: true, licensePlate: true } },
        checkIns: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.partyGroupMember.findMany({
      where: { partyGroupId: activeGroupId, status: MemberStatus.ACTIVE },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    // Payments scoped to this owner's cars across the same range as debts
    prisma.payment.findMany({
      where: {
        trip: {
          car: { ownerId: userId },
          partyGroupId: activeGroupId,
          date: { gte: oneYearAgo, lte: farFuture },
        },
      },
      select: { userId: true, amount: true },
    }),
  ]);

  const myCarPaidPerUser: Record<string, number> = {};
  for (const p of myCarPayments) {
    myCarPaidPerUser[p.userId] = (myCarPaidPerUser[p.userId] ?? 0) + p.amount;
  }

  return { allCars, debts, recentTripsRaw, myCarPaidPerUser, groupMembersRaw };
}

const getCachedManageData = unstable_cache(
  fetchManageData,
  ["manage-data"],
  { tags: ["manage"], revalidate: 3600 }
);

export default async function ManagePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeMembership) redirect("/join");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));

  const { user } = ctx;
  const userId = user.id;
  const activeGroupId = ctx.activeMembership.partyGroupId;

  const { allCars, debts, recentTripsRaw, myCarPaidPerUser, groupMembersRaw } = await getCachedManageData(userId, activeGroupId);

  const carIds = allCars.map((c) => c.id);
  const ownedCarId = allCars[0]?.id ?? "";

  const serializedDebts = debts
    .map((d) => {
      const myCarBreakdown = d.breakdown.filter((b) => carIds.includes(b.carId));
      const myCarDebt = Math.round(myCarBreakdown.reduce((s, b) => s + b.share, 0) * 100) / 100;
      // Use car-specific payments instead of global totalPaid to avoid
      // payments for other owners' trips incorrectly offsetting this owner's debt
      const myCarPaid = Math.round((myCarPaidPerUser[d.userId] ?? 0) * 100) / 100;
      return {
        userId: d.userId,
        userName: d.userName,
        userImage: d.userImage,
        pendingDebt: Math.round((myCarDebt - myCarPaid) * 100) / 100,
        totalDebt: myCarDebt,
        totalPaid: myCarPaid,
        breakdown: myCarBreakdown.map((b) => ({
          tripId: b.tripId,
          carName: b.carName,
          licensePlate: b.licensePlate,
          date: formatDateMedium(new Date(b.date), locale as Locale),
          dateISO: new Date(b.date).toISOString().split("T")[0],
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
              date: formatDateMedium(new Date(d.date), locale as Locale),
              parkingCost: d.parkingCost,
              headcount: d.headcount,
              tripNumber: d.tripNumber,
            })),
            uniqueNames: b.sharedParking.uniqueNames,
            totalParking: b.sharedParking.totalParking,
            parkingHeadcount: b.sharedParking.parkingHeadcount,
          } : null,
        })),
      };
    })
    .filter((d) => d.breakdown.length > 0);

  // Compute trip numbers per car+date
  const carDateGroups = new Map<string, string[]>();
  for (const trip of recentTripsRaw) {
    const key = `${trip.carId}-${new Date(trip.date).toISOString()}`;
    if (!carDateGroups.has(key)) carDateGroups.set(key, []);
    carDateGroups.get(key)!.push(trip.id);
  }
  const tripNumberMap = new Map<string, number>();
  for (const [, ids] of carDateGroups) {
    ids.forEach((id, i) => tripNumberMap.set(id, i + 1));
  }

  const recentTripsForSharing = recentTripsRaw
    .slice(-5)
    .reverse()
    .map((trip) => ({
      id: trip.id,
      carName: trip.car.name,
      licensePlate: trip.car.licensePlate,
      date: formatDateMedium(new Date(trip.date), locale),
      gasCost: trip.gasCost,
      parkingCost: trip.parkingCost,
      headcount: trip.checkIns.length + 1,
      tripNumber: tripNumberMap.get(trip.id) ?? 1,
    }));

  const allTrips = [...recentTripsRaw].reverse().map((trip) => ({
    id: trip.id,
    carId: trip.carId,
    carName: trip.car.name,
    licensePlate: trip.car.licensePlate,
    date: formatDateMedium(new Date(trip.date), locale),
    gasCost: trip.gasCost,
    parkingCost: trip.parkingCost,
    headcount: trip.checkIns.length + 1,
    tripNumber: tripNumberMap.get(trip.id) ?? 1,
    sharedParkingTripIds: trip.sharedParkingTripIds,
    checkInUserIds: trip.checkIns.map((ci) => ci.userId),
    parkingPaidById: trip.parkingPaidById,
  }));

  const groupMembers = groupMembersRaw.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
  }));

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <ManageContent
        cars={allCars.map((c) => ({
          id: c.id,
          name: c.name,
          licensePlate: c.licensePlate,
          defaultGasCost: c.defaultGasCost,
        }))}
        debts={serializedDebts}
        carId={ownedCarId}
        locale={locale}
        recentTrips={recentTripsForSharing}
        allTrips={allTrips}
        partyGroupId={activeGroupId}
        groupMembers={groupMembers}
        currentUserId={userId}
        currentUserName={user.name ?? ""}
      />
    </main>
  );
}
