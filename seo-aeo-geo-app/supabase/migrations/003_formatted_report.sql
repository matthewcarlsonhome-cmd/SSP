-- Add formatted_report column for Agent 5's polished Markdown output
ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS formatted_report TEXT;
