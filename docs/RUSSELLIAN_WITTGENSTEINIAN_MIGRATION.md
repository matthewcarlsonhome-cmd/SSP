# Russellian & Wittgensteinian Architecture Migration

## Overview

This document describes the migration from a hybrid TypeScript/Database architecture to a **database-only** architecture with Russellian formal validation and Wittgensteinian contextual enrichment.

## Architecture Summary

### Before (Hybrid)
```
TypeScript Files (73 skills)
         ↓
    Seed Script
         ↓
    Database (skill_registry)
         ↓
    App Load (with TypeScript fallback)
```

### After (Database-Only)
```
Database (skill_registry) ← Single Source of Truth
         ↓
    App Load (no fallback)
         ↓
    Execution (unchanged)
         ↓
    Russellian/Wittgensteinian Metadata (enrichment)
```

## Backward Compatibility Guarantee

**Your existing skills will NOT break because:**

1. **Execution path unchanged**: Skills execute using `current_system_instruction` + `current_user_prompt_template` TEXT fields
2. **New columns are nullable**: All Russellian/Wittgensteinian fields have `DEFAULT NULL`
3. **Metadata is additive**: New fields enrich skills but don't affect execution
4. **Loaders work the same**: `loadExecutableSkill()` returns the same data structure

## New Database Schema

### Russellian Fields (Formal Validation)

| Column | Type | Purpose |
|--------|------|---------|
| `axioms` | TEXT[] | Primitive operations: READ, TRANSFORM, WRITE, DECIDE, GENERATE, WAIT, VALIDATE |
| `type_level` | INTEGER (0-5) | Stratification level for preventing circular dependencies |
| `validation_certificate` | JSONB | Cryptographic proof of valid composition |

### Wittgensteinian Fields (Contextual Validation)

| Column | Type | Purpose |
|--------|------|---------|
| `language_games` | TEXT[] | Context: analysis, generation, optimization, coaching, research, translation |
| `family_clusters` | TEXT[] | Fuzzy categorization via family resemblance |
| `vocabulary_terms` | TEXT[] | Domain vocabulary for contextual meaning |
| `form_of_life` | TEXT | Broader practice context (e.g., 'job-seeking', 'software-development') |

### Atomic Composition Fields

| Column | Type | Purpose |
|--------|------|---------|
| `prompt_recipe` | JSONB | Declarative composition recipe (optional, for new skills) |
| `prompt_hash` | TEXT | Cache invalidation hash |
| `prompt_byte_size` | INTEGER | Performance monitoring |

## Migration Steps

### Step 1: Apply Database Migration

```bash
# Apply the new columns
supabase db push

# Or manually run:
# supabase/migrations/20260124_russellian_wittgensteinian_architecture.sql
```

### Step 2: Verify Existing Skills

```bash
# Run verification to ensure all skills are in database
npx tsx scripts/verifySkillMigration.ts

# Expected output:
# ✅ ALL SKILLS HAVE EXECUTION FIELDS
# ✅ DATABASE CAN BE USED AS SOLE SOURCE
# ✅ SAFE TO REMOVE TYPESCRIPT FALLBACK
```

### Step 3: Enrich Skills with Metadata

```bash
# Dry run first
npx tsx scripts/analyzeAndEnrichSkills.ts --dry-run --verbose

# If satisfied, run for real
npx tsx scripts/analyzeAndEnrichSkills.ts
```

### Step 4: Verify Enrichment

```sql
-- Check that metadata was populated
SELECT
  id,
  name,
  axioms,
  type_level,
  language_games,
  family_clusters,
  form_of_life
FROM skill_registry
WHERE axioms IS NOT NULL
LIMIT 10;
```

### Step 5: Update Application Code (Optional)

Replace deprecated sync functions with async database functions:

```typescript
// OLD (deprecated)
const skills = getAllLibrarySkills();
const skill = getLibrarySkill(id);

// NEW (recommended)
const skills = await getAllLibrarySkillsAsync();
const skill = await getExecutableSkillAsync(id);
```

## Verification Queries

### Check All Skills Have Execution Fields

```sql
SELECT COUNT(*) as total,
       COUNT(CASE WHEN current_system_instruction IS NOT NULL
                  AND LENGTH(current_system_instruction) > 50 THEN 1 END) as with_prompts
FROM skill_registry;
```

### Check Russellian Metadata Coverage

```sql
SELECT
  COUNT(*) as total,
  COUNT(axioms) as has_axioms,
  COUNT(type_level) as has_type_level,
  COUNT(validation_certificate) as has_certificate
FROM skill_registry;
```

### Check Wittgensteinian Metadata Coverage

```sql
SELECT
  COUNT(*) as total,
  COUNT(language_games) as has_games,
  COUNT(family_clusters) as has_clusters,
  COUNT(form_of_life) as has_form_of_life
FROM skill_registry;
```

### Find Similar Skills (Family Resemblance)

```sql
SELECT * FROM find_similar_skills('job-readiness-score', 5);
```

### Find Skills by Language Game

```sql
SELECT * FROM find_skills_by_game('analysis');
```

## Rollback Plan

If issues occur, the migration is fully reversible:

1. **New columns are nullable**: Simply ignore them
2. **Execution is unchanged**: Skills work with or without metadata
3. **TypeScript fallback exists**: Can be re-enabled if needed

To rollback TypeScript fallback removal:

```typescript
// In lib/skillLibrary/index.ts, remove the deprecation warning
// and keep using getAllLibrarySkills() as the primary function
```

## File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20260124_russellian_wittgensteinian_architecture.sql` | Database migration |
| `scripts/analyzeAndEnrichSkills.ts` | Metadata extraction script |
| `scripts/verifySkillMigration.ts` | Verification script |
| `lib/skillLibrary/dbLoader.ts` | Database-first skill loading |
| `lib/russellian/` | Russellian validation system |
| `lib/wittgenstein/` | Wittgensteinian contextual system |
| `lib/skills/prompts/` | Atomic prompt composition |

## Benefits After Migration

### Operational
- **Single source of truth**: All skill data in database
- **No code deployments**: Skill changes via Admin UI
- **Version control**: Built-in versioning with certificates

### Russellian (Formal)
- **Safe composition**: Axiom rules prevent invalid combinations
- **Stratification**: Type levels prevent circular dependencies
- **Audit trail**: Cryptographic certificates for compliance

### Wittgensteinian (Contextual)
- **Semantic discovery**: Find skills by meaning, not just keywords
- **Family resemblance**: Fuzzy categorization for related skills
- **Context awareness**: Skills behave differently in different games

### Performance
- **Smaller payloads**: Metadata without full prompts (~2KB vs ~50KB)
- **Cached atoms**: Compositional prompts cache efficiently
- **Lazy loading**: Load prompts only when executing
