"use client";

import { useState, useTransition } from "react";
import { removeMemberAction } from "@/actions/household";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/styles";
import type { Member } from "@/services/household.service";

export function MemberList({
  members,
  currentUserId,
  canRemove,
}: {
  members: Member[];
  currentUserId: string;
  canRemove: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(member: Member) {
    if (!window.confirm(`Remove ${member.name} from the household? Their past expenses stay in the history.`)) return;
    startTransition(async () => {
      const res = await removeMemberAction(member.id);
      setError(res.ok ? null : res.error);
    });
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {m.name}
                {m.id === currentUserId && <span className="text-muted"> (you)</span>}
              </span>
              <span className="block truncate text-sm text-muted">
                {m.email} · {m.role === "OWNER" ? "Owner" : "Member"}
              </span>
            </span>
            {canRemove && m.role !== "OWNER" && (
              <button type="button" disabled={pending} onClick={() => remove(m)} className={buttonClass("danger")}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
