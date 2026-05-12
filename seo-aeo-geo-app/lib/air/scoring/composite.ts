import { AIR_BANDS, AIR_DOMAINS, bandForScore } from "../config";
import type { AirCompositeScore, AirDomain, AirSubDimensionScore } from "../types";
import { AIR_SUB_DIMENSIONS } from "./domains";
import { getAllRules, type ScoringContext, type ScoringResult } from "./rules";

export async function computeAirScore(ctx: ScoringContext): Promise<AirCompositeScore> {
  const rules = getAllRules();
  const domainScores: AirCompositeScore["domains"] = [];
  let composite = 0;

  for (const domain of Object.keys(AIR_DOMAINS) as AirDomain[]) {
    const subDims = AIR_SUB_DIMENSIONS[domain];
    const subScores: AirSubDimensionScore[] = [];
    let domainTotal = 0;

    for (const sd of subDims) {
      const rule = rules[domain][sd.key];
      const result: ScoringResult = rule
        ? rule(ctx)
        : {
            score: sd.defaultSnapshotScore,
            confidence: "low",
            evidenceRefs: [],
            reasoning: "No rule defined.",
          };
      const finalScore = clamp(result.score);
      subScores.push({
        domain,
        subDimension: sd.key,
        finalScore,
        autoScore: finalScore,
        confidence: result.confidence,
        evidenceRefs: result.evidenceRefs,
        reasoning: result.reasoning,
      });
      domainTotal += finalScore;
    }

    const roundedDomain = Math.round(domainTotal * 10) / 10;
    domainScores.push({
      domain,
      totalScore: roundedDomain,
      subDimensions: subScores,
      confidence: aggregateConfidence(subScores.map((s) => s.confidence)),
    });
    composite += roundedDomain;
  }

  const roundedComposite = Math.round(composite * 10) / 10;
  const band = bandForScore(roundedComposite);
  const bandInfo = AIR_BANDS[band];

  return {
    composite: roundedComposite,
    band,
    bandLabel: bandInfo.label,
    recommendedTier: bandInfo.recommendedTier,
    domains: domainScores,
    confidence: aggregateConfidence(domainScores.map((d) => d.confidence)),
    scoredAt: new Date().toISOString(),
  };
}

export function aggregateConfidence(items: Array<"high" | "medium" | "low">): "high" | "medium" | "low" {
  if (!items.length) return "low";
  const weights = items.map((c) => (c === "high" ? 3 : c === "medium" ? 2 : 1));
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  if (avg >= 2.5) return "high";
  if (avg >= 1.5) return "medium";
  return "low";
}

function clamp(value: number) {
  return Math.max(0, Math.min(5, Math.round(value * 10) / 10));
}
