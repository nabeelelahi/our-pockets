"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import {
  createCategory,
  deleteCategory,
  moveCategory,
  setCategoryArchived,
  updateCategory,
} from "@/services/category.service";

function categoryInput(formData: FormData) {
  return {
    name: formString(formData, "name"),
    icon: formString(formData, "icon"),
    type: (formString(formData, "type") || "EXPENSE") as "EXPENSE" | "SAVING",
  };
}

export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await createCategory(await requireUserId(), categoryInput(formData));
    revalidatePath("/", "layout");
  }, "Category added.");
}

export async function updateCategoryAction(categoryId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await updateCategory(await requireUserId(), categoryId, categoryInput(formData));
    revalidatePath("/", "layout");
  }, "Category saved.");
}

export async function moveCategoryAction(categoryId: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAction(async () => {
    await moveCategory(await requireUserId(), categoryId, direction === "up" ? "up" : "down");
    revalidatePath("/", "layout");
  });
}

export async function setCategoryArchivedAction(categoryId: string, archived: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await setCategoryArchived(await requireUserId(), categoryId, archived === true);
    revalidatePath("/", "layout");
  }, archived ? "Category archived." : "Category restored.");
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteCategory(await requireUserId(), categoryId);
    revalidatePath("/", "layout");
  }, "Category deleted.");
}
