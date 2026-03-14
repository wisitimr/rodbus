import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Get the current authenticated user from the database.
 * Cached per request — safe to call multiple times (layout + page).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  try {
    const user = await prisma.user.upsert({
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

    return user;
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
