/**
 * Language Game Registry
 *
 * Manages registration and lookup of language games.
 * Language games define contexts in which skills "make sense."
 *
 * @module wittgenstein/games/registry
 */

import type { Axiom, SkillDefinition, CompositionRule } from '../../russellian/types';
import { COMPOSITION_RULES } from '../../russellian/types';
import type {
  LanguageGame,
  VocabularyEntry,
  AxiomContextualMeaning,
  GameCompatibility,
} from '../types';
import { createLanguageGame, lookupVocabulary } from '../types';

/**
 * Registry for managing language games.
 */
export class LanguageGameRegistry {
  private games: Map<string, LanguageGame> = new Map();

  constructor() {
    // Register default games
    this.registerDefaultGames();
  }

  /**
   * Register a language game.
   *
   * @param game - The game to register
   * @throws If a game with the same ID already exists
   */
  registerGame(game: LanguageGame): void {
    if (this.games.has(game.gameId)) {
      throw new Error(`Language game '${game.gameId}' already registered`);
    }
    this.games.set(game.gameId, game);
  }

  /**
   * Update an existing game.
   *
   * @param game - The game to update
   */
  updateGame(game: LanguageGame): void {
    game.updatedAt = new Date().toISOString();
    this.games.set(game.gameId, game);
  }

  /**
   * Get a language game by ID.
   *
   * @param gameId - The game ID
   * @returns The game, or null if not found
   */
  getGame(gameId: string): LanguageGame | null {
    return this.games.get(gameId) || null;
  }

  /**
   * Get all registered games.
   *
   * @returns Array of all games
   */
  getAllGames(): LanguageGame[] {
    return Array.from(this.games.values());
  }

  /**
   * Get games related to a specific game.
   *
   * @param gameId - The game ID to find relations for
   * @returns Related games
   */
  getRelatedGames(gameId: string): LanguageGame[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    const related: LanguageGame[] = [];
    for (const relatedId of game.relatedGames) {
      const relatedGame = this.games.get(relatedId);
      if (relatedGame) {
        related.push(relatedGame);
      }
    }

    return related;
  }

  /**
   * Get games by form of life.
   *
   * @param formOfLife - The form of life identifier
   * @returns Games belonging to that form
   */
  getGamesByFormOfLife(formOfLife: string): LanguageGame[] {
    return Array.from(this.games.values()).filter(
      (g) => g.formOfLife === formOfLife
    );
  }

  /**
   * Get games by tag.
   *
   * @param tag - The tag to search for
   * @returns Games with that tag
   */
  getGamesByTag(tag: string): LanguageGame[] {
    const lowerTag = tag.toLowerCase();
    return Array.from(this.games.values()).filter(
      (g) => g.tags.some((t) => t.toLowerCase() === lowerTag)
    );
  }

