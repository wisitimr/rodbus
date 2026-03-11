import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { SignOutButton } from "@clerk/nextjs";

export default async function PendingApprovalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.PENDING) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-5xl">{"\u23F3"}</div>
        <h1 className="mb-2 text-2xl font-bold">Pending Approval</h1>
        <p className="mb-6 text-gray-600">
          Your account is awaiting approval from an administrator. You will be
          able to use the carpool system once your account has been approved.
        </p>
        <p className="text-sm text-gray-400">
          Signed in as {user.email}
        </p>
        <SignOutButton>
          <button className="mt-4 inline-block text-sm text-blue-600 underline hover:text-blue-800">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
