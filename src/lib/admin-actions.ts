"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { todayBangkok } from "@/lib/timezone";

// ---------------------------------------------------------------------------
// Reusable authorization guard — ensures only ADMIN (Car Owners) can proceed
// ---------------------------------------------------------------------------
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  if (user.role !== Role.ADMIN) {
    throw new Error("Forbidden: admin access required");
  }
  return user;
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

/** Approve a PENDING user → USER */
export async function approveUser(userId: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role: Role.USER },
  });
  revalidatePath("/admin");
}

/** Delete a user and all associated data (trips, payments, owned cars) */
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("Cannot delete yourself");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
}

/** Revoke a USER → back to PENDING */
export async function revokeUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("Cannot revoke your own access");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { role: Role.PENDING },
  });
  revalidatePath("/admin");
}

/** Set any user's role (with safeguards) */
export async function setUserRole(userId: string, role: Role): Promise<{ error?: string }> {
  const admin = await requireAdmin();

  // Prevent admin from demoting themselves
  if (userId === admin.id && role !== Role.ADMIN) {
    return { error: "Cannot change your own role" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
  return {};
}

// ---------------------------------------------------------------------------
// Cost Management — Admin can update gas/parking for their owned cars
// ---------------------------------------------------------------------------

export async function createTrip(
  carId: string,
  date: string,
  gasCost: number,
  parkingCost: number
) {
  await requireAdmin();

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) {
    throw new Error("Car not found");
  }

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  await prisma.trip.create({
    data: { carId, date: parsedDate, gasCost, parkingCost },
  });

  revalidatePath("/admin");
  revalidateTag("dashboard");
}

// ---------------------------------------------------------------------------
// Default Gas Cost — Admin sets default gas cost per car
// ---------------------------------------------------------------------------

export async function updateDefaultGasCost(carId: string, gasCost: number) {
  await requireAdmin();

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) {
    throw new Error("Car not found");
  }

  await prisma.car.update({
    where: { id: carId },
    data: { defaultGasCost: gasCost },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// System Configuration — Disabled Dates (holidays / maintenance)
// ---------------------------------------------------------------------------

/** Disable the system for a specific date */
export async function disableDate(date: string, reason?: string) {
  await requireAdmin();
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  await prisma.disabledDate.upsert({
    where: { date: parsedDate },
    update: { reason: reason || null },
    create: { date: parsedDate, reason: reason || null },
  });
  revalidatePath("/admin");
}

/** Re-enable the system for a specific date */
export async function enableDate(date: string) {
  await requireAdmin();
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  await prisma.disabledDate
    .delete({ where: { date: parsedDate } })
    .catch(() => {
      // Silently ignore if date wasn't disabled
    });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Car Management
// ---------------------------------------------------------------------------

/** Add a new car owned by the logged-in user */
export async function addCar(name: string, licensePlate: string | null) {
  const user = await requireAdmin();

  if (!name.trim()) {
    throw new Error("Car name is required");
  }

  await prisma.car.create({
    data: {
      name: name.trim(),
      licensePlate: licensePlate?.trim() || null,
      ownerId: user.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
}

/** Delete a car and all associated data */
export async function deleteCar(carId: string) {
  await requireAdmin();

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) {
    throw new Error("Car not found");
  }

  await prisma.car.delete({ where: { id: carId } });

  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Payment / Debt Settlement
// ---------------------------------------------------------------------------

/** Record a payment (partial or full) for a user toward a specific car */
export async function recordPayment(
  userId: string,
  carId: string,
  amount: number,
  note?: string
) {
  await requireAdmin();

  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const { calculateUserPendingBreakdown } = await import("@/lib/cost-splitting");
  const result = await calculateUserPendingBreakdown(userId);

  // Distribute payment across dates oldest-first
  let remaining = amount;
  const payments: { date: Date; amount: number }[] = [];

  for (const entry of result.perDate) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, entry.amount);
    payments.push({ date: entry.date, amount: Math.round(pay * 100) / 100 });
    remaining = Math.round((remaining - pay) * 100) / 100;
  }

  // If amount exceeds total pending, put remainder on the latest date
  if (remaining > 0) {
    const lastDate = result.perDate.length > 0
      ? result.perDate[result.perDate.length - 1].date
      : todayBangkok();
    if (payments.length > 0 && payments[payments.length - 1].date.getTime() === lastDate.getTime()) {
      payments[payments.length - 1].amount += remaining;
    } else {
      payments.push({ date: lastDate, amount: remaining });
    }
  }

  await prisma.payment.createMany({
    data: payments.map((p) => ({
      userId,
      carId,
      amount: p.amount,
      note: note || null,
      date: p.date,
    })),
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
}

/** Clear the full pending balance for a user by creating a payment for the exact amount */
export async function markAsSettled(userId: string, carId: string) {
  await requireAdmin();

  const { calculateUserPendingBreakdown } = await import("@/lib/cost-splitting");
  const result = await calculateUserPendingBreakdown(userId);

  if (result.totalPending <= 0) {
    throw new Error("User has no pending debt");
  }

  // Create one payment per cost date
  await prisma.payment.createMany({
    data: result.perDate.map((entry) => ({
      userId,
      carId,
      amount: entry.amount,
      note: "Full balance cleared",
      date: entry.date,
    })),
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidateTag("dashboard");
}
