-- ═══════════════════════════════════════════════════════════════════════════
-- EXPAND SKILL_REGISTRY FOR DB-FIRST ARCHITECTURE
-- Date: 2026-01-23
-- Purpose: Store ALL skill data in the database (single source of truth)
--
-- This eliminates the need for TypeScript skill definitions by storing:
-- - Metadata (name, description, tags)
-- - Visual config (theme, icon)
-- - Form inputs
-- - Execution config
-- - Attribution
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. ADD METADATA COLUMNS
-- ───────────────────────────────────────────────────────────────────────────

-- Short description for skill cards
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS description TEXT;

-- Detailed description for skill detail view
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS long_description TEXT;

-- What the user gets from this skill (array of benefit strings)
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS what_you_get JSONB DEFAULT '[]'::jsonb;

-- Estimated time saved (e.g., "2 hours", "30 minutes")
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS estimated_time_saved TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. ADD FORM INPUT CONFIGURATION
-- ───────────────────────────────────────────────────────────────────────────

-- Form inputs as JSONB array
-- Each input: {id, label, type, placeholder, helpText, options, defaultValue, validation}
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS inputs JSONB DEFAULT '[]'::jsonb;

-- Output format for the skill result
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS output_format TEXT DEFAULT 'markdown'
CHECK (output_format IN ('markdown', 'json', 'table'));

-- ───────────────────────────────────────────────────────────────────────────
-- 3. ADD CATEGORIZATION & TAGGING
-- ───────────────────────────────────────────────────────────────────────────

-- Primary category
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'generation'
CHECK (category IN ('analysis', 'generation', 'automation', 'optimization', 'communication', 'research'));

-- Use case contexts (when to use this skill)
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}';

-- Experience level required
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'intermediate'
CHECK (level IN ('beginner', 'intermediate', 'advanced'));

-- Job roles this skill is useful for
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- Custom tags for additional filtering
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS custom_tags TEXT[] DEFAULT '{}';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. ADD VISUAL CONFIGURATION
-- ───────────────────────────────────────────────────────────────────────────

-- Theme configuration (colors, gradients)
-- {primary: 'text-blue-400', secondary: 'bg-blue-900/20', gradient: 'from-blue-500/20'}
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"primary": "text-blue-400", "secondary": "bg-blue-900/20", "gradient": "from-blue-500/20 to-transparent"}'::jsonb;

-- Lucide icon name
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'Sparkles';

-- ───────────────────────────────────────────────────────────────────────────
-- 5. ADD EXECUTION CONFIGURATION
-- ───────────────────────────────────────────────────────────────────────────

-- Recommended AI model
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS recommended_model TEXT DEFAULT 'any'
CHECK (recommended_model IN ('gemini', 'claude', 'any'));

-- Whether to use web search
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS use_web_search BOOLEAN DEFAULT false;

-- Maximum tokens for response
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096;

-- Temperature for generation
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. ADD SOURCE & ATTRIBUTION
-- ───────────────────────────────────────────────────────────────────────────

-- Where the skill comes from
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'builtin'
CHECK (source IN ('builtin', 'role-template', 'community'));

-- For role-template skills, which template it came from
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS source_role_id TEXT;

-- For community skills, the author
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. ADD USAGE METRICS
-- ───────────────────────────────────────────────────────────────────────────

-- Execution count
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Last executed timestamp
ALTER TABLE skill_registry
ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMPTZ;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. CREATE INDEXES FOR EFFICIENT QUERYING
-- ───────────────────────────────────────────────────────────────────────────

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_skill_registry_category ON skill_registry(category);

-- Index for level filtering
CREATE INDEX IF NOT EXISTS idx_skill_registry_level ON skill_registry(level);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_skill_registry_source ON skill_registry(source);

-- GIN index for roles array (for contains queries)
CREATE INDEX IF NOT EXISTS idx_skill_registry_roles ON skill_registry USING GIN(roles);

-- GIN index for use_cases array
CREATE INDEX IF NOT EXISTS idx_skill_registry_use_cases ON skill_registry USING GIN(use_cases);

-- GIN index for custom_tags array
CREATE INDEX IF NOT EXISTS idx_skill_registry_custom_tags ON skill_registry USING GIN(custom_tags);

-- Index for popularity sorting
CREATE INDEX IF NOT EXISTS idx_skill_registry_use_count ON skill_registry(use_count DESC);

-- Full-text search index on name and description
CREATE INDEX IF NOT EXISTS idx_skill_registry_search
ON skill_registry USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ───────────────────────────────────────────────────────────────────────────
-- 9. CREATE HELPER FUNCTION FOR INCREMENTING USE COUNT
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_skill_use_count(p_skill_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE skill_registry
  SET
    use_count = use_count + 1,
    last_executed_at = now()
  WHERE id = p_skill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anyone to increment use count (for tracking)
GRANT EXECUTE ON FUNCTION increment_skill_use_count(TEXT) TO anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. CREATE VIEW FOR SKILL LIBRARY BROWSING
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
  -- Metrics
  use_count,
  total_grades,
  avg_overall_score,
  -- Timestamps
  created_at,
  updated_at
FROM skill_registry
ORDER BY use_count DESC, name ASC;

-- Grant read access to the library view
GRANT SELECT ON skill_library TO anon, authenticated;

COMMENT ON VIEW skill_library IS 'Public view of skills for browsing (excludes prompt content)';

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This migration adds all necessary columns to make skill_registry the
-- single source of truth for all skill data:
--
-- METADATA: description, long_description, what_you_get, estimated_time_saved
-- INPUTS: inputs (JSONB array of form fields)
-- TAGGING: category, use_cases, level, roles, custom_tags
-- VISUAL: theme (JSONB), icon_name
-- EXECUTION: output_format, recommended_model, use_web_search, max_tokens, temperature
-- ATTRIBUTION: source, source_role_id, author_id
-- METRICS: use_count, last_executed_at
--
-- After running this migration and seeding data, TypeScript skill
-- definitions can be removed - everything loads from the database.
--
