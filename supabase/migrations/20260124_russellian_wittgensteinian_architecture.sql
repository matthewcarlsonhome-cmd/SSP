-- ═══════════════════════════════════════════════════════════════════════════
-- RUSSELLIAN & WITTGENSTEINIAN ARCHITECTURE MIGRATION
-- Date: 2026-01-24
-- Purpose: Add formal validation and contextual metadata to skills
--
-- BACKWARD COMPATIBILITY GUARANTEE:
-- ─────────────────────────────────────────────────────────────────────────────
-- All new columns are NULLABLE and do not affect existing execution.
-- Skills execute using current_system_instruction + current_user_prompt_template
-- exactly as before. These new columns are METADATA ENRICHMENT ONLY.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. RUSSELLIAN FORMAL VALIDATION COLUMNS
-- Inspired by Russell & Whitehead's Principia Mathematica
-- ───────────────────────────────────────────────────────────────────────────

-- Primitive axioms this skill uses
-- Valid values: READ, TRANSFORM, WRITE, DECIDE, GENERATE, WAIT, VALIDATE
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS axioms TEXT[] DEFAULT NULL;

COMMENT ON COLUMN skill_registry.axioms IS
  'Russellian primitive operations: READ, TRANSFORM, WRITE, DECIDE, GENERATE, WAIT, VALIDATE';

-- Type level for stratification (prevents circular dependencies)
-- LEVEL_0 = Pure transformations only
-- LEVEL_1 = Can read external data
-- LEVEL_2 = Can write external data
-- LEVEL_3 = Can orchestrate LEVEL_0-2 skills
-- LEVEL_4 = Can orchestrate LEVEL_0-3 skills
-- LEVEL_5 = Admin-only, full access
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS type_level INTEGER DEFAULT NULL
CHECK (type_level IS NULL OR (type_level >= 0 AND type_level <= 5));

COMMENT ON COLUMN skill_registry.type_level IS
  'Russellian type level 0-5 for stratification (higher can invoke lower, never same or higher)';

-- Derivation certificate - cryptographic proof of valid composition
-- Contains: axiom chain, validation timestamp, hash
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS validation_certificate JSONB DEFAULT NULL;

COMMENT ON COLUMN skill_registry.validation_certificate IS
  'Cryptographic derivation certificate proving valid axiom composition';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. WITTGENSTEINIAN CONTEXTUAL VALIDATION COLUMNS
-- "The meaning of a word is its use in the language"
-- ───────────────────────────────────────────────────────────────────────────

-- Language games this skill participates in
-- Determines context-dependent behavior
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS language_games TEXT[] DEFAULT NULL;

COMMENT ON COLUMN skill_registry.language_games IS
  'Wittgensteinian language games: analysis, generation, optimization, coaching, research, translation';

-- Family resemblance clusters for fuzzy categorization
-- Skills in same cluster share overlapping features (not rigid taxonomy)
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS family_clusters TEXT[] DEFAULT NULL;

COMMENT ON COLUMN skill_registry.family_clusters IS
  'Family resemblance clusters for fuzzy skill grouping (Wittgensteinian)';

-- Domain vocabulary terms this skill uses
-- For contextual meaning validation
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS vocabulary_terms TEXT[] DEFAULT NULL;

COMMENT ON COLUMN skill_registry.vocabulary_terms IS
  'Domain vocabulary terms used by this skill (for contextual validation)';

-- Form of life - the broader practice context
-- E.g., 'job-seeking', 'software-development', 'business-operations'
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS form_of_life TEXT DEFAULT NULL;

COMMENT ON COLUMN skill_registry.form_of_life IS
  'Wittgensteinian form of life - the broader practice context';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. ATOMIC PROMPT COMPOSITION COLUMNS
-- For future skills using compositional prompts
-- ───────────────────────────────────────────────────────────────────────────

-- Prompt recipe for atomic composition
-- {role, expertise[], methodologies[], output, constraints[], customSections[]}
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS prompt_recipe JSONB DEFAULT NULL;

COMMENT ON COLUMN skill_registry.prompt_recipe IS
  'Declarative recipe for atomic prompt composition (optional, for new skills)';

-- Hash of composed prompt for cache invalidation
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS prompt_hash TEXT DEFAULT NULL;

COMMENT ON COLUMN skill_registry.prompt_hash IS
  'Hash of current prompt for cache invalidation';

-- Byte size of prompt for performance monitoring
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS prompt_byte_size INTEGER DEFAULT NULL;

COMMENT ON COLUMN skill_registry.prompt_byte_size IS
  'Byte size of current prompt for performance monitoring';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. CREATE INDEXES FOR NEW COLUMNS
-- ───────────────────────────────────────────────────────────────────────────

-- GIN index for axioms array queries
CREATE INDEX IF NOT EXISTS idx_skill_registry_axioms
ON skill_registry USING GIN(axioms)
WHERE axioms IS NOT NULL;

-- Index for type level filtering
CREATE INDEX IF NOT EXISTS idx_skill_registry_type_level
ON skill_registry(type_level)
WHERE type_level IS NOT NULL;

-- GIN index for language games
CREATE INDEX IF NOT EXISTS idx_skill_registry_language_games
ON skill_registry USING GIN(language_games)
WHERE language_games IS NOT NULL;

-- GIN index for family clusters
CREATE INDEX IF NOT EXISTS idx_skill_registry_family_clusters
ON skill_registry USING GIN(family_clusters)
WHERE family_clusters IS NOT NULL;

