import { prisma } from "@/lib/prisma";

export interface SharedParkingInfo {
  trips: {
    tripId: string;
    carName: string;
    date: Date;
    parkingCost: number;
    headcount: number;
    tripNumber: number;
  }[];
  uniqueNames: string[];
  totalParking: number;
  parkingHeadcount: number;
}

export interface UserDebt {
  userId: string;
  userName: string | null;
  userImage: string | null;
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
    passengers: { id: string; name: string }[];
    driver: { id: string; name: string };
    createdAt: Date;
    sharedParking: SharedParkingInfo | null;
  }[];
}

/**
 * For each Trip, split total cost (gas + parking) among linked check-ins + driver.
 */
export async function calculateDebts(
  startDate: Date,
  endDate: Date,
  partyGroupId: string
): Promise<UserDebt[]> {
  const trips = await prisma.trip.findMany({
    where: {
      partyGroupId,
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

  // Fetch all check-ins for trips in range + linked trips outside range
  const allTripIds = [...trips.map((t) => t.id), ...Array.from(allLinkedIds)];
  const allCheckIns = allTripIds.length > 0
    ? await prisma.checkIn.findMany({
        where: { tripId: { in: allTripIds } },
        include: { user: true },
      })
    : [];

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
    if (trip.gasCost === 0 && trip.parkingCost === 0 && trip.sharedParkingTripIds.length === 0) continue;

    // Find check-ins linked to this Trip (or legacy match by carId+date)
    const linkedCheckIns = allCheckIns.filter(
      (c) =>
        c.tripId === trip.id
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
            c.tripId === linkedTripId
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

    // Collect unique passengers (dedup by userId)
    const passengerMap = new Map<string, { id: string; name: string }>();
    for (const ci of linkedCheckIns) {
      if (!passengerMap.has(ci.userId)) {
        passengerMap.set(ci.userId, { id: ci.userId, name: ci.user.name || "Unknown" });
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
        tripNumber: tripNumberMap.get(trip.id) ?? 1,
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
            c.tripId === linkedTripId
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
          tripNumber: tripNumberMap.get(linkedTripId) ?? 1,
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

    // Determine if someone other than the car owner paid for parking
    const hasSeparateParkingPayer = trip.parkingPaidById && trip.parkingPaidById !== trip.car.ownerId;

    // Charge this trip's passengers (gas + parking)
    for (const uid of passengerIds) {
      // Skip the car owner — they are the driver and don't owe gas debt
      // But if someone else paid for parking, the owner still owes parking
      if (uid === trip.car.ownerId && !hasSeparateParkingPayer) continue;

      const checkIn = linkedCheckIns.find((c) => c.userId === uid);

      let entry = debtMap.get(uid);
      if (!entry) {
        entry = {
          userId: uid,
          userName: checkIn?.user.name ?? null,
          userImage: checkIn?.user.image ?? null,
          totalDebt: 0,
          totalPaid: 0,
          pendingDebt: 0,
          breakdown: [],
        };
        debtMap.set(uid, entry);
      }

      let roundedGasShare = Math.round(gasPerPerson * 100) / 100;
      let roundedParkingShare = Math.round(parkingPerPerson * 100) / 100;

      if (hasSeparateParkingPayer) {
        if (uid === trip.parkingPaidById) {
          // Parking payer: no parking debt (they paid it)
          roundedParkingShare = 0;
        }
        if (uid === trip.car.ownerId) {
          // Car owner: no gas debt (they paid gas) but owes parking
          roundedGasShare = 0;
        }
      }

      const roundedShare = roundedGasShare + roundedParkingShare;
      if (roundedShare === 0) continue;

      entry.totalDebt += roundedShare;
      entry.breakdown.push({
        tripId: trip.id,
        carId: trip.carId,
        carName: trip.car.name,
        licensePlate: trip.car.licensePlate,
        date: trip.date,
        share: roundedShare,
        gasShare: roundedGasShare,
        parkingShare: roundedParkingShare,
        gasCost: trip.gasCost,
        parkingCost: trip.parkingCost,
        totalCost,
        headcount,
        parkingHeadcount,
        tripNumber: tripNumberMap.get(trip.id) ?? 1,
        passengers: Array.from(passengerMap.values()),
        driver: { id: trip.car.ownerId, name: trip.car.owner.name || "Unknown" },
        createdAt: trip.createdAt,
        sharedParking,
      });
    }

    // If someone else paid for parking and the car owner is NOT a passenger,
    // we still need to add the owner's parking debt
    if (hasSeparateParkingPayer && !passengerIds.has(trip.car.ownerId)) {
      const roundedParkingShare = Math.round(parkingPerPerson * 100) / 100;
      if (roundedParkingShare > 0) {
        let entry = debtMap.get(trip.car.ownerId);
        if (!entry) {
          entry = {
            userId: trip.car.ownerId,
            userName: trip.car.owner.name ?? null,
            userImage: null,
            totalDebt: 0,
            totalPaid: 0,
            pendingDebt: 0,
            breakdown: [],
          };
          debtMap.set(trip.car.ownerId, entry);
        }
        entry.totalDebt += roundedParkingShare;
        entry.breakdown.push({
          tripId: trip.id,
          carId: trip.carId,
          carName: trip.car.name,
          licensePlate: trip.car.licensePlate,
          date: trip.date,
          share: roundedParkingShare,
          gasShare: 0,
          parkingShare: roundedParkingShare,
          gasCost: trip.gasCost,
          parkingCost: trip.parkingCost,
          totalCost,
          headcount,
          parkingHeadcount,
          tripNumber: tripNumberMap.get(trip.id) ?? 1,
          passengers: Array.from(passengerMap.values()),
          driver: { id: trip.car.ownerId, name: trip.car.owner.name || "Unknown" },
          createdAt: trip.createdAt,
          sharedParking,
        });
      }
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
          c.tripId === gt.id
      );
      for (const ci of gtCheckIns) groupParkingUserIds.add(ci.userId);
    }
    for (const driverId of groupDriverIds) groupParkingUserIds.add(driverId);
    const groupParkingHeadcount = groupParkingUserIds.size;
    const targetPerPerson = totalParking / groupParkingHeadcount;

    // Collect parking payers across group trips
    const groupParkingPayers = new Set<string>();
    for (const gt of groupTrips) {
      if (gt.parkingPaidById && gt.parkingPaidById !== gt.car.ownerId) {
        groupParkingPayers.add(gt.parkingPaidById);
      }
    }

    // For each person in the debt map, adjust their parking for this group
    for (const entry of debtMap.values()) {
      // Skip drivers (unless they owe parking to a separate payer)
      if (groupDriverIds.has(entry.userId) && !groupParkingPayers.size) continue;
      // Skip parking payers (they fronted parking, no parking debt)
      if (groupParkingPayers.has(entry.userId)) continue;
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
        target.share = target.gasShare + target.parkingShare;
        entry.totalDebt += deficit;
      }
    }
  }

  // Hide shared parking info on entries where parkingShare is 0
  // (e.g. person in both trips already gets charged on the other trip)
  for (const entry of debtMap.values()) {
    for (const b of entry.breakdown) {
      if (b.sharedParking && b.parkingShare === 0) {
        b.sharedParking = null;
      }
    }
  }

  // Fetch all payments linked to trips in this date range
  const tripIdsInRange = trips.map((t) => t.id);
  const payments = tripIdsInRange.length > 0
    ? await prisma.payment.findMany({
        where: { tripId: { in: tripIdsInRange } },
      })
    : [];

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
 * Calculate pending debt for a single user (all-time), broken down per trip.
 * Returns per-trip shares sorted oldest-first, with already-paid amounts subtracted.
 */
export async function calculateUserPendingBreakdown(userId: string, partyGroupId: string, carId?: string): Promise<{
  totalPending: number;
  perTrip: { tripId: string; date: Date; amount: number }[];
}> {
  const allTripsForUser = await prisma.trip.findMany({
    where: { partyGroupId },
    include: { car: true },
    orderBy: { date: "asc" },
  });

  const tripIds = allTripsForUser.map((t) => t.id);
  const allCheckInsForUser = tripIds.length > 0
    ? await prisma.checkIn.findMany({
        where: { tripId: { in: tripIds } },
        include: { user: true },
      })
    : [];

  const allTripsMapForUser = new Map(allTripsForUser.map((t) => [t.id, t]));

  // When carId is provided, only process trips for that car (but keep full map for shared parking lookups)
  const tripsToProcess = carId
    ? allTripsForUser.filter((t) => t.carId === carId)
    : allTripsForUser;

  const dateShares: { date: Date; amount: number; tripId: string }[] = [];

  for (const trip of tripsToProcess) {
    if (trip.gasCost === 0 && trip.parkingCost === 0 && trip.sharedParkingTripIds.length === 0) continue;

    const hasSeparateParkingPayer = trip.parkingPaidById && trip.parkingPaidById !== trip.car.ownerId;

    // Skip if user is the car owner (unless someone else paid for parking)
    if (userId === trip.car.ownerId && !hasSeparateParkingPayer) continue;

    const linkedCheckIns = allCheckInsForUser.filter(
      (c) =>
        c.tripId === trip.id
    );

    // For car owner with separate parking payer, they may not have a check-in
    if (linkedCheckIns.length === 0 && userId !== trip.car.ownerId) continue;

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
            c.tripId === linkedTripId
        );
        for (const ci of linkedCIs) allParkingUserIds.add(ci.userId);
      }
      for (const driverId of allDriverIds) allParkingUserIds.add(driverId);
      parkingHeadcount = allParkingUserIds.size;
    }

    // Only charge if user is a direct passenger of this trip or the owner owing parking
    if (!passengerIds.has(userId) && userId !== trip.car.ownerId) continue;

    const gasPerPerson = trip.gasCost / headcount;
    const parkingPerPerson = trip.parkingCost > 0 ? trip.parkingCost / parkingHeadcount : 0;

    let roundedGas = Math.round(gasPerPerson * 100) / 100;
    let roundedParking = Math.round(parkingPerPerson * 100) / 100;

    if (hasSeparateParkingPayer) {
      if (userId === trip.parkingPaidById) roundedParking = 0;
      if (userId === trip.car.ownerId) roundedGas = 0;
    }

    const share = roundedGas + roundedParking;
    if (share > 0) {
      dateShares.push({ date: trip.date, amount: share, tripId: trip.id });
    }
  }

  // Post-processing: redistribute shared parking deficit to user's own trip entries
  const processedGroups = new Set<string>();
  for (const trip of tripsToProcess) {
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
          c.tripId === gt.id
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
          c.tripId === dsTrip.id
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
              c.tripId === ltId
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

  // Subtract payments per trip
  const tripIdsWithDebt = dateShares.map((ds) => ds.tripId);
  const payments = tripIdsWithDebt.length > 0
    ? await prisma.payment.findMany({
        where: { userId, tripId: { in: tripIdsWithDebt } },
        select: { tripId: true, amount: true },
      })
    : [];

  // Sum payments per trip
  const paidPerTrip = new Map<string, number>();
  for (const p of payments) {
    paidPerTrip.set(p.tripId, (paidPerTrip.get(p.tripId) ?? 0) + p.amount);
  }

  const pending: { tripId: string; date: Date; amount: number }[] = [];

  for (const entry of dateShares) {
    const paid = Math.round((paidPerTrip.get(entry.tripId) ?? 0) * 100) / 100;
    const remaining = Math.round((entry.amount - paid) * 100) / 100;
    if (remaining > 0) {
      pending.push({ tripId: entry.tripId, date: entry.date, amount: remaining });
    }
  }

  const totalPending = pending.reduce((sum, e) => sum + e.amount, 0);
  return {
    totalPending: Math.round(totalPending * 100) / 100,
    perTrip: pending,
  };
}
