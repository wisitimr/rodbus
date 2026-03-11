import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      <div className="animate-fade-in-up mb-8 text-center">
        <Link href="/" className="group inline-block">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Carpool{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              NFC
            </span>
          </h1>
        </Link>
        <p className="mt-2 text-sm text-gray-500">Create an account to get started</p>
      </div>
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <SignUp forceRedirectUrl="/dashboard" afterSignOutUrl="/" />
      </div>
    </main>
  );
}
