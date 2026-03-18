import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { headers } from "next/headers";
import { detectLocale, getTranslations, formatDateMedium, type Locale } from "@/lib/i18n";
import DashboardContent from "../dashboard-content";
import { unstable_cache } from "next/cache";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";

async function fetchDashboardData(userId: string, isAdmin: boolean, partyGroupId: string) {
  // Use all-time range for debt calculation so pending debt includes all months
  const allTimeStart = new Date(2000, 0, 1);
  const allTimeEnd = new Date(2099, 11, 31);

  const [debts, recentTrips] = await Promise.all([
    calculateDebts(allTimeStart, allTimeEnd, partyGroupId),
    prisma.trip.findMany({
      where: {
        partyGroupId,
        OR: [
          { car: { ownerId: userId } },
          { checkIns: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        car: { select: { name: true, licensePlate: true, ownerId: true, owner: { select: { name: true } } } },
        checkIns: { select: { id: true, userId: true, user: { select: { name: true } } } },
      },
    }),
  ]);

  // Compute trip numbers for each trip within same car+date (batch query)
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

  const carDateTrips = new Map<string, string[]>();
  for (const t of allRelatedTrips) {
    const key = `${t.carId}-${t.date.toISOString().split("T")[0]}`;
    if (!carDateTrips.has(key)) carDateTrips.set(key, []);
    carDateTrips.get(key)!.push(t.id);
  }

  const tripNumbers: Record<string, number> = {};
  for (const trip of recentTrips) {
    const cdKey = `${trip.carId}-${trip.date.toISOString().split("T")[0]}`;
    const idx = (carDateTrips.get(cdKey) ?? []).indexOf(trip.id);
    if (idx >= 0) tripNumbers[trip.id] = idx + 1;
  }

  return { debts, recentTrips, tripNumbers };
}

const getCachedDashboardData = unstable_cache(
  fetchDashboardData,
  ["dashboard-data"],
  { tags: ["dashboard"], revalidate: 60 }
);

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));

  const userId = user.id;
  const activeGroupId = await getActiveGroupOrRedirect();
  const role = await getGroupRole(user.id, activeGroupId);
  const isAdmin = role === GroupRole.ADMIN;

  const { debts, recentTrips, tripNumbers } = await getCachedDashboardData(userId, isAdmin, activeGroupId);

  const myDebt = debts.find((d) => d.userId === userId);

  // Compute pending breakdown entries
  const pendingEntries = (() => {
    if (!myDebt || myDebt.pendingDebt <= 0) return { entries: [] as (typeof debts)[number]["breakdown"], paidAmounts: new Map<number, number>() };
    const sorted = [...myDebt.breakdown].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let remaining = myDebt.totalPaid;
    const entries: typeof sorted = [];
    const paidAmounts = new Map<number, number>();
    for (const entry of sorted) {
      if (remaining >= entry.share) {
        remaining = Math.round((remaining - entry.share) * 100) / 100;
      } else if (remaining > 0) {
        entries.push({
          ...entry,
          share: Math.round((entry.share - remaining) * 100) / 100,
        });
        paidAmounts.set(entries.length - 1, remaining);
        remaining = 0;
      } else {
        entries.push(entry);
      }
    }
    entries.reverse();
    // Adjust paidAmounts keys after reverse
    const reversedPaid = new Map<number, number>();
    for (const [idx, amt] of paidAmounts) {
      reversedPaid.set(entries.length - 1 - idx, amt);
    }
    return { entries, paidAmounts: reversedPaid };
  })();

  // Format debt entries for client component
  const debtEntries = pendingEntries.entries.map((b, idx) => ({
    date: formatDateMedium(new Date(b.date), locale),
    time: new Date(b.createdAt).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }),
    carName: b.carName,
    licensePlate: b.licensePlate,
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
    paidAmount: pendingEntries.paidAmounts.get(idx),
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
  }));

  // Compute which trips are paid vs pending (oldest-first payment allocation)
  const perUserPaidKeys = new Map<string, Set<string>>();
  for (const debt of debts) {
    const keys = new Set<string>();
    const sorted = [...debt.breakdown].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let remaining = debt.totalPaid;
    for (const entry of sorted) {
      if (remaining >= entry.share) {
        remaining = Math.round((remaining - entry.share) * 100) / 100;
        keys.add(`${entry.carId}-${new Date(entry.date).toISOString().split("T")[0]}-${entry.tripNumber}`);
      } else {
        break;
      }
    }
    perUserPaidKeys.set(debt.userId, keys);
  }
  const paidTripKeys = perUserPaidKeys.get(userId) ?? new Set<string>();

  // For owner trips: a trip is "settled" if ALL users who owe debt on it have paid
  const tripDebtors = new Map<string, string[]>();
  for (const debt of debts) {
    for (const b of debt.breakdown) {
      const key = `${b.carId}-${new Date(b.date).toISOString().split("T")[0]}-${b.tripNumber}`;
      const list = tripDebtors.get(key) ?? [];
      list.push(debt.userId);
      tripDebtors.set(key, list);
    }
  }
  const fullySettledTripKeys = new Set<string>();
  for (const [tripKey, userIds] of tripDebtors) {
    const allPaid = userIds.every((uid) => perUserPaidKeys.get(uid)?.has(tripKey));
    if (allPaid) fullySettledTripKeys.add(tripKey);
  }

  // Build shared parking lookup from debt breakdowns (keyed by tripId)
  const sharedParkingByTripId = new Map<string, typeof debts[number]["breakdown"][number]["sharedParking"]>();
  for (const debt of debts) {
    for (const b of debt.breakdown) {
      if (b.sharedParking && !sharedParkingByTripId.has(b.tripId)) {
        sharedParkingByTripId.set(b.tripId, b.sharedParking);
      }
    }
  }

  // Format recent trips for client component
  const formattedRecentTrips = recentTrips.map((trip) => {
    const dateISO = new Date(trip.date).toISOString().split("T")[0];
    const tn = tripNumbers[trip.id] ?? 1;
    return {
      id: trip.id,
      date: formatDateMedium(new Date(trip.date), locale),
      time: new Date(trip.createdAt).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      }),
      carName: trip.car.name,
      licensePlate: trip.car.licensePlate,
      gasCost: trip.gasCost,
      parkingCost: trip.parkingCost,
      riderCount: trip.checkIns.length + 1,
      tripNumber: tn,
      sharedParkingTripIds: trip.sharedParkingTripIds,
      isOwner: trip.car.ownerId === userId,
      passengers: trip.checkIns
        .filter((c) => c.userId !== trip.car.ownerId)
        .map((c) => ({ id: c.userId, name: c.user.name || "Unknown" })),
      driverName: trip.car.owner.name || "Unknown",
      sharedParking: (() => {
        const sp = sharedParkingByTripId.get(trip.id);
        if (!sp) return null;
        return {
          trips: sp.trips.map((d) => ({
            carName: d.carName,
            date: formatDateMedium(new Date(d.date), locale),
            parkingCost: d.parkingCost,
            headcount: d.headcount,
            tripNumber: d.tripNumber,
          })),
          uniqueNames: sp.uniqueNames,
          totalParking: sp.totalParking,
          parkingHeadcount: sp.parkingHeadcount,
        };
      })(),
      paymentStatus: trip.checkIns.length === 0
        ? "no_passengers" as const
        : trip.car.ownerId === userId
          ? ((!tripDebtors.has(`${trip.carId}-${dateISO}-${tn}`) || fullySettledTripKeys.has(`${trip.carId}-${dateISO}-${tn}`)) ? "paid" as const : "pending" as const)
          : (paidTripKeys.has(`${trip.carId}-${dateISO}-${tn}`) ? "paid" as const : "pending" as const),
    };
  });

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <DashboardContent
        pendingDebt={myDebt?.pendingDebt ?? 0}
        pendingCount={pendingEntries.entries.length}
        debtEntries={debtEntries}
        recentTrips={formattedRecentTrips}
      />
    </main>
  );
}
