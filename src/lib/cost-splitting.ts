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
    const totalCost = cost.gasCost + cost.parkingCost;
    if (totalCost === 0) continue;

    // Find distinct users who tapped into this car on this date
    const trips = await prisma.trip.findMany({
      where: {
        carId: cost.carId,
        date: cost.date,
      },
      include: { user: true },
      distinct: ["userId"],
    });

    if (trips.length === 0) continue;

    const share = totalCost / trips.length;

    for (const trip of trips) {
      let entry = debtMap.get(trip.userId);
      if (!entry) {
        entry = {
          userId: trip.userId,
          userName: trip.user.name,
          totalDebt: 0,
          totalPaid: 0,
          pendingDebt: 0,
          breakdown: [],
        };
        debtMap.set(trip.userId, entry);
      }

      entry.totalDebt += share;
      entry.breakdown.push({
        carId: cost.carId,
        carName: cost.car.name,
        date: cost.date,
        share: Math.round(share * 100) / 100,
        totalCost,
        passengerCount: trips.length,
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
    const totalCost = cost.gasCost + cost.parkingCost;
    if (totalCost === 0) continue;

    const trips = await prisma.trip.findMany({
      where: { carId: cost.carId, date: cost.date },
      distinct: ["userId"],
    });

    if (trips.length === 0) continue;

    const isPassenger = trips.some((t) => t.userId === userId);
    if (isPassenger) {
      totalDebt += totalCost / trips.length;
    }
  }

  // Subtract all payments
  const paymentsAgg = await prisma.payment.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  const totalPaid = paymentsAgg._sum.amount ?? 0;
  return Math.round((totalDebt - totalPaid) * 100) / 100;
}
