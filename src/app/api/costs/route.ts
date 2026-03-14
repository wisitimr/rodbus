import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const parsedDate = new Date(date);
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

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

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

  // Update linked trips to include the new trip ID (bidirectional linking)
  if (linkedIds.length > 0) {
    const linkedTrips = await prisma.trip.findMany({
      where: { id: { in: linkedIds } },
      select: { id: true, sharedParkingTripIds: true },
    });
    for (const lt of linkedTrips) {
      const updatedIds = Array.from(new Set([...lt.sharedParkingTripIds, trip.id, ...linkedIds.filter(id => id !== lt.id)]));
      await prisma.trip.update({
        where: { id: lt.id },
        data: { sharedParkingTripIds: updatedIds },
      });
    }
  }

  return NextResponse.json(trip);
}
