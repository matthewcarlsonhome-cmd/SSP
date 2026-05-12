"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AirDomainGrid } from "@/components/air/AirDomainGrid";
import { AirScoreDial } from "@/components/air/AirScoreDial";
import { AIR_DOMAINS, AIR_BANDS, bandForScore } from "@/lib/air/config";
import type { AirCompositeScore, AirDomain, AirDomainScore } from "@/lib/air/types";

type ScoreRow = { domain: AirDomain; sub_dimension: string; final_score: number; confidence: "high" | "medium" | "low"; reasoning: string | null };

export default function AirScoringPage() {
  const params = useParams<{ id: string }>();
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch(`/api/air/audits/${params.id}`);
    if (response.ok) {
      const data = await response.json();
      setScores(data.scores || []);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const composite = useMemo<AirCompositeScore | null>(() => {
    if (!scores.length) return null;
    const domains = (Object.keys(AIR_DOMAINS) as AirDomain[]).map((domain): AirDomainScore => {
      const rows = scores.filter((row) => row.domain === domain);
      return {
        domain,
        totalScore: rows.reduce((sum, row) => sum + Number(row.final_score || 0), 0),
        confidence: rows.some((row) => row.confidence === "low") ? "low" : rows.some((row) => row.confidence === "medium") ? "medium" : "high",
        subDimensions: rows.map((row) => ({
          domain,
          subDimension: row.sub_dimension,
          finalScore: Number(row.final_score || 0),
          confidence: row.confidence,
          evidenceRefs: [],
          reasoning: row.reasoning || undefined,
        })),
      };
    });
    const total = domains.reduce((sum, domain) => sum + domain.totalScore, 0);
    const band = bandForScore(total);
    return {
      composite: total,
      band,
      bandLabel: AIR_BANDS[band].label,
      recommendedTier: AIR_BANDS[band].recommendedTier,
      domains,
      confidence: "medium",
      scoredAt: new Date().toISOString(),
    };
  }, [scores]);

  const rerun = async () => {
    setBusy(true);
    await fetch(`/api/air/audits/${params.id}/score`, { method: "POST" });
    await load();
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AIR Scoring</h1>
          <p className="mt-2 text-muted-foreground">Review the 20 sub-dimension scores and evidence confidence.</p>
        </div>
        <Button onClick={rerun} disabled={busy}>{busy ? "Scoring..." : "Re-run auto scoring"}</Button>
      </div>
      {composite ? (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border bg-card p-6 text-center">
            <AirScoreDial score={composite.composite} band={composite.band} />
          </div>
          <AirDomainGrid domains={composite.domains} showSubDimensions />
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-muted-foreground">No scores yet. Run auto scoring to generate the first AIR Score.</div>
      )}
    </main>
  );
}
