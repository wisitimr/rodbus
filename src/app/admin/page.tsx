import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import UserManagement from "./user-management";
import DateManagement from "./date-management";
import CostManagement from "./cost-management";
import CarManagement from "./car-management";
import { todayBangkok } from "@/lib/timezone";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;

  const today = todayBangkok();

  const [allUsers, disabledDates, myCars, allCars] =
    await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      }),
      prisma.disabledDate.findMany({
        where: { date: { gte: today } },
        orderBy: { date: "asc" },
      }),
      prisma.car.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, defaultGasCost: true },
      }),
      prisma.car.findMany({
        include: { owner: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      {/* Header */}
      <header className="animate-fade-in sticky top-0 z-50 -mx-4 mb-6 bg-gray-50/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:mb-8 sm:px-6">
        <div className="flex items-center">
          <a
            href="/dashboard"
            className="shrink-0 rounded-xl bg-gray-900 p-2 text-white shadow-sm transition hover:bg-gray-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <h1 className="flex-1 text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {t.settings}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="stagger-children space-y-4 sm:space-y-6">
        {/* User Management */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-red-200">
          <div className="border-b border-red-100 bg-red-50/50 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-600 sm:text-sm">
              {t.userManagement}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <UserManagement
              users={allUsers.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
              }))}
              currentUserId={userId}
            />
          </div>
        </section>

        {/* Car Management */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-purple-200">
          <div className="border-b border-purple-100 bg-purple-50/50 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-600 sm:text-sm">
              {t.carManagement}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <CarManagement
              cars={allCars.map((c) => ({
                id: c.id,
                name: c.name,
                licensePlate: c.licensePlate,
                ownerName: c.owner.name,
              }))}
              users={allUsers
                .filter((u) => u.role !== "PENDING")
                .map((u) => ({ id: u.id, name: u.name, email: u.email }))}
            />
          </div>
        </section>

        {/* Cost Management */}
        {allCars.length > 0 && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-200">
            <div className="border-b border-blue-100 bg-blue-50/50 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 sm:text-sm">
                {t.costManagement}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <CostManagement
                cars={allCars.map((c) => ({ id: c.id, name: c.name, defaultGasCost: c.defaultGasCost }))}
              />
            </div>
          </section>
        )}

        {/* Operating Days */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 sm:text-sm">
              {t.operatingDays}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <DateManagement
              disabledDates={disabledDates.map((d) => ({
                id: d.id,
                date: d.date.toISOString().split("T")[0],
                reason: d.reason,
              }))}
            />
          </div>
        </section>
      </div>

    </main>
  );
}
