"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireGroupAdmin } from "@/lib/party-group";
import { revalidatePath, revalidateTag } from "next/cache";
import { bangkokDateToUTC, todayBangkokUTC } from "@/lib/timezone";

// ---------------------------------------------------------------------------
// Cost Management — Admin can create trips for their owned cars
// ---------------------------------------------------------------------------

export async function createTrip(
  carId: string,
  date: string,
  gasCost: number,
  parkingCost: number,
  partyGroupId: string
) {
  await requireGroupAdmin(partyGroupId);

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) throw new Error("Car not found");
  if (car.ownerId !== user.id) throw new Error("You do not own this car");

  const parsedDate = bangkokDateToUTC(date);

  await prisma.trip.create({
    data: { carId, partyGroupId, date: parsedDate, gasCost, parkingCost },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}

// ---------------------------------------------------------------------------
// Update Car — Admin edits car name, license plate, and default gas cost
// ---------------------------------------------------------------------------

export async function updateCar(
  carId: string,
  data: { name: string; licensePlate: string | null; defaultGasCost: number }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!data.name.trim()) throw new Error("Car name is required");

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) throw new Error("Car not found");
  if (car.ownerId !== user.id) throw new Error("You do not own this car");

  await prisma.car.update({
    where: { id: carId },
    data: {
      name: data.name.trim(),
      licensePlate: data.licensePlate?.trim() || null,
      defaultGasCost: data.defaultGasCost,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}

// ---------------------------------------------------------------------------
// Car Management
// ---------------------------------------------------------------------------

/** Add a new car owned by the logged-in user */
export async function addCar(name: string, licensePlate: string | null, defaultGasCost: number = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!name.trim()) {
    throw new Error("Car name is required");
  }

  await prisma.car.create({
    data: {
      name: name.trim(),
      licensePlate: licensePlate?.trim() || null,
      defaultGasCost,
      ownerId: user.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}

/** Delete a car and all associated data */
export async function deleteCar(carId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) throw new Error("Car not found");
  if (car.ownerId !== user.id) throw new Error("You do not own this car");

  await prisma.car.delete({ where: { id: carId } });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}

// ---------------------------------------------------------------------------
// Payment / Debt Settlement
// ---------------------------------------------------------------------------

/** Record a payment (partial or full) for a user toward a specific car */
export async function recordPayment(
  userId: string,
  carId: string,
  amount: number,
  partyGroupId: string,
  note?: string
) {
  await requireGroupAdmin(partyGroupId);

  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const { calculateUserPendingBreakdown } = await import("@/lib/cost-splitting");
  const result = await calculateUserPendingBreakdown(userId, partyGroupId, carId);

  // Distribute payment across trips oldest-first
  let remaining = amount;
  const payments: { tripId: string; amount: number }[] = [];

  for (const entry of result.perTrip) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, entry.amount);
    payments.push({ tripId: entry.tripId, amount: Math.round(pay * 100) / 100 });
    remaining = Math.round((remaining - pay) * 100) / 100;
  }

  // If amount exceeds total pending, put remainder on the latest trip
  if (remaining > 0 && payments.length > 0) {
    payments[payments.length - 1].amount += remaining;
  }

  await prisma.payment.createMany({
    data: payments.map((p) => ({
      userId,
      tripId: p.tripId,
      amount: p.amount,
      note: note || null,
    })),
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}

/** Clear the pending balance for a user. If tripIds provided, settle only those trips. */
export async function markAsSettled(userId: string, carId: string, partyGroupId: string, note?: string, tripIds?: string[]) {
  await requireGroupAdmin(partyGroupId);

  const { calculateUserPendingBreakdown } = await import("@/lib/cost-splitting");
  const result = await calculateUserPendingBreakdown(userId, partyGroupId, carId);

  const tripsToSettle = tripIds
    ? result.perTrip.filter((entry) => tripIds.includes(entry.tripId))
    : result.perTrip;

  if (tripsToSettle.length === 0) {
    throw new Error("User has no pending debt");
  }

  // Create one payment per trip
  await prisma.payment.createMany({
    data: tripsToSettle.map((entry) => ({
      userId,
      tripId: entry.tripId,
      amount: entry.amount,
      note: note || null,
    })),
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/manage");
  revalidateTag("dashboard");
}