  /**
   * Check a skill's compatibility with a language game.
   *
   * @param skill - The skill to check
   * @param gameId - The game to check against
   * @returns Compatibility assessment
   */
  checkCompatibility(
    skill: SkillDefinition,
    gameId: string
  ): GameCompatibility {
    const game = this.games.get(gameId);

    if (!game) {
      return {
        gameId,
        compatibilityScore: 0,
        missingVocabulary: [],
        violatedLocalRules: [],
        unmetSuccessCriteria: [],
        atypicalAxiomUse: [],
        suggestions: [`Game '${gameId}' not found`],
      };
    }

    const missingVocabulary: string[] = [];
    const violatedLocalRules: string[] = [];
    const unmetSuccessCriteria: string[] = [];
    const atypicalAxiomUse: Array<{ axiom: Axiom; issue: string }> = [];
    const suggestions: string[] = [];

    // Extract vocabulary from skill description and step names
    const skillTerms = this.extractTerms(skill);

    // Check vocabulary coverage
    for (const term of skillTerms) {
      if (!lookupVocabulary(game, term)) {
        missingVocabulary.push(term);
      }
    }

    // Check axiom usage against game semantics
    const axiomsUsed = new Set(skill.steps.map((s) => s.axiom));
    for (const axiom of axiomsUsed) {
      const meaning = game.axiomSemantics[axiom];
      if (meaning?.constraints) {
        // Check if any constraints might be violated
        // This is a simplified check
        for (const constraint of meaning.constraints) {
          if (this.mightViolateConstraint(skill, constraint)) {
            atypicalAxiomUse.push({
              axiom,
              issue: `May violate constraint: ${constraint}`,
            });
          }
        }
      }
    }

    // Check local rules
    for (const rule of game.localRules) {
      if (!this.checkLocalRule(skill, rule)) {
        violatedLocalRules.push(rule.id);
      }
    }

    // Calculate compatibility score
    let score = 1.0;

    // Deduct for missing vocabulary (up to 0.3)
    const vocabPenalty = Math.min(0.3, missingVocabulary.length * 0.05);
    score -= vocabPenalty;

    // Deduct for violated rules (up to 0.4)
    const rulePenalty = Math.min(0.4, violatedLocalRules.length * 0.1);
    score -= rulePenalty;

    // Deduct for atypical axiom use (up to 0.2)
    const axiomPenalty = Math.min(0.2, atypicalAxiomUse.length * 0.05);
    score -= axiomPenalty;

    score = Math.max(0, score);

    // Generate suggestions
    if (missingVocabulary.length > 0) {
      suggestions.push(
        `Consider adding these terms to the game vocabulary: ${missingVocabulary.slice(0, 3).join(', ')}`
      );
    }

    if (violatedLocalRules.length > 0) {
      suggestions.push(
        `Review local rules: ${violatedLocalRules.join(', ')}`
      );
    }

    if (score < 0.5) {
      const relatedGames = this.getRelatedGames(gameId);
      if (relatedGames.length > 0) {
        suggestions.push(
          `Consider these related games: ${relatedGames.map((g) => g.name).join(', ')}`
        );
      }
    }

    return {
      gameId,
      compatibilityScore: score,
      missingVocabulary,
      violatedLocalRules,
      unmetSuccessCriteria,
      atypicalAxiomUse,
      suggestions,
    };
  }

  /**
   * Get the contextual meaning of an axiom in a game.
   *
   * @param axiom - The axiom
   * @param gameId - The game ID
   * @returns Contextual meaning, or null
   */
  getAxiomMeaning(axiom: Axiom, gameId: string): AxiomContextualMeaning | null {
    const game = this.games.get(gameId);
    if (!game) return null;
    return game.axiomSemantics[axiom] || null;
  }

  /**
   * Look up a vocabulary term in a game.
   *
   * @param term - The term to look up
   * @param gameId - The game ID
   * @returns Vocabulary entry, or null
   */
  lookupTerm(term: string, gameId: string): VocabularyEntry | null {
    const game = this.games.get(gameId);
    if (!game) return null;
    return lookupVocabulary(game, term) || null;
  }

  /**
   * Get effective composition rules for a game.
   * Combines base rules with game-specific local rules.
   *
   * @param gameId - The game ID
   * @returns Combined composition rules
   */
  getEffectiveRules(gameId: string): CompositionRule[] {
    const game = this.games.get(gameId);
    if (!game) {
      return COMPOSITION_RULES;
    }

    // Start with base rules
    const ruleMap = new Map<string, CompositionRule>();
    for (const rule of COMPOSITION_RULES) {
      ruleMap.set(rule.id, rule);
    }

    // Override with local rules
    for (const localRule of game.localRules) {
      ruleMap.set(localRule.id, localRule);
    }

    return Array.from(ruleMap.values());
  }

  /**
   * Unregister a game.
   *
   * @param gameId - The game ID to remove
   * @returns True if removed, false if not found
   */
  unregisterGame(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  /**
   * Get registry statistics.
   */
  getStats(): {
    totalGames: number;
    gamesByForm: Record<string, number>;
    gamesWithLocalRules: number;
  } {
    const games = Array.from(this.games.values());
    const gamesByForm: Record<string, number> = {};

    for (const game of games) {
      gamesByForm[game.formOfLife] = (gamesByForm[game.formOfLife] || 0) + 1;
    }

    return {
      totalGames: games.length,
      gamesByForm,
      gamesWithLocalRules: games.filter((g) => g.localRules.length > 0).length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract terms from a skill for vocabulary checking.
   */
  private extractTerms(skill: SkillDefinition): string[] {
    const terms = new Set<string>();

    // From name
    const nameWords = skill.name.toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 3) terms.add(word);
    }

    // From description
    if (skill.description) {
      const descWords = skill.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (word.length > 3) terms.add(word);
      }
    }

    // From tags
    for (const tag of skill.tags) {
      terms.add(tag.toLowerCase());
    }

    return Array.from(terms);
  }

