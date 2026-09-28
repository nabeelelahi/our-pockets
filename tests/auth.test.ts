import { describe, expect, it } from "vitest";
import { sessionCookieOptions, signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { User } from "@/models/User";
import { authenticateUser, getUserById, registerUser } from "@/services/auth.service";

const input = { name: "Nabeel", email: "Nabeel@Example.com", password: "password123", confirmPassword: "password123" };

describe("registration", () => {
  it("registers a user with a hashed password and normalised email", async () => {
    const user = await registerUser(input);
    expect(user).toEqual({ id: expect.any(String), name: "Nabeel", email: "nabeel@example.com" });
    expect(user).not.toHaveProperty("passwordHash");

    const stored = await User.findById(user.id).select("+passwordHash").lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored?.passwordHash).not.toContain("password123");
  });

  it("rejects duplicate emails regardless of case", async () => {
    await registerUser(input);
    await expect(registerUser({ ...input, email: "NABEEL@example.com" })).rejects.toThrow(
      "An account with this email already exists.",
    );
  });

  it("validates input", async () => {
    await expect(registerUser({ ...input, email: "not-an-email" })).rejects.toThrow();
    await expect(registerUser({ ...input, password: "short", confirmPassword: "short" })).rejects.toThrow();
    await expect(registerUser({ ...input, confirmPassword: "different1" })).rejects.toMatchObject({
      fieldErrors: { confirmPassword: ["Passwords do not match."] },
    });
  });

  it("never returns the password hash from lookups", async () => {
    const user = await registerUser(input);
    expect(await getUserById(user.id)).not.toHaveProperty("passwordHash");
  });
});

describe("login", () => {
  it("logs in with correct credentials", async () => {
    const user = await registerUser(input);
    await expect(authenticateUser({ email: " NABEEL@example.com ", password: "password123" })).resolves.toEqual(user);
  });

  it("rejects an invalid password or unknown email with the same message", async () => {
    await registerUser(input);
    await expect(authenticateUser({ email: input.email, password: "wrong-password" })).rejects.toThrow(
      "Incorrect email or password.",
    );
    await expect(authenticateUser({ email: "nobody@example.com", password: "password123" })).rejects.toThrow(
      "Incorrect email or password.",
    );
  });
});

describe("session JWT", () => {
  const userId = "64b7f0c2a1b2c3d4e5f60718";

  it("round-trips a user id and carries nothing else", async () => {
    const token = await signSessionToken(userId);
    expect(await verifySessionToken(token)).toBe(userId);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("rejects missing, malformed and tampered tokens", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("garbage.token.value")).toBeNull();
    const token = await signSessionToken(userId);
    expect(await verifySessionToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "another-secret-that-is-at-least-32-characters";
    const foreign = await signSessionToken(userId);
    process.env.JWT_SECRET = original;
    expect(await verifySessionToken(foreign)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const expired = await signSessionToken(userId, Math.floor(Date.now() / 1000) - 60);
    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("uses HTTP-only cookies, and logout clears with maxAge 0", () => {
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(sessionCookieOptions(0).maxAge).toBe(0);
  });
});
