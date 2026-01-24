#!/usr/bin/env npx tsx
/**
 * SKILL ANALYZER & ENRICHMENT SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This script analyzes existing skills and populates Russellian/Wittgensteinian
 * metadata WITHOUT MODIFYING the actual prompts.
 *
 * BACKWARD COMPATIBILITY GUARANTEE:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - current_system_instruction: NEVER TOUCHED
 * - current_user_prompt_template: NEVER TOUCHED
 * - Only new nullable metadata columns are populated
 * - If analysis fails for a skill, it's skipped (skill still works)
 *
 * WHAT IT DOES:
 * 1. Reads each skill's current_system_instruction
 * 2. Analyzes the text to extract:
 *    - Axioms (what operations the prompt indicates)
 *    - Type level (based on axioms)
 *    - Language games (what context the skill operates in)
 *    - Family clusters (what other skills it's similar to)
 *    - Form of life (the broader practice context)
 *    - Prompt hash and byte size
 * 3. Updates ONLY the new metadata columns
 *
 * USAGE:
 *   npx tsx scripts/analyzeAndEnrichSkills.ts [--dry-run] [--skill-id=<id>]
 *
 * OPTIONS:
 *   --dry-run       Show what would be updated without making changes
 *   --skill-id=X    Only analyze a specific skill
 *   --verbose       Show detailed analysis for each skill
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

type RussellianAxiom = 'READ' | 'TRANSFORM' | 'WRITE' | 'DECIDE' | 'GENERATE' | 'WAIT' | 'VALIDATE';
type WittgensteinianGame = 'analysis' | 'generation' | 'optimization' | 'coaching' | 'research' | 'translation';

interface SkillRecord {
  id: string;
  name: string;
  current_system_instruction: string;
  current_user_prompt_template: string;
  category: string | null;
  use_cases: string[] | null;
  roles: string[] | null;
  description: string | null;
}

interface AnalysisResult {
  axioms: RussellianAxiom[];
  type_level: number;
  language_games: WittgensteinianGame[];
  family_clusters: string[];
  form_of_life: string;
  vocabulary_terms: string[];
  prompt_hash: string;
  prompt_byte_size: number;
  validation_certificate: {
    axiom_chain: RussellianAxiom[];
    validated_at: string;
    hash: string;
    validator_version: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIOM DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const AXIOM_PATTERNS: Record<RussellianAxiom, RegExp[]> = {
  READ: [
    /read|fetch|retrieve|access|load|get|query|lookup|search|find|browse|scan/i,
    /data from|information from|content from|input from/i,
    /analyze.*provided|review.*provided|examine.*provided/i,
    /user.*provides|user.*inputs|user.*gives/i,
  ],
  TRANSFORM: [
    /transform|convert|process|calculate|compute|format|restructure|reformat/i,
    /organize|arrange|sort|filter|map|reduce|aggregate/i,
    /extract|parse|interpret|decode|encode/i,
    /summarize|condense|expand|elaborate/i,
  ],
  WRITE: [
    /write|save|store|output|export|publish|post|send|submit|deliver/i,
    /create.*file|generate.*document|produce.*report/i,
    /update.*record|modify.*database/i,
  ],
  DECIDE: [
    /decide|determine|choose|select|pick|evaluate|assess|judge/i,
    /if.*then|based on|depending on|according to/i,
    /score|rate|rank|prioritize|recommend/i,
    /criteria|threshold|condition|requirement/i,
  ],
  GENERATE: [
    /generate|create|write|compose|draft|produce|develop|craft|author/i,
    /build|construct|design|formulate|devise/i,
    /suggest|propose|recommend|advise/i,
    /you are|act as|role as|expert|specialist|professional/i,
  ],
  WAIT: [
    /wait|pause|delay|hold|pending|async|callback/i,
    /await.*response|await.*input|await.*confirmation/i,
  ],
  VALIDATE: [
    /validate|verify|check|confirm|ensure|assert|test/i,
    /must.*be|should.*be|required.*to|needs.*to/i,
    /error.*if|fail.*if|reject.*if|invalid.*if/i,
    /compliance|conformance|adherence/i,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE GAME DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const GAME_PATTERNS: Record<WittgensteinianGame, RegExp[]> = {
  analysis: [
    /analyze|assess|evaluate|review|examine|audit|inspect/i,
    /score|rate|grade|measure|quantify/i,
    /identify.*gaps|find.*issues|detect.*problems/i,
    /compare|contrast|benchmark/i,
  ],
  generation: [
    /generate|create|write|compose|draft|produce|build/i,
    /new|original|fresh|from scratch/i,
    /template|boilerplate|starter/i,
  ],
  optimization: [
    /optimize|improve|enhance|refine|polish|perfect/i,
    /better|stronger|clearer|more effective/i,
    /rewrite|revise|edit|update|upgrade/i,
    /tailor|customize|personalize|adapt/i,
  ],
  coaching: [
    /coach|guide|mentor|teach|train|advise/i,
    /step.by.step|walkthrough|tutorial/i,
    /help.*understand|explain.*how|show.*how/i,
    /practice|prepare|rehearse/i,
  ],
  research: [
    /research|investigate|explore|discover|study/i,
    /gather.*information|collect.*data|find.*sources/i,
    /market|industry|competitive|landscape/i,
    /trends|insights|intelligence/i,
  ],
  translation: [
    /translate|convert|transform|adapt|port/i,
    /from.*to|into|as a|reformat/i,
    /different.*format|alternative.*version/i,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM OF LIFE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_OF_LIFE_PATTERNS: Record<string, RegExp[]> = {
  'job-seeking': [
    /resume|cv|cover letter|job|career|interview|hiring|recruiter/i,
    /salary|compensation|negotiate|offer/i,
    /linkedin|networking|referral/i,
  ],
  'software-development': [
    /code|programming|software|developer|engineer|technical/i,
    /bug|debug|refactor|deploy|release/i,
    /api|database|frontend|backend|architecture/i,
  ],
  'business-operations': [
    /business|enterprise|corporate|organization/i,
    /process|workflow|procedure|policy/i,
    /vendor|supplier|contract|compliance/i,
  ],
  'sales-marketing': [
    /sales|marketing|customer|prospect|lead/i,
    /proposal|pitch|presentation|demo/i,
    /campaign|brand|messaging|content/i,
  ],
  'product-management': [
    /product|feature|roadmap|backlog|sprint/i,
    /user.*story|requirement|specification/i,
    /stakeholder|customer.*feedback|market/i,
  ],
  'data-analysis': [
    /data|analytics|metrics|kpi|dashboard/i,
    /excel|spreadsheet|visualization|chart/i,
    /insight|trend|pattern|correlation/i,
  ],
  'governance-compliance': [
    /governance|compliance|regulation|policy|audit/i,
    /risk|control|framework|standard/i,
    /ethics|responsible|accountable/i,
  ],
  'human-resources': [
    /hr|human resources|employee|staff|team/i,
    /onboarding|performance|training|development/i,
    /culture|engagement|retention/i,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILY CLUSTER DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const FAMILY_CLUSTERS: Record<string, RegExp[]> = {
  'career-development': [/career|job|resume|interview|salary|linkedin/i],
  'document-generation': [/generate|create|write|compose|draft|document/i],
  'content-optimization': [/optimize|improve|enhance|refine|tailor/i],
  'data-processing': [/data|analyze|process|transform|calculate/i],
  'communication': [/email|message|letter|memo|communication/i],
  'strategy-planning': [/strategy|plan|roadmap|objective|goal/i],
  'assessment-scoring': [/score|rate|assess|evaluate|grade/i],
  'research-intelligence': [/research|market|competitive|intelligence/i],
  'compliance-governance': [/compliance|governance|policy|audit|risk/i],
  'technical-documentation': [/technical|spec|architecture|api|code/i],
};

// ═══════════════════════════════════════════════════════════════════════════════
// VOCABULARY EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

const DOMAIN_VOCABULARY: Record<string, string[]> = {
  career: ['resume', 'cv', 'cover letter', 'interview', 'job description', 'qualifications', 'experience', 'skills gap', 'ats', 'recruiter'],
  sales: ['prospect', 'lead', 'proposal', 'objection', 'close', 'pipeline', 'quota', 'crm', 'demo'],
  product: ['prd', 'user story', 'acceptance criteria', 'mvp', 'roadmap', 'backlog', 'sprint', 'stakeholder'],
  technical: ['api', 'database', 'architecture', 'deployment', 'debugging', 'refactoring', 'code review', 'incident'],
  data: ['kpi', 'metric', 'dashboard', 'visualization', 'trend', 'correlation', 'pivot table', 'formula'],
  hr: ['onboarding', 'performance review', 'job description', 'compensation', 'benefits', 'culture'],
  governance: ['policy', 'compliance', 'audit', 'risk assessment', 'framework', 'control', 'regulation'],
  operations: ['sop', 'process', 'workflow', 'vendor', 'contract', 'procurement'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function detectAxioms(prompt: string): RussellianAxiom[] {
  const detected: Set<RussellianAxiom> = new Set();

  // All LLM skills inherently GENERATE
  detected.add('GENERATE');

  for (const [axiom, patterns] of Object.entries(AXIOM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        detected.add(axiom as RussellianAxiom);
        break;
      }
    }
  }

  return Array.from(detected);
}

function calculateTypeLevel(axioms: RussellianAxiom[]): number {
  // Type levels based on Russellian stratification
  if (axioms.includes('WRITE')) return 2;  // Side effects = LEVEL_2
  if (axioms.includes('READ') || axioms.includes('GENERATE')) return 1;  // External data = LEVEL_1
  return 0;  // Pure transformation = LEVEL_0
}

function detectLanguageGames(prompt: string, category: string | null): WittgensteinianGame[] {
  const detected: Set<WittgensteinianGame> = new Set();

  // Category hints
  if (category) {
    const categoryMap: Record<string, WittgensteinianGame> = {
      analysis: 'analysis',
      generation: 'generation',
      optimization: 'optimization',
      communication: 'generation',
      research: 'research',
      automation: 'optimization',
    };
    if (categoryMap[category]) {
      detected.add(categoryMap[category]);
    }
  }

  // Pattern matching
  for (const [game, patterns] of Object.entries(GAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        detected.add(game as WittgensteinianGame);
        break;
      }
    }
  }

  // Default to generation if nothing detected
  if (detected.size === 0) {
    detected.add('generation');
  }

  return Array.from(detected);
}

function detectFormOfLife(prompt: string, roles: string[] | null, useCases: string[] | null): string {
  // Check roles first (most specific)
  if (roles?.length) {
    const roleHints: Record<string, string> = {
      'Software Engineer': 'software-development',
      'Product Manager': 'product-management',
      'Sales Representative': 'sales-marketing',
      'HR Manager': 'human-resources',
      'Data Analyst': 'data-analysis',
      'Job Seeker': 'job-seeking',
      'Executive': 'business-operations',
    };
    for (const role of roles) {
      for (const [pattern, formOfLife] of Object.entries(roleHints)) {
        if (role.toLowerCase().includes(pattern.toLowerCase())) {
          return formOfLife;
        }
      }
    }
  }

  // Pattern matching on prompt
  for (const [formOfLife, patterns] of Object.entries(FORM_OF_LIFE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        return formOfLife;
      }
    }
  }

  return 'general-professional';
}

function detectFamilyClusters(prompt: string, category: string | null): string[] {
  const clusters: Set<string> = new Set();

  for (const [cluster, patterns] of Object.entries(FAMILY_CLUSTERS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        clusters.add(cluster);
        break;
      }
    }
  }

  // Add category-based cluster
  if (category) {
    clusters.add(`category-${category}`);
  }

  return Array.from(clusters);
}

function extractVocabularyTerms(prompt: string): string[] {
  const terms: Set<string> = new Set();
  const promptLower = prompt.toLowerCase();

  for (const domainTerms of Object.values(DOMAIN_VOCABULARY)) {
    for (const term of domainTerms) {
      if (promptLower.includes(term.toLowerCase())) {
        terms.add(term);
      }
    }
  }

  return Array.from(terms);
}

function calculatePromptHash(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
}

function analyzeSkill(skill: SkillRecord): AnalysisResult {
  const fullPrompt = `${skill.current_system_instruction}\n${skill.current_user_prompt_template}`;

  const axioms = detectAxioms(fullPrompt);
  const type_level = calculateTypeLevel(axioms);
  const language_games = detectLanguageGames(fullPrompt, skill.category);
  const family_clusters = detectFamilyClusters(fullPrompt, skill.category);
  const form_of_life = detectFormOfLife(fullPrompt, skill.roles, skill.use_cases);
  const vocabulary_terms = extractVocabularyTerms(fullPrompt);
  const prompt_hash = calculatePromptHash(skill.current_system_instruction);
  const prompt_byte_size = Buffer.byteLength(skill.current_system_instruction, 'utf8');

  const validation_certificate = {
    axiom_chain: axioms,
    validated_at: new Date().toISOString(),
    hash: calculatePromptHash(JSON.stringify({ axioms, type_level, skill_id: skill.id })),
    validator_version: '1.0.0',
  };

  return {
    axioms,
    type_level,
    language_games,
    family_clusters,
    form_of_life,
    vocabulary_terms,
    prompt_hash,
    prompt_byte_size,
    validation_certificate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const skillIdArg = args.find(a => a.startsWith('--skill-id='));
  const specificSkillId = skillIdArg?.split('=')[1];

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('SKILL ANALYZER & ENRICHMENT');
  console.log('Russellian & Wittgensteinian Architecture Migration');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE (will update database)'}`);
  console.log(`Target: ${specificSkillId || 'ALL SKILLS'}`);
  console.log('');

  // Fetch skills
  let query = supabase
    .from('skill_registry')
    .select('id, name, current_system_instruction, current_user_prompt_template, category, use_cases, roles, description');

  if (specificSkillId) {
    query = query.eq('id', specificSkillId);
  }

  const { data: skills, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch skills:', error.message);
    process.exit(1);
  }

  if (!skills || skills.length === 0) {
    console.log('No skills found to analyze.');
    process.exit(0);
  }

  console.log(`Found ${skills.length} skills to analyze.`);
  console.log('');
  console.log('───────────────────────────────────────────────────────────────────────────────');

  let successCount = 0;
  let errorCount = 0;

  for (const skill of skills as SkillRecord[]) {
    try {
      const analysis = analyzeSkill(skill);

      if (verbose) {
        console.log('');
        console.log(`📊 ${skill.name} (${skill.id})`);
        console.log(`   Axioms: ${analysis.axioms.join(', ')}`);
        console.log(`   Type Level: ${analysis.type_level}`);
        console.log(`   Language Games: ${analysis.language_games.join(', ')}`);
        console.log(`   Family Clusters: ${analysis.family_clusters.join(', ')}`);
        console.log(`   Form of Life: ${analysis.form_of_life}`);
        console.log(`   Vocabulary Terms: ${analysis.vocabulary_terms.length} found`);
        console.log(`   Prompt Size: ${analysis.prompt_byte_size} bytes`);
      } else {
        process.stdout.write(`  Analyzing: ${skill.name.padEnd(40)} `);
      }

      if (!dryRun) {
        // UPDATE ONLY THE NEW METADATA COLUMNS
        // current_system_instruction and current_user_prompt_template are NOT touched
        const { error: updateError } = await supabase
          .from('skill_registry')
          .update({
            axioms: analysis.axioms,
            type_level: analysis.type_level,
            language_games: analysis.language_games,
            family_clusters: analysis.family_clusters,
            form_of_life: analysis.form_of_life,
            vocabulary_terms: analysis.vocabulary_terms,
            prompt_hash: analysis.prompt_hash,
            prompt_byte_size: analysis.prompt_byte_size,
            validation_certificate: analysis.validation_certificate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', skill.id);

        if (updateError) {
          throw updateError;
        }
      }

      if (!verbose) {
        console.log('✅');
      }
      successCount++;
    } catch (err) {
      if (!verbose) {
        console.log('❌');
      }
      console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`);
      errorCount++;
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('SUMMARY');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${skills.length}`);
  console.log('');

  if (dryRun) {
    console.log('🔍 This was a DRY RUN - no changes were made.');
    console.log('   Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Database has been updated with Russellian/Wittgensteinian metadata.');
    console.log('   Existing prompts were NOT modified.');
  }
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
