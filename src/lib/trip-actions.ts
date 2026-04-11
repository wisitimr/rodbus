"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupRole } from "@/lib/party-group";
import { GroupRole, MemberStatus } from "@prisma/client";
import { revalidateTag } from "next/cache";
/** Delete a check-in. User can delete own check-ins; group admin can delete any. */
export async function deleteCheckIn(checkInId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { trip: { select: { partyGroupId: true } } },
  });
  if (!checkIn) throw new Error("Check-in not found");

  if (checkIn.userId !== user.id) {
    const groupId = checkIn.trip.partyGroupId;
    const role = await getGroupRole(user.id, groupId);
    if (role !== GroupRole.ADMIN) throw new Error("Forbidden");
  }

  await prisma.checkIn.delete({ where: { id: checkInId } });

  revalidateTag("dashboard");
  revalidateTag("history");
  revalidateTag("manage");
  revalidateTag("nav");
}

/** Update a trip's gas, parking costs, and shared parking links. Only the car owner can edit. */
export async function updateTrip(
  tripId: string,
  data: { gasCost: number; parkingCost: number; sharedParkingTripIds?: string[] }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { car: { select: { ownerId: true } } },
  });
  if (!trip) throw new Error("Trip not found");

  if (trip.car.ownerId !== user.id) {
    throw new Error("Forbidden");
  }

  const updateData: { gasCost: number; parkingCost: number; sharedParkingTripIds?: string[] } = {
    gasCost: data.gasCost,
    parkingCost: data.parkingCost,
  };

  // Handle shared parking link changes
  if (data.sharedParkingTripIds !== undefined) {
    const newLinkedIds = data.sharedParkingTripIds;
    const oldLinkedIds = trip.sharedParkingTripIds;

    // Remove this trip from trips that are no longer linked
    const removedIds = oldLinkedIds.filter((id) => !newLinkedIds.includes(id));
    for (const removedId of removedIds) {
      const removedTrip = await prisma.trip.findUnique({
        where: { id: removedId },
        select: { sharedParkingTripIds: true },
      });
      if (removedTrip) {
        await prisma.trip.update({
          where: { id: removedId },
          data: {
            sharedParkingTripIds: removedTrip.sharedParkingTripIds.filter((id) => id !== tripId),
          },
        });
      }
    }

    // Build full group with transitive linking
    if (newLinkedIds.length > 0) {
      const allGroupIds = new Set<string>(newLinkedIds);
      const linkedTrips = await prisma.trip.findMany({
        where: { id: { in: newLinkedIds } },
        select: { id: true, sharedParkingTripIds: true },
      });
      for (const lt of linkedTrips) {
        for (const id of lt.sharedParkingTripIds) {
          allGroupIds.add(id);
        }
      }
      allGroupIds.add(tripId);

      const extraIds = Array.from(allGroupIds).filter(
        (id) => id !== tripId && !newLinkedIds.includes(id)
      );
      const extraTrips =
        extraIds.length > 0
          ? await prisma.trip.findMany({
              where: { id: { in: extraIds } },
              select: { id: true, sharedParkingTripIds: true },
            })
          : [];

      const allLinkedTrips = [...linkedTrips, ...extraTrips];

      for (const lt of allLinkedTrips) {
        const updatedIds = Array.from(allGroupIds).filter((id) => id !== lt.id);
        await prisma.trip.update({
          where: { id: lt.id },
          data: { sharedParkingTripIds: updatedIds },
        });
      }

      updateData.sharedParkingTripIds = Array.from(allGroupIds).filter((id) => id !== tripId);
    } else {
      updateData.sharedParkingTripIds = [];
    }
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
  });

  revalidateTag("dashboard");
  revalidateTag("history");
  revalidateTag("manage");
  revalidateTag("nav");
}

/** Delete a trip. Only the car owner can delete. */
export async function deleteTrip(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { car: { select: { ownerId: true } } },
  });
  if (!trip) throw new Error("Trip not found");

  if (trip.car.ownerId !== user.id) {
    throw new Error("Forbidden");
  }

  // Payments and CheckIns cascade-deleted via DB ON DELETE CASCADE
  await prisma.trip.delete({ where: { id: tripId } });

  revalidateTag("dashboard");
  revalidateTag("history");
  revalidateTag("manage");
  revalidateTag("nav");
}

/** Add a passenger (check-in) to a trip. Only the car owner can add passengers. */
export async function addCheckIn(tripId: string, userId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { car: { select: { ownerId: true } } },
  });
  if (!trip) throw new Error("Trip not found");

  // Only the car owner can manually add passengers
  if (trip.car.ownerId !== user.id) throw new Error("Forbidden");

  // Owner cannot be added as a passenger
  if (userId === trip.car.ownerId) throw new Error("Owner cannot check in");

  // Verify target user is an active group member
  const membership = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId, partyGroupId: trip.partyGroupId } },
  });
  if (!membership || membership.status !== MemberStatus.ACTIVE) {
    throw new Error("User is not an active group member");
  }

  // Prevent duplicate check-in
  const existing = await prisma.checkIn.findFirst({
    where: { userId, tripId },
  });
  if (existing) throw new Error("Already checked in");

  await prisma.checkIn.create({ data: { userId, tripId } });

  revalidateTag("dashboard");
  revalidateTag("history");
  revalidateTag("manage");
  revalidateTag("nav");
}