  /**
   * Check if a skill might violate a constraint.
   * This is a simplified heuristic check.
   */
  private mightViolateConstraint(
    skill: SkillDefinition,
    constraint: string
  ): boolean {
    // Simple pattern matching on constraint text
    const constraintLower = constraint.toLowerCase();

    // Check for data source constraints
    if (constraintLower.includes('crm') && !skill.tags.includes('crm')) {
      return false; // Not applicable
    }

    if (constraintLower.includes('api') && !skill.tags.includes('api')) {
      return false; // Not applicable
    }

    // Default: assume constraint is met
    return false;
  }

  /**
   * Check if a skill satisfies a local composition rule.
   */
  private checkLocalRule(
    skill: SkillDefinition,
    rule: CompositionRule
  ): boolean {
    // Check if the skill contains the pattern this rule applies to
    for (const conn of skill.connections) {
      const fromStep = skill.steps.find((s) => s.stepId === conn.fromStepId);
      const toStep = skill.steps.find((s) => s.stepId === conn.toStepId);

      if (fromStep && toStep) {
        if (fromStep.axiom === rule.fromAxiom && toStep.axiom === rule.toAxiom) {
          // This connection matches the rule pattern
          return rule.allowed;
        }
      }
    }

    // Rule doesn't apply to this skill
    return true;
  }

  /**
   * Register default language games.
   */
  private registerDefaultGames(): void {
    // Sales Automation Game
    const salesAutomation = this.createSalesAutomationGame();
    this.games.set(salesAutomation.gameId, salesAutomation);

    // Data Pipeline Game
    const dataPipeline = this.createDataPipelineGame();
    this.games.set(dataPipeline.gameId, dataPipeline);

    // Content Generation Game
    const contentGeneration = this.createContentGenerationGame();
    this.games.set(contentGeneration.gameId, contentGeneration);

    // Customer Support Game
    const customerSupport = this.createCustomerSupportGame();
    this.games.set(customerSupport.gameId, customerSupport);
  }

  private createSalesAutomationGame(): LanguageGame {
    const game = createLanguageGame(
      'sales-automation',
      'Sales Automation',
      'enterprise-software'
    );

    game.description = 'Automates sales processes including lead qualification, outreach, and pipeline management.';
    game.purpose = 'Increase sales efficiency and conversion rates through automated workflows.';

    game.vocabulary = {
      lead: {
        term: 'lead',
        meaningInGame: 'A potential customer who has shown interest but not yet qualified',
        exemplars: ['Downloaded whitepaper', 'Attended webinar', 'Visited pricing page'],
        contrasts: ['Not a current customer', 'Not a qualified opportunity'],
        relatedTerms: ['prospect', 'contact', 'opportunity'],
      },
      opportunity: {
        term: 'opportunity',
        meaningInGame: 'A qualified lead with identified need, budget, and timeline',
        exemplars: ['Requested demo', 'In active sales cycle'],
        contrasts: ['Not a marketing lead', 'Not a closed deal'],
        relatedTerms: ['lead', 'deal', 'account'],
      },
      pipeline: {
        term: 'pipeline',
        meaningInGame: 'The set of active opportunities at various stages',
        exemplars: ['Q4 pipeline', 'Enterprise pipeline'],
        contrasts: ['Not closed deals', 'Not marketing funnel'],
        relatedTerms: ['forecast', 'stages', 'velocity'],
      },
      outreach: {
        term: 'outreach',
        meaningInGame: 'Proactive contact attempts to engage prospects',
        exemplars: ['Cold email sequence', 'LinkedIn connection'],
        contrasts: ['Not inbound marketing', 'Not support requests'],
        relatedTerms: ['sequence', 'cadence', 'touchpoint'],
      },
    };

    game.axiomSemantics = {
      READ: {
        axiom: 'READ' as Axiom,
        meaningInGame: 'Fetch data from CRM or enrichment APIs',
        typicalSources: ['Salesforce', 'HubSpot', 'Clearbit', 'LinkedIn'],
        constraints: ['Must respect API rate limits', 'Must handle missing data'],
        examples: ['Read contact from CRM', 'Fetch company data from enrichment API'],
      },
      TRANSFORM: {
        axiom: 'TRANSFORM' as Axiom,
        meaningInGame: 'Qualify, score, or segment leads',
        constraints: ['Scoring models must be documented', 'Segments must be mutually exclusive'],
        examples: ['Calculate lead score', 'Assign to segment based on firmographics'],
      },
      WRITE: {
        axiom: 'WRITE' as Axiom,
        meaningInGame: 'Update CRM records or trigger outreach',
        typicalTargets: ['CRM opportunity', 'Email sequence', 'Task queue'],
        constraints: ['Must maintain data integrity', 'Must log all changes'],
        examples: ['Update lead status', 'Enroll in email sequence'],
      },
      GENERATE: {
        axiom: 'GENERATE' as Axiom,
        meaningInGame: 'Create personalized outreach content',
        constraints: ['Must follow brand guidelines', 'Must include unsubscribe option'],
        examples: ['Generate personalized email', 'Create LinkedIn message'],
      },
      DECIDE: {
        axiom: 'DECIDE' as Axiom,
        meaningInGame: 'Route leads or determine next actions',
        constraints: ['Routing rules must be explicit', 'Fallback must exist'],
        examples: ['Route to appropriate rep', 'Determine if lead is qualified'],
      },
    };

    game.successCriteria = [
      {
        criterionId: 'lead-quality',
        description: 'Leads passed to sales meet qualification criteria',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'qualified_rate >= 0.3',
      },
      {
        criterionId: 'response-rate',
        description: 'Outreach generates positive responses',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'response_rate >= 0.1',
      },
    ];

    game.relatedGames = ['content-generation', 'customer-support'];
    game.tags = ['sales', 'automation', 'crm', 'outreach'];

    return game;
  }

