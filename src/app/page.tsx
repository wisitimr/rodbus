import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-4xl font-bold">Carpool NFC Tracker</h1>
      <p className="mb-8 text-center text-lg text-gray-600">
        Tap the NFC sticker in your car to log your ride. Costs are split
        automatically.
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Dashboard
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
