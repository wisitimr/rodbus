import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateMedium, type Locale } from "@/lib/i18n";
import ManageContent from "./manage-content";
import { startOfMonthBangkok, endOfMonthBangkok } from "@/lib/timezone";
import { getActiveGroupOrRedirect } from "@/lib/party-group";
import { unstable_cache } from "next/cache";

async function fetchManageData(userId: string, activeGroupId: string) {
  const startOfMonth = startOfMonthBangkok();
  const endOfMonth = endOfMonthBangkok();

  const [allCars, debts, recentTripsRaw] = await Promise.all([
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
      orderBy: { name: "asc" },
    }),
    calculateDebts(startOfMonth, endOfMonth, activeGroupId),
    prisma.trip.findMany({
      where: {
        car: { ownerId: userId },
        partyGroupId: activeGroupId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        car: { select: { name: true, licensePlate: true } },
        checkIns: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { allCars, debts, recentTripsRaw };
}

const getCachedManageData = unstable_cache(
  fetchManageData,
  ["manage-data"],
  { tags: ["manage"], revalidate: 60 }
);

export default async function ManagePage() {
  const user = (await getCurrentUser())!;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;
  const activeGroupId = await getActiveGroupOrRedirect();

  const { allCars, debts, recentTripsRaw } = await getCachedManageData(userId, activeGroupId);

  const carIds = allCars.map((c) => c.id);
  const ownedCarId = allCars[0]?.id ?? "";

  const serializedDebts = debts
    .map((d) => {
      const myCarBreakdown = d.breakdown.filter((b) => carIds.includes(b.carId));
      const myCarDebt = Math.round(myCarBreakdown.reduce((s, b) => s + b.share, 0) * 100) / 100;
      return {
        userId: d.userId,
        userName: d.userName,
        userImage: d.userImage,
        pendingDebt: Math.round((myCarDebt - d.totalPaid) * 100) / 100,
        totalDebt: myCarDebt,
        totalPaid: d.totalPaid,
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
      />
    </main>
  );
}
