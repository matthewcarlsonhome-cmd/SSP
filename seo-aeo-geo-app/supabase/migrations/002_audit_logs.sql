-- Add audit_logs table for real-time streaming log messages during pipeline execution
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  level TEXT DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'success', 'skip')),
  agent TEXT,           -- which agent produced this log
  message TEXT NOT NULL,
  detail TEXT,          -- optional extra detail
  page_url TEXT         -- optional: which page this relates to
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job logs" ON audit_logs
  FOR ALL USING (job_id IN (
    SELECT id FROM audit_jobs WHERE client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

CREATE INDEX idx_audit_logs_job ON audit_logs(job_id, timestamp);

-- Enable real-time for audit_logs so frontend can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
