import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { headers } from "next/headers";
import { detectLocale, formatDateMedium, type Locale } from "@/lib/i18n";
import ManageContent from "./manage-content";
import { MemberStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";

async function fetchManageData(userId: string, activeGroupId: string) {
  // Pending debts and trips span all time so every unsettled trip shows up
  // in Manage, not just the current month.
  const allTimeStart = new Date(0);
  const farFuture = new Date(2099, 11, 31);

  const [allCars, debts, recentTripsRaw, groupMembersRaw, myCarPayments] = await Promise.all([
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
      orderBy: { name: "asc" },
    }),
    calculateDebts(allTimeStart, farFuture, activeGroupId),
    prisma.trip.findMany({
      where: {
        car: { ownerId: userId },
        partyGroupId: activeGroupId,
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
    // Payments made TO this user (as creditor) across all time so settlement
    // totals line up with the all-time debt range above. A payment counts when
    // it explicitly targets this user, or — for legacy rows with no creditor —
    // when this user owns the trip's car (the implicit creditor).
    prisma.payment.findMany({
      where: {
        trip: { partyGroupId: activeGroupId },
        OR: [
          { paidToId: userId },
          { paidToId: null, trip: { car: { ownerId: userId } } },
        ],
      },
      select: { userId: true, amount: true },
    }),
  ]);

  const myCreditPaidPerUser: Record<string, number> = {};
  for (const p of myCarPayments) {
    myCreditPaidPerUser[p.userId] = (myCreditPaidPerUser[p.userId] ?? 0) + p.amount;
  }

  return { allCars, debts, recentTripsRaw, myCreditPaidPerUser, groupMembersRaw };
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

  const { allCars, debts, recentTripsRaw, myCreditPaidPerUser, groupMembersRaw } = await getCachedManageData(userId, activeGroupId);

  const serializedDebts = debts
    .map((d) => {
      // Scope each trip's share to the portion owed to THIS user as creditor:
      // gas when they own the car, parking when they fronted it (or own the car
      // and nobody else paid parking).
      const myBreakdown = d.breakdown
        .map((b) => {
          const gasOwed = b.driver.id === userId ? b.gasShare : 0;
          const parkingCreditorId = b.parkingPaidById ?? b.driver.id;
          const parkingOwed = parkingCreditorId === userId ? b.parkingShare : 0;
          const shareOwed = Math.round((gasOwed + parkingOwed) * 100) / 100;
          return { b, gasOwed, parkingOwed, shareOwed };
        })
        .filter((x) => x.shareOwed > 0);

      const myDebt = Math.round(myBreakdown.reduce((s, x) => s + x.shareOwed, 0) * 100) / 100;
      // Payments made to this user as creditor (explicit or legacy implicit).
      const myPaid = Math.round((myCreditPaidPerUser[d.userId] ?? 0) * 100) / 100;
      return {
        userId: d.userId,
        userName: d.userName,
        userImage: d.userImage,
        pendingDebt: Math.round((myDebt - myPaid) * 100) / 100,
        totalDebt: myDebt,
        totalPaid: myPaid,
        breakdown: myBreakdown.map(({ b, gasOwed, parkingOwed, shareOwed }) => ({
          tripId: b.tripId,
          carName: b.carName,
          licensePlate: b.licensePlate,
          date: formatDateMedium(new Date(b.date), locale as Locale),
          dateISO: new Date(b.date).toISOString().split("T")[0],
          share: shareOwed,
          gasShare: gasOwed,
          gasCost: b.gasCost,
          parkingShare: parkingOwed,
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

  // Determine which trips still have any unpaid passenger share so the Trips
  // tab can hide trips that are fully cleared. Uses the group-wide debt (full
  // share, all of each debtor's payments) so a trip stays visible while ANY
  // creditor — car owner or a separate parking payer — is still owed money.
  const tripsWithDebts = new Set<string>();
  const unsettledTripIds = new Set<string>();
  for (const d of debts) {
    const sorted = [...d.breakdown].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let remaining = d.totalPaid;
    for (const entry of sorted) {
      tripsWithDebts.add(entry.tripId);
      if (remaining >= entry.share) {
        remaining = Math.round((remaining - entry.share) * 100) / 100;
      } else {
        unsettledTripIds.add(entry.tripId);
        remaining = 0;
      }
    }
  }
  const isClearedTrip = (id: string) =>
    tripsWithDebts.has(id) && !unsettledTripIds.has(id);

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

  const allTrips = [...recentTripsRaw]
    .filter((trip) => !isClearedTrip(trip.id))
    .reverse()
    .map((trip) => ({
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
