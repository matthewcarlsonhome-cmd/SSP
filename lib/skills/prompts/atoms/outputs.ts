/**
 * Output Atoms - Format and structure specifications
 *
 * These define HOW the AI should format its response.
 * Composable and can be combined (e.g., markdown + table + sections).
 */

import { OutputAtom, OutputSection } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create output atom
// ═══════════════════════════════════════════════════════════════════════════════

function createOutputAtom(config: Omit<OutputAtom, 'type' | 'render'>): OutputAtom {
  return {
    type: 'output',
    ...config,
    render: () => {
      const sectionList = config.sections
        .map((s) => {
          const required = s.required ? '(Required)' : '(Optional)';
          return `- **${s.header}** ${required}: ${s.description}`;
        })
        .join('\n');

      return `**OUTPUT FORMAT: ${config.format.toUpperCase()}**

Include the following sections:
${sectionList}`;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD OUTPUT FORMATS
// ═══════════════════════════════════════════════════════════════════════════════

export const OUTPUTS = {
  // Scoring Outputs
  scoreCard: createOutputAtom({
    id: 'score-card',
    format: 'markdown',
    sections: [
      { header: 'Overall Score', description: 'Prominent display of 0-100 score with classification', required: true },
      { header: 'Score Breakdown', description: 'Table showing each component score and weight', required: true },
      { header: 'Key Strengths', description: 'Top 3-5 strengths with specific evidence', required: true },
      { header: 'Critical Gaps', description: 'All identified gaps, prioritized by severity', required: true },
      { header: 'Action Plan', description: 'Numbered list of specific improvement actions', required: true },
      { header: 'Timeline Estimate', description: 'Suggested prioritization of improvements', required: false },
    ],
  }),

  gapReport: createOutputAtom({
    id: 'gap-report',
    format: 'structured',
    sections: [
      { header: 'Executive Summary', description: '2-3 sentence overview of findings', required: true },
      { header: 'Current State Analysis', description: 'Assessment of what exists today', required: true },
      { header: 'Target State Definition', description: 'What good looks like for this context', required: true },
      { header: 'Gap Inventory', description: 'Complete list of gaps with severity ratings', required: true },
      { header: 'Recommendations', description: 'Prioritized actions to close gaps', required: true },
    ],
  }),

  // Generation Outputs
  coverLetter: createOutputAtom({
    id: 'cover-letter',
    format: 'markdown',
    sections: [
      { header: 'Opening Hook', description: 'Compelling first paragraph that grabs attention', required: true },
      { header: 'Value Proposition', description: 'Clear statement of unique value for this role', required: true },
      { header: 'Evidence Section', description: '2-3 specific achievements relevant to role', required: true },
      { header: 'Company Alignment', description: 'Why this company specifically', required: true },
      { header: 'Strong Close', description: 'Clear call to action', required: true },
    ],
  }),

  networkingMessage: createOutputAtom({
    id: 'networking-message',
    format: 'markdown',
    sections: [
      { header: 'Subject Line', description: 'Compelling, personalized subject (if email)', required: false },
      { header: 'Opening', description: 'Personal connection point', required: true },
      { header: 'Context', description: 'Brief relevant background', required: true },
      { header: 'Ask', description: 'Clear, specific, low-friction request', required: true },
      { header: 'Close', description: 'Graceful exit with gratitude', required: true },
    ],
  }),

  // Research Outputs
  companyBrief: createOutputAtom({
    id: 'company-brief',
    format: 'structured',
    sections: [
      { header: 'Company Overview', description: 'Size, industry, stage, key facts', required: true },
      { header: 'Business Model', description: 'How they make money, key products', required: true },
      { header: 'Culture & Values', description: 'Working environment signals', required: true },
      { header: 'Recent News', description: 'Key developments, funding, leadership changes', required: true },
      { header: 'Interview Talking Points', description: 'Company-specific insights to mention', required: true },
      { header: 'Questions to Ask', description: 'Thoughtful questions demonstrating research', required: true },
    ],
  }),

  marketAnalysis: createOutputAtom({
    id: 'market-analysis',
    format: 'structured',
    sections: [
      { header: 'Market Overview', description: 'Size, growth, key trends', required: true },
      { header: 'Competitive Landscape', description: 'Key players and positioning', required: true },
      { header: 'SWOT Summary', description: 'Synthesized strengths/weaknesses/opportunities/threats', required: true },
      { header: 'Key Insights', description: 'Non-obvious findings from analysis', required: true },
      { header: 'Recommendations', description: 'Strategic implications and next steps', required: true },
    ],
  }),

  // Technical Outputs
  technicalSpec: createOutputAtom({
    id: 'technical-spec',
    format: 'structured',
    sections: [
      { header: 'Overview', description: 'High-level summary of the system/feature', required: true },
      { header: 'Requirements', description: 'Functional and non-functional requirements', required: true },
      { header: 'Architecture', description: 'System design with component interactions', required: true },
      { header: 'API Design', description: 'Interface definitions (if applicable)', required: false },
      { header: 'Data Model', description: 'Schema and data flow', required: false },
      { header: 'Security Considerations', description: 'Authentication, authorization, data protection', required: true },
      { header: 'Testing Strategy', description: 'How to verify the implementation', required: true },
    ],
  }),

  incidentReport: createOutputAtom({
    id: 'incident-report',
    format: 'structured',
    sections: [
      { header: 'Incident Summary', description: 'What happened, impact, duration', required: true },
      { header: 'Timeline', description: 'Chronological sequence of events', required: true },
      { header: 'Contributing Factors', description: 'What conditions allowed this to happen', required: true },
      { header: 'What Went Well', description: 'Positive aspects of response', required: true },
      { header: 'Action Items', description: 'Specific improvements with owners and dates', required: true },
      { header: 'Lessons Learned', description: 'Key takeaways for future prevention', required: true },
    ],
  }),

  // Coaching Outputs
  developmentPlan: createOutputAtom({
    id: 'development-plan',
    format: 'structured',
    sections: [
      { header: 'Current Assessment', description: 'Where you are now', required: true },
      { header: 'Goals', description: 'Clear, measurable objectives', required: true },
      { header: 'Skill Gaps', description: 'Areas requiring development', required: true },
      { header: 'Learning Path', description: 'Resources, courses, experiences', required: true },
      { header: 'Milestones', description: 'Checkpoints to measure progress', required: true },
      { header: 'Next Steps', description: 'Immediate actions to take', required: true },
    ],
  }),

  negotiationPlaybook: createOutputAtom({
    id: 'negotiation-playbook',
    format: 'structured',
    sections: [
      { header: 'Market Analysis', description: 'Compensation benchmarks and context', required: true },
      { header: 'Your Position', description: 'Strengths and leverage points', required: true },
      { header: 'Target & Floor', description: 'Ideal outcome and walk-away point', required: true },
      { header: 'Script & Phrases', description: 'Exact language to use', required: true },
      { header: 'Objection Handling', description: 'Responses to common pushback', required: true },
      { header: 'Alternative Levers', description: 'Non-salary negotiation points', required: true },
    ],
  }),

  // Generic Flexible Output
  structuredAnalysis: createOutputAtom({
    id: 'structured-analysis',
    format: 'markdown',
    sections: [
      { header: 'Summary', description: 'Key findings in 2-3 sentences', required: true },
      { header: 'Analysis', description: 'Detailed examination of the topic', required: true },
      { header: 'Findings', description: 'Key insights organized by theme', required: true },
      { header: 'Recommendations', description: 'Actionable next steps', required: true },
    ],
  }),
} as const;

// Type for output IDs
export type OutputId = keyof typeof OUTPUTS;

// Get output by ID
export function getOutput(id: OutputId): OutputAtom {
  return OUTPUTS[id];
}

// Combine output sections from multiple outputs
export function combineOutputSections(...ids: OutputId[]): OutputSection[] {
  const seen = new Set<string>();
  const combined: OutputSection[] = [];

  for (const id of ids) {
    for (const section of OUTPUTS[id].sections) {
      if (!seen.has(section.header)) {
        seen.add(section.header);
        combined.push(section);
      }
    }
  }

  return combined;
}
