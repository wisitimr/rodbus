import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { bangkokDateToUTC } from "@/lib/timezone";
import { getActiveGroupId } from "@/lib/party-group";
import { MemberStatus } from "@prisma/client";

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

  const activeGroupId = await getActiveGroupId();
  if (!activeGroupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const parsedDate = bangkokDateToUTC(date);

  const trips = await prisma.trip.findMany({
    where: {
      carId: { in: carIds.split(",") },
      date: parsedDate,
      partyGroupId: activeGroupId,
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
  const { carId, date, gasCost, parkingCost, label, sharedParkingTripIds, partyGroupId, parkingPaidById } = body;

  if (!carId || !date || !partyGroupId) {
    return NextResponse.json({ error: "carId, date, and partyGroupId are required" }, { status: 400 });
  }

  // Verify the user owns this car
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden: you do not own this car" }, { status: 403 });
  }

  // Verify user is an active member of the group
  const membership = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId: user.id, partyGroupId } },
  });
  if (!membership || membership.status !== MemberStatus.ACTIVE) {
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
  }

  const parsedDate = bangkokDateToUTC(date);

  const linkedIds: string[] = Array.isArray(sharedParkingTripIds) ? sharedParkingTripIds : [];

  const trip = await prisma.trip.create({
    data: {
      carId,
      partyGroupId,
      date: parsedDate,
      gasCost: gasCost ?? 0,
      parkingCost: parkingCost ?? 0,
      parkingPaidById: parkingPaidById || null,
      label: label || null,
      sharedParkingTripIds: linkedIds,
    },
  });

  // Update linked trips to include the new trip ID (bidirectional + transitive linking)
  if (linkedIds.length > 0) {
    const allGroupIds = new Set<string>(linkedIds);
    const linkedTrips = await prisma.trip.findMany({
      where: { id: { in: linkedIds } },
      select: { id: true, sharedParkingTripIds: true },
    });
    for (const lt of linkedTrips) {
      for (const id of lt.sharedParkingTripIds) {
        allGroupIds.add(id);
      }
    }
    allGroupIds.add(trip.id);

    const extraIds = Array.from(allGroupIds).filter((id) => id !== trip.id && !linkedIds.includes(id));
    const extraTrips = extraIds.length > 0
      ? await prisma.trip.findMany({
          where: { id: { in: extraIds } },
          select: { id: true, sharedParkingTripIds: true },
        })
      : [];

    const allLinkedTrips = [...linkedTrips, ...extraTrips];

    for (const lt of allLinkedTrips) {
      const updatedIds = Array.from(allGroupIds).filter((id) => id !== lt.id);
      await prisma.trip.update({
        where: { id: lt.id },
        data: { sharedParkingTripIds: updatedIds },
      });
    }

    const newTripLinks = Array.from(allGroupIds).filter((id) => id !== trip.id);
    if (newTripLinks.length > linkedIds.length) {
      await prisma.trip.update({
        where: { id: trip.id },
        data: { sharedParkingTripIds: newTripLinks },
      });
    }
  }

  revalidateTag("dashboard");
  revalidateTag("history");
  revalidateTag("manage");
  revalidateTag("nav");
  return NextResponse.json(trip);
}
