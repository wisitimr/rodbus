import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TripType, Role } from "@prisma/client";
import { nowBangkok, todayBangkok } from "@/lib/timezone";

const DEBOUNCE_HOURS = 2;
const RETURN_GAP_HOURS = 4;

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

  // --- Determine Outbound vs Return ---
  const todaysTrips = await prisma.trip.findMany({
    where: { userId, date: today },
    orderBy: { tappedAt: "asc" },
  });

  let tripType: TripType;

  if (todaysTrips.length === 0) {
    // First tap of the day -> Outbound
    tripType = TripType.OUTBOUND;
  } else {
    const outboundTap = todaysTrips.find((t) => t.type === TripType.OUTBOUND);
    if (outboundTap) {
      const hoursSinceOutbound =
        (now.getTime() - outboundTap.tappedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceOutbound >= RETURN_GAP_HOURS) {
        // Check if user already has a return tap today (from any car)
        const hasReturn = todaysTrips.some((t) => t.type === TripType.RETURN);
        if (hasReturn) {
          const successUrl = new URL("/tap-success", request.url);
          successUrl.searchParams.set("status", "already_recorded");
          successUrl.searchParams.set("car", car.name);
          return NextResponse.redirect(successUrl);
        }
        tripType = TripType.RETURN;
      } else {
        // Too soon for return tap — treat as debounce
        const successUrl = new URL("/tap-success", request.url);
        successUrl.searchParams.set("status", "too_soon");
        successUrl.searchParams.set("car", car.name);
        return NextResponse.redirect(successUrl);
      }
    } else {
      // No outbound tap found (shouldn't happen), default to outbound
      tripType = TripType.OUTBOUND;
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
