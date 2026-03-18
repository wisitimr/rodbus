import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import OpenInBrowserClient from "./client";

export default async function OpenInBrowserPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const targetUrl = url?.startsWith("/") ? url : "/";

  return <OpenInBrowserClient targetUrl={targetUrl} locale={locale} />;
}
