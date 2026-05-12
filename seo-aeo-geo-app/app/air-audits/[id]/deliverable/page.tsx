"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AirDeliverableSnapshot } from "@/components/air/AirDeliverableSnapshot";
import type { AirSnapshotDeliverable } from "@/lib/air/types";

export default function AirDeliverablePage() {
  const params = useParams<{ id: string }>();
  const [deliverable, setDeliverable] = useState<AirSnapshotDeliverable | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch(`/api/air/audits/${params.id}`);
    if (response.ok) {
      const data = await response.json();
      setDeliverable(data.deliverables?.find((item: { kind: string }) => item.kind === "snapshot")?.content || null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const generate = async () => {
    setBusy(true);
    await fetch(`/api/air/audits/${params.id}/generate-deliverable`, { method: "POST" });
    await load();
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AIR Deliverable</h1>
          <p className="mt-2 text-muted-foreground">Preview the current client-facing Snapshot deliverable.</p>
        </div>
        <Button onClick={generate} disabled={busy}>{busy ? "Generating..." : "Regenerate"}</Button>
      </div>
      {deliverable ? <AirDeliverableSnapshot deliverable={deliverable} /> : <div className="rounded-xl border bg-card p-8">No deliverable generated yet.</div>}
    </main>
  );
}
