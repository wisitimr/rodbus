import Link from "next/link";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      {/* Hero icon */}
      <div className="animate-scale-in relative">
        <div className="absolute -inset-6 rounded-3xl bg-blue-500/15 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 sm:h-28 sm:w-28">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-white sm:h-14 sm:w-14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="animate-fade-in-up mt-8 text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        Carpool{" "}
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          NFC
        </span>
      </h1>
      <p
        className="animate-fade-in-up mt-4 max-w-xs text-center text-base leading-relaxed text-gray-500 sm:max-w-sm sm:text-lg"
        style={{ animationDelay: "100ms" }}
      >
        Tap the NFC sticker in your car to log your ride. Costs are split
        automatically.
      </p>

      {/* Feature pills */}
      <div
        className="animate-fade-in-up mt-6 flex flex-wrap justify-center gap-2"
        style={{ animationDelay: "200ms" }}
      >
        {[
          { label: "NFC Tap-In", icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
          { label: "Auto Split", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
          { label: "Monthly Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
        ].map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-medium text-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
            </svg>
            {f.label}
          </span>
        ))}
      </div>

      {/* CTA buttons */}
      <div
        className="animate-fade-in-up mt-10 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4"
        style={{ animationDelay: "300ms" }}
      >
        <Link
          href="/dashboard"
          className="group relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] sm:py-3.5"
        >
          <span className="relative z-10">Go to Dashboard</span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        {user ? (
          <SignOutButton>
            <button className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.98] sm:py-3.5">
              Sign Out
            </button>
          </SignOutButton>
        ) : (
          <SignInButton>
            <button className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.98] sm:py-3.5">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </main>
  );
}
