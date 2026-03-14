import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserManagement from "./user-management";
import CarManagement from "./car-management";
import QRTab from "./qr-tab";
import SettingsTabs from "./settings-tabs";

export default async function AdminPage() {
  const user = (await getCurrentUser())!;
  const userId = user.id;

  const [allUsers, myCars] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
    }),
  ]);

  return (
      <main className="mx-auto max-w-lg p-4">
      <SettingsTabs
        usersTab={
          <UserManagement
            users={allUsers.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
            }))}
            currentUserId={userId}
          />
        }
        carsTab={
          <CarManagement
            cars={myCars.map((c) => ({
              id: c.id,
              name: c.name,
              licensePlate: c.licensePlate,
              defaultGasCost: c.defaultGasCost,
            }))}
          />
        }
        qrTab={
          <QRTab
            cars={myCars.map((c) => ({
              id: c.id,
              name: c.name,
              licensePlate: c.licensePlate,
            }))}
          />
        }
      />
      </main>
  );
}