  private createDataPipelineGame(): LanguageGame {
    const game = createLanguageGame(
      'data-pipeline',
      'Data Pipeline',
      'enterprise-software'
    );

    game.description = 'Moves and transforms data between systems with validation and error handling.';
    game.purpose = 'Ensure reliable, consistent data flow across the organization.';

    game.vocabulary = {
      source: {
        term: 'source',
        meaningInGame: 'The system or location from which data is extracted',
        exemplars: ['Database', 'API endpoint', 'File storage'],
        contrasts: ['Not the destination', 'Not the transform layer'],
        relatedTerms: ['extraction', 'connector', 'ingestion'],
      },
      sink: {
        term: 'sink',
        meaningInGame: 'The system or location where data is loaded',
        exemplars: ['Data warehouse', 'Analytics database', 'Report'],
        contrasts: ['Not the source', 'Not intermediate storage'],
        relatedTerms: ['destination', 'target', 'load'],
      },
      schema: {
        term: 'schema',
        meaningInGame: 'The structure and types of data being processed',
        exemplars: ['Column definitions', 'JSON schema', 'Protobuf definition'],
        contrasts: ['Not data values', 'Not processing logic'],
        relatedTerms: ['types', 'structure', 'contract'],
      },
      backfill: {
        term: 'backfill',
        meaningInGame: 'Processing historical data that was missed or needs reprocessing',
        exemplars: ['Reprocess last 30 days', 'Fill gaps from outage'],
        contrasts: ['Not real-time processing', 'Not schema migration'],
        relatedTerms: ['replay', 'reprocess', 'catch-up'],
      },
    };

    game.axiomSemantics = {
      READ: {
        axiom: 'READ' as Axiom,
        meaningInGame: 'Extract data from source systems',
        typicalSources: ['Database', 'API', 'Message queue', 'File storage'],
        constraints: ['Must handle pagination', 'Must be idempotent for replays'],
        examples: ['Query database with incremental cursor', 'Poll message queue'],
      },
      TRANSFORM: {
        axiom: 'TRANSFORM' as Axiom,
        meaningInGame: 'Clean, enrich, or reshape data',
        constraints: ['Must preserve data lineage', 'Must handle schema evolution'],
        examples: ['Normalize addresses', 'Join with reference data', 'Aggregate metrics'],
      },
      WRITE: {
        axiom: 'WRITE' as Axiom,
        meaningInGame: 'Load data to destination systems',
        typicalTargets: ['Data warehouse', 'Cache', 'Search index'],
        constraints: ['Must be atomic or support partial failure', 'Must track watermarks'],
        examples: ['Upsert to warehouse', 'Update search index'],
      },
      VALIDATE: {
        axiom: 'VALIDATE' as Axiom,
        meaningInGame: 'Check data quality and schema compliance',
        constraints: ['Must log validation failures', 'Must have quarantine strategy'],
        examples: ['Validate against JSON schema', 'Check referential integrity'],
      },
      DECIDE: {
        axiom: 'DECIDE' as Axiom,
        meaningInGame: 'Route data based on content or handle errors',
        constraints: ['Dead letter queue for failures', 'Routing must be deterministic'],
        examples: ['Route to appropriate table', 'Handle malformed records'],
      },
    };

    game.successCriteria = [
      {
        criterionId: 'data-freshness',
        description: 'Data arrives within SLA',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'latency_p99 <= sla_seconds',
      },
      {
        criterionId: 'data-completeness',
        description: 'No data loss in pipeline',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'source_count == sink_count',
      },
    ];

    game.relatedGames = [];
    game.tags = ['data', 'etl', 'pipeline', 'integration'];

    return game;
  }

