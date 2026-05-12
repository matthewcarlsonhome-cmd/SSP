import { INTAKE_HELPERS } from "@/lib/air/copy/intake-helpers";

const sections = [
  ["Public data", "Auto-completed for Snapshot. Firecrawl-backed ingestion will populate this area as the SEO/AEO/GEO evidence layer expands."],
  ["CRM audit", INTAKE_HELPERS.crm_audit_upload],
  ["Tool inventory", INTAKE_HELPERS.tool_inventory],
  ["Stakeholder interviews", INTAKE_HELPERS.interview_owner],
  ["Workflow swimlanes", INTAKE_HELPERS.workflow_swimlane],
  ["Report samples", "Upload examples of current reports to judge automation and reporting maturity."],
];

export default function AirIntakePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">AIR Intake Workspace</h1>
      <p className="mt-2 text-muted-foreground">
        Full AIR Audit intake captures the private operational evidence that public Snapshot scoring cannot see.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map(([title, body]) => (
          <section key={title} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Structured save endpoints for this section are reserved for the next AIR milestone.
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
