# Migrating to Composable Prompts

This guide shows how to migrate existing monolithic skills to use the atomic prompt composition system.

## Before: Monolithic Prompt (Current System)

```typescript
// lib/skills/job-seeker/skills.ts - BEFORE
export const JOB_SEEKER_SKILLS: Record<string, Skill> = {
  'job-readiness-score': {
    id: 'job-readiness-score',
    name: 'Job Readiness Scorer',
    // ...metadata...
    generatePrompt: (inputs) => ({
      systemInstruction: `You are a Principal Career Strategist and Talent Assessment Expert with 25+ years of experience at McKinsey, Bain, Goldman Sachs, Google, and executive search firms including Korn Ferry and Spencer Stuart. You have personally assessed over 15,000 candidates across industries, levels, and functions. You hold certifications in SHRM-SCP, ICF PCC coaching, and have developed proprietary assessment frameworks adopted by Fortune 100 companies.

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: YOUR EXPERTISE AND CREDENTIALS
═══════════════════════════════════════════════════════════════════════════════

**CORE COMPETENCIES:**
- Executive assessment and C-suite readiness evaluation
- Technical and functional skills gap analysis across 50+ industries
[... 300+ more lines of static prompt content ...]
`,
      userPrompt: createUserPrompt('Job Readiness Assessment', inputs, standardJobSeekerMapping),
    }),
  },
};
```

**Problems:**
- ~15KB of prompt text per skill
- Duplicated credentials/methodologies across 73 skills
- Can't update "Principal Career Strategist" role in one place
- Full prompt loaded even if user only previews skill

---

## After: Composable Prompt (New System)

```typescript
// lib/skills/job-seeker/skills.ts - AFTER
import { composePrompt, SKILL_RECIPES, GameContext } from '../prompts';

// Default context for job-seeker skills
const defaultContext: GameContext = {
  game: 'analysis',
  tone: 'professional',
  depth: 'comprehensive',
  audience: 'professional',
};

export const JOB_SEEKER_SKILLS: Record<string, Skill> = {
  'job-readiness-score': {
    id: 'job-readiness-score',
    name: 'Job Readiness Scorer',
    // ...metadata stays the same...
    generatePrompt: (inputs) => {
      // Compose from atoms - cached after first call
      const composed = composePrompt(SKILL_RECIPES.jobReadinessScore, defaultContext);

      return {
        systemInstruction: composed.systemInstruction,
        userPrompt: createUserPrompt('Job Readiness Assessment', inputs, standardJobSeekerMapping),
      };
    },
  },
};
```

**Benefits:**
- Recipe is ~10 lines vs. 300+ lines
- Atoms cached and reused across skills
- Update role/expertise in one place → all skills updated
- Byte size tracked for optimization

---

## Gradual Migration Strategy

You don't need to migrate all skills at once. The systems are compatible:

### Phase 1: Add Composition System (No Breaking Changes)
```typescript
// Add new prompts/ directory alongside existing skills
lib/skills/
├── prompts/          # NEW: Atomic composition system
│   ├── atoms/
│   ├── composer.ts
│   └── index.ts
├── job-seeker/       # UNCHANGED: Existing skills still work
├── governance/
└── static.ts
```

### Phase 2: Migrate High-Impact Skills First
Start with skills that share the most common patterns:
- All job-seeker skills share `careerStrategist` role
- All governance skills share `aiGovernance` role
- All technical skills share `softwareArchitect` role

### Phase 3: Add Custom Sections for Skill-Specific Content
For skills with unique sections not covered by atoms:

```typescript
import { recipe, composePrompt } from '../prompts';

const customRecipe = recipe()
  .role('careerStrategist')
  .expertise('talentAssessment')
  .methodology('weightedScoring')
  .customSection({
    title: 'Industry-Specific Scoring Adjustments',
    content: `For healthcare roles, add 10% weight to compliance knowledge...`,
    position: 'after-methodology',
  })
  .output('scoreCard')
  .constraints('evidenceBacked', 'honestAssessment')
  .build();
```

