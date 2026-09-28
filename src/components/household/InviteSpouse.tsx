"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { createInvitationAction, revokeInvitationsAction } from "@/actions/household";
import { Alert } from "@/components/ui/Alert";
import { buttonClass, inputClass } from "@/components/ui/styles";

/**
 * Creates a one-time invitation link to share over WhatsApp/SMS.
 * The server stores only a hash, so the link is shown once; creating a new
 * link disables older ones.
 */
export function InviteSpouse() {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function create() {
    startTransition(async () => {
      const res = await createInvitationAction();
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      // Prefer the configured public URL; fall back to wherever the app is running.
      const base = process.env.NEXT_APP_URL || window.location.origin;
      setLink({ url: `${base.replace(/\/$/, "")}/invite/${res.data.token}`, expiresAt: res.data.expiresAt });
      setMessage(null);
    });
  }

  function revoke() {
    startTransition(async () => {
      const res = await revokeInvitationsAction();
      setLink(null);
      setMessage(res.ok ? { ok: true, text: res.message ?? "Disabled." } : { ok: false, text: res.error });
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setMessage({ ok: true, text: "Link copied." });
    } catch {
      setMessage({ ok: false, text: "Couldn't copy automatically. Select the link and copy it." });
    }
  }

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ title: "Join our household budget", url: link.url });
    } catch {
      // Share sheet dismissed.
    }
  }

  // Server snapshot is false so the markup matches before hydration.
  const canShare = useSyncExternalStore(noopSubscribe, () => "share" in navigator, () => false);

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">Invite your spouse</p>
        <p className="text-sm text-muted">
          Create a link and send it over WhatsApp or SMS. It works once and expires in 7 days.
        </p>
      </div>
      {message && <Alert tone={message.ok ? "success" : "error"}>{message.text}</Alert>}
      {link ? (
        <div className="space-y-2">
          <label htmlFor="invite-link" className="sr-only">Invitation link</label>
          <input id="invite-link" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={`${inputClass} text-sm`} />
          <p className="text-xs text-muted">
            Expires {new Date(link.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
            Anyone with this link can join, so share it only with your spouse.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={buttonClass("primary")}>Copy link</button>
            {canShare && (
              <button type="button" onClick={share} className={buttonClass("secondary")}>Share…</button>
            )}
            <button type="button" onClick={revoke} disabled={pending} className={buttonClass("ghost")}>Disable link</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={create} disabled={pending} className={buttonClass("primary")}>
          {pending ? "Creating link…" : "Create invitation link"}
        </button>
      )}
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}
