import { z } from "zod";
import { isValidDate, isValidMonth, isValidTimeZone } from "./dates";
import { parseWholeAmount } from "./money";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");

const wholeAmount = (opts: { min: number; emptyAsZero?: boolean }) =>
  z.union([z.string(), z.number()]).transform((raw, ctx) => {
    const input = opts.emptyAsZero && typeof raw === "string" && raw.trim() === "" ? 0 : raw;
    const value = parseWholeAmount(input);
    if (value === null || value < opts.min) {
      ctx.addIssue({ code: "custom", message: "Please enter a valid amount." });
      return z.NEVER;
    }
    return value;
  });

/** Expense amounts: whole number, at least 1. */
export const amountSchema = wholeAmount({ min: 1 });
/** Income/allocations: whole number, 0 allowed, blank means 0. */
export const budgetAmountSchema = wholeAmount({ min: 0, emptyAsZero: true });

export const monthSchema = z.string().refine(isValidMonth, "Please choose a valid month.");
export const dateSchema = z.string().refine(isValidDate, "Please choose a valid date.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .pipe(z.email("Please enter a valid email address."));

const nameSchema = z.string().trim().min(1, "Please enter your name.").max(60, "Name is too long.");

// bcrypt only uses the first 72 bytes of a password, so cap the length there.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password.").max(200),
});

export const profileSchema = z.object({ name: nameSchema });

export const householdNameSchema = z
  .string()
  .trim()
  .min(1, "Please enter a household name.")
  .max(60, "Household name is too long.");

export const createHouseholdSchema = z.object({
  name: householdNameSchema,
  useDefaultCategories: z.boolean(),
});

export const householdSettingsSchema = z.object({
  name: householdNameSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code, e.g. PKR."),
  timezone: z.string().refine(isValidTimeZone, "Please choose a valid timezone."),
});

export const CATEGORY_TYPES = ["EXPENSE", "SAVING"] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Please enter a category name.").max(40, "Category name is too long."),
  type: z.enum(CATEGORY_TYPES),
  icon: z.string().trim().max(8, "Icon is too long.").default(""),
});

export const budgetSchema = z.object({
  month: monthSchema,
  totalIncome: budgetAmountSchema,
  allocations: z
    .array(z.object({ categoryId: objectIdSchema, allocatedAmount: budgetAmountSchema }))
    .max(200),
});

export const transactionSchema = z.object({
  amount: amountSchema,
  categoryId: objectIdSchema.or(z.literal("")).refine((v) => v !== "", "Please choose a category."),
  description: z.string().trim().max(140, "Description is too long.").default(""),
  paidByUserId: objectIdSchema,
  transactionDate: dateSchema,
});

export const transactionFiltersSchema = z.object({
  month: monthSchema,
  categoryId: objectIdSchema.optional(),
  paidByUserId: objectIdSchema.optional(),
  date: dateSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

export const invitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{32,128}$/, "This invitation link is invalid.");

export type RegisterInput = z.infer<typeof registerSchema>;
export type TransactionInput = z.input<typeof transactionSchema>;
export type BudgetInput = z.input<typeof budgetSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type TransactionFilters = z.input<typeof transactionFiltersSchema>;

export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
