import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

export type AuditJob = {
  id: string;
  client_id: string;
  created_by: string;
  status:
    | "pending"
    | "crawling"
    | "analyzing_competitors"
    | "optimizing_pages"
    | "generating_report"
    | "completed"
    | "failed";
  progress: number;
  current_step: string | null;
  input_brief: Record<string, unknown> | null;
  uploaded_file_path: string | null;
  site_crawl_results: Record<string, unknown> | null;
  competitor_analysis: Record<string, unknown> | null;
  gap_analysis: Record<string, unknown> | null;
  topical_architecture: Record<string, unknown> | null;
  page_optimizations: Record<string, unknown> | null;
  technical_audit: Record<string, unknown> | null;
  offpage_strategy: Record<string, unknown> | null;
  roadmap: Record<string, unknown> | null;
  measurement_framework: Record<string, unknown> | null;
  report_docx_path: string | null;
  report_pdf_path: string | null;
  schema_zip_path: string | null;
  roadmap_csv_path: string | null;
  full_package_zip_path: string | null;
  total_pages_audited: number | null;
  total_tokens_used: number | null;
  estimated_cost: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  organization_id: string;
  name: string;
  website_url: string;
  business_type: string | null;
  industry: string | null;
  target_geography: string | null;
  primary_goal: string | null;
  gbp_url: string | null;
  gbp_review_count: number | null;
  gbp_average_rating: number | null;
  cms_platform: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Mark any jobs stuck in non-terminal states as failed.
 * Called once on first dashboard load to clean up after server restarts.
 */
let _staleJobsCleanedUp = false;
export async function cleanupStaleJobs() {
  if (_staleJobsCleanedUp) return;
  _staleJobsCleanedUp = true;

  const supabase = getServiceClient();
  const staleStatuses = ["pending", "crawling", "analyzing_competitors", "optimizing_pages", "generating_report"];

  // Mark any non-terminal jobs older than 10 minutes as failed
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("audit_jobs")
    .update({
      status: "failed",
      error_message: "Pipeline interrupted — server was restarted. Please re-run this audit.",
      completed_at: new Date().toISOString(),
    })
    .in("status", staleStatuses)
    .lt("created_at", cutoff)
    .select("id");

  if (!error && data?.length) {
    console.log(`[cleanup] Marked ${data.length} stale job(s) as failed: ${data.map(j => j.id).join(", ")}`);
  }
}

export type PageAudit = {
  id: string;
  job_id: string;
  page_url: string;
  page_title: string | null;
  page_type: string | null;
  health_score: number | null;
  cluster_role: string | null;
  primary_keyword: string | null;
  search_intent: string | null;
  current_title_tag: string | null;
  current_meta_description: string | null;
  current_h1: string | null;
  current_word_count: number | null;
  current_schema_types: string[] | null;
  has_answer_block: boolean;
  has_faq_section: boolean;
  optimization_spec: Record<string, unknown> | null;
  generated_schema_code: string | null;
  recommended_title: string | null;
  recommended_meta: string | null;
  recommended_h1: string | null;
  answer_block_text: string | null;
  heading_structure: Record<string, unknown> | null;
  content_requirements: Record<string, unknown> | null;
  internal_linking_plan: Record<string, unknown> | null;
  created_at: string;
};
