import { prisma } from "@/lib/prisma";

export interface UserDebt {
  userId: string;
  userName: string | null;
  totalDebt: number;
  totalPaid: number;
  pendingDebt: number;
  breakdown: {
    carId: string;
    carName: string;
    date: Date;
    share: number;
    gasShare: number;
    parkingShare: number;
    outboundCount: number;
    returnCount: number;
    totalCost: number;
    passengerCount: number;
  }[];
}

/**
 * Calculate debts for all users within a date range.
 * pendingDebt = totalDebt (accumulated cost shares) - totalPaid (sum of payments)
 */
export async function calculateDebts(
  startDate: Date,
  endDate: Date
): Promise<UserDebt[]> {
  // Fetch all daily costs in the date range with their car info
  const dailyCosts = await prisma.dailyCost.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { car: true },
  });

  // For each daily cost entry, find distinct passengers for that car on that day
  const debtMap = new Map<string, UserDebt>();

  for (const cost of dailyCosts) {
    if (cost.gasCost === 0 && cost.parkingCost === 0) continue;

    // Fetch ALL trips (not distinct) to count per-user trip count
    const trips = await prisma.trip.findMany({
      where: {
        carId: cost.carId,
        date: cost.date,
      },
      include: { user: true },
    });

    if (trips.length === 0) continue;

    // Count trips per user (1 = one way, 2 = round trip)
    const userTrips = new Map<string, { name: string | null; count: number }>();
    for (const trip of trips) {
      const existing = userTrips.get(trip.userId);
      if (existing) {
        existing.count++;
      } else {
        userTrips.set(trip.userId, { name: trip.user.name, count: 1 });
      }
    }

    // Count outbound/return per user
    const userTripTypes = new Map<string, { outbound: number; return: number }>();
    for (const trip of trips) {
      const existing = userTripTypes.get(trip.userId) ?? { outbound: 0, return: 0 };
      if (trip.type === "OUTBOUND") existing.outbound++;
      else existing.return++;
      userTripTypes.set(trip.userId, existing);
    }

    const distinctUsers = userTrips.size;
    // Include driver (car owner) in parking split even if they didn't tap
    const parkingHeadcount = userTrips.has(cost.car.ownerId) ? distinctUsers : distinctUsers + 1;

    for (const [uid, info] of userTrips) {
      // Gas: per-trip cost (outbound+return = gasCost*2, one way = gasCost*1)
      const gasShare = cost.gasCost * info.count;
      // Parking: split equally among all riders + driver that day
      const parkingShare = parkingHeadcount > 0 ? cost.parkingCost / parkingHeadcount : 0;
      const share = gasShare + parkingShare;
      const tripTypes = userTripTypes.get(uid) ?? { outbound: 0, return: 0 };

      let entry = debtMap.get(uid);
      if (!entry) {
        entry = {
          userId: uid,
          userName: info.name,
          totalDebt: 0,
          totalPaid: 0,
          pendingDebt: 0,
          breakdown: [],
        };
        debtMap.set(uid, entry);
      }

      entry.totalDebt += share;
      entry.breakdown.push({
        carId: cost.carId,
        carName: cost.car.name,
        date: cost.date,
        share: Math.round(share * 100) / 100,
        gasShare: Math.round(gasShare * 100) / 100,
        parkingShare: Math.round(parkingShare * 100) / 100,
        outboundCount: tripTypes.outbound,
        returnCount: tripTypes.return,
        totalCost: cost.gasCost + cost.parkingCost,
        passengerCount: parkingHeadcount,
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
  const dailyCosts = await prisma.dailyCost.findMany({
    include: { car: true },
    orderBy: { date: "asc" },
  });

  // Collect per-date shares (oldest first)
  const dateShares: { date: Date; amount: number }[] = [];

  for (const cost of dailyCosts) {
    if (cost.gasCost === 0 && cost.parkingCost === 0) continue;

    const trips = await prisma.trip.findMany({
      where: { carId: cost.carId, date: cost.date },
    });

    if (trips.length === 0) continue;

    const userTrips = new Map<string, number>();
    for (const t of trips) {
      userTrips.set(t.userId, (userTrips.get(t.userId) ?? 0) + 1);
    }

    const myTrips = userTrips.get(userId);
    if (!myTrips) continue;

    const distinctUsers = userTrips.size;
    // Include driver (car owner) in parking split even if they didn't tap
    const parkingHeadcount = userTrips.has(cost.car.ownerId) ? distinctUsers : distinctUsers + 1;

    // Gas: per-trip cost (outbound+return = gasCost*2, one way = gasCost*1)
    const gasShare = cost.gasCost * myTrips;
    // Parking: split equally among all riders + driver that day
    const parkingShare = parkingHeadcount > 0 ? cost.parkingCost / parkingHeadcount : 0;
    const share = Math.round((gasShare + parkingShare) * 100) / 100;

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
