import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const redirectUrl = redirect_url?.startsWith("/") ? redirect_url : "/dashboard";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm animate-scale-in text-center">
        <Link href="/" className="group inline-block">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            RodBus{" "}
            <span className="text-primary">
              NFC Tracker
            </span>
          </h1>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">{t.signInSubtitle}</p>
      </div>
      <div className="mt-8 animate-fade-in">
        <SignIn forceRedirectUrl={redirectUrl} afterSignOutUrl="/" />
      </div>
    </main>
  );
}
