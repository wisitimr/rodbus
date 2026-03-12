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

    const distinctUsers = userTrips.size;
    const totalTripUnits = Array.from(userTrips.values()).reduce((sum, u) => sum + u.count, 0);

    for (const [uid, info] of userTrips) {
      // Gas: proportional to trip count (round trip pays 2x, one way pays 1x)
      const gasShare = totalTripUnits > 0 ? (cost.gasCost * info.count) / totalTripUnits : 0;
      // Parking: split equally per person
      const parkingShare = distinctUsers > 0 ? cost.parkingCost / distinctUsers : 0;
      const share = gasShare + parkingShare;

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
        totalCost: cost.gasCost + cost.parkingCost,
        passengerCount: distinctUsers,
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
 * Calculate pending debt for a single user (all-time).
 * Used for the "Clear Full Balance" action.
 */
export async function calculateUserPendingDebt(userId: string): Promise<number> {
  // Get all cost shares for this user
  const dailyCosts = await prisma.dailyCost.findMany({
    include: { car: true },
  });

  let totalDebt = 0;

  for (const cost of dailyCosts) {
    if (cost.gasCost === 0 && cost.parkingCost === 0) continue;

    const trips = await prisma.trip.findMany({
      where: { carId: cost.carId, date: cost.date },
    });

    if (trips.length === 0) continue;

    // Count trips per user
    const userTrips = new Map<string, number>();
    for (const t of trips) {
      userTrips.set(t.userId, (userTrips.get(t.userId) ?? 0) + 1);
    }

    const myTrips = userTrips.get(userId);
    if (!myTrips) continue;

    const totalTripUnits = Array.from(userTrips.values()).reduce((sum, c) => sum + c, 0);
    const distinctUsers = userTrips.size;

    const gasShare = totalTripUnits > 0 ? (cost.gasCost * myTrips) / totalTripUnits : 0;
    const parkingShare = distinctUsers > 0 ? cost.parkingCost / distinctUsers : 0;
    totalDebt += gasShare + parkingShare;
  }

  // Subtract all payments
  const paymentsAgg = await prisma.payment.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  const totalPaid = paymentsAgg._sum.amount ?? 0;
  return Math.round((totalDebt - totalPaid) * 100) / 100;
}
