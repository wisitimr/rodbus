"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

/** Update a check-in's date. User can edit own check-ins; admin can edit any. */
export async function updateCheckInDate(checkInId: string, newDate: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const checkIn = await prisma.checkIn.findUnique({ where: { id: checkInId } });
  if (!checkIn) throw new Error("Check-in not found");

  if (checkIn.userId !== user.id && user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  const parsedDate = new Date(newDate);
  parsedDate.setHours(0, 0, 0, 0);

  await prisma.checkIn.update({
    where: { id: checkInId },
    data: { date: parsedDate },
  });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
}

/** Delete a check-in. User can delete own check-ins; admin can delete any. */
export async function deleteCheckIn(checkInId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const checkIn = await prisma.checkIn.findUnique({ where: { id: checkInId } });
  if (!checkIn) throw new Error("Check-in not found");

  if (checkIn.userId !== user.id && user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  await prisma.checkIn.delete({ where: { id: checkInId } });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
}

/** Update a trip's gas and parking costs. Only the car owner can edit. */
export async function updateTrip(tripId: string, data: { gasCost: number; parkingCost: number }) {
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

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      gasCost: data.gasCost,
      parkingCost: data.parkingCost,
    },
  });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
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
  revalidateTag("dashboard");
}