  private createContentGenerationGame(): LanguageGame {
    const game = createLanguageGame(
      'content-generation',
      'Content Generation',
      'enterprise-software'
    );

    game.description = 'Creates and manages content using AI and templates.';
    game.purpose = 'Produce high-quality content efficiently while maintaining brand consistency.';

    game.vocabulary = {
      prompt: {
        term: 'prompt',
        meaningInGame: 'Instructions given to an AI model to generate content',
        exemplars: ['System prompt', 'User prompt', 'Few-shot examples'],
        contrasts: ['Not the output', 'Not the model parameters'],
        relatedTerms: ['instruction', 'template', 'context'],
      },
      template: {
        term: 'template',
        meaningInGame: 'A reusable structure with placeholders for dynamic content',
        exemplars: ['Email template', 'Blog post structure', 'Product description format'],
        contrasts: ['Not generated content', 'Not static content'],
        relatedTerms: ['scaffold', 'format', 'structure'],
      },
      tone: {
        term: 'tone',
        meaningInGame: 'The style and voice of the content',
        exemplars: ['Professional', 'Casual', 'Authoritative', 'Friendly'],
        contrasts: ['Not topic', 'Not format'],
        relatedTerms: ['voice', 'style', 'personality'],
      },
      revision: {
        term: 'revision',
        meaningInGame: 'An updated version of content based on feedback',
        exemplars: ['Human edits', 'AI refinement', 'A/B variant'],
        contrasts: ['Not original draft', 'Not final version'],
        relatedTerms: ['edit', 'iteration', 'version'],
      },
    };

    game.axiomSemantics = {
      READ: {
        axiom: 'READ' as Axiom,
        meaningInGame: 'Gather context, examples, or reference material',
        typicalSources: ['Content database', 'Brand guidelines', 'Knowledge base'],
        constraints: ['Must respect copyright', 'Must cite sources when required'],
        examples: ['Fetch brand guidelines', 'Load example content'],
      },
      GENERATE: {
        axiom: 'GENERATE' as Axiom,
        meaningInGame: 'Create new content using AI or templates',
        constraints: ['Must follow brand guidelines', 'Must be factually accurate', 'Must avoid harmful content'],
        examples: ['Generate blog post', 'Create product description', 'Draft email'],
      },
      TRANSFORM: {
        axiom: 'TRANSFORM' as Axiom,
        meaningInGame: 'Revise, summarize, or adapt existing content',
        constraints: ['Must preserve key messages', 'Must maintain accuracy'],
        examples: ['Summarize article', 'Adjust tone', 'Translate to another format'],
      },
      VALIDATE: {
        axiom: 'VALIDATE' as Axiom,
        meaningInGame: 'Check content for quality, accuracy, and compliance',
        constraints: ['Must flag potential issues', 'Must suggest corrections'],
        examples: ['Check for plagiarism', 'Verify facts', 'Ensure brand compliance'],
      },
      WRITE: {
        axiom: 'WRITE' as Axiom,
        meaningInGame: 'Publish or store content',
        typicalTargets: ['CMS', 'Content database', 'Publishing platform'],
        constraints: ['Must track versions', 'Must handle scheduling'],
        examples: ['Publish to blog', 'Save draft', 'Schedule social post'],
      },
    };

    game.successCriteria = [
      {
        criterionId: 'content-quality',
        description: 'Content meets quality standards',
        isObservable: true,
        checkMethod: 'both',
        expression: 'quality_score >= 0.8',
      },
      {
        criterionId: 'brand-compliance',
        description: 'Content follows brand guidelines',
        isObservable: true,
        checkMethod: 'both',
      },
    ];

    game.relatedGames = ['sales-automation'];
    game.tags = ['content', 'ai', 'generation', 'marketing'];

    return game;
  }

