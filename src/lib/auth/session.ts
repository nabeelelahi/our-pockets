import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { UnauthorizedError } from "@/lib/errors";
import { getUserById, type PublicUser } from "@/services/auth.service";
import { getMembership, type Membership } from "@/services/household.service";
import { SESSION_COOKIE, sessionCookieOptions, signSessionToken, verifySessionToken } from "./jwt";

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function deleteSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

/** Verified user id from the session cookie, or null. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
});

/** The logged-in user, or null (also null if the account was deleted). */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const userId = await getSessionUserId();
  return userId ? getUserById(userId) : null;
});

/** For pages: redirects to /login when there is no valid session. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    // A valid token for a deleted account must be cleared, or /login would bounce back here.
    redirect((await getSessionUserId()) ? "/api/session/clear" : "/login");
  }
  return user;
}

export const getCurrentMembership = cache(async (userId: string): Promise<Membership | null> => {
  return getMembership(userId);
});

/** For pages inside the app: requires a user who belongs to a household. */
export async function requireHousehold(): Promise<{ user: PublicUser; membership: Membership }> {
  const user = await requireUser();
  const membership = await getCurrentMembership(user.id);
  if (!membership) redirect("/onboarding");
  return { user, membership };
}

/** Only allow same-origin relative paths as post-login destinations. */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

/** For server actions: the verified user id, or an UnauthorizedError. */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Your session has expired. Please log in again.");
  return user.id;
}
