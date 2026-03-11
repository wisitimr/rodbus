import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import { Role } from "@prisma/client";
import { SignOutButton } from "@clerk/nextjs";
import CostForm from "./cost-form";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const userId = user.id;
  const isAdmin = user.role === Role.ADMIN;

  // Date range: current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all data in parallel
  const [myCars, todaysTrips, recentTrips, debts, myPayments] =
    await Promise.all([
      prisma.car.findMany({ where: { ownerId: userId } }),
      prisma.trip.findMany({
        where: { userId, date: today },
        include: { car: true },
      }),
      prisma.trip.findMany({
        where: { userId },
        include: { car: true },
        orderBy: { tappedAt: "desc" },
        take: 20,
      }),
      calculateDebts(startOfMonth, endOfMonth),
      prisma.payment.findMany({
        where: { userId },
        include: { car: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const myDebt = debts.find((d) => d.userId === userId);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome, {user.name ?? user.email}
            {isAdmin && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Admin
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <a
              href="/admin"
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Admin Panel
            </a>
          )}
          <SignOutButton>
            <button className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </header>

      {/* Current Pending Debt */}
      <section className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-2 text-lg font-semibold">Your Pending Debt</h2>
        {myDebt && myDebt.pendingDebt > 0 ? (
          <div>
            <p className="text-3xl font-bold text-red-600">
              ${myDebt.pendingDebt.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Total accrued: ${myDebt.totalDebt.toFixed(2)} &middot; Paid:{" "}
              ${myDebt.totalPaid.toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="text-2xl font-bold text-green-600">$0.00</p>
        )}

        {/* Breakdown */}
        {myDebt && myDebt.breakdown.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
              View cost breakdown
            </summary>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {myDebt.breakdown.map((b, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {b.carName} — {b.date.toLocaleDateString()} ({b.passengerCount}{" "}
                    riders)
                  </span>
                  <span>${b.share.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Today's Rides */}
      <section className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Today&apos;s Rides</h2>
        {todaysTrips.length === 0 ? (
          <p className="text-gray-500">No rides logged today.</p>
        ) : (
          <ul className="space-y-2">
            {todaysTrips.map((trip) => (
              <li
                key={trip.id}
                className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2"
              >
                <span className="font-medium">{trip.car.name}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    trip.type === "MORNING"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  {trip.type === "MORNING" ? "Morning (In)" : "Evening (Out)"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent Trip History */}
      <section className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Recent Trips</h2>
        {recentTrips.length === 0 ? (
          <p className="text-gray-500">No trip history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Car</th>
                  <th className="pb-2 text-right">Type</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip) => (
                  <tr key={trip.id} className="border-b">
                    <td className="py-2">
                      {trip.date.toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {trip.tappedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2">{trip.car.name}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          trip.type === "MORNING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {trip.type === "MORNING" ? "Morning" : "Evening"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payment History */}
      <section className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Payment History</h2>
        {myPayments.length === 0 ? (
          <p className="text-gray-500">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Car</th>
                  <th className="pb-2">Note</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">
                      {p.date.toLocaleDateString()}
                    </td>
                    <td className="py-2">{p.car.name}</td>
                    <td className="py-2 text-gray-500">
                      {p.note ?? "\u2014"}
                    </td>
                    <td className="py-2 text-right font-medium text-green-600">
                      ${p.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Monthly Summary Table */}
      <section className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          Monthly Summary ({now.toLocaleString("default", { month: "long" })})
        </h2>
        {debts.length === 0 ? (
          <p className="text-gray-500">No costs recorded this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="pb-2">Passenger</th>
                  <th className="pb-2 text-right">Accrued</th>
                  <th className="pb-2 text-right">Paid</th>
                  <th className="pb-2 text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => (
                  <tr
                    key={d.userId}
                    className={`border-b ${d.userId === userId ? "bg-blue-50 font-semibold" : ""}`}
                  >
                    <td className="py-2">{d.userName ?? "Unknown"}</td>
                    <td className="py-2 text-right">
                      ${d.totalDebt.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-green-600">
                      ${d.totalPaid.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      ${d.pendingDebt.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Driver: Enter Costs (quick access) */}
      {myCars.length > 0 && (
        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Enter Daily Costs</h2>
          <CostForm cars={myCars.map((c) => ({ id: c.id, name: c.name }))} />
        </section>
      )}
    </main>
  );
}
