/**
 * Wittgensteinian Language Games
 *
 * A language game defines a context in which skills operate, determining
 * what counts as valid use, what vocabulary means, and what success looks like.
 * Different games may interpret the same axioms differently.
 *
 * @module wittgenstein/types/language-game
 */

import type { Axiom, CompositionRule } from '../../russellian/types';

/**
 * Entry in a game's vocabulary.
 * Defines how a term is understood within this specific game.
 */
export interface VocabularyEntry {
  /** The term being defined */
  term: string;

  /** What this term means in this game */
  meaningInGame: string;

  /** Examples of correct use of this term */
  exemplars: string[];

  /** What this term does NOT mean (common confusions) */
  contrasts: string[];

  /** Related terms in this vocabulary */
  relatedTerms: string[];
}

/**
 * How an axiom is interpreted within a specific game.
 * The same axiom may have different typical uses in different contexts.
 */
export interface AxiomContextualMeaning {
  /** The axiom being contextualized */
  axiom: Axiom;

  /** What this axiom typically means in this game */
  meaningInGame: string;

  /** Typical data sources when using READ */
  typicalSources?: string[];

  /** Typical data destinations when using WRITE */
  typicalTargets?: string[];

  /** Game-specific constraints on this axiom */
  constraints?: string[];

  /** Examples of this axiom's use in this game */
  examples?: string[];
}

/**
 * Criterion for determining success in a game.
 * Success must be publicly observable (per Wittgenstein).
 */
export interface SuccessCriterion {
  /** Unique identifier */
  criterionId: string;

  /** Human-readable description */
  description: string;

  /** Whether this can be observed publicly (must be true per Wittgenstein) */
  isObservable: boolean;

  /** How to check this criterion */
  checkMethod: 'automatic' | 'human' | 'both';

  /** Expression for automatic checking (optional) */
  expression?: string;

  /** Priority when multiple criteria conflict */
  priority?: number;
}

/**
 * A Language Game defines a context of use.
 * Skills "make sense" only within specific games.
 */
export interface LanguageGame {
  /** Unique identifier for this game */
  gameId: string;

  /** Human-readable name */
  name: string;

  /** Detailed description of this game */
  description: string;

  /** The purpose or goal of this game */
  purpose: string;

  /** Domain vocabulary with contextual meanings */
  vocabulary: Record<string, VocabularyEntry>;

  /** How axioms are interpreted in this context */
  axiomSemantics: Partial<Record<Axiom, AxiomContextualMeaning>>;

  /** Game-specific composition rules (can override base rules) */
  localRules: CompositionRule[];

  /** Observable success criteria for this game */
  successCriteria: SuccessCriterion[];

  /** IDs of related games (for skill portability) */
  relatedGames: string[];

  /** The parent form of life this game belongs to */
  formOfLife: string;

  /** Tags for categorization */
  tags: string[];

  /** When this game was created */
  createdAt: string;

  /** When this game was last updated */
  updatedAt: string;
}

/**
 * Result of checking a skill's compatibility with a game.
 */
export interface GameCompatibility {
  /** The game being checked against */
  gameId: string;

  /** Compatibility score from 0 to 1 */
  compatibilityScore: number;

  /** Vocabulary terms the skill uses but aren't in the game */
  missingVocabulary: string[];

  /** IDs of local rules the skill violates */
  violatedLocalRules: string[];

  /** IDs of success criteria that cannot be met */
  unmetSuccessCriteria: string[];

  /** Axioms used in ways not typical for this game */
  atypicalAxiomUse: Array<{
    axiom: Axiom;
    issue: string;
  }>;

  /** Suggestions for improving compatibility */
  suggestions: string[];
}

/**
 * Create an empty language game with required fields.
 *
 * @param gameId - Unique identifier
 * @param name - Human-readable name
 * @param formOfLife - Parent form of life
 * @returns A minimal LanguageGame
 */
export function createLanguageGame(
  gameId: string,
  name: string,
  formOfLife: string
): LanguageGame {
  const now = new Date().toISOString();
  return {
    gameId,
    name,
    description: '',
    purpose: '',
    vocabulary: {},
    axiomSemantics: {},
    localRules: [],
    successCriteria: [],
    relatedGames: [],
    formOfLife,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a vocabulary entry.
 *
 * @param term - The term to define
 * @param meaningInGame - What it means in this game
 * @returns A VocabularyEntry
 */
export function createVocabularyEntry(
  term: string,
  meaningInGame: string
): VocabularyEntry {
  return {
    term,
    meaningInGame,
    exemplars: [],
    contrasts: [],
    relatedTerms: [],
  };
}

/**
 * Create a success criterion.
 *
 * @param criterionId - Unique identifier
 * @param description - What success looks like
 * @param checkMethod - How to verify success
 * @returns A SuccessCriterion
 */
export function createSuccessCriterion(
  criterionId: string,
  description: string,
  checkMethod: 'automatic' | 'human' | 'both' = 'both'
): SuccessCriterion {
  return {
    criterionId,
    description,
    isObservable: true, // Per Wittgenstein, criteria must be public
    checkMethod,
  };
}

/**
 * Add a vocabulary term to a game.
 *
 * @param game - The game to modify
 * @param entry - The vocabulary entry to add
 */
export function addVocabulary(game: LanguageGame, entry: VocabularyEntry): void {
  game.vocabulary[entry.term] = entry;
  game.updatedAt = new Date().toISOString();
}

/**
 * Set axiom contextual meaning for a game.
 *
 * @param game - The game to modify
 * @param meaning - The axiom's contextual meaning
 */
export function setAxiomMeaning(
  game: LanguageGame,
  meaning: AxiomContextualMeaning
): void {
  game.axiomSemantics[meaning.axiom] = meaning;
  game.updatedAt = new Date().toISOString();
}

/**
 * Add a success criterion to a game.
 *
 * @param game - The game to modify
 * @param criterion - The criterion to add
 */
export function addSuccessCriterion(
  game: LanguageGame,
  criterion: SuccessCriterion
): void {
  game.successCriteria.push(criterion);
  game.updatedAt = new Date().toISOString();
}

/**
 * Check if a game has a specific vocabulary term.
 *
 * @param game - The game to check
 * @param term - The term to look for
 * @returns True if the term is in the vocabulary
 */
export function hasVocabulary(game: LanguageGame, term: string): boolean {
  return term.toLowerCase() in game.vocabulary ||
    Object.values(game.vocabulary).some(
      (v) => v.term.toLowerCase() === term.toLowerCase()
    );
}

/**
 * Look up a vocabulary term in a game.
 *
 * @param game - The game to search
 * @param term - The term to find
 * @returns The entry, or undefined if not found
 */
export function lookupVocabulary(
  game: LanguageGame,
  term: string
): VocabularyEntry | undefined {
  const key = term.toLowerCase();
  return game.vocabulary[key] || Object.values(game.vocabulary).find(
    (v) => v.term.toLowerCase() === key
  );
}
