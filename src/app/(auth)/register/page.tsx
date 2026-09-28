import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const { next } = await props.searchParams;
  return <RegisterForm next={safeNextPath(next) ?? ""} />;
}
