import { describe, expect, it } from "vitest";
import { AIR_BANDS, bandForScore } from "@/lib/air/config";
import { computeAirScore } from "@/lib/air/scoring/composite";
import { AIR_SCORING_FIXTURES } from "@/lib/air/scoring/fixtures";

describe("AIR scoring engine", () => {
  it("assigns threshold bands exactly", () => {
    expect(bandForScore(0)).toBe("pre_ai");
    expect(bandForScore(19)).toBe("pre_ai");
    expect(bandForScore(20)).toBe("stabilization_first");
    expect(bandForScore(40)).toBe("catch_up");
    expect(bandForScore(60)).toBe("foundation_strong");
    expect(bandForScore(80)).toBe("ai_native_ready");
    expect(AIR_BANDS.ai_native_ready.recommendedTier).toBe("air_transition_sprint");
  });

  for (const fixture of Object.values(AIR_SCORING_FIXTURES)) {
    it(`scores fixture: ${fixture.label}`, async () => {
      const result = await computeAirScore({ inputs: fixture.inputs, tier: "air_audit" });
      expect(result.composite).toBeGreaterThanOrEqual(Math.max(0, fixture.expected - fixture.tolerance));
      expect(result.composite).toBeLessThanOrEqual(Math.min(100, fixture.expected + fixture.tolerance));
      expect(result.domains).toHaveLength(5);
      for (const domain of result.domains) {
        expect(domain.subDimensions).toHaveLength(4);
        expect(domain.totalScore).toBeGreaterThanOrEqual(0);
        expect(domain.totalScore).toBeLessThanOrEqual(20);
      }
    });
  }
});
