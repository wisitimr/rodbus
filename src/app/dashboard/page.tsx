import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";
import CostForm from "./cost-form";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Date range: current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Fetch user's cars (as driver)
  const myCars = await prisma.car.findMany({
    where: { driverId: userId },
  });

  // Fetch today's trips for the user
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysTrips = await prisma.trip.findMany({
    where: { userId, date: today },
    include: { car: true },
  });

  // Calculate debts for the month
  const debts = await calculateDebts(startOfMonth, endOfMonth);
  const myDebt = debts.find((d) => d.userId === userId);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome, {session.user.name ?? session.user.email}
          </p>
        </div>
        <a
          href="/api/auth/signout"
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          Sign Out
        </a>
      </header>

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

      {/* Monthly Debt Summary */}
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
                  <th className="pb-2 text-right">Total Owed</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => (
                  <tr
                    key={d.userId}
                    className={`border-b ${d.userId === userId ? "bg-blue-50 font-semibold" : ""}`}
                  >
                    <td className="py-2">{d.userName ?? "Unknown"}</td>
                    <td className="py-2 text-right">${d.totalDebt.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Breakdown for current user */}
        {myDebt && myDebt.breakdown.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
              View your breakdown
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

      {/* Driver: Enter Costs */}
      {myCars.length > 0 && (
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Enter Daily Costs</h2>
          <CostForm cars={myCars.map((c) => ({ id: c.id, name: c.name }))} />
        </section>
      )}
    </main>
  );
}
