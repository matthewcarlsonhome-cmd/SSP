# Next Install Steps

Version: 2026-04-29
Purpose: prioritized deployment checklist for functionality that exists in code but is not live until database, Edge Function, secrets, and hosting configuration are applied.

## Priority 0: Verify The Target Environment

Before enabling the new agentic/CRM functionality in a hosted environment:

1. Confirm the production app has:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Confirm the Supabase project has the existing public/client migrations applied, especially:
   - `supabase/migrations/20260119_clients_table.sql`
   - `supabase/migrations/20260121_client_contacts_enhancement.sql`
   - `supabase/migrations/20260121_client_features_enhancement.sql`
   - `supabase/migrations/20260424_agentic_schema.sql`
3. Confirm admin users have `public.user_profiles.is_admin = true`; the agentic schema RLS policies depend on `agentic.is_admin()`.
4. Expose the `agentic` schema in Supabase API/PostgREST settings. The app reads it through `supabase.schema('agentic')`.

## Priority 1: Apply Required SQL

For an existing hosted project, run these migrations in this order through Supabase SQL Editor or `supabase db push`.

### 1. Agentic Routing And Cost Attribution

File: `supabase/migrations/20260429_agentic_routing_costs.sql`

```sql
ALTER TABLE agentic.skill_executions
  ADD COLUMN IF NOT EXISTS model_id TEXT,
  ADD COLUMN IF NOT EXISTS model_provider TEXT,
  ADD COLUMN IF NOT EXISTS model_tier TEXT,
  ADD COLUMN IF NOT EXISTS price_snapshot_id TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost_cents NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_cost_cents NUMERIC,
  ADD COLUMN IF NOT EXISTS tokens_in INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_out INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_cached_read INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_cached_write INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_reasoning INTEGER,
  ADD COLUMN IF NOT EXISTS routing_reason TEXT,
  ADD COLUMN IF NOT EXISTS routing_rejected_candidates JSONB;

CREATE INDEX IF NOT EXISTS idx_agentic_skill_exec_model_id
  ON agentic.skill_executions(model_id);

CREATE INDEX IF NOT EXISTS idx_agentic_skill_exec_model_tier
  ON agentic.skill_executions(model_tier);
```

### 2. Agentic Quality Telemetry

File: `supabase/migrations/20260429_agentic_quality_events.sql`

```sql
CREATE TABLE IF NOT EXISTS agentic.quality_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES agentic.agent_runs(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  skill_id TEXT,
  round_index INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  model_provider TEXT,
  model_tier TEXT,
  evaluator_id TEXT NOT NULL DEFAULT 'deterministic-contract',
  status TEXT NOT NULL,
  decision TEXT NOT NULL,
  contract_completeness NUMERIC NOT NULL DEFAULT 0,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  present_required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  present_optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  retry_count INTEGER NOT NULL DEFAULT 0,
  escalation_tier TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agentic.quality_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'agentic'
      AND tablename = 'quality_events'
      AND policyname = 'agentic_quality_events_admin'
  ) THEN
    CREATE POLICY agentic_quality_events_admin
      ON agentic.quality_events
      FOR ALL
      USING (agentic.is_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_run
  ON agentic.quality_events(agent_run_id);

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_workflow
  ON agentic.quality_events(workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_step
  ON agentic.quality_events(step_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_tier
  ON agentic.quality_events(model_tier, created_at DESC);

GRANT ALL ON TABLE agentic.quality_events TO authenticated, service_role;
```

### 3. Client Lookup Provenance

File: `supabase/migrations/20260429_client_lookup_provenance.sql`

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS lookup_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS lookup_raw JSONB;

CREATE INDEX IF NOT EXISTS idx_clients_source_provider ON public.clients(source_provider);
CREATE INDEX IF NOT EXISTS idx_clients_source_external_id ON public.clients(source_external_id);

COMMENT ON COLUMN public.clients.source_provider IS 'Lookup/import provider used to create the prospect, such as google_places or manual.';
COMMENT ON COLUMN public.clients.source_external_id IS 'Provider-specific external identifier, such as a Google Places place ID.';
COMMENT ON COLUMN public.clients.source_url IS 'Source URL used for prospect import, such as website, maps URL, or directory URL.';
COMMENT ON COLUMN public.clients.lookup_confidence IS '0-1 confidence score assigned during local business lookup/enrichment.';
COMMENT ON COLUMN public.clients.lookup_raw IS 'Raw normalized lookup payload for audit/debugging.';
```

## Priority 2: Deploy Local Business Lookup

The CRM prospecting UI can run demo lookup locally without deployment. Real Google Places lookup in production requires the Edge Function.

1. Link the Supabase project if needed:

```bash
supabase link --project-ref <project-ref>
```

2. Set the provider secret:

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=<google-places-api-key>
```

3. Deploy the function:

```bash
supabase functions deploy local-business-lookup
```

4. Confirm the function can be invoked by an authenticated app user. The function rejects missing or invalid auth headers by design.

## Priority 3: Redeploy The Frontend

Redeploy the React app after the SQL/function changes.

Required hosted environment variables:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Recommended smoke tests after deploy:

1. Open `/agentic/costs` and confirm actual execution rows can load without schema errors.
2. Open `/agentic/capabilities` and confirm CRM capability rows are listed.
3. Open `/agentic/goals`, enter "Find 40 local law firms around Milwaukee and draft a two-week automation outreach campaign", and confirm the planner selects CRM capabilities.
4. Open Admin -> Prospect Discovery, choose "Supabase Places proxy", search a local business type, and confirm records import with source provider/external id.

## Priority 4: Keep These Code-Only Features In Beta

These pieces are implemented but should be treated as beta until the next deployment pass:

- Website contact extraction currently works as a capability, but production crawling should move into a server-side Edge Function with robots, rate-limit, timeout, and audit controls.
- Campaign worklists are generated artifacts, not persisted campaign entities yet.
- Quality events are persisted after completed runs when the executed DAG is available. Attempt-level retry/escalation telemetry is emitted by the runner and can persist live when the caller supplies `quality.agentRunId`; the Goal Console still creates its run row after execution.
- Cost attribution now prefers actual provider token usage when wrappers expose it; live provider response shapes should be monitored because usage metadata differs by streaming mode and SDK.
- Runtime routing is provider-scoped; a multi-provider credential envelope is still needed before one run can safely route across Claude, Gemini, and ChatGPT.
- The Business Agent Console route is live in the frontend but uses local/demo state until Supabase-backed console queries are wired.
- Connector draft execution is local-first; external send/update actions still need connector credentials, approval UX, and audit persistence before going live.

## Priority 5: Next Tables To Install In A Future Migration

These are not created yet. They are the recommended next SQL surface for turning CRM campaign planning into durable operations:

```sql
CREATE TABLE public.crm_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  audience TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.crm_campaign_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  prospect_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  fit_score INTEGER,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.crm_outreach_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_member_id UUID NOT NULL REFERENCES public.crm_campaign_members(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sequence_day INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  subject TEXT,
  body TEXT,
  approval_id UUID,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.crm_suppression_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  domain TEXT,
  phone TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Do not enable send-side connectors until suppression, approval, and audit logging are in place.

## Verification Commands

Run these locally after install-sensitive changes:

```bash
npm.cmd test
npm.cmd run build
git diff --check
```

Known current caveat: `npm run typecheck` calls `tsc --noEmit`, but this repo currently lacks a usable `tsconfig.json`, so it prints TypeScript help and exits nonzero.
