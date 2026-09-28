import { AppError } from "./errors";

export type ActionResult<T = void> =
  | ({ ok: true; message?: string } & ([T] extends [undefined | void] ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Runs server-action work and converts failures into a user-safe result.
 * Only AppError messages reach the client; anything else is logged
 * server-side (name + message only, no request data) and replaced.
 */
export async function runAction<T>(
  work: () => Promise<T>,
  message?: string,
): Promise<ActionResult<T>> {
  try {
    const data = await work();
    return { ok: true, message, data } as ActionResult<T>;
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    }
    const e = err instanceof Error ? err : new Error(String(err));
    console.error(`[action] ${e.name}: ${e.message}`);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
