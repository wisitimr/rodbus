"use client";

import { useState } from "react";
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
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedToCreateParty);
    } finally {
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
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-debt">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading || !groupName.trim()}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? t.creating : t.createGroup}
      </button>
    </div>
  );
}
