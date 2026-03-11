import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { SignOutButton } from "@clerk/nextjs";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import UserManagement from "./user-management";
import DateManagement from "./date-management";
import CostManagement from "./cost-management";
import SystemPauseToggle from "./system-pause-toggle";
import DebtSettlement from "./debt-settlement";
import CarManagement from "./car-management";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const userId = user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [allUsers, disabledDates, myCars, allCars, systemPausedConfig, debts] =
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
        select: { id: true, name: true },
      }),
      prisma.car.findMany({
        include: { owner: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.systemConfig.findUnique({
        where: { key: "system_paused" },
      }),
      calculateDebts(startOfMonth, endOfMonth),
    ]);

  const isSystemPaused = systemPausedConfig?.value === "true";

  return (
    <main className="mx-auto max-w-4xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      {/* Header */}
      <header className="animate-fade-in mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {t.adminDashboard}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {user.name ?? user.email}
              <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-500/20 ring-inset">
                {t.admin}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href="/dashboard"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 sm:px-4"
            >
              {t.dashboard}
            </a>
            <SignOutButton>
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 sm:px-4">
                {t.signOut}
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <div className="stagger-children space-y-4 sm:space-y-6">
        {/* System Pause Toggle */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-200">
          <div className="border-b border-orange-100 bg-orange-50/50 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-600 sm:text-sm">
              {t.systemStatus}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <SystemPauseToggle isPaused={isSystemPaused} />
          </div>
        </section>

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
        {myCars.length > 0 && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-200">
            <div className="border-b border-blue-100 bg-blue-50/50 px-5 py-3 sm:px-6 sm:py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 sm:text-sm">
                {t.costManagement}
              </h2>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <CostManagement
                cars={myCars.map((c) => ({ id: c.id, name: c.name }))}
              />
            </div>
          </section>
        )}

        {/* Debt Settlement */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-green-200">
          <div className="border-b border-green-100 bg-green-50/50 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-green-600 sm:text-sm">
              {t.debtSettlement}
            </h2>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <DebtSettlement
              debts={debts.map((d) => ({
                userId: d.userId,
                userName: d.userName,
                pendingDebt: d.pendingDebt,
                totalDebt: d.totalDebt,
                totalPaid: d.totalPaid,
              }))}
              cars={myCars.map((c) => ({ id: c.id, name: c.name }))}
            />
          </div>
        </section>

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
