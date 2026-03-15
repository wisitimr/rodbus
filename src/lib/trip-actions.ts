"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { bangkokDateToUTC } from "@/lib/timezone";

/** Update a check-in's date. User can edit own check-ins; group admin can edit any. */
export async function updateCheckInDate(checkInId: string, newDate: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { trip: { select: { partyGroupId: true } } },
  });
  if (!checkIn) throw new Error("Check-in not found");

  // Check permission: own check-in OR group admin
  if (checkIn.userId !== user.id) {
    const groupId = checkIn.trip?.partyGroupId;
    if (!groupId) throw new Error("Forbidden");
    const role = await getGroupRole(user.id, groupId);
    if (role !== GroupRole.ADMIN) throw new Error("Forbidden");
  }

  const parsedDate = bangkokDateToUTC(newDate);

  await prisma.checkIn.update({
    where: { id: checkInId },
    data: { date: parsedDate },
  });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}

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
    const groupId = checkIn.trip?.partyGroupId;
    if (!groupId) throw new Error("Forbidden");
    const role = await getGroupRole(user.id, groupId);
    if (role !== GroupRole.ADMIN) throw new Error("Forbidden");
  }

  await prisma.checkIn.delete({ where: { id: checkInId } });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
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

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
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

  await prisma.trip.delete({ where: { id: tripId } });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}
