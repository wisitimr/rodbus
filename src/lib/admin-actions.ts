"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

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
export async function setUserRole(userId: string, role: Role) {
  const admin = await requireAdmin();

  // Prevent admin from demoting themselves
  if (userId === admin.id && role !== Role.ADMIN) {
    throw new Error("Cannot change your own role");
  }

  // If promoting to ADMIN, the user should own at least one car
  // (ADMIN = Car Owner by definition). Skip this check for demotions.
  if (role === Role.ADMIN) {
    const carCount = await prisma.car.count({ where: { ownerId: userId } });
    if (carCount === 0) {
      throw new Error("Only car owners can be promoted to ADMIN. Assign a car first.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Cost Management — Admin can update gas/parking for their owned cars
// ---------------------------------------------------------------------------

export async function updateDailyCost(
  carId: string,
  date: string,
  gasCost: number,
  parkingCost: number
) {
  const admin = await requireAdmin();

  // Verify the admin owns this car
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.ownerId !== admin.id) {
    throw new Error("Forbidden: you do not own this car");
  }

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  await prisma.dailyCost.upsert({
    where: { carId_date: { carId, date: parsedDate } },
    update: { gasCost, parkingCost },
    create: { carId, date: parsedDate, gasCost, parkingCost },
  });

  revalidatePath("/admin");
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
// System-wide pause toggle (via SystemConfig)
// ---------------------------------------------------------------------------

/** Toggle the global system pause */
export async function setSystemPaused(paused: boolean) {
  await requireAdmin();

  await prisma.systemConfig.upsert({
    where: { key: "system_paused" },
    update: { value: paused ? "true" : "false" },
    create: { key: "system_paused", value: paused ? "true" : "false" },
  });
  revalidatePath("/admin");
}

/** Check if the system is globally paused */
export async function isSystemPaused(): Promise<boolean> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "system_paused" },
  });
  return config?.value === "true";
}

// ---------------------------------------------------------------------------
// Car Management
// ---------------------------------------------------------------------------

/** Add a new car */
export async function addCar(name: string, licensePlate: string | null, ownerId: string) {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("Car name is required");
  }

  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) {
    throw new Error("Owner not found");
  }

  await prisma.car.create({
    data: {
      name: name.trim(),
      licensePlate: licensePlate?.trim() || null,
      ownerId,
    },
  });

  revalidatePath("/admin");
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.payment.create({
    data: {
      userId,
      carId,
      amount,
      note: note || null,
      date: today,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/** Clear the full pending balance for a user by creating a payment for the exact amount */
export async function clearFullBalance(userId: string, carId: string) {
  await requireAdmin();

  const { calculateUserPendingDebt } = await import("@/lib/cost-splitting");
  const pendingDebt = await calculateUserPendingDebt(userId);

  if (pendingDebt <= 0) {
    throw new Error("User has no pending debt");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.payment.create({
    data: {
      userId,
      carId,
      amount: pendingDebt,
      note: "Full balance cleared",
      date: today,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
