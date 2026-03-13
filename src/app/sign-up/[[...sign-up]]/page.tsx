import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";

export default async function SignUpPage() {
  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      <div className="animate-fade-in-up mb-8 text-center">
        <Link href="/" className="group inline-block">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            RodBus{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              NFC Tracker
            </span>
          </h1>
        </Link>
        <p className="mt-2 text-sm text-gray-500">{t.signUpSubtitle}</p>
      </div>
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <SignUp forceRedirectUrl="/dashboard" afterSignOutUrl="/" />
      </div>
    </main>
  );
}
