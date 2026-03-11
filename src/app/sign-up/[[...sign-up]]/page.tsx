import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <Link href="/" className="group inline-block">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Carpool{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              NFC
            </span>
          </h1>
        </Link>
        <p className="mt-2 text-sm text-gray-500">Create an account to get started</p>
      </div>
      <SignUp afterSignUpUrl="/dashboard" afterSignOutUrl="/" />
    </main>
  );
}
