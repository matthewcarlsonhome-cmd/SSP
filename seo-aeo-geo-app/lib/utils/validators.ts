import { z } from "zod";

export const ClientBriefSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  website_url: z.string().url("Must be a valid URL"),
  business_type: z.string().optional(),
  industry: z.string().optional(),
  target_geography: z.string().optional(),
  primary_goal: z.string().optional(),
  competitors: z
    .array(
      z.object({
        url: z.string(),
        name: z.string().optional(),
      })
    )
    .optional(),
  keywords: z
    .array(
      z.object({
        keyword: z.string(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        currentRanking: z.string().optional(),
      })
    )
    .optional(),
  gbp: z
    .object({
      claimed: z.string().optional(),
      url: z.string().optional(),
      reviewCount: z.string().optional(),
      avgRating: z.string().optional(),
    })
    .optional(),
  analytics: z
    .object({
      monthlyTraffic: z.string().optional(),
      conversionRate: z.string().optional(),
      topLandingPages: z.string().optional(),
    })
    .optional(),
  cms_platform: z.string().optional(),
  pain_points: z.string().optional(),
  previous_seo: z.string().optional(),
  budget: z.string().optional(),
});

export type ClientBrief = z.infer<typeof ClientBriefSchema>;

export function validateBrief(data: unknown): { valid: boolean; errors: string[] } {
  const result = ClientBriefSchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map((e) => `${String(e.path.join("."))}: ${e.message}`),
  };
}
