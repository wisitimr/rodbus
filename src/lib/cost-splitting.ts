import { prisma } from "@/lib/prisma";

export interface UserDebt {
  userId: string;
  userName: string | null;
  totalDebt: number;
  totalPaid: number;
  pendingDebt: number;
  breakdown: {
    tripCostId: string;
    carId: string;
    carName: string;
    licensePlate: string | null;
    date: Date;
    share: number;
    gasShare: number;
    parkingShare: number;
    gasCost: number;
    parkingCost: number;
    totalCost: number;
    headcount: number;
    tripNumber: number;
    passengerNames: string[];
    driverName: string | null;
  }[];
}

/**
 * For each TripCost, split total cost (gas + parking) among linked passengers + driver.
 * Legacy trips (without tripCostId) fall back to matching by carId+date.
 */
export async function calculateDebts(
  startDate: Date,
  endDate: Date
): Promise<UserDebt[]> {
  const tripCosts = await prisma.tripCost.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { car: { include: { owner: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  const allTrips = await prisma.trip.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { user: true },
  });

  // Pre-compute trip numbers per car+date
  const tripNumberMap = new Map<string, number>();
  const carDateGroups = new Map<string, string[]>();
  for (const tc of tripCosts) {
    const key = `${tc.carId}-${tc.date.toISOString()}`;
    if (!carDateGroups.has(key)) carDateGroups.set(key, []);
    carDateGroups.get(key)!.push(tc.id);
  }
  for (const [, ids] of carDateGroups) {
    ids.forEach((id, i) => tripNumberMap.set(id, i + 1));
  }

  const debtMap = new Map<string, UserDebt>();

  for (const cost of tripCosts) {
    if (cost.gasCost === 0 && cost.parkingCost === 0) continue;

    // Find trips linked to this TripCost (or legacy match by carId+date)
    const linkedTrips = allTrips.filter(
      (t) =>
        t.tripCostId === cost.id ||
        (t.tripCostId === null && t.carId === cost.carId && t.date.getTime() === cost.date.getTime())
    );

    if (linkedTrips.length === 0) continue;

    // Unique passengers
    const passengerIds = new Set(linkedTrips.map((t) => t.userId));
    // headcount = unique passengers + 1 for driver
    const headcount = passengerIds.size + (passengerIds.has(cost.car.ownerId) ? 0 : 1);

    const totalCost = cost.gasCost + cost.parkingCost;
    const perPerson = totalCost / headcount;
    const gasPerPerson = cost.gasCost / headcount;
    const parkingPerPerson = cost.parkingCost / headcount;

    for (const uid of passengerIds) {
      // Skip the car owner — they are the driver and don't owe debt
      if (uid === cost.car.ownerId) continue;

      const tripUser = linkedTrips.find((t) => t.userId === uid);

      let entry = debtMap.get(uid);
      if (!entry) {
        entry = {
          userId: uid,
          userName: tripUser?.user.name ?? null,
          totalDebt: 0,
          totalPaid: 0,
          pendingDebt: 0,
          breakdown: [],
        };
        debtMap.set(uid, entry);
      }

      // Collect unique passenger names
      const nameSet = new Map<string, string>();
      for (const trip of linkedTrips) {
        if (trip.user.name && !nameSet.has(trip.userId)) {
          nameSet.set(trip.userId, trip.user.name);
        }
      }

      entry.totalDebt += perPerson;
      entry.breakdown.push({
        tripCostId: cost.id,
        carId: cost.carId,
        carName: cost.car.name,
        licensePlate: cost.car.licensePlate,
        date: cost.date,
        share: Math.round(perPerson * 100) / 100,
        gasShare: Math.round(gasPerPerson * 100) / 100,
        parkingShare: Math.round(parkingPerPerson * 100) / 100,
        gasCost: cost.gasCost,
        parkingCost: cost.parkingCost,
        totalCost,
        headcount,
        tripNumber: tripNumberMap.get(cost.id) ?? 1,
        passengerNames: Array.from(nameSet.values()),
        driverName: cost.car.owner.name ?? null,
      });
    }
  }

  // Fetch all payments within the date range and subtract from debt
  const payments = await prisma.payment.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  for (const payment of payments) {
    const entry = debtMap.get(payment.userId);
    if (entry) {
      entry.totalPaid += payment.amount;
    }
  }

  // Round and compute pending
  for (const entry of debtMap.values()) {
    entry.totalDebt = Math.round(entry.totalDebt * 100) / 100;
    entry.totalPaid = Math.round(entry.totalPaid * 100) / 100;
    entry.pendingDebt = Math.round((entry.totalDebt - entry.totalPaid) * 100) / 100;
  }

  return Array.from(debtMap.values()).sort((a, b) => b.pendingDebt - a.pendingDebt);
}

/**
 * Calculate pending debt for a single user (all-time), broken down by date.
 * Returns per-date shares sorted oldest-first, with already-paid amounts subtracted.
 */
export async function calculateUserPendingBreakdown(userId: string): Promise<{
  totalPending: number;
  perDate: { date: Date; amount: number }[];
}> {
  const tripCosts = await prisma.tripCost.findMany({
    include: { car: true },
    orderBy: { date: "asc" },
  });

  const allTrips = await prisma.trip.findMany({
    include: { user: true },
  });

  const dateShares: { date: Date; amount: number }[] = [];

  for (const cost of tripCosts) {
    if (cost.gasCost === 0 && cost.parkingCost === 0) continue;

    // Skip if user is the car owner
    if (userId === cost.car.ownerId) continue;

    const linkedTrips = allTrips.filter(
      (t) =>
        t.tripCostId === cost.id ||
        (t.tripCostId === null && t.carId === cost.carId && t.date.getTime() === cost.date.getTime())
    );

    if (linkedTrips.length === 0) continue;

    const passengerIds = new Set(linkedTrips.map((t) => t.userId));
    if (!passengerIds.has(userId)) continue;

    const headcount = passengerIds.size + (passengerIds.has(cost.car.ownerId) ? 0 : 1);
    const totalCost = cost.gasCost + cost.parkingCost;
    const share = Math.round((totalCost / headcount) * 100) / 100;

    if (share > 0) {
      dateShares.push({ date: cost.date, amount: share });
    }
  }

  // Subtract payments from oldest dates first
  const paymentsAgg = await prisma.payment.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  let remaining = paymentsAgg._sum.amount ?? 0;
  const pending: { date: Date; amount: number }[] = [];

  for (const entry of dateShares) {
    if (remaining >= entry.amount) {
      remaining = Math.round((remaining - entry.amount) * 100) / 100;
    } else if (remaining > 0) {
      pending.push({
        date: entry.date,
        amount: Math.round((entry.amount - remaining) * 100) / 100,
      });
      remaining = 0;
    } else {
      pending.push(entry);
    }
  }

  const totalPending = pending.reduce((sum, e) => sum + e.amount, 0);
  return {
    totalPending: Math.round(totalPending * 100) / 100,
    perDate: pending,
  };
}
