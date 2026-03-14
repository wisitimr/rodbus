import { prisma } from "@/lib/prisma";

export interface SharedParkingInfo {
  trips: {
    tripId: string;
    carName: string;
    date: Date;
    parkingCost: number;
    headcount: number;
  }[];
  uniqueNames: string[];
  totalParking: number;
  parkingHeadcount: number;
}

export interface UserDebt {
  userId: string;
  userName: string | null;
  totalDebt: number;
  totalPaid: number;
  pendingDebt: number;
  breakdown: {
    tripId: string;
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
    parkingHeadcount: number;
    tripNumber: number;
    passengerNames: string[];
    driverName: string | null;
    createdAt: Date;
    sharedParking: SharedParkingInfo | null;
  }[];
}

/**
 * For each Trip, split total cost (gas + parking) among linked check-ins + driver.
 * Legacy check-ins (without tripId) fall back to matching by carId+date.
 */
export async function calculateDebts(
  startDate: Date,
  endDate: Date
): Promise<UserDebt[]> {
  const trips = await prisma.trip.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { car: { include: { owner: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  // Also fetch any trips outside the date range that are linked via sharedParkingTripIds
  const allLinkedIds = new Set<string>();
  for (const trip of trips) {
    for (const id of trip.sharedParkingTripIds) {
      if (!trips.some((t) => t.id === id)) {
        allLinkedIds.add(id);
      }
    }
  }
  const linkedTripsOutOfRange = allLinkedIds.size > 0
    ? await prisma.trip.findMany({
        where: { id: { in: Array.from(allLinkedIds) } },
        include: { car: { include: { owner: { select: { name: true } } } } },
      })
    : [];
  const allTripsMap = new Map(
    [...trips, ...linkedTripsOutOfRange].map((t) => [t.id, t])
  );

  // Fetch check-ins for linked trips outside the date range too
  const linkedCheckInsOutOfRange = allLinkedIds.size > 0
    ? await prisma.checkIn.findMany({
        where: {
          OR: [
            { tripId: { in: Array.from(allLinkedIds) } },
            ...linkedTripsOutOfRange.map((t) => ({
              tripId: null as string | null,
              carId: t.carId,
              date: t.date,
            })),
          ],
        },
        include: { user: true },
      })
    : [];

  const dateRangeCheckIns = await prisma.checkIn.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { user: true },
  });
  const allCheckIns = [...dateRangeCheckIns, ...linkedCheckInsOutOfRange];

  // Pre-compute trip numbers per car+date
  const tripNumberMap = new Map<string, number>();
  const carDateGroups = new Map<string, string[]>();
  for (const trip of trips) {
    const key = `${trip.carId}-${trip.date.toISOString()}`;
    if (!carDateGroups.has(key)) carDateGroups.set(key, []);
    carDateGroups.get(key)!.push(trip.id);
  }
  for (const [, ids] of carDateGroups) {
    ids.forEach((id, i) => tripNumberMap.set(id, i + 1));
  }

  const debtMap = new Map<string, UserDebt>();

  for (const trip of trips) {
    if (trip.gasCost === 0 && trip.parkingCost === 0) continue;

    // Find check-ins linked to this Trip (or legacy match by carId+date)
    const linkedCheckIns = allCheckIns.filter(
      (c) =>
        c.tripId === trip.id ||
        (c.tripId === null && c.carId === trip.carId && c.date.getTime() === trip.date.getTime())
    );

    if (linkedCheckIns.length === 0) continue;

    // Unique passengers
    const passengerIds = new Set(linkedCheckIns.map((c) => c.userId));
    // headcount = unique passengers + 1 for driver
    const headcount = passengerIds.size + (passengerIds.has(trip.car.ownerId) ? 0 : 1);

    // Calculate parking headcount: if shared with other trips, pool all unique people
    let parkingHeadcount = headcount;
    // Track all unique parking participants (passengers + drivers) across linked trips
    const allParkingUserIds = new Set(passengerIds);
    const allDriverIds = new Set<string>();
    allDriverIds.add(trip.car.ownerId);

    if (trip.sharedParkingTripIds.length > 0) {
      for (const linkedTripId of trip.sharedParkingTripIds) {
        const linkedTrip = allTripsMap.get(linkedTripId);
        if (!linkedTrip) continue;

        allDriverIds.add(linkedTrip.car.ownerId);
        const linkedCIs = allCheckIns.filter(
          (c) =>
            c.tripId === linkedTripId ||
            (c.tripId === null && c.carId === linkedTrip.carId && c.date.getTime() === linkedTrip.date.getTime())
        );
        for (const ci of linkedCIs) {
          allParkingUserIds.add(ci.userId);
        }
      }

      // parkingHeadcount = unique people across all linked trips (passengers + drivers)
      for (const driverId of allDriverIds) {
        if (!allParkingUserIds.has(driverId)) {
          allParkingUserIds.add(driverId);
        }
      }
      parkingHeadcount = allParkingUserIds.size;
    }

    const gasPerPerson = trip.gasCost / headcount;
    const parkingPerPerson = trip.parkingCost > 0 ? trip.parkingCost / parkingHeadcount : 0;
    const perPerson = gasPerPerson + parkingPerPerson;
    const totalCost = trip.gasCost + trip.parkingCost;

    // Collect unique passenger names (from check-ins only, not driver)
    const nameSet = new Map<string, string>();
    for (const ci of linkedCheckIns) {
      if (ci.user.name && !nameSet.has(ci.userId)) {
        nameSet.set(ci.userId, ci.user.name);
      }
    }

    // Build consolidated shared parking info (computed once, shared across entries)
    let sharedParking: SharedParkingInfo | null = null;
    if (trip.sharedParkingTripIds.length > 0) {
      const parkingNameSet = new Map<string, string>();
      const parkingTrips: SharedParkingInfo["trips"] = [];

      // Add current trip's passengers and driver names
      for (const ci of linkedCheckIns) {
        if (ci.user.name && !parkingNameSet.has(ci.userId)) {
          parkingNameSet.set(ci.userId, ci.user.name);
        }
      }
      if (trip.car.owner.name && !parkingNameSet.has(trip.car.ownerId)) {
        parkingNameSet.set(trip.car.ownerId, trip.car.owner.name);
      }

      // Add current trip detail
      parkingTrips.push({
        tripId: trip.id,
        carName: trip.car.name,
        date: trip.date,
        parkingCost: trip.parkingCost,
        headcount,
      });

      // Add linked trips
      for (const linkedTripId of trip.sharedParkingTripIds) {
        const linkedTrip = allTripsMap.get(linkedTripId);
        if (!linkedTrip) continue;

        // Collect names from linked trip
        if (linkedTrip.car.owner?.name && !parkingNameSet.has(linkedTrip.car.ownerId)) {
          parkingNameSet.set(linkedTrip.car.ownerId, linkedTrip.car.owner.name);
        }
        const linkedCIs = allCheckIns.filter(
          (c) =>
            c.tripId === linkedTripId ||
            (c.tripId === null && c.carId === linkedTrip.carId && c.date.getTime() === linkedTrip.date.getTime())
        );
        for (const ci of linkedCIs) {
          if (ci.user.name && !parkingNameSet.has(ci.userId)) {
            parkingNameSet.set(ci.userId, ci.user.name);
          }
        }

        // Compute linked trip headcount
        const linkedPassengerIds = new Set(linkedCIs.map((c) => c.userId));
        const linkedHeadcount = linkedPassengerIds.size + (linkedPassengerIds.has(linkedTrip.car.ownerId) ? 0 : 1);

        parkingTrips.push({
          tripId: linkedTripId,
          carName: linkedTrip.car.name,
          date: linkedTrip.date,
          parkingCost: linkedTrip.parkingCost,
          headcount: linkedHeadcount,
        });
      }

      const totalParking = parkingTrips.reduce((sum, t) => sum + t.parkingCost, 0);

      sharedParking = {
        trips: parkingTrips,
        uniqueNames: Array.from(parkingNameSet.values()),
        totalParking,
        parkingHeadcount,
      };
    }

    // Charge this trip's passengers (gas + parking)
    for (const uid of passengerIds) {
      // Skip the car owner — they are the driver and don't owe debt
      if (uid === trip.car.ownerId) continue;

      const checkIn = linkedCheckIns.find((c) => c.userId === uid);

      let entry = debtMap.get(uid);
      if (!entry) {
        entry = {
          userId: uid,
          userName: checkIn?.user.name ?? null,
          totalDebt: 0,
          totalPaid: 0,
          pendingDebt: 0,
          breakdown: [],
        };
        debtMap.set(uid, entry);
      }

      entry.totalDebt += perPerson;
      entry.breakdown.push({
        tripId: trip.id,
        carId: trip.carId,
        carName: trip.car.name,
        licensePlate: trip.car.licensePlate,
        date: trip.date,
        share: Math.round(perPerson * 100) / 100,
        gasShare: Math.round(gasPerPerson * 100) / 100,
        parkingShare: Math.round(parkingPerPerson * 100) / 100,
        gasCost: trip.gasCost,
        parkingCost: trip.parkingCost,
        totalCost,
        headcount,
        parkingHeadcount,
        tripNumber: tripNumberMap.get(trip.id) ?? 1,
        passengerNames: Array.from(nameSet.values()),
        driverName: trip.car.owner.name ?? null,
        createdAt: trip.createdAt,
        sharedParking,
      });
    }

  }

  // Post-processing: redistribute shared parking so each person's total parking
  // share (totalParking / parkingHeadcount) is added to their OWN trip entries,
  // not as separate entries from trips they're not in.
  const processedGroups = new Set<string>();
  for (const trip of trips) {
    if (trip.sharedParkingTripIds.length === 0) continue;

    // Canonical group key to avoid processing the same group twice
    const groupIds = [trip.id, ...trip.sharedParkingTripIds].sort();
    const groupKey = groupIds.join(",");
    if (processedGroups.has(groupKey)) continue;
    processedGroups.add(groupKey);

    // Get all trips in this group
    const groupTrips = groupIds.map((id) => allTripsMap.get(id)).filter(Boolean) as typeof trips;
    const totalParking = groupTrips.reduce((sum, t) => sum + t.parkingCost, 0);
    if (totalParking === 0) continue;

    // Compute parking headcount for this group
    const groupParkingUserIds = new Set<string>();
    const groupDriverIds = new Set<string>();
    for (const gt of groupTrips) {
      groupDriverIds.add(gt.car.ownerId);
      const gtCheckIns = allCheckIns.filter(
        (c) =>
          c.tripId === gt.id ||
          (c.tripId === null && c.carId === gt.carId && c.date.getTime() === gt.date.getTime())
      );
      for (const ci of gtCheckIns) groupParkingUserIds.add(ci.userId);
    }
    for (const driverId of groupDriverIds) groupParkingUserIds.add(driverId);
    const groupParkingHeadcount = groupParkingUserIds.size;
    const targetPerPerson = totalParking / groupParkingHeadcount;

    // For each person in the debt map, adjust their parking for this group
    for (const entry of debtMap.values()) {
      // Skip drivers
      if (groupDriverIds.has(entry.userId)) continue;
      // Skip people not in this parking pool
      if (!groupParkingUserIds.has(entry.userId)) continue;

      // Find their breakdown entries that belong to trips in this group
      const groupBreakdowns = entry.breakdown.filter((b) => groupIds.includes(b.tripId));
      if (groupBreakdowns.length === 0) continue;

      // Sum their current parking share from trips in this group
      const currentParkingSum = groupBreakdowns.reduce((sum, b) => sum + b.parkingShare, 0);
      const deficit = Math.round((targetPerPerson - currentParkingSum) * 100) / 100;

      if (deficit > 0) {
        // Add deficit to their first breakdown entry in the group
        const target = groupBreakdowns[0];
        target.parkingShare = Math.round((target.parkingShare + deficit) * 100) / 100;
        target.share = Math.round((target.share + deficit) * 100) / 100;
        entry.totalDebt += deficit;
      }
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
  const allTripsForUser = await prisma.trip.findMany({
    include: { car: true },
    orderBy: { date: "asc" },
  });

  const allCheckInsForUser = await prisma.checkIn.findMany({
    include: { user: true },
  });

  const allTripsMapForUser = new Map(allTripsForUser.map((t) => [t.id, t]));

  const dateShares: { date: Date; amount: number; tripId: string }[] = [];

  for (const trip of allTripsForUser) {
    if (trip.gasCost === 0 && trip.parkingCost === 0) continue;

    // Skip if user is the car owner
    if (userId === trip.car.ownerId) continue;

    const linkedCheckIns = allCheckInsForUser.filter(
      (c) =>
        c.tripId === trip.id ||
        (c.tripId === null && c.carId === trip.carId && c.date.getTime() === trip.date.getTime())
    );

    if (linkedCheckIns.length === 0) continue;

    const passengerIds = new Set(linkedCheckIns.map((c) => c.userId));
    const headcount = passengerIds.size + (passengerIds.has(trip.car.ownerId) ? 0 : 1);

    // Compute shared parking headcount
    let parkingHeadcount = headcount;
    const allParkingUserIds = new Set(passengerIds);
    const allDriverIds = new Set<string>();
    allDriverIds.add(trip.car.ownerId);

    if (trip.sharedParkingTripIds.length > 0) {
      for (const linkedTripId of trip.sharedParkingTripIds) {
        const linkedTrip = allTripsMapForUser.get(linkedTripId);
        if (!linkedTrip) continue;
        allDriverIds.add(linkedTrip.car.ownerId);
        const linkedCIs = allCheckInsForUser.filter(
          (c) =>
            c.tripId === linkedTripId ||
            (c.tripId === null && c.carId === linkedTrip.carId && c.date.getTime() === linkedTrip.date.getTime())
        );
        for (const ci of linkedCIs) allParkingUserIds.add(ci.userId);
      }
      for (const driverId of allDriverIds) allParkingUserIds.add(driverId);
      parkingHeadcount = allParkingUserIds.size;
    }

    // Only charge if user is a direct passenger of this trip
    if (!passengerIds.has(userId)) continue;

    const gasPerPerson = trip.gasCost / headcount;
    const parkingPerPerson = trip.parkingCost > 0 ? trip.parkingCost / parkingHeadcount : 0;
    const share = Math.round((gasPerPerson + parkingPerPerson) * 100) / 100;
    if (share > 0) {
      dateShares.push({ date: trip.date, amount: share, tripId: trip.id });
    }
  }

  // Post-processing: redistribute shared parking deficit to user's own trip entries
  const processedGroups = new Set<string>();
  for (const trip of allTripsForUser) {
    if (trip.sharedParkingTripIds.length === 0) continue;

    const groupIds = [trip.id, ...trip.sharedParkingTripIds].sort();
    const groupKey = groupIds.join(",");
    if (processedGroups.has(groupKey)) continue;
    processedGroups.add(groupKey);

    // Check if user is in the parking pool for this group
    const groupParkingUserIds = new Set<string>();
    const groupDriverIds = new Set<string>();
    const groupTrips = groupIds.map((id) => allTripsMapForUser.get(id)).filter(Boolean) as typeof allTripsForUser;
    const totalParking = groupTrips.reduce((sum, t) => sum + t.parkingCost, 0);
    if (totalParking === 0) continue;

    for (const gt of groupTrips) {
      groupDriverIds.add(gt.car.ownerId);
      const gtCheckIns = allCheckInsForUser.filter(
        (c) =>
          c.tripId === gt.id ||
          (c.tripId === null && c.carId === gt.carId && c.date.getTime() === gt.date.getTime())
      );
      for (const ci of gtCheckIns) groupParkingUserIds.add(ci.userId);
    }
    for (const driverId of groupDriverIds) groupParkingUserIds.add(driverId);

    if (!groupParkingUserIds.has(userId)) continue;
    if (groupDriverIds.has(userId)) continue;

    const groupParkingHeadcount = groupParkingUserIds.size;
    const targetPerPerson = totalParking / groupParkingHeadcount;

    // Find user's dateShares entries belonging to trips in this group
    const groupEntries = dateShares.filter((ds) => groupIds.includes(ds.tripId));
    if (groupEntries.length === 0) continue;

    // Sum current parking contribution from these entries
    // We need to recalculate what parking was already included
    let currentParkingSum = 0;
    for (const ds of groupEntries) {
      const dsTrip = allTripsMapForUser.get(ds.tripId);
      if (!dsTrip) continue;
      const dsCIs = allCheckInsForUser.filter(
        (c) =>
          c.tripId === dsTrip.id ||
          (c.tripId === null && c.carId === dsTrip.carId && c.date.getTime() === dsTrip.date.getTime())
      );
      const dsPassengerIds = new Set(dsCIs.map((c) => c.userId));
      const dsHeadcount = dsPassengerIds.size + (dsPassengerIds.has(dsTrip.car.ownerId) ? 0 : 1);

      let dsParkingHC = dsHeadcount;
      if (dsTrip.sharedParkingTripIds.length > 0) {
        const dsParkingUsers = new Set(dsPassengerIds);
        const dsDrivers = new Set<string>();
        dsDrivers.add(dsTrip.car.ownerId);
        for (const ltId of dsTrip.sharedParkingTripIds) {
          const lt = allTripsMapForUser.get(ltId);
          if (!lt) continue;
          dsDrivers.add(lt.car.ownerId);
          const ltCIs = allCheckInsForUser.filter(
            (c) =>
              c.tripId === ltId ||
              (c.tripId === null && c.carId === lt.carId && c.date.getTime() === lt.date.getTime())
          );
          for (const ci of ltCIs) dsParkingUsers.add(ci.userId);
        }
        for (const did of dsDrivers) dsParkingUsers.add(did);
        dsParkingHC = dsParkingUsers.size;
      }

      if (dsTrip.parkingCost > 0) {
        currentParkingSum += dsTrip.parkingCost / dsParkingHC;
      }
    }

    const deficit = Math.round((targetPerPerson - currentParkingSum) * 100) / 100;
    if (deficit > 0) {
      groupEntries[0].amount = Math.round((groupEntries[0].amount + deficit) * 100) / 100;
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
