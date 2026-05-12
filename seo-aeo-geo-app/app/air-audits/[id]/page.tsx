"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AirDeliverableSnapshot } from "@/components/air/AirDeliverableSnapshot";
import type { AirSnapshotDeliverable } from "@/lib/air/types";

type AirDetail = {
  audit: {
    id: string;
    tier_id: string;
    status: string;
    public_slug: string | null;
    primary_website_url: string | null;
    vertical: string | null;
    clients?: { name?: string; website_url?: string } | null;
  };
  events: Array<{ id: string; event_type: string; created_at: string; payload: Record<string, unknown> }>;
  deliverables: Array<{ id: string; kind: string; content: AirSnapshotDeliverable }>;
};

export default function AirAuditDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AirDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/air/audits/${params.id}`);
      if (response.ok) setDetail(await response.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const snapshot = useMemo(() => detail?.deliverables.find((item) => item.kind === "snapshot")?.content, [detail]);

  const runAction = async (path: string, label: string) => {
    setBusy(label);
    try {
      await fetch(`/api/air/audits/${params.id}/${path}`, { method: "POST" });
      await load();
    } finally {
      setBusy("");
    }
  };

  const publish = async () => {
    setBusy("publish");
    try {
      const response = await fetch(`/api/air/audits/${params.id}/publish`, { method: "POST" });
      const data = await response.json();
      if (data.publicUrl) await navigator.clipboard.writeText(data.publicUrl);
      await load();
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-7xl px-4 py-8 text-muted-foreground">Loading AIR audit...</main>;
  }

  if (!detail) {
    return <main className="mx-auto max-w-7xl px-4 py-8">AIR audit not found.</main>;
  }

  const publicUrl = detail.audit.public_slug ? `/public-air/${detail.audit.public_slug}` : "";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Bridge AIR / {detail.audit.tier_id.replace("air_", "").replaceAll("_", " ")}</p>
          <h1 className="mt-1 text-3xl font-bold">{detail.audit.clients?.name || "AIR Audit"}</h1>
          <p className="mt-2 text-muted-foreground">{detail.audit.primary_website_url || detail.audit.clients?.website_url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/air-audits/${params.id}/intake`}>
            <Button variant="outline">Intake</Button>
          </Link>
          <Link href={`/air-audits/${params.id}/scoring`}>
            <Button variant="outline">Scoring</Button>
          </Link>
          <Link href={`/air-audits/${params.id}/deliverable`}>
            <Button variant="outline">Deliverable</Button>
          </Link>
          <Button variant="outline" onClick={() => runAction("score", "score")} disabled={Boolean(busy)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-run scoring
          </Button>
          <Button variant="outline" onClick={() => runAction("generate-deliverable", "deliverable")} disabled={Boolean(busy)}>
            <FileText className="mr-2 h-4 w-4" />
            Generate deliverable
          </Button>
          <Button onClick={publish} disabled={Boolean(busy)}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize">{detail.audit.status.replaceAll("_", " ")}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Vertical</p>
          <p className="mt-1 text-lg font-semibold capitalize">{detail.audit.vertical?.replaceAll("_", " ") || "Home improvement"}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Public report</p>
          {publicUrl ? (
            <Link href={publicUrl} className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
              Open public report <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="mt-1 text-muted-foreground">Not published</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>{snapshot ? <AirDeliverableSnapshot deliverable={snapshot} /> : <div className="rounded-xl border bg-card p-8">No deliverable generated yet.</div>}</section>
        <aside className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Activity</h2>
          <div className="mt-4 space-y-3">
            {detail.events.map((event) => (
              <div key={event.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="font-medium">{event.event_type.replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
