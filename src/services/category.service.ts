import { Types } from "mongoose";
import { AppError, NotFoundError } from "@/lib/errors";
import { categorySchema, fieldErrorsOf, type CategoryInput } from "@/lib/validation";
import { BudgetAllocation } from "@/models/BudgetAllocation";
import { Category, type CategoryDoc } from "@/models/Category";
import { Transaction } from "@/models/Transaction";
import { requireMembership } from "./household.service";

export type CategoryInfo = {
  id: string;
  name: string;
  type: "EXPENSE" | "SAVING";
  icon: string;
  sortOrder: number;
  isArchived: boolean;
};

export function toCategoryInfo(c: CategoryDoc): CategoryInfo {
  return {
    id: c._id.toString(),
    name: c.name,
    type: c.type as CategoryInfo["type"],
    icon: c.icon ?? "",
    sortOrder: c.sortOrder,
    isArchived: c.isArchived,
  };
}

const CATEGORY_NOT_FOUND = "This category no longer exists.";

async function findOwnCategory(householdId: Types.ObjectId, categoryId: string) {
  if (!Types.ObjectId.isValid(categoryId)) throw new NotFoundError(CATEGORY_NOT_FOUND);
  const category = await Category.findOne({ _id: categoryId, householdId });
  if (!category) throw new NotFoundError(CATEGORY_NOT_FOUND);
  return category;
}

function parseCategory(input: CategoryInput) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  return parsed.data;
}

async function assertNameAvailable(householdId: Types.ObjectId, name: string, exceptId?: Types.ObjectId) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clash = await Category.exists({
    householdId,
    isArchived: false,
    name: { $regex: `^${escaped}$`, $options: "i" },
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
  if (clash) throw new AppError("A category with this name already exists.", { name: ["A category with this name already exists."] });
}

export async function listCategories(
  userId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<CategoryInfo[]> {
  const { householdId } = await requireMembership(userId);
  const categories = await Category.find({
    householdId,
    ...(opts.includeArchived ? {} : { isArchived: false }),
  })
    .sort({ isArchived: 1, sortOrder: 1, createdAt: 1 })
    .lean<CategoryDoc[]>();
  return categories.map(toCategoryInfo);
}

export async function createCategory(userId: string, input: CategoryInput): Promise<CategoryInfo> {
  const { householdId } = await requireMembership(userId);
  const data = parseCategory(input);
  await assertNameAvailable(householdId, data.name);
  const last = await Category.findOne({ householdId }).sort({ sortOrder: -1 }).lean();
  const category = await Category.create({ ...data, householdId, sortOrder: (last?.sortOrder ?? -1) + 1 });
  return toCategoryInfo(category.toObject());
}

export async function updateCategory(userId: string, categoryId: string, input: CategoryInput): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const category = await findOwnCategory(householdId, categoryId);
  const data = parseCategory(input);
  await assertNameAvailable(householdId, data.name, category._id);
  category.set(data);
  await category.save();
}

export async function setCategoryArchived(userId: string, categoryId: string, archived: boolean): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const category = await findOwnCategory(householdId, categoryId);
  if (!archived) await assertNameAvailable(householdId, category.name, category._id);
  category.isArchived = archived;
  await category.save();
}

/** Swaps a category with its neighbour among the active categories. */
export async function moveCategory(userId: string, categoryId: string, direction: "up" | "down"): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const active = await Category.find({ householdId, isArchived: false }).sort({ sortOrder: 1, createdAt: 1 });
  const index = active.findIndex((c) => c._id.toString() === categoryId);
  if (index === -1) throw new NotFoundError(CATEGORY_NOT_FOUND);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= active.length) return;

  [active[index], active[target]] = [active[target], active[index]];
  await Category.bulkWrite(
    active.map((c, i) => ({
      updateOne: { filter: { _id: c._id, householdId }, update: { $set: { sortOrder: i } } },
    })),
  );
}

/** Permanent delete is only allowed while a category has no expenses; otherwise archive it. */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const category = await findOwnCategory(householdId, categoryId);
  if (await Transaction.exists({ householdId, categoryId: category._id })) {
    throw new AppError("This category has expenses, so it can't be deleted. Archive it instead.");
  }
  await BudgetAllocation.deleteMany({ householdId, categoryId: category._id });
  await Category.deleteOne({ _id: category._id, householdId });
}
