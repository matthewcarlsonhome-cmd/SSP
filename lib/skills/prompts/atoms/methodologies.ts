/**
 * Methodology Atoms - Process and framework definitions
 *
 * Wittgensteinian Principle: Methodologies behave differently based on
 * the "language game" (context) in which they're used.
 *
 * The same scoring rubric renders differently for:
 * - 'analysis' game: Emphasizes evaluation criteria
 * - 'coaching' game: Emphasizes improvement paths
 * - 'generation' game: Emphasizes output requirements
 */

import { MethodologyAtom, LanguageGame } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create methodology atom with game-aware rendering
// ═══════════════════════════════════════════════════════════════════════════════

interface MethodologyConfig {
  id: string;
  framework: string;
  steps: readonly string[];
  applicableGames: readonly LanguageGame[];
  gameVariants: Partial<Record<LanguageGame, string>>;
  baseTemplate: string;
}

function createMethodologyAtom(config: MethodologyConfig): MethodologyAtom {
  return {
    type: 'methodology',
    id: config.id,
    framework: config.framework,
    steps: config.steps,
    applicableGames: config.applicableGames,
    render: (game: LanguageGame) => {
      const variant = config.gameVariants[game] || '';
      const stepsFormatted = config.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

      return `**${config.framework.toUpperCase()} METHODOLOGY:**

${config.baseTemplate}

${variant ? `\n**For ${game} context:**\n${variant}\n` : ''}
**Process Steps:**
${stepsFormatted}`;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING & ASSESSMENT METHODOLOGIES
// ═══════════════════════════════════════════════════════════════════════════════

export const METHODOLOGIES = {
  // Quantitative Assessment
  weightedScoring: createMethodologyAtom({
    id: 'weighted-scoring',
    framework: 'Weighted Multi-Factor Scoring',
    steps: [
      'Identify all factors to evaluate',
      'Assign weights based on relative importance (must sum to 100%)',
      'Score each factor on consistent scale (0-100)',
      'Calculate weighted score: Σ(weight × score)',
      'Provide interpretation based on score ranges',
      'Identify top contributors and detractors',
    ],
    applicableGames: ['analysis', 'coaching', 'optimization'],
    gameVariants: {
      analysis: 'Focus on precise scoring with evidence for each factor. Be rigorous and objective.',
      coaching: 'Explain scores in terms of improvement opportunity. Focus on actionable gaps.',
      optimization: 'Compare current vs. optimal scores. Quantify potential improvement.',
    },
    baseTemplate: `Use weighted scoring to provide objective, quantifiable assessments.
Each score must be backed by specific evidence from the input materials.`,
  }),

  rubricScoring: createMethodologyAtom({
    id: 'rubric-scoring',
    framework: 'Evidence-Based Rubric Scoring',
    steps: [
      'Define clear criteria for each score level',
      'Collect evidence from source materials',
      'Match evidence to rubric criteria',
      'Assign score based on best-matching level',
      'Document evidence supporting the score',
      'Identify specific gaps between current and next level',
    ],
    applicableGames: ['analysis', 'coaching'],
    gameVariants: {
      analysis: 'Apply rubric strictly. Score based on what IS present, not potential.',
      coaching: 'Show the path from current level to next level. Make gaps actionable.',
    },
    baseTemplate: `Use standardized rubrics to ensure consistent, fair evaluation.
Each score level has explicit criteria that must be met.`,
  }),

  // Analytical Frameworks
  gapAnalysis: createMethodologyAtom({
    id: 'gap-analysis',
    framework: 'Comprehensive Gap Analysis',
    steps: [
      'Define the "current state" from provided materials',
      'Define the "target state" from requirements/criteria',
      'Identify all gaps between current and target',
      'Categorize gaps by severity (critical, major, minor)',
      'Prioritize gaps by impact and effort to close',
      'Recommend specific actions to close each gap',
    ],
    applicableGames: ['analysis', 'optimization', 'coaching'],
    gameVariants: {
      analysis: 'Be thorough in gap identification. Don\'t minimize or overlook issues.',
      optimization: 'Focus on highest-impact gaps. Provide specific fixes.',
      coaching: 'Frame gaps as growth opportunities. Provide learning paths.',
    },
    baseTemplate: `Systematically identify what's missing between current state and ideal state.
Every gap must have a clear, actionable path to resolution.`,
  }),

  swotAnalysis: createMethodologyAtom({
    id: 'swot-analysis',
    framework: 'SWOT Analysis',
    steps: [
      'Identify Strengths (internal positives)',
      'Identify Weaknesses (internal negatives)',
      'Identify Opportunities (external positives)',
      'Identify Threats (external negatives)',
      'Develop strategies leveraging S+O',
      'Develop strategies mitigating W+T',
    ],
    applicableGames: ['analysis', 'research', 'coaching'],
    gameVariants: {
      analysis: 'Be balanced. Identify both positive and negative factors objectively.',
      research: 'Ground SWOT in market data and competitive intelligence.',
      coaching: 'Help user leverage strengths while addressing weaknesses.',
    },
    baseTemplate: `Provide balanced internal/external analysis for strategic decision-making.`,
  }),

  // Generation Frameworks
  starMethod: createMethodologyAtom({
    id: 'star-method',
    framework: 'STAR Method',
    steps: [
      'Situation: Set the context and background',
      'Task: Describe the specific challenge or responsibility',
      'Action: Detail the specific actions taken',
      'Result: Quantify the outcome and impact',
    ],
    applicableGames: ['generation', 'optimization', 'coaching'],
    gameVariants: {
      generation: 'Create compelling STAR stories with specific metrics and outcomes.',
      optimization: 'Strengthen existing stories by adding specificity and quantification.',
      coaching: 'Guide user to recall and structure their experiences in STAR format.',
    },
    baseTemplate: `Structure achievements and experiences using the proven STAR framework.
Every story should have quantifiable results where possible.`,
  }),

  carMethod: createMethodologyAtom({
    id: 'car-method',
    framework: 'CAR Method (Challenge-Action-Result)',
    steps: [
      'Challenge: Define the problem or obstacle faced',
      'Action: Describe the approach and specific steps taken',
      'Result: Quantify the outcome with metrics',
    ],
    applicableGames: ['generation', 'optimization'],
    gameVariants: {
      generation: 'Focus on impactful challenges with measurable results.',
      optimization: 'Ensure each component is specific and quantified.',
    },
    baseTemplate: `Concise achievement format emphasizing problem-solving and impact.`,
  }),

  // Coaching Frameworks
  growModel: createMethodologyAtom({
    id: 'grow-model',
    framework: 'GROW Coaching Model',
    steps: [
      'Goal: Clarify the desired outcome',
      'Reality: Assess current situation honestly',
      'Options: Generate multiple paths forward',
      'Will: Commit to specific actions',
    ],
    applicableGames: ['coaching'],
    gameVariants: {
      coaching: 'Guide through each stage with powerful questions. Ensure commitment at the end.',
    },
    baseTemplate: `Structure coaching conversations for clarity and action commitment.`,
  }),

  fiveWhys: createMethodologyAtom({
    id: 'five-whys',
    framework: 'Five Whys Root Cause Analysis',
    steps: [
      'State the problem clearly',
      'Ask "Why?" and document the answer',
      'For each answer, ask "Why?" again',
      'Repeat until root cause is identified (typically 5 iterations)',
      'Verify root cause addresses original problem',
      'Develop solution targeting root cause',
    ],
    applicableGames: ['analysis', 'coaching'],
    gameVariants: {
      analysis: 'Apply rigorously to find true root causes. Don\'t stop at surface issues.',
      coaching: 'Guide user through the questioning process to build their analytical skills.',
    },
    baseTemplate: `Dig beneath surface symptoms to identify true root causes.`,
  }),

  // Research Frameworks
  pestelAnalysis: createMethodologyAtom({
    id: 'pestel-analysis',
    framework: 'PESTEL Analysis',
    steps: [
      'Political: Government policies, regulations, stability',
      'Economic: Market conditions, growth, inflation',
      'Social: Demographics, culture, trends',
      'Technological: Innovation, automation, R&D',
      'Environmental: Sustainability, climate, resources',
      'Legal: Laws, compliance, litigation',
    ],
    applicableGames: ['research', 'analysis'],
    gameVariants: {
      research: 'Gather comprehensive data for each dimension.',
      analysis: 'Assess impact of each factor on the specific context.',
    },
    baseTemplate: `Comprehensive macro-environmental analysis for strategic planning.`,
  }),

  // Incident & Reliability
  blamelessPostmortem: createMethodologyAtom({
    id: 'blameless-postmortem',
    framework: 'Blameless Postmortem',
    steps: [
      'Establish timeline of events with evidence',
      'Identify contributing factors (not "root cause")',
      'Analyze system conditions that allowed incident',
      'Identify what went well (successes)',
      'Generate actionable improvements',
      'Assign owners and due dates to action items',
    ],
    applicableGames: ['analysis', 'coaching'],
    gameVariants: {
      analysis: 'Focus on systems and processes, not individuals. Be thorough and objective.',
      coaching: 'Help team learn without blame. Build psychological safety.',
    },
    baseTemplate: `Analyze incidents to improve systems without assigning blame to individuals.
Focus on "what" and "how", not "who".`,
  }),
} as const;

// Type for methodology IDs
export type MethodologyId = keyof typeof METHODOLOGIES;

// Get methodology by ID
export function getMethodology(id: MethodologyId): MethodologyAtom {
  return METHODOLOGIES[id];
}

// Render methodology for specific game
export function renderMethodology(id: MethodologyId, game: LanguageGame): string {
  return METHODOLOGIES[id].render(game);
}
