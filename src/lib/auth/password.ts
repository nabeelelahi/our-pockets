import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same time as a real password check. Used when the email is
 * unknown so response timing doesn't reveal which accounts exist.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= bcrypt.hash("not-a-real-password", COST);
  await bcrypt.compare(password, await dummyHash);
  return false;
}
