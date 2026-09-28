import type { ReactNode } from "react";
import { cn } from "./styles";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "warn";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    error: "bg-danger-soft text-danger",
    success: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl px-3 py-2.5 text-sm font-medium", styles, className)}
    >
      {children}
    </div>
  );
}