  private createCustomerSupportGame(): LanguageGame {
    const game = createLanguageGame(
      'customer-support',
      'Customer Support',
      'enterprise-software'
    );

    game.description = 'Handles customer inquiries, issues, and requests through automated and assisted workflows.';
    game.purpose = 'Resolve customer issues efficiently while maintaining high satisfaction.';

    game.vocabulary = {
      ticket: {
        term: 'ticket',
        meaningInGame: 'A tracked customer inquiry or issue',
        exemplars: ['Support request', 'Bug report', 'Feature request'],
        contrasts: ['Not a sales lead', 'Not internal task'],
        relatedTerms: ['case', 'issue', 'request'],
      },
      escalation: {
        term: 'escalation',
        meaningInGame: 'Routing an issue to higher-tier support',
        exemplars: ['Tier 2 escalation', 'Manager review', 'Engineering handoff'],
        contrasts: ['Not resolution', 'Not closure'],
        relatedTerms: ['handoff', 'routing', 'triage'],
      },
      resolution: {
        term: 'resolution',
        meaningInGame: 'The solution provided to address the customer issue',
        exemplars: ['Fix applied', 'Workaround provided', 'Refund issued'],
        contrasts: ['Not diagnosis', 'Not ticket closure'],
        relatedTerms: ['solution', 'fix', 'answer'],
      },
      sla: {
        term: 'sla',
        meaningInGame: 'Service level agreement defining response and resolution times',
        exemplars: ['4-hour response', '24-hour resolution', 'Priority levels'],
        contrasts: ['Not guidelines', 'Not goals'],
        relatedTerms: ['response time', 'resolution time', 'priority'],
      },
    };

    game.axiomSemantics = {
      READ: {
        axiom: 'READ' as Axiom,
        meaningInGame: 'Fetch ticket details, customer history, or knowledge base articles',
        typicalSources: ['Ticketing system', 'CRM', 'Knowledge base'],
        constraints: ['Must check customer permissions', 'Must load relevant context'],
        examples: ['Get ticket details', 'Fetch customer history', 'Search knowledge base'],
      },
      TRANSFORM: {
        axiom: 'TRANSFORM' as Axiom,
        meaningInGame: 'Categorize, prioritize, or enrich ticket information',
        constraints: ['Must follow triage rules', 'Must preserve customer data'],
        examples: ['Classify ticket type', 'Calculate priority', 'Extract key entities'],
      },
      GENERATE: {
        axiom: 'GENERATE' as Axiom,
        meaningInGame: 'Create response drafts or knowledge base suggestions',
        constraints: ['Must be helpful and accurate', 'Must follow support guidelines'],
        examples: ['Draft response', 'Suggest KB articles', 'Generate summary'],
      },
      DECIDE: {
        axiom: 'DECIDE' as Axiom,
        meaningInGame: 'Route tickets, determine escalation, or select response strategy',
        constraints: ['Must respect SLAs', 'Must have human escalation path'],
        examples: ['Route to appropriate queue', 'Determine if escalation needed'],
      },
      WRITE: {
        axiom: 'WRITE' as Axiom,
        meaningInGame: 'Update ticket, send response, or log interaction',
        typicalTargets: ['Ticketing system', 'Email', 'Chat'],
        constraints: ['Must track all interactions', 'Must update status correctly'],
        examples: ['Send response to customer', 'Update ticket status', 'Log resolution'],
      },
    };

    game.successCriteria = [
      {
        criterionId: 'response-sla',
        description: 'First response within SLA',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'first_response_time <= sla_response',
      },
      {
        criterionId: 'resolution-sla',
        description: 'Issue resolved within SLA',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'resolution_time <= sla_resolution',
      },
      {
        criterionId: 'csat',
        description: 'Customer satisfaction score meets target',
        isObservable: true,
        checkMethod: 'automatic',
        expression: 'csat_score >= 4.0',
      },
    ];

    game.relatedGames = ['sales-automation'];
    game.tags = ['support', 'customer', 'service', 'tickets'];

    return game;
  }
}

/**
 * Singleton instance of the language game registry.
 */
export const languageGameRegistry = new LanguageGameRegistry();
