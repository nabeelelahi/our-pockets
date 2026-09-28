"use client";

import { useTransition } from "react";
import { logoutAction } from "@/actions/auth";
import { buttonClass } from "@/components/ui/styles";

export function LogoutButton({ variant = "secondary" }: { variant?: "secondary" | "ghost" | "danger" }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass(variant)}
      onClick={() =>
        startTransition(async () => {
          const res = await logoutAction();
          window.location.assign(res.ok ? res.data.redirectTo : "/login");
        })
      }
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
