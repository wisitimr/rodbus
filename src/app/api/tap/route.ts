import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TripType, Role } from "@prisma/client";
import { nowBangkok, todayBangkok } from "@/lib/timezone";

const DEBOUNCE_HOURS = 2;
const EVENING_GAP_HOURS = 4;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // --- Check: user must not be PENDING ---
  if (user.role === Role.PENDING) {
    const pendingUrl = new URL("/pending-approval", request.url);
    return NextResponse.redirect(pendingUrl);
  }

  const carId = request.nextUrl.searchParams.get("carId");
  if (!carId) {
    return NextResponse.json({ error: "Missing carId parameter" }, { status: 400 });
  }

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  const userId = user.id;
  const now = nowBangkok();
  const today = todayBangkok();

  // --- Check: date must not be disabled ---
  const disabledDate = await prisma.disabledDate.findUnique({
    where: { date: today },
  });
  if (disabledDate) {
    const successUrl = new URL("/tap-success", request.url);
    successUrl.searchParams.set("status", "disabled");
    successUrl.searchParams.set("reason", disabledDate.reason ?? "System is disabled for today");
    return NextResponse.redirect(successUrl);
  }

  // --- Debounce: prevent duplicate taps within 2 hours ---
  const debounceThreshold = new Date(now.getTime() - DEBOUNCE_HOURS * 60 * 60 * 1000);
  const recentTap = await prisma.trip.findFirst({
    where: {
      userId,
      carId,
      tappedAt: { gte: debounceThreshold },
    },
    orderBy: { tappedAt: "desc" },
  });

  if (recentTap) {
    const successUrl = new URL("/tap-success", request.url);
    successUrl.searchParams.set("status", "already_recorded");
    successUrl.searchParams.set("car", car.name);
    return NextResponse.redirect(successUrl);
  }

  // --- Determine Morning vs Evening ---
  const todaysTrips = await prisma.trip.findMany({
    where: { userId, date: today },
    orderBy: { tappedAt: "asc" },
  });

  let tripType: TripType;

  if (todaysTrips.length === 0) {
    // First tap of the day -> Morning
    tripType = TripType.MORNING;
  } else {
    const morningTap = todaysTrips.find((t) => t.type === TripType.MORNING);
    if (morningTap) {
      const hoursSinceMorning =
        (now.getTime() - morningTap.tappedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceMorning >= EVENING_GAP_HOURS) {
        // Check if user already has an evening tap today (from any car)
        const hasEvening = todaysTrips.some((t) => t.type === TripType.EVENING);
        if (hasEvening) {
          const successUrl = new URL("/tap-success", request.url);
          successUrl.searchParams.set("status", "already_recorded");
          successUrl.searchParams.set("car", car.name);
          return NextResponse.redirect(successUrl);
        }
        tripType = TripType.EVENING;
      } else {
        // Too soon for evening tap — treat as debounce
        const successUrl = new URL("/tap-success", request.url);
        successUrl.searchParams.set("status", "too_soon");
        successUrl.searchParams.set("car", car.name);
        return NextResponse.redirect(successUrl);
      }
    } else {
      // No morning tap found (shouldn't happen), default to morning
      tripType = TripType.MORNING;
    }
  }

  // --- Create the trip record ---
  await prisma.trip.create({
    data: {
      userId,
      carId,
      type: tripType,
      date: today,
    },
  });

  const successUrl = new URL("/tap-success", request.url);
  successUrl.searchParams.set("status", "recorded");
  successUrl.searchParams.set("type", tripType.toLowerCase());
  successUrl.searchParams.set("car", car.name);
  return NextResponse.redirect(successUrl);
}