---

## Performance Impact

### Before (Monolithic)
- Each skill: 10-20KB prompt text
- 73 skills × 15KB avg = ~1.1MB total prompt content
- No caching between skills
- Full prompt loaded on skill preview

### After (Composable)
- Atom library: ~25KB total (all atoms)
- Recipe per skill: ~200 bytes
- Cached compositions: O(1) lookups
- Only referenced atoms loaded

### Estimated Improvements
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Memory per skill | 15KB | 200B + shared atoms | ~75× smaller |
| First skill load | 15KB | ~5KB (atoms + recipe) | 3× faster |
| Subsequent skill loads | 15KB | ~200B (recipe only) | 75× faster |
| Update propagation | Manual (73 files) | Automatic (1 atom) | ∞ better |

---

## Philosophical Foundation

### Russellian Logical Atomism
Each atom is an **irreducible, unambiguous unit**:
- Role atoms define WHO (clear identity predicate)
- Expertise atoms define WHAT (knowledge domains)
- Methodology atoms define HOW (process frameworks)
- Output atoms define FORMAT (structure requirements)
- Constraint atoms define LIMITS (behavioral boundaries)

These atoms can be combined without contradiction because they're logically independent.

### Wittgensteinian Language Games
The **same methodology behaves differently based on context**:

```typescript
// "Weighted Scoring" in ANALYSIS game
METHODOLOGIES.weightedScoring.render('analysis')
// → "Focus on precise scoring with evidence for each factor. Be rigorous and objective."

// "Weighted Scoring" in COACHING game
METHODOLOGIES.weightedScoring.render('coaching')
// → "Explain scores in terms of improvement opportunity. Focus on actionable gaps."
```

Meaning derives from use—the same scoring framework serves different purposes in different "language games."

---

## Adding New Atoms

When you need a new capability:

### 1. Identify the atom type
- Is it a WHO (role)?
- Is it a WHAT (expertise)?
- Is it a HOW (methodology)?
- Is it a FORMAT (output)?
- Is it a LIMIT (constraint)?

### 2. Create the atom

```typescript
// lib/skills/prompts/atoms/expertise.ts
export const EXPERTISE = {
  // ...existing...

  myNewDomain: createExpertiseAtom({
    id: 'my-new-domain',
    domain: 'My New Domain',
    subdomains: ['subdomain1', 'subdomain2'],
    specificKnowledge: [
      'Specific knowledge point 1',
      'Specific knowledge point 2',
    ],
  }),
};
```

### 3. Use in recipes

```typescript
const newSkillRecipe = recipe()
  .role('domainExpert')
  .expertise('myNewDomain')
  .methodology('gapAnalysis')
  .output('structuredAnalysis')
  .constraints('evidenceBacked')
  .build();
```

---

## Testing Atoms

Atoms can be tested in isolation:

```typescript
// __tests__/atoms.test.ts
import { ROLES, EXPERTISE, METHODOLOGIES } from '../prompts/atoms';

describe('Role Atoms', () => {
  it('renders career strategist correctly', () => {
    const rendered = ROLES.careerStrategist.render();
    expect(rendered).toContain('Principal Career Strategist');
    expect(rendered).toContain('25+ years');
    expect(rendered).toContain('SHRM-SCP');
  });
});

describe('Methodology Atoms', () => {
  it('adapts to language game context', () => {
    const analysis = METHODOLOGIES.weightedScoring.render('analysis');
    const coaching = METHODOLOGIES.weightedScoring.render('coaching');

    expect(analysis).toContain('rigorous');
    expect(coaching).toContain('improvement opportunity');
    expect(analysis).not.toEqual(coaching);
  });
});
```

---

## Backward Compatibility Guarantee

The new system is **fully backward compatible**:

1. Existing `generatePrompt` functions continue to work
2. Skills can be migrated one at a time
3. Mixed usage (some composed, some monolithic) is supported
4. No changes to skill execution or API contracts
