import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join",
  "/pending-approval(.*)",
  "/tap-success(.*)",
  "/tap-confirm(.*)",
  "/open-in-browser",
]);

const IN_APP_BROWSER_RE =
  /Line|FBAN|FBAV|Instagram|Twitter|MicroMessenger|WeChat|Snapchat|TikTok/i;

const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join(.*)",
  "/api/tap(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Detect in-app browsers on auth pages and redirect to open-in-browser page
  if (isAuthRoute(request)) {
    const ua = request.headers.get("user-agent") ?? "";
    if (IN_APP_BROWSER_RE.test(ua)) {
      const targetUrl = request.nextUrl.pathname + request.nextUrl.search;
      const url = new URL("/open-in-browser", request.url);
      url.searchParams.set("url", targetUrl);
      return NextResponse.redirect(url);
    }
  }

  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("redirectUrl", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
