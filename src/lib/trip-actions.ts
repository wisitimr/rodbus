"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

/** Update a trip's date. User can edit own trips; admin can edit any. */
export async function updateTripDate(tripId: string, newDate: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");

  if (trip.userId !== user.id && user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  const parsedDate = new Date(newDate);
  parsedDate.setHours(0, 0, 0, 0);

  await prisma.trip.update({
    where: { id: tripId },
    data: { date: parsedDate },
  });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
}

/** Delete a trip. User can delete own trips; admin can delete any. */
export async function deleteTrip(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");

  if (trip.userId !== user.id && user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  await prisma.trip.delete({ where: { id: tripId } });

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
}
