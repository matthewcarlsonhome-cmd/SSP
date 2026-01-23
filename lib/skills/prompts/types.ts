/**
 * Atomic Prompt Composition System - Type Definitions
 *
 * Implements a Russellian logical atomism approach to prompt engineering:
 * - Atoms are irreducible, self-contained prompt units
 * - Molecules combine atoms with specific bindings
 * - Organisms are full prompts assembled from molecules
 *
 * Also incorporates Wittgensteinian "language games":
 * - Context determines how atoms behave when composed
 * - The same atom may contribute differently in different games
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ATOM TYPES - Irreducible prompt units (Russellian)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A Role Atom defines WHO the AI is.
 * Russellian: Clear, unambiguous identity predicate.
 */
export interface RoleAtom {
  readonly type: 'role';
  readonly id: string;
  readonly title: string;                    // "Principal Career Strategist"
  readonly yearsExperience: number;          // 25
  readonly organizations: readonly string[]; // ["McKinsey", "Goldman Sachs"]
  readonly credentials: readonly string[];   // ["SHRM-SCP", "ICF PCC"]
  readonly render: () => string;             // Lazy evaluation
}

/**
 * An Expertise Atom defines WHAT domains the AI knows.
 * Can be combined without conflict.
 */
export interface ExpertiseAtom {
  readonly type: 'expertise';
  readonly id: string;
  readonly domain: string;                   // "talent assessment"
  readonly subdomains: readonly string[];    // ["executive assessment", "ATS"]
  readonly specificKnowledge: readonly string[];
  readonly render: () => string;
}

/**
 * A Methodology Atom defines HOW the AI approaches problems.
 * Wittgensteinian: Behavior changes based on language game context.
 */
export interface MethodologyAtom {
  readonly type: 'methodology';
  readonly id: string;
  readonly framework: string;                // "STAR Framework"
  readonly steps: readonly string[];
  readonly applicableGames: readonly LanguageGame[];
  readonly render: (game: LanguageGame) => string;
}

/**
 * A Constraint Atom defines BOUNDARIES.
 */
export interface ConstraintAtom {
  readonly type: 'constraint';
  readonly id: string;
  readonly rule: string;
  readonly severity: 'must' | 'should' | 'prefer';
  readonly render: () => string;
}

/**
 * An Output Atom defines FORMAT expectations.
 */
export interface OutputAtom {
  readonly type: 'output';
  readonly id: string;
  readonly format: 'markdown' | 'json' | 'table' | 'structured';
  readonly sections: readonly OutputSection[];
  readonly render: () => string;
}

export interface OutputSection {
  readonly header: string;
  readonly description: string;
  readonly required: boolean;
}

// Union of all atom types
export type PromptAtom = RoleAtom | ExpertiseAtom | MethodologyAtom | ConstraintAtom | OutputAtom;

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE GAMES (Wittgensteinian)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Language Games determine context-dependent meaning.
 *
 * Per Wittgenstein: "The meaning of a word is its use in the language"
 * Different games invoke different behaviors from the same atoms.
 */
export type LanguageGame =
  | 'analysis'      // Evaluating, scoring, critiquing existing content
  | 'generation'    // Creating new content from scratch
  | 'optimization'  // Improving existing content
  | 'coaching'      // Guiding user through a process
  | 'research'      // Gathering and synthesizing information
  | 'translation';  // Converting between formats/contexts

/**
 * Game context influences atom rendering.
 */
export interface GameContext {
  readonly game: LanguageGame;
  readonly tone: 'formal' | 'conversational' | 'direct';
  readonly depth: 'quick' | 'standard' | 'comprehensive';
  readonly audience: 'expert' | 'professional' | 'novice';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOLECULES - Composed from atoms with bindings
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A Molecule combines multiple atoms for a specific purpose.
 * Molecules can be further composed into full prompts.
 */
export interface PromptMolecule {
  readonly id: string;
  readonly name: string;
  readonly atoms: readonly PromptAtom[];
  readonly defaultGame: LanguageGame;
  readonly bindings: Record<string, string>;  // Variable bindings
  readonly render: (context: GameContext) => string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITION RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A composed prompt ready for execution.
 */
export interface ComposedPrompt {
  readonly systemInstruction: string;
  readonly atoms: readonly PromptAtom[];      // For debugging/caching
  readonly molecules: readonly PromptMolecule[];
  readonly hash: string;                       // For caching
  readonly byteSize: number;                   // For load time tracking
}

/**
 * Prompt composition options.
 */
export interface CompositionOptions {
  readonly context: GameContext;
  readonly includeCredentials: boolean;        // Can skip for faster loads
  readonly maxTokenEstimate?: number;          // Truncate if needed
  readonly cacheKey?: string;                  // For memoization
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY LOADING SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference to an atom that can be loaded on demand.
 * Enables chunked loading for faster initial render.
 */
export interface AtomRef<T extends PromptAtom = PromptAtom> {
  readonly type: T['type'];
  readonly id: string;
  readonly byteSize: number;       // For load planning
  readonly load: () => Promise<T>; // Lazy loader
}

/**
 * A prompt template with deferred atom loading.
 */
export interface LazyPromptTemplate {
  readonly id: string;
  readonly coreAtoms: readonly PromptAtom[];       // Always loaded
  readonly deferredAtoms: readonly AtomRef[];      // Loaded on demand
  readonly loadAll: () => Promise<ComposedPrompt>;
  readonly loadCore: () => ComposedPrompt;         // Fast path
}
