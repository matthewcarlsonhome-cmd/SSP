/**
 * persuasiveMessaging.ts - Science-Backed Persuasive Marketing Messages
 *
 * Based on 7 persuasion principles from behavioral science research:
 * 1. Ambivert approach - Know when to assert, when to listen
 * 2. Explain WHY - Use "because" (our brains are wired for reasons)
 * 3. Social proof - Show what others like them are doing
 * 4. Bad news first - Lead with pain, pivot to good, then action
 * 5. Rhyme/alliteration - Processing fluency makes messages stick
 * 6. Strategic questions - Questions outperform declarations
 * 7. Make it easy - Pave the road, don't just persuade
 */

import type { ClientIndustry } from './storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ClientContext {
  companyName: string;
  industry: ClientIndustry;
  companyType?: string;
  services?: string;
  description?: string;
  painPoints?: string;
  revenue?: string;
  employeeCount?: string;
  estimatedTimeSavings?: string;
  estimatedCostSavings?: string;
}

interface PersuasiveMessage {
  headline: string;
  message: string;
  callToAction: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// INDUSTRY-SPECIFIC PAIN POINT OPENERS
// "Bad news first" - acknowledge the challenge
// ═══════════════════════════════════════════════════════════════════════════

const INDUSTRY_PAIN_OPENERS: Record<ClientIndustry, string[]> = {
  marketing_advertising: [
    "Campaign deadlines wait for no one—but your team is drowning in repetitive tasks.",
    "Your clients expect more, faster, better. Sound familiar?",
    "Reporting shouldn't take longer than the campaign itself.",
    "Multi-channel management is consuming hours that should go to strategy.",
  ],
  insurance: [
    "Compliance requirements keep growing, but your team size doesn't.",
    "Claims processing bottlenecks are costing you client trust.",
    "Manual policy reviews are a time sink your competitors have automated.",
  ],
  financial_services: [
    "Regulatory changes come faster than your team can document.",
    "Client reporting still takes days when it should take minutes.",
    "Your analysts spend more time formatting than analyzing.",
  ],
  healthcare: [
    "HIPAA compliance documentation is consuming clinical hours.",
    "Patient communication workflows are stuck in 2010.",
    "Your staff spends more time on paperwork than patient care.",
  ],
  technology: [
    "Technical debt is growing faster than your product.",
    "Documentation always lags behind development.",
    "Sprint velocity suffers from context-switching overhead.",
  ],
  professional_services: [
    "Proposal deadlines pile up while your best people are in meetings.",
    "Every engagement feels like reinventing the wheel.",
    "Client deliverables compete with business development for your time.",
  ],
  retail: [
    "Inventory headaches intensify every season.",
    "Customer expectations outpace your operational capacity.",
    "Seasonal scaling challenges never get easier.",
  ],
  manufacturing: [
    "Supply chain visibility is a daily guessing game.",
    "Quality documentation requirements keep expanding.",
    "Coordination across facilities burns management hours.",
  ],
  real_estate: [
    "Market moves faster than your listing updates.",
    "Transaction coordination consumes your relationship-building time.",
    "CRM maintenance steals hours from client meetings.",
  ],
  hospitality: [
    "Guest expectations rise while staffing challenges persist.",
    "Seasonal demand planning remains more art than science.",
    "Review management feels like a full-time job.",
  ],
  education: [
    "Administrative burden grows while teaching time shrinks.",
    "Compliance documentation demands more every year.",
    "Communication with stakeholders multiplies exponentially.",
  ],
  nonprofit: [
    "Grant reporting takes time away from your mission.",
    "Donor communication competes with program delivery.",
    "Every dollar spent on admin is a dollar not serving your cause.",
  ],
  construction: [
    "Project coordination complexity grows with every job.",
    "Safety documentation requirements never stop expanding.",
    "Bid preparation consumes your best estimators.",
  ],
  automotive: [
    "Service scheduling efficiency directly impacts revenue.",
    "Customer follow-up falls through the cracks.",
    "Inventory management complexity grows with your lot.",
  ],
  food_beverage: [
    "Compliance documentation for food safety never ends.",
    "Staff scheduling remains a weekly puzzle.",
    "Recipe consistency across locations is a constant challenge.",
  ],
  biotechnology: [
    "R&D documentation requirements slow innovation.",
    "Regulatory compliance consumes scientist hours.",
    "Technical literature management is a full-time job.",
  ],
  legal: [
    "Document review timelines squeeze matter profitability.",
    "Client communication tracking is fragmented.",
    "Billing documentation takes time from billable work.",
  ],
  staffing: [
    "Candidate communication at scale feels impossible.",
    "Client coordination consumes recruiter bandwidth.",
    "Placement tracking across accounts is overwhelming.",
  ],
  engineering: [
    "Technical documentation lags behind project delivery.",
    "Bid preparation quality suffers from time pressure.",
    "Project status reporting is a manual marathon.",
  ],
  utilities: [
    "Regulatory compliance documentation never stops growing.",
    "Customer communication across service areas is fragmented.",
    "Outage response coordination could be faster.",
  ],
  other: [
    "Operational tasks consume time meant for growth.",
    "Documentation requirements keep expanding.",
    "Team bandwidth is stretched thinner every quarter.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGIC QUESTIONS BY INDUSTRY
// "Questions outperform declarations when facts are on your side"
// ═══════════════════════════════════════════════════════════════════════════

const STRATEGIC_QUESTIONS: Record<ClientIndustry, string[]> = {
  marketing_advertising: [
    "What if your team could reclaim 20 hours every week?",
    "How much faster could you deliver if reports wrote themselves?",
    "What would you do with 15 extra hours per campaign?",
  ],
  insurance: [
    "What if compliance documentation took minutes, not hours?",
    "How many more policies could you process with AI assistance?",
    "What would faster claims processing mean for client retention?",
  ],
  financial_services: [
    "What if regulatory updates were automatically tracked and documented?",
    "How would instant client reporting change your relationships?",
    "What could your analysts accomplish if freed from formatting?",
  ],
  healthcare: [
    "What if documentation didn't compete with patient care?",
    "How would automated compliance affect your staff morale?",
    "What could your team accomplish with streamlined workflows?",
  ],
  technology: [
    "What if documentation kept pace with development?",
    "How would automated technical specs affect sprint velocity?",
    "What could your engineers build if freed from repetitive tasks?",
  ],
  professional_services: [
    "What if proposals practically wrote themselves?",
    "How many more clients could you serve with streamlined delivery?",
    "What would faster turnaround mean for your win rate?",
  ],
  retail: [
    "What if seasonal scaling was finally predictable?",
    "How would real-time inventory visibility change your operations?",
    "What could your team focus on if reporting was automated?",
  ],
  manufacturing: [
    "What if supply chain visibility was instant?",
    "How would automated quality documentation affect compliance?",
    "What could your managers accomplish with streamlined coordination?",
  ],
  real_estate: [
    "What if market updates were automatic?",
    "How many more deals could you close with streamlined transactions?",
    "What would instant CRM updates mean for your follow-up?",
  ],
  hospitality: [
    "What if guest communication was effortlessly personalized?",
    "How would automated scheduling affect staff satisfaction?",
    "What could you accomplish with streamlined review management?",
  ],
  education: [
    "What if administrative tasks didn't cut into teaching time?",
    "How would automated compliance affect your accreditation?",
    "What could your educators accomplish with streamlined communication?",
  ],
  nonprofit: [
    "What if grant reporting took hours instead of days?",
    "How many more donors could you engage with automation?",
    "What impact could you make with streamlined operations?",
  ],
  construction: [
    "What if project coordination was seamlessly automated?",
    "How would instant safety documentation affect compliance?",
    "What could your estimators accomplish with AI-assisted bids?",
  ],
  automotive: [
    "What if service scheduling optimized itself?",
    "How would automated follow-up affect customer retention?",
    "What could your team accomplish with streamlined inventory?",
  ],
  food_beverage: [
    "What if food safety documentation was effortlessly maintained?",
    "How would automated scheduling affect your labor costs?",
    "What could you accomplish with consistent recipes across locations?",
  ],
  biotechnology: [
    "What if R&D documentation kept pace with discovery?",
    "How would automated compliance affect time-to-market?",
    "What could your scientists accomplish with streamlined admin?",
  ],
  legal: [
    "What if document review was 3x faster?",
    "How would automated tracking affect matter profitability?",
    "What could your attorneys accomplish with streamlined billing?",
  ],
  staffing: [
    "What if candidate communication scaled effortlessly?",
    "How many more placements could you make with automation?",
    "What could your recruiters accomplish with streamlined tracking?",
  ],
  engineering: [
    "What if technical documentation was always current?",
    "How would AI-assisted bids affect your win rate?",
    "What could your team accomplish with automated status reporting?",
  ],
  utilities: [
    "What if regulatory compliance was automatically tracked?",
    "How would streamlined communication affect customer satisfaction?",
    "What could faster outage response mean for your service reputation?",
  ],
  other: [
    "What if operational tasks took half the time?",
    "How would automated documentation affect your team's focus?",
    "What could you accomplish with an extra 15 hours per week?",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ALLITERATIVE AND MEMORABLE PHRASES
// Processing fluency makes messages stick
// ═══════════════════════════════════════════════════════════════════════════

const MEMORABLE_PHRASES = [
  'Save time. Scale smart. Succeed faster.',
  'Less busywork. More breakthrough.',
  'Automate the mundane. Amplify the meaningful.',
  'From chaos to clarity—automatically.',
  'Work smarter, not harder—that\'s not a cliche, it\'s AI.',
  'Precision meets productivity.',
  'Streamline. Simplify. Succeed.',
  'Transform tedious to tremendous.',
  'Efficiency elevated. Excellence enabled.',
  'Accelerate accuracy. Amplify achievement.',
];

// ═══════════════════════════════════════════════════════════════════════════
// HASH FUNCTION FOR DETERMINISTIC UNIQUENESS
// ═══════════════════════════════════════════════════════════════════════════

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function selectFromArray<T>(arr: T[], hash: number, index: number = 0): T {
  return arr[(hash + index) % arr.length];
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT KEY PHRASES FROM CLIENT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

function extractKeyAchievements(description?: string): string[] {
  if (!description) return [];
  const achievements: string[] = [];

  // Look for years in business
  const yearsMatch = description.match(/(\d+)\+?\s*years?/i);
  if (yearsMatch) achievements.push(`${yearsMatch[1]}+ years`);

  // Look for founded year
  const foundedMatch = description.match(/[Ff]ounded\s*(\d{4})/);
  if (foundedMatch) {
    const yearsAgo = new Date().getFullYear() - parseInt(foundedMatch[1]);
    achievements.push(`${yearsAgo}+ years`);
  }

  // Look for revenue
  const revenueMatch = description.match(/\$[\d.]+[MBK]?\+?\s*(?:revenue|rev)/i);
  if (revenueMatch) achievements.push(revenueMatch[0]);

  // Look for awards
  if (/award|winner|best|top|inc\.?\s*5000/i.test(description)) {
    achievements.push('award-winning');
  }

  // Look for notable clients
  const clientMatch = description.match(/[Cc]lients?:?\s*([^.]+)/);
  if (clientMatch) achievements.push(`serving clients like ${clientMatch[1].split(',')[0].trim()}`);

  return achievements;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE PERSUASIVE HEADLINE
// Combines: Strategic question OR achievement + value proposition
// ═══════════════════════════════════════════════════════════════════════════

export function generatePersuasiveHeadline(client: ClientContext): string {
  const hash = hashString(client.companyName);
  const achievements = extractKeyAchievements(client.description);

  // Strategy: 40% question headlines, 30% achievement headlines, 30% value headlines
  const strategy = hash % 10;

  if (strategy < 4) {
    // Question headline - "What if [pain point] was solved?"
    const questions = STRATEGIC_QUESTIONS[client.industry] || STRATEGIC_QUESTIONS.other;
    const question = selectFromArray(questions, hash);
    return question;
  } else if (strategy < 7 && achievements.length > 0) {
    // Achievement headline - "[Years] of [expertise], Now Supercharged"
    const achievement = achievements[0];
    const verbs = ['Supercharged', 'Accelerated', 'Amplified', 'Elevated', 'Transformed'];
    const verb = selectFromArray(verbs, hash);
    if (achievement.includes('years')) {
      return `${achievement.charAt(0).toUpperCase() + achievement.slice(1)} of Excellence, Now ${verb} by AI`;
    }
    return `${client.companyName}'s ${achievement.charAt(0).toUpperCase() + achievement.slice(1)} Advantage, ${verb}`;
  } else {
    // Value headline - industry-specific
    const industryHeadlines: Record<string, string[]> = {
      marketing_advertising: [
        'AI That Works as Hard as Your Creatives',
        'Reclaim 20 Hours a Week for Strategy',
        'Campaign Excellence, Automated',
      ],
      insurance: [
        'Compliance Confidence, Delivered Automatically',
        'Process Claims Faster, Serve Clients Better',
        'AI Built for Insurance Excellence',
      ],
      financial_services: [
        'Regulatory Confidence at the Speed of Change',
        'Client Reporting in Minutes, Not Days',
        'Financial Precision, Automated',
      ],
      healthcare: [
        'More Time for Patients, Less for Paperwork',
        'Compliance Without the Burden',
        'Healthcare Administration, Streamlined',
      ],
      technology: [
        'Ship Faster. Document Better. Scale Smarter.',
        'Engineering Excellence, Automated',
        'From Code to Docs—Automatically',
      ],
      manufacturing: [
        'Supply Chain Clarity, Finally',
        'Quality Documentation on Autopilot',
        'Manufacturing Excellence, Streamlined',
      ],
      professional_services: [
        'Win More. Deliver Faster. Scale Smarter.',
        'Proposals That Write Themselves',
        'Client Excellence, Systematized',
      ],
    };

    const headlines = industryHeadlines[client.industry] || [
      'Operational Excellence, Automated',
      'Work Smarter with AI That Gets Your Business',
      'Transform How Your Team Works',
    ];

    return selectFromArray(headlines, hash);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE PERSUASIVE MESSAGE
// Structure: Pain (acknowledge) → Why AI helps → Memorable closer
// Note: Savings stats removed - portal page displays those separately
// ═══════════════════════════════════════════════════════════════════════════

export function generatePersuasiveMessage(client: ClientContext): string {
  const hash = hashString(client.companyName);

  // 1. Pain opener (bad news first) - acknowledge their specific challenge
  const painOpeners = INDUSTRY_PAIN_OPENERS[client.industry] || INDUSTRY_PAIN_OPENERS.other;
  const painOpener = selectFromArray(painOpeners, hash);

  // 2. Build the "because" bridge - explain WHY AI helps
  const painPointWords = (client.painPoints || '').toLowerCase().split(/[,;.]+/).filter(p => p.trim().length > 3);
  let becauseBridge: string;

  if (painPointWords.length > 0) {
    const firstPain = painPointWords[0].trim();
    const secondPain = painPointWords.length > 1 ? painPointWords[1].trim() : '';

    becauseBridge = `That's why we've curated AI skills specifically for ${firstPain}${secondPain ? ` and ${secondPain}` : ''}—because your expertise should go to strategy, not repetitive tasks.`;
  } else {
    becauseBridge = `That's why our AI automation exists—because your expertise is too valuable for repetitive tasks.`;
  }

  // 3. Memorable closer
  const closer = selectFromArray(MEMORABLE_PHRASES, hash);

  // Assemble the message (social proof stats and savings removed - portal shows savings separately)
  const parts = [
    painOpener,
    becauseBridge,
    closer,
  ].filter(p => p.length > 0);

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE CALL TO ACTION
// "Make it easy to act" - clear, specific, low friction
// ═══════════════════════════════════════════════════════════════════════════

export function generateCallToAction(client: ClientContext): string {
  const hash = hashString(client.companyName);

  const ctas = [
    'Explore your personalized AI toolkit—no commitment, just possibilities.',
    'See exactly which skills match your workflow in 60 seconds.',
    'Try one skill free. See the difference yourself.',
    'Your customized demo is ready. Just click.',
    'Preview your potential time savings—takes 30 seconds.',
  ];

  return selectFromArray(ctas, hash);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: Generate complete persuasive message package
// ═══════════════════════════════════════════════════════════════════════════

export function generatePersuasiveContent(client: ClientContext): PersuasiveMessage {
  return {
    headline: generatePersuasiveHeadline(client),
    message: generatePersuasiveMessage(client),
    callToAction: generateCallToAction(client),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH FUNCTION: Apply to client record
// Returns updated customHeadline and customMessage
// ═══════════════════════════════════════════════════════════════════════════

export function applyPersuasiveMessaging(client: {
  companyName: string;
  industry: ClientIndustry;
  companyType?: string;
  services?: string;
  description?: string;
  painPoints?: string;
  revenue?: string;
  employeeCount?: string;
  estimatedTimeSavings?: string;
  estimatedCostSavings?: string;
}): { customHeadline: string; customMessage: string } {
  const content = generatePersuasiveContent(client);

  return {
    customHeadline: content.headline,
    customMessage: `${content.message}\n\n${content.callToAction}`,
  };
}
