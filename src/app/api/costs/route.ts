import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/costs — Driver sets gas & parking for their car on a given date
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { carId, date, gasCost, parkingCost } = body;

  if (!carId || !date) {
    return NextResponse.json({ error: "carId and date are required" }, { status: 400 });
  }

  // Verify the user owns this car
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.driverId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden: you do not own this car" }, { status: 403 });
  }

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  const dailyCost = await prisma.dailyCost.upsert({
    where: {
      carId_date: { carId, date: parsedDate },
    },
    update: {
      gasCost: gasCost ?? 0,
      parkingCost: parkingCost ?? 0,
    },
    create: {
      carId,
      date: parsedDate,
      gasCost: gasCost ?? 0,
      parkingCost: parkingCost ?? 0,
    },
  });

  return NextResponse.json(dailyCost);
}