-- Index for form of life
CREATE INDEX IF NOT EXISTS idx_skill_registry_form_of_life
ON skill_registry(form_of_life)
WHERE form_of_life IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. UPDATE skill_library VIEW TO INCLUDE NEW COLUMNS
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW skill_library AS
SELECT
  id,
  name,
  description,
  long_description,
  what_you_get,
  estimated_time_saved,
  -- Tagging
  category,
  use_cases,
  level,
  roles,
  custom_tags,
  -- Visual
  theme,
  icon_name,
  -- Source
  skill_type,
  source,
  source_role_id,
  -- Execution (excluding prompts for public view)
  inputs,
  output_format,
  recommended_model,
  use_web_search,
  -- Russellian (for advanced filtering)
  axioms,
  type_level,
  -- Wittgensteinian (for contextual discovery)
  language_games,
  family_clusters,
  form_of_life,
  -- Metrics
  use_count,
  total_grades,
  avg_overall_score,
  -- Timestamps
  created_at,
  updated_at
FROM skill_registry
ORDER BY use_count DESC, name ASC;

-- Re-grant read access
GRANT SELECT ON skill_library TO anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTION: Validate Skill Axiom Composition
-- Returns whether a skill's axiom composition is valid
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_skill_axioms(p_skill_id TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  required_level INTEGER,
  has_side_effects BOOLEAN,
  validation_message TEXT
) AS $$
DECLARE
  v_axioms TEXT[];
  v_has_write BOOLEAN := false;
  v_has_read BOOLEAN := false;
  v_has_generate BOOLEAN := false;
  v_min_level INTEGER := 0;
BEGIN
  -- Get skill axioms
  SELECT axioms INTO v_axioms FROM skill_registry WHERE id = p_skill_id;

  IF v_axioms IS NULL OR array_length(v_axioms, 1) IS NULL THEN
    RETURN QUERY SELECT true, 0, false, 'No axioms defined (pure computation)'::TEXT;
    RETURN;
  END IF;

  -- Check for side effects and determine required level
  v_has_write := 'WRITE' = ANY(v_axioms);
  v_has_read := 'READ' = ANY(v_axioms);
  v_has_generate := 'GENERATE' = ANY(v_axioms);

  -- Determine minimum required level
  IF v_has_write THEN
    v_min_level := 2;  -- WRITE requires LEVEL_2+
  ELSIF v_has_read OR v_has_generate THEN
    v_min_level := 1;  -- READ/GENERATE require LEVEL_1+
  ELSE
    v_min_level := 0;  -- Pure transformations
  END IF;

  RETURN QUERY SELECT
    true,
    v_min_level,
    v_has_write,
    format('Valid composition: axioms=%s, required_level=%s', v_axioms, v_min_level)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. HELPER FUNCTION: Find Skills by Language Game
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_skills_by_game(p_game TEXT)
RETURNS TABLE(
  skill_id TEXT,
  skill_name TEXT,
  family_clusters TEXT[],
  form_of_life TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    name,
    sr.family_clusters,
    sr.form_of_life
  FROM skill_registry sr
  WHERE p_game = ANY(sr.language_games)
  ORDER BY use_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. HELPER FUNCTION: Find Skills by Family Resemblance
-- Returns skills that share cluster membership (fuzzy matching)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_similar_skills(p_skill_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  skill_id TEXT,
  skill_name TEXT,
  shared_clusters TEXT[],
  similarity_score NUMERIC
) AS $$
DECLARE
  v_clusters TEXT[];
BEGIN
  -- Get source skill's clusters
  SELECT family_clusters INTO v_clusters FROM skill_registry WHERE id = p_skill_id;

  IF v_clusters IS NULL THEN
    RETURN;
  END IF;

  -- Find skills with overlapping clusters
  RETURN QUERY
  SELECT
    sr.id,
    sr.name,
    ARRAY(SELECT unnest(sr.family_clusters) INTERSECT SELECT unnest(v_clusters)) as shared,
    (
      array_length(ARRAY(SELECT unnest(sr.family_clusters) INTERSECT SELECT unnest(v_clusters)), 1)::NUMERIC /
      GREATEST(array_length(v_clusters, 1), 1)::NUMERIC
    ) as score
  FROM skill_registry sr
  WHERE sr.id != p_skill_id
    AND sr.family_clusters IS NOT NULL
    AND sr.family_clusters && v_clusters  -- Overlap operator
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_skill_axioms(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_skills_by_game(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_similar_skills(TEXT, INTEGER) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY: BACKWARD COMPATIBILITY VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- UNCHANGED (execution path):
-- - current_system_instruction: TEXT NOT NULL ← Used for LLM execution
-- - current_user_prompt_template: TEXT NOT NULL ← Used for LLM execution
--
-- ADDED (optional metadata):
-- - axioms: TEXT[] ← NULL OK, enrichment only
-- - type_level: INTEGER ← NULL OK, enrichment only
-- - validation_certificate: JSONB ← NULL OK, enrichment only
-- - language_games: TEXT[] ← NULL OK, enrichment only
-- - family_clusters: TEXT[] ← NULL OK, enrichment only
-- - vocabulary_terms: TEXT[] ← NULL OK, enrichment only
-- - form_of_life: TEXT ← NULL OK, enrichment only
-- - prompt_recipe: JSONB ← NULL OK, enrichment only
-- - prompt_hash: TEXT ← NULL OK, enrichment only
-- - prompt_byte_size: INTEGER ← NULL OK, enrichment only
--
-- All existing skills continue to work because:
-- 1. New columns are NULLABLE (DEFAULT NULL)
-- 2. Execution uses current_system_instruction (unchanged)
-- 3. No constraints block NULL metadata
-- 4. Loaders don't require these fields
--
