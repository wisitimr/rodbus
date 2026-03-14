import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { todayBangkok } from "@/lib/timezone";

// GET /api/costs?date=YYYY-MM-DD&carIds=id1,id2 — Fetch trips for given date and cars
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const carIds = searchParams.get("carIds");

  if (!date || !carIds) {
    return NextResponse.json({ error: "date and carIds are required" }, { status: 400 });
  }

  const parsedDate = new Date(date + "T00:00:00");
  parsedDate.setHours(0, 0, 0, 0);

  const trips = await prisma.trip.findMany({
    where: {
      carId: { in: carIds.split(",") },
      date: parsedDate,
    },
    include: { checkIns: { select: { id: true, userId: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    trips.map((t) => ({
      id: t.id,
      carId: t.carId,
      gasCost: t.gasCost,
      parkingCost: t.parkingCost,
      label: t.label,
      passengerCount: t.checkIns.length,
    }))
  );
}

// POST /api/costs — Owner creates a new trip
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { carId, date, gasCost, parkingCost, label, sharedParkingTripIds } = body;

  if (!carId || !date) {
    return NextResponse.json({ error: "carId and date are required" }, { status: 400 });
  }

  // Verify the user owns this car
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden: you do not own this car" }, { status: 403 });
  }

  // Use todayBangkok() to ensure the date matches check-in lookup (tap route)
  // which also uses todayBangkok(). This prevents timezone mismatch.
  const bangkokToday = todayBangkok();
  const bangkokTodayStr = `${bangkokToday.getFullYear()}-${String(bangkokToday.getMonth() + 1).padStart(2, "0")}-${String(bangkokToday.getDate()).padStart(2, "0")}`;
  const parsedDate = date === bangkokTodayStr
    ? bangkokToday
    : (() => { const d = new Date(date + "T00:00:00"); d.setHours(0, 0, 0, 0); return d; })();

  const linkedIds: string[] = Array.isArray(sharedParkingTripIds) ? sharedParkingTripIds : [];

  const trip = await prisma.trip.create({
    data: {
      carId,
      date: parsedDate,
      gasCost: gasCost ?? 0,
      parkingCost: parkingCost ?? 0,
      label: label || null,
      sharedParkingTripIds: linkedIds,
    },
  });

  // Update linked trips to include the new trip ID (bidirectional + transitive linking)
  // Collect the full group: all trips reachable through existing links
  if (linkedIds.length > 0) {
    const allGroupIds = new Set<string>(linkedIds);
    const linkedTrips = await prisma.trip.findMany({
      where: { id: { in: linkedIds } },
      select: { id: true, sharedParkingTripIds: true },
    });
    // Gather all transitively linked trip IDs
    for (const lt of linkedTrips) {
      for (const id of lt.sharedParkingTripIds) {
        allGroupIds.add(id);
      }
    }
    allGroupIds.add(trip.id);

    // Fetch any additional trips discovered through transitive links
    const extraIds = Array.from(allGroupIds).filter((id) => id !== trip.id && !linkedIds.includes(id));
    const extraTrips = extraIds.length > 0
      ? await prisma.trip.findMany({
          where: { id: { in: extraIds } },
          select: { id: true, sharedParkingTripIds: true },
        })
      : [];

    const allLinkedTrips = [...linkedTrips, ...extraTrips];

    // Update every trip in the group to know about all other members
    for (const lt of allLinkedTrips) {
      const updatedIds = Array.from(allGroupIds).filter((id) => id !== lt.id);
      await prisma.trip.update({
        where: { id: lt.id },
        data: { sharedParkingTripIds: updatedIds },
      });
    }

    // Update the newly created trip to include all group members
    const newTripLinks = Array.from(allGroupIds).filter((id) => id !== trip.id);
    if (newTripLinks.length > linkedIds.length) {
      await prisma.trip.update({
        where: { id: trip.id },
        data: { sharedParkingTripIds: newTripLinks },
      });
    }
  }

  revalidateTag("dashboard");
  return NextResponse.json(trip);
}
