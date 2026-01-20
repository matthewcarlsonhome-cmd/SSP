/**
 * Wittgensteinian Forms of Life
 *
 * A form of life is the broader cultural/organizational context in which
 * language games are played. It includes practices, values, and assumptions
 * that are so fundamental they're rarely questioned.
 *
 * @module wittgenstein/types/form-of-life
 */

/**
 * A practice within a form of life.
 */
export interface Practice {
  /** Unique identifier */
  practiceId: string;

  /** Human-readable name */
  name: string;

  /** Description of this practice */
  description: string;

  /** Activities that constitute this practice */
  activities: string[];

  /** Roles involved in this practice */
  roles: string[];

  /** Tools/technologies used */
  tools: string[];

  /** How to know if you're doing it right */
  criteriaOfCorrectness: string[];
}

/**
 * A form of life - the broadest context of meaning.
 */
export interface FormOfLife {
  /** Unique identifier */
  formId: string;

  /** Human-readable name */
  name: string;

  /** Description of this form of life */
  description: string;

  /** Domain (e.g., "enterprise software", "healthcare", "finance") */
  domain: string;

  /** Core practices that define this form */
  practices: Practice[];

  /** Language games played within this form */
  languageGames: string[];

  /** Things "everyone knows" (rarely stated explicitly) */
  backgroundAssumptions: string[];

  /** Guiding values */
  values: string[];

  /** What ultimate success looks like */
  ultimateGoals: string[];

  /** Tags for categorization */
  tags: string[];

  /** When this was created */
  createdAt: string;

  /** When this was last updated */
  updatedAt: string;
}

/**
 * Create a form of life.
 *
 * @param formId - Unique identifier
 * @param name - Human-readable name
 * @param domain - The domain this form operates in
 * @returns A minimal FormOfLife
 */
export function createFormOfLife(
  formId: string,
  name: string,
  domain: string
): FormOfLife {
  const now = new Date().toISOString();
  return {
    formId,
    name,
    description: '',
    domain,
    practices: [],
    languageGames: [],
    backgroundAssumptions: [],
    values: [],
    ultimateGoals: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a practice.
 *
 * @param practiceId - Unique identifier
 * @param name - Human-readable name
 * @returns A minimal Practice
 */
export function createPractice(
  practiceId: string,
  name: string
): Practice {
  return {
    practiceId,
    name,
    description: '',
    activities: [],
    roles: [],
    tools: [],
    criteriaOfCorrectness: [],
  };
}

/**
 * Add a practice to a form of life.
 *
 * @param form - The form to modify
 * @param practice - The practice to add
 */
export function addPractice(form: FormOfLife, practice: Practice): void {
  form.practices.push(practice);
  form.updatedAt = new Date().toISOString();
}

/**
 * Add a language game to a form of life.
 *
 * @param form - The form to modify
 * @param gameId - The language game ID
 */
export function addLanguageGame(form: FormOfLife, gameId: string): void {
  if (!form.languageGames.includes(gameId)) {
    form.languageGames.push(gameId);
    form.updatedAt = new Date().toISOString();
  }
}

/**
 * Add a background assumption.
 *
 * @param form - The form to modify
 * @param assumption - The assumption to add
 */
export function addBackgroundAssumption(
  form: FormOfLife,
  assumption: string
): void {
  if (!form.backgroundAssumptions.includes(assumption)) {
    form.backgroundAssumptions.push(assumption);
    form.updatedAt = new Date().toISOString();
  }
}

/**
 * Add a value to a form of life.
 *
 * @param form - The form to modify
 * @param value - The value to add
 */
export function addValue(form: FormOfLife, value: string): void {
  if (!form.values.includes(value)) {
    form.values.push(value);
    form.updatedAt = new Date().toISOString();
  }
}

/**
 * Add an ultimate goal.
 *
 * @param form - The form to modify
 * @param goal - The goal to add
 */
export function addUltimateGoal(form: FormOfLife, goal: string): void {
  if (!form.ultimateGoals.includes(goal)) {
    form.ultimateGoals.push(goal);
    form.updatedAt = new Date().toISOString();
  }
}

/**
 * Get all practices for a form of life.
 *
 * @param form - The form to query
 * @returns All practices
 */
export function getAllPractices(form: FormOfLife): Practice[] {
  return [...form.practices];
}

/**
 * Find a practice by ID.
 *
 * @param form - The form to search
 * @param practiceId - The practice ID
 * @returns The practice, or undefined
 */
export function findPractice(
  form: FormOfLife,
  practiceId: string
): Practice | undefined {
  return form.practices.find((p) => p.practiceId === practiceId);
}

/**
 * Check if a form of life has a specific language game.
 *
 * @param form - The form to check
 * @param gameId - The game ID
 * @returns True if the game is part of this form
 */
export function hasLanguageGame(form: FormOfLife, gameId: string): boolean {
  return form.languageGames.includes(gameId);
}

/**
 * Get a summary of a form of life.
 *
 * @param form - The form to summarize
 * @returns Summary object
 */
export function summarizeFormOfLife(form: FormOfLife): {
  name: string;
  domain: string;
  practiceCount: number;
  gameCount: number;
  valueCount: number;
} {
  return {
    name: form.name,
    domain: form.domain,
    practiceCount: form.practices.length,
    gameCount: form.languageGames.length,
    valueCount: form.values.length,
  };
}
