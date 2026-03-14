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
