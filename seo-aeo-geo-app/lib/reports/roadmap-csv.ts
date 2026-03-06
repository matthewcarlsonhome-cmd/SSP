import Papa from "papaparse";

type JobData = Record<string, unknown>;

export function generateRoadmapCsv(job: JobData): string {
  const roadmap = job.roadmap as Record<string, unknown>;
  if (!roadmap) return "No roadmap data available";

  const phases = (roadmap.phases || []) as Array<Record<string, unknown>>;
  const rows: Array<Record<string, string>> = [];

  for (const phase of phases) {
    const tasks = (phase.tasks || []) as Array<Record<string, unknown>>;
    for (const task of tasks) {
      rows.push({
        Task: (task.task || "") as string,
        Phase: (phase.name || "") as string,
        Timeframe: (phase.timeframe || "") as string,
        Priority: (task.priority || "medium") as string,
        "Assignee Role": (task.assignee_role || "") as string,
        Status: "To Do",
        "Page/URL": (task.page_url || "") as string,
        Category: (task.category || "") as string,
        "Est. Hours": String(task.estimated_hours || ""),
      });
    }
  }

  return Papa.unparse(rows);
}

export function generateLinkOpportunitiesCsv(job: JobData): string {
  const linkOpps = (job.link_opportunities || []) as Array<Record<string, unknown>>;
  const rows = linkOpps.map((l) => ({
    "Target URL": (l.target_url || "") as string,
    Domain: (l.target_domain || "") as string,
    Type: (l.opportunity_type || "") as string,
    Priority: (l.priority || "") as string,
    "Outreach Approach": (l.outreach_approach || "") as string,
    Status: (l.status || "identified") as string,
  }));

  return Papa.unparse(rows);
}

export function generateCitationTasksCsv(job: JobData): string {
  const citations = (job.citation_tasks || []) as Array<Record<string, unknown>>;
  const rows = citations.map((c) => ({
    Directory: (c.directory_name || "") as string,
    URL: (c.directory_url || "") as string,
    "Current Status": (c.current_status || "") as string,
    "Action Needed": (c.action_needed || "") as string,
    Priority: (c.priority || "") as string,
    Completed: c.completed ? "Yes" : "No",
  }));

  return Papa.unparse(rows);
}
