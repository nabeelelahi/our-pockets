"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { createSession, deleteSession, requireUserId, safeNextPath } from "@/lib/auth/session";
import { authenticateUser, registerUser, updateProfile } from "@/services/auth.service";

type Redirect = { redirectTo: string };

export async function registerAction(formData: FormData): Promise<ActionResult<Redirect>> {
  return runAction(async () => {
    const user = await registerUser({
      name: formString(formData, "name"),
      email: formString(formData, "email"),
      password: formString(formData, "password"),
      confirmPassword: formString(formData, "confirmPassword"),
    });
    await createSession(user.id);
    return { redirectTo: safeNextPath(formString(formData, "next")) ?? "/onboarding" };
  });
}

export async function loginAction(formData: FormData): Promise<ActionResult<Redirect>> {
  return runAction(async () => {
    const user = await authenticateUser({
      email: formString(formData, "email"),
      password: formString(formData, "password"),
    });
    await createSession(user.id);
    return { redirectTo: safeNextPath(formString(formData, "next")) ?? "/" };
  });
}

export async function logoutAction(): Promise<ActionResult<Redirect>> {
  await deleteSession();
  return { ok: true, data: { redirectTo: "/login" } };
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await updateProfile(await requireUserId(), { name: formString(formData, "name") });
    revalidatePath("/", "layout");
  }, "Profile saved.");
}
