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

    // Track which users have outbound/return trips
    const userNames = new Map<string, string | null>();
    const outboundUsers = new Set<string>();
    const returnUsers = new Set<string>();
    for (const trip of trips) {
      userNames.set(trip.userId, trip.user.name);
      if (trip.type === "OUTBOUND") outboundUsers.add(trip.userId);
      else returnUsers.add(trip.userId);
    }

    // Include driver in both leg headcounts (driver always travels both legs)
    const outboundHeadcount = outboundUsers.size + (outboundUsers.has(cost.car.ownerId) ? 0 : 1);
    const returnHeadcount = returnUsers.size + (returnUsers.has(cost.car.ownerId) ? 0 : 1);

    // Gas: split total daily cost in half per leg, then divide by headcount per leg
    const gasPerLeg = cost.gasCost / 2;
    // Parking: only split among outbound riders (including driver),
    // because the parking fee is paid once when arriving in the morning.
    const parkingHeadcount = outboundHeadcount;

    const allUsers = new Set([...outboundUsers, ...returnUsers]);
    for (const uid of allUsers) {
      // Skip the car owner — they are the driver and don't owe debt
      if (uid === cost.car.ownerId) continue;

      const hasOutbound = outboundUsers.has(uid);
      const hasReturn = returnUsers.has(uid);

      // Gas: per-leg share based on headcount for that leg
      const gasOutbound = hasOutbound ? gasPerLeg / outboundHeadcount : 0;
      const gasReturn = hasReturn ? gasPerLeg / returnHeadcount : 0;
      const gasShare = gasOutbound + gasReturn;
      // Parking: only outbound riders pay, split by outbound headcount
      const parkingShare = hasOutbound && parkingHeadcount > 0 ? cost.parkingCost / parkingHeadcount : 0;
      const share = gasShare + parkingShare;

      let entry = debtMap.get(uid);
      if (!entry) {
        entry = {
          userId: uid,
          userName: userNames.get(uid) ?? null,
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
        outboundCount: hasOutbound ? 1 : 0,
        returnCount: hasReturn ? 1 : 0,
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

    // Skip if user is the car owner (driver doesn't owe debt)
    if (userId === cost.car.ownerId) continue;

    // Track outbound/return riders separately
    const outboundUsers = new Set<string>();
    const returnUsers = new Set<string>();
    for (const t of trips) {
      if (t.type === "OUTBOUND") outboundUsers.add(t.userId);
      else returnUsers.add(t.userId);
    }

    const hasOutbound = outboundUsers.has(userId);
    const hasReturn = returnUsers.has(userId);
    if (!hasOutbound && !hasReturn) continue;

    // Include driver in both leg headcounts
    const outboundHeadcount = outboundUsers.size + (outboundUsers.has(cost.car.ownerId) ? 0 : 1);
    const returnHeadcount = returnUsers.size + (returnUsers.has(cost.car.ownerId) ? 0 : 1);

    // Gas: split total daily cost in half per leg, divide by headcount per leg
    const gasPerLeg = cost.gasCost / 2;
    const gasOutbound = hasOutbound ? gasPerLeg / outboundHeadcount : 0;
    const gasReturn = hasReturn ? gasPerLeg / returnHeadcount : 0;
    const gasShare = gasOutbound + gasReturn;
    // Parking: only outbound riders pay, because the parking fee is paid once when arriving in the morning.
    const parkingShare = hasOutbound && outboundHeadcount > 0 ? cost.parkingCost / outboundHeadcount : 0;
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
