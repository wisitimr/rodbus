import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { todayBangkok } from "@/lib/timezone";

type ValidateError =
  | { error: "not_found" }
  | { error: "owner"; car: string }
  | { error: "disabled"; reason: string }
  | { error: "already_recorded"; car: string }
  | { error: "no_open_trip"; car: string };

type ValidateSuccess = { ok: true; tripId: string; car: string; today: Date };

async function validateTap(
  user: { id: string; role: string },
  carId: string,
): Promise<ValidateError | ValidateSuccess> {
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) return { error: "not_found" };

  if (user.id === car.ownerId) {
    return { error: "owner", car: car.name };
  }

  const today = todayBangkok();

  const disabledDate = await prisma.disabledDate.findUnique({
    where: { date: today },
  });
  if (disabledDate) {
    return { error: "disabled", reason: disabledDate.reason ?? "System is disabled for today" };
  }

  // Find active trips for this car today that user hasn't checked in yet
  const todaysTrips = await prisma.trip.findMany({
    where: { carId, date: today },
    orderBy: { createdAt: "asc" },
    include: { checkIns: { where: { userId: user.id } } },
  });

  for (const trip of todaysTrips) {
    if (trip.checkIns.length === 0) {
      return { ok: true, tripId: trip.id, car: car.name, today };
    }
  }

  // All trips already checked in or no trips exist
  if (todaysTrips.length === 0) {
    return { error: "no_open_trip", car: car.name };
  }
  return { error: "already_recorded", car: car.name };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role === Role.PENDING) {
    const pendingUrl = new URL("/pending-approval", request.url);
    return NextResponse.redirect(pendingUrl);
  }

  const carId = request.nextUrl.searchParams.get("carId");
  if (!carId) {
    return NextResponse.json({ error: "Missing carId parameter" }, { status: 400 });
  }

  const result = await validateTap(user, carId);

  if (!("ok" in result)) {
    const successUrl = new URL("/tap-success", request.url);
    successUrl.searchParams.set("status", result.error);
    if ("car" in result) successUrl.searchParams.set("car", result.car);
    if ("reason" in result) successUrl.searchParams.set("reason", result.reason);
    return NextResponse.redirect(successUrl);
  }

  const confirmUrl = new URL("/tap-confirm", request.url);
  confirmUrl.searchParams.set("carId", carId);
  confirmUrl.searchParams.set("car", result.car);
  confirmUrl.searchParams.set("tripId", result.tripId);
  return NextResponse.redirect(confirmUrl);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === Role.PENDING) {
    return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
  }

  const body = await request.json();
  const { carId, tripId } = body;
  if (!carId) {
    return NextResponse.json({ error: "Missing carId" }, { status: 400 });
  }

  // Re-validate to prevent race conditions
  const result = await validateTap(user, carId);

  if (!("ok" in result)) {
    return NextResponse.json({ error: result.error, car: "car" in result ? result.car : undefined }, { status: 400 });
  }

  // Use the tripId from validation (most accurate) or from request body
  const finalTripId = result.tripId || tripId;

  await prisma.checkIn.create({
    data: {
      userId: user.id,
      carId,
      tripId: finalTripId,
      date: result.today,
    },
  });

  return NextResponse.json({
    status: "recorded",
    car: result.car,
  });
}
