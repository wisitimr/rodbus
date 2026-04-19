"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createGroup } from "@/lib/group-actions";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-context";

export default function JoinContent() {
  const { t } = useT();
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!groupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createGroup(groupName);
      // Keep the loading state on through the transition so the button
      // doesn't flicker back to "Create Party" before the dashboard loads.
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedToCreateParty);
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t.groupName}
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t.partyNamePlaceholder}
          disabled={loading}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-debt">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading || !groupName.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.creatingParty}
          </>
        ) : (
          t.createGroup
        )}
      </button>

      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">{t.creatingParty}</p>
        </div>
      )}
    </div>
  );
}
