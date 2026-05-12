import type { AirBand } from "../types";

export const BAND_DESCRIPTIONS: Record<
  AirBand,
  { label: string; shortMeaning: string; longInterpretation: string; whatToTell: string }
> = {
  ai_native_ready: {
    label: "AI-Native Ready",
    shortMeaning: "Strong foundations, motivated team, real opportunity surface.",
    longInterpretation: "The business can absorb significant AI investment and compound ROI quickly.",
    whatToTell: "Aggressive automation roadmap, Transition Sprint, and AI Operations from day 1.",
  },
  foundation_strong: {
    label: "Foundation Strong",
    shortMeaning: "Sound basics with fixable gaps.",
    longInterpretation: "The business has cleaner data and workflows than most peers, with gaps that fit a 90-day sprint.",
    whatToTell: "Standard Transition Sprint scoped to the top five opportunities.",
  },
  catch_up: {
    label: "Catch-Up Phase",
    shortMeaning: "Real readiness gaps that will throttle AI value.",
    longInterpretation: "Data and workflow gaps must be sequenced before heavier AI investment pays back.",
    whatToTell: "Scoped Sprint that fixes foundations first, then layers AI on top.",
  },
  stabilization_first: {
    label: "Stabilization First",
    shortMeaning: "Data and process foundations need work first.",
    longInterpretation: "AI on this foundation will create frustration. The readiness work also fixes existing operational pain.",
    whatToTell: "Foundation Sprint focused on Data Foundation and Workflow Maturity.",
  },
  pre_ai: {
    label: "Pre-AI",
    shortMeaning: "Basic operational issues no AI tool will solve.",
    longInterpretation: "Selling AI here would waste money. The right move is stabilization or referral.",
    whatToTell: "Decline the Sprint. Offer Foundation consulting or refer out.",
  },
};
