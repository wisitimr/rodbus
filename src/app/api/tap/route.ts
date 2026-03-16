import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayBangkokUTC } from "@/lib/timezone";
import { revalidateTag } from "next/cache";

// QR tap must always query DB fresh — never serve cached redirect
export const dynamic = "force-dynamic";

type ValidateError =
  | { error: "not_found" }
  | { error: "owner"; car: string }
  | { error: "no_group" }
  | { error: "already_recorded"; car: string }
  | { error: "no_open_trip"; car: string };

type AvailableTrip = { id: string; tripNumber: number; checkInCount: number; gasCost: number; parkingCost: number };

type ValidateSuccess = { ok: true; trips: AvailableTrip[]; car: string; today: Date };

async function validateTap(
  user: { id: string },
  carId: string,
): Promise<ValidateError | ValidateSuccess> {
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) return { error: "not_found" };

  if (user.id === car.ownerId) {
    return { error: "owner", car: car.name };
  }

  // Get user's active group IDs
  const memberships = await prisma.partyGroupMember.findMany({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
    select: { partyGroupId: true },
  });

  if (memberships.length === 0) {
    return { error: "no_group" };
  }

  const userGroupIds = memberships.map((m) => m.partyGroupId);

  const today = todayBangkokUTC();

  // Find active trips for this car today that are in groups the user belongs to
  const todaysTrips = await prisma.trip.findMany({
    where: {
      carId,
      date: today,
      partyGroupId: { in: userGroupIds },
    },
    orderBy: { createdAt: "asc" },
    include: {
      checkIns: true,
    },
  });

  const availableTrips: AvailableTrip[] = [];
  for (let i = 0; i < todaysTrips.length; i++) {
    const trip = todaysTrips[i];
    const alreadyCheckedIn = trip.checkIns.some((ci) => ci.userId === user.id);
    if (!alreadyCheckedIn) {
      availableTrips.push({
        id: trip.id,
        tripNumber: i + 1,
        checkInCount: trip.checkIns.length,
        gasCost: trip.gasCost,
        parkingCost: trip.parkingCost,
      });
    }
  }

  if (availableTrips.length === 0) {
    if (todaysTrips.length === 0) {
      return { error: "no_open_trip", car: car.name };
    }
    return { error: "already_recorded", car: car.name };
  }

  return { ok: true, trips: availableTrips, car: car.name, today };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check user has at least one active group
  const hasGroup = await prisma.partyGroupMember.findFirst({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
  });
  if (!hasGroup) {
    const joinUrl = new URL("/join", request.url);
    return NextResponse.redirect(joinUrl);
  }

  const carId = request.nextUrl.searchParams.get("carId");
  if (!carId) {
    return NextResponse.json({ error: "Missing carId parameter" }, { status: 400 }, );
  }

  const result = await validateTap(user, carId);

  if (!("ok" in result)) {
    const successUrl = new URL("/tap-success", request.url);
    successUrl.searchParams.set("status", result.error);
    if ("car" in result) successUrl.searchParams.set("car", result.car);
    return NextResponse.redirect(successUrl);
  }

  const confirmUrl = new URL("/tap-confirm", request.url);
  confirmUrl.searchParams.set("carId", carId);
  confirmUrl.searchParams.set("car", result.car);
  confirmUrl.searchParams.set("trips", JSON.stringify(result.trips));
  return NextResponse.redirect(confirmUrl);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check user has at least one active group
  const hasGroup = await prisma.partyGroupMember.findFirst({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
  });
  if (!hasGroup) {
    return NextResponse.json({ error: "No active group membership" }, { status: 403 });
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

  // Use tripId from request body; verify it's still available
  const finalTripId = tripId && result.trips.some((t) => t.id === tripId)
    ? tripId
    : result.trips[0]?.id;

  if (!finalTripId) {
    return NextResponse.json({ error: "no_open_trip", car: result.car }, { status: 400 });
  }

  await prisma.checkIn.create({
    data: {
      userId: user.id,
      tripId: finalTripId,
    },
  });

  revalidateTag("dashboard");

  return NextResponse.json({
    status: "recorded",
    car: result.car,
  });
}
