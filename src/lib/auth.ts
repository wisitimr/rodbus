import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Get the current authenticated user from the database.
 * Uses auth() (JWT, no HTTP call) + findUnique for speed.
 * Only falls back to full Clerk API + upsert for first-time users.
 * Cached per request — safe to call multiple times (layout + page).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  try {
    // Fast path: existing user (JWT read + single DB query)
    const existing = await prisma.user.findUnique({
      where: { clerkId },
    });
    if (existing) return existing;

    // Slow path: first-time user — fetch from Clerk API + create in DB
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    return await prisma.user.upsert({
      where: { clerkId: clerkUser.id },
      update: {
        name: clerkUser.fullName ?? clerkUser.firstName,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        image: clerkUser.imageUrl,
      },
      create: {
        clerkId: clerkUser.id,
        name: clerkUser.fullName ?? clerkUser.firstName,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        image: clerkUser.imageUrl,
      },
    });
  } catch (error) {
    console.error("[getCurrentUser] DB error:", error);
    return null;
  }
});

/**
 * Require an authenticated user or throw/redirect.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
