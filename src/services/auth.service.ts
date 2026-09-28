import { dbConnect } from "@/lib/db";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { loginSchema, profileSchema, registerSchema, fieldErrorsOf } from "@/lib/validation";
import { User } from "@/models/User";

export type PublicUser = { id: string; name: string; email: string };

function toPublicUser(user: { _id: { toString(): string }; name: string; email: string }): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

const DUPLICATE_EMAIL = "An account with this email already exists.";

export async function registerUser(input: unknown): Promise<PublicUser> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  const { name, email, password } = parsed.data;

  await dbConnect();
  if (await User.exists({ email })) {
    throw new AppError(DUPLICATE_EMAIL, { email: [DUPLICATE_EMAIL] });
  }
  try {
    const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    return toPublicUser(user);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(DUPLICATE_EMAIL, { email: [DUPLICATE_EMAIL] });
    throw err;
  }
}

export async function authenticateUser(input: unknown): Promise<PublicUser> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  const { email, password } = parsed.data;

  await dbConnect();
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  if (!user || !ok) throw new AppError("Incorrect email or password.");
  return toPublicUser(user);
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  await dbConnect();
  const user = await User.findById(userId).lean();
  return user ? toPublicUser(user) : null;
}

export async function updateProfile(userId: string, input: unknown): Promise<PublicUser> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));

  await dbConnect();
  const user = await User.findByIdAndUpdate(userId, { $set: { name: parsed.data.name } }, { returnDocument: "after" }).lean();
  if (!user) throw new AppError("Your account no longer exists.");
  return toPublicUser(user);
}
