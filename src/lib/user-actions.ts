"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { revalidatePath } from "next/cache";

/**
 * Sync the current Clerk user's profile (name + image) back into the app DB.
 * Called after the user updates their profile via Clerk's user profile modal.
 */
export async function syncClerkProfile() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated");

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Clerk user not found");

  const name = clerkUser.fullName ?? clerkUser.firstName ?? null;
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const image = clerkUser.imageUrl;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (!existing) return null;

  if (existing.name === name && existing.image === image && existing.email === email) {
    return existing;
  }

  const updated = await prisma.user.update({
    where: { clerkId },
    data: { name, email, image },
  });

  revalidateTag("dashboard");
  revalidateTag("history");
  revalidateTag("manage");
  revalidateTag("nav");
  revalidatePath("/", "layout");

  return updated;
}
