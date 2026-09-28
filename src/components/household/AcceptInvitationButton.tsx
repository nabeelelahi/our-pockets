"use client";

import { useState, useTransition } from "react";
import { acceptInvitationAction } from "@/actions/household";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/styles";

export function AcceptInvitationButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <button
        type="button"
        disabled={pending}
        className={buttonClass("primary", "w-full")}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptInvitationAction(token);
            if (res.ok) window.location.assign(res.data.redirectTo);
            else setError(res.error);
          })
        }
      >
        {pending ? "Joining…" : "Accept invitation"}
      </button>
    </div>
  );
}
