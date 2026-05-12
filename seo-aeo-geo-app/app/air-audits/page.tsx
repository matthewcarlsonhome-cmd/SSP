"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AirAuditListItem = {
  id: string;
  tier_id: string;
  status: string;
  title: string | null;
  vertical: string | null;
  primary_website_url: string | null;
  created_at: string;
  clients?: { name?: string; website_url?: string } | null;
};

export default function AirAuditsPage() {
  const [audits, setAudits] = useState<AirAuditListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/air/audits");
      if (response.ok) setAudits(await response.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Bridge AIR</p>
          <h1 className="text-3xl font-bold text-foreground">AI Readiness Audits</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Run AIR Snapshots, full operational AI readiness audits, and sprint re-scores alongside SEO/AEO/GEO and LLM visibility work.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAudits}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/air-audits/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New AIR Audit
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading AIR audits...</div>
      ) : audits.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Vertical</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{audit.clients?.name || audit.title || "AIR Audit"}</p>
                    <p className="text-xs text-muted-foreground">{audit.primary_website_url || audit.clients?.website_url}</p>
                  </td>
                  <td className="px-4 py-3">{audit.tier_id.replace("air_", "").replaceAll("_", " ")}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{audit.status.replaceAll("_", " ")}</Badge></td>
                  <td className="px-4 py-3">{audit.vertical || "home improvement"}</td>
                  <td className="px-4 py-3">{new Date(audit.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/air-audits/${audit.id}`} className="text-primary hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-xl font-semibold">Run your first AIR Audit</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Start with a free Snapshot to turn public business signals into an AI readiness score and three quick wins.
          </p>
          <Link href="/air-audits/new" className="mt-6 inline-block">
            <Button>New AIR Audit</Button>
          </Link>
        </div>
      )}
    </main>
  );
}
