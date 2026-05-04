-- Firecrawl-backed site evidence layer for SEO/AEO/GEO and LLM Visibility audits

CREATE TABLE IF NOT EXISTS client_site_crawl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  seed_url TEXT NOT NULL,
  firecrawl_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'complete', 'failed', 'cancelled')),
  crawl_limit INTEGER NOT NULL DEFAULT 50,
  max_depth INTEGER NOT NULL DEFAULT 2,
  credits_used INTEGER,
  discovered_url_count INTEGER,
  selected_url_count INTEGER,
  selected_urls JSONB DEFAULT '[]'::jsonb,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_site_page (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id UUID NOT NULL REFERENCES client_site_crawl(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  canonical_url TEXT,
  status_code INTEGER,
  title TEXT,
  description TEXT,
  h1 TEXT,
  page_type TEXT NOT NULL DEFAULT 'other',
  markdown_storage_path TEXT,
  raw_html_storage_path TEXT,
  word_count INTEGER,
  indexability_status TEXT DEFAULT 'unknown',
  seo_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crawl_id, url)
);

CREATE TABLE IF NOT EXISTS client_schema_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES client_site_page(id) ON DELETE CASCADE,
  schema_type TEXT NOT NULL,
  raw_json JSONB,
  detected_entities TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_voice_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  crawl_id UUID NOT NULL REFERENCES client_site_crawl(id) ON DELETE CASCADE,
  tone TEXT,
  differentiators TEXT[] DEFAULT '{}',
  value_props TEXT[] DEFAULT '{}',
  proof_points TEXT[] DEFAULT '{}',
  audiences TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  ctas TEXT[] DEFAULT '{}',
  phrases_to_reuse TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, crawl_id)
);

CREATE TABLE IF NOT EXISTS seo_geo_finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  crawl_id UUID NOT NULL REFERENCES client_site_crawl(id) ON DELETE CASCADE,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 3),
  category TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Site evidence finding',
  page_ids UUID[] DEFAULT '{}',
  evidence TEXT[] DEFAULT '{}',
  recommended_fix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'in_progress', 'done', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_site_crawl ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_site_page ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_schema_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_voice_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_geo_finding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org site crawls" ON client_site_crawl
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view org site crawl pages" ON client_site_page
  FOR ALL USING (crawl_id IN (
    SELECT id FROM client_site_crawl WHERE client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can view org schema items" ON client_schema_item
  FOR ALL USING (page_id IN (
    SELECT id FROM client_site_page WHERE crawl_id IN (
      SELECT id FROM client_site_crawl WHERE client_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  ));

CREATE POLICY "Users can view org voice profiles" ON client_voice_profile
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view org seo geo findings" ON seo_geo_finding
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE INDEX IF NOT EXISTS idx_client_site_crawl_client ON client_site_crawl(client_id);
CREATE INDEX IF NOT EXISTS idx_client_site_crawl_job ON client_site_crawl(job_id);
CREATE INDEX IF NOT EXISTS idx_client_site_page_crawl ON client_site_page(crawl_id);
CREATE INDEX IF NOT EXISTS idx_client_site_page_type ON client_site_page(page_type);
CREATE INDEX IF NOT EXISTS idx_client_schema_item_page ON client_schema_item(page_id);
CREATE INDEX IF NOT EXISTS idx_client_schema_item_type ON client_schema_item(schema_type);
CREATE INDEX IF NOT EXISTS idx_client_voice_profile_client ON client_voice_profile(client_id);
CREATE INDEX IF NOT EXISTS idx_seo_geo_finding_client ON seo_geo_finding(client_id);
CREATE INDEX IF NOT EXISTS idx_seo_geo_finding_crawl ON seo_geo_finding(crawl_id);
