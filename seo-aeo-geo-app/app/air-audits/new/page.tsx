"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AIR_TIER_CONFIGS } from "@/lib/air/config";
import type { AirTierId } from "@/lib/air/types";

const verticals = ["pool_spa", "roofing", "hvac", "landscaping", "home_remodeling", "plumbing", "electrical", "flooring", "windows_doors"];

export default function NewAirAuditPage() {
  const router = useRouter();
  const [tierId, setTierId] = useState<AirTierId>("air_snapshot");
  const [clientName, setClientName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [vertical, setVertical] = useState("pool_spa");
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/air/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          clientName,
          primaryWebsiteUrl: websiteUrl,
          vertical,
          competitorUrls: competitorUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create AIR audit");
      router.push(`/air-audits/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Bridge AIR
        </p>
        <h1 className="mt-2 text-3xl font-bold">Create AIR Audit</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Start with a Snapshot or set up a full Audit tier. Snapshot runs public-data scoring immediately.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Audit tier</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {AIR_TIER_CONFIGS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setTierId(tier.id)}
                className={`rounded-lg border p-4 text-left transition ${tierId === tier.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{tier.displayName}</p>
                    <p className="text-xs text-muted-foreground">{tier.durationLabel}</p>
                  </div>
                  <span className="text-sm font-semibold">{tier.priceDisplay}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Client setup</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <Label>Business Name</Label>
              <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Madison Pool & Spa" />
            </label>
            <label className="block">
              <Label>Website</Label>
              <Input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" />
            </label>
            <label className="block">
              <Label>Business category</Label>
              <select value={vertical} onChange={(event) => setVertical(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {verticals.map((item) => (
                  <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <Label>Competitor URLs</Label>
              <textarea
                value={competitorUrls}
                onChange={(event) => setCompetitorUrls(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="One URL per line"
              />
            </label>
            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <Button onClick={submit} disabled={submitting || (!clientName && !websiteUrl)} className="w-full">
              {submitting ? "Creating..." : "Start AIR Audit"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
