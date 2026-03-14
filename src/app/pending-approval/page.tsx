import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { SignOutButton } from "@clerk/nextjs";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";

export default async function PendingApprovalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== Role.PENDING) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm animate-scale-in text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-warning/10 border-2 border-warning/30">
          <svg className="h-12 w-12 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {t.pendingApprovalTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t.pendingApprovalDesc}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4 text-left">
          <h3 className="mb-3 text-sm font-semibold text-foreground">How it works:</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              <span>You&apos;ve signed up — that&apos;s done!</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning text-xs font-bold text-white">2</span>
              <span>Wait for the driver/admin to approve your account</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">3</span>
              <span>Once approved, tap NFC or scan QR to check in</span>
            </li>
          </ol>
        </div>

        <div className="mt-6 rounded-xl bg-muted px-4 py-3">
          <p className="text-xs text-muted-foreground">{t.signedInAs}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {user.email}
          </p>
        </div>

        <SignOutButton>
          <button className="mt-5 text-sm font-medium text-primary transition hover:text-primary/80">
            {t.signOut}
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
