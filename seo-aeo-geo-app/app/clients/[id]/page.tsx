"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileSearch,
  Globe,
  Loader2,
  MapPin,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

type ClientData = {
  id: string;
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
};

type AuditHistoryItem = {
  id: string;
  status: string;
  progress?: number;
  current_step?: string | null;
  created_at: string;
  completed_at: string | null;
  total_pages_audited: number | null;
  estimated_cost: number | null;
};

type ToolRunCard = {
  toolKey: "firecrawl" | "seo_geo" | "llm_visibility" | "air";
  label: string;
  description: string;
  status: "not_started" | "queued" | "running" | "completed" | "failed" | "needs_review";
  progressPercent: number;
  metrics: Record<string, unknown>;
  errorMessage: string | null;
  updatedAt: string | null;
  sourceId: string | null;
};

type Recommendation = {
  id: string;
  sourceTool: string;
  category: string;
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  description: string | null;
  recommendedFix: string | null;
  status: string;
};

type WorkbenchPayload = {
  client: ClientData;
  audits: AuditHistoryItem[];
  cycle: { id: string; name: string; status: string } | null;
  workbench: {
    summary: {
      overallProgress: number;
      completedTools: number;
      activeTools: number;
      recommendedActions: number;
      latestUpdatedAt: string | null;
    };
    toolRuns: ToolRunCard[];
    firecrawl: {
      crawl: { id: string; status: string; seed_url: string; credits_used: number | null; discovered_url_count: number | null } | null;
      pageCount: number;
      schemaTypes: string[];
      schemaCount: number;
      pages: Array<{
        id: string;
        url: string;
        pageType: string;
        title: string | null;
        h1: string | null;
        wordCount: number | null;
        indexabilityStatus: string | null;
        schemaTypes: string[];
      }>;
      voiceProfile: {
        tone?: string | null;
        services?: string[] | null;
        differentiators?: string[] | null;
        value_props?: string[] | null;
        ctas?: string[] | null;
      } | null;
      findings: Array<{ id: string; title: string; category: string; severity: number; recommended_fix: string }>;
    };
    seoGeo: {
      latestJob: AuditHistoryItem | null;
      pageOptimizations: number;
      roadmapItems: number;
    };
    llmVisibility: {
      latestAudit: { id: string; status: string; created_at: string } | null;
      runCount: number;
      providerCount: number;
      visibilityScore: number | null;
      workbookAverage: number | null;
      mentions: number | null;
    };
    air: {
      latestAudit: { id: string; status: string; tier_id: string } | null;
      composite: number | null;
      band: string | null;
      quickWins: unknown[];
    };
    recommendations: Recommendation[];
  };
};

const TOOL_ICONS = {
  firecrawl: FileSearch,
  seo_geo: Globe,
  llm_visibility: Bot,
  air: Sparkles,
};

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [payload, setPayload] = useState<WorkbenchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const [runningCrawl, setRunningCrawl] = useState(false);

  const client = payload?.client || null;
  const audits = payload?.audits || [];
  const workbench = payload?.workbench || null;

  const loadWorkbench = async () => {
    const response = await fetch(`/api/clients/${clientId}/workbench`, { cache: "no-store" });
    const data = await response.json();
    if (data.client) setPayload(data);
  };

  useEffect(() => {
    loadWorkbench()
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleRunFirecrawl = async () => {
    setRunningCrawl(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/site-crawl/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "standard" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Firecrawl crawl failed");
      await loadWorkbench();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Firecrawl crawl failed");
    } finally {
      setRunningCrawl(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    if (!confirm(`Delete "${client.name}" and all their audits? This cannot be undone.`)) return;
    setDeletingClient(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/clients");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete client");
        setDeletingClient(false);
      }
    } catch {
      alert("Failed to delete client");
      setDeletingClient(false);
    }
  };

  const handleDeleteAudit = async (auditId: string) => {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    setDeletingId(auditId);
    try {
      const res = await fetch(`/api/jobs/${auditId}`, { method: "DELETE" });
      if (res.ok) await loadWorkbench();
    } catch {
      // ignore
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client || !workbench) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <Link href="/clients" className="mt-4 inline-block">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm">
                <Globe className="h-4 w-4" />
                {client.website_url.replace(/^https?:\/\//, "")}
              </span>
              {client.target_geography && (
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {client.target_geography}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleRunFirecrawl} disabled={runningCrawl}>
              {runningCrawl ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
              Run Firecrawl
            </Button>
            <Link href="/audits/new">
              <Button>
                <PlusCircle className="h-4 w-4" />
                New SEO Audit
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleDeleteClient}
              disabled={deletingClient}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deletingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </div>
        </div>
      </div>

      <ClientDetails client={client} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Client Results Dashboard</CardTitle>
              <CardDescription>
                One operating view for Firecrawl evidence, SEO/AEO/GEO, LLM Visibility, AIR readiness, and next-step remediation.
              </CardDescription>
            </div>
            <Badge variant="outline">
              {workbench.summary.latestUpdatedAt ? `Updated ${formatDate(workbench.summary.latestUpdatedAt)}` : "No runs yet"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Overall Progress" value={`${workbench.summary.overallProgress}%`} detail={`${workbench.summary.completedTools}/4 tools complete`} />
            <MetricCard label="Active / Review" value={String(workbench.summary.activeTools)} detail="Tools running or needing QA" />
            <MetricCard label="Open Actions" value={String(workbench.summary.recommendedActions)} detail="Combined optimization backlog" />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {workbench.toolRuns.map((run) => (
              <ToolRunCardView key={run.toolKey} run={run} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Firecrawl Evidence Layer</CardTitle>
                <CardDescription>
                  Stored site crawl data that can safely enrich SEO/AEO/GEO, report writing, LLM scoring, and AIR context.
                </CardDescription>
              </div>
              <Badge variant={workbench.firecrawl.crawl ? "success" : "secondary"}>
                {workbench.firecrawl.crawl ? workbench.firecrawl.crawl.status : "not run"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <SmallMetric label="Pages" value={workbench.firecrawl.pageCount} />
              <SmallMetric label="Schema" value={workbench.firecrawl.schemaCount} />
              <SmallMetric label="Credits" value={workbench.firecrawl.crawl?.credits_used ?? 0} />
              <SmallMetric label="Findings" value={workbench.firecrawl.findings.length} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Client Voice</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {workbench.firecrawl.voiceProfile?.tone || "No crawl-derived tone profile yet."}
                </p>
                <TagList items={workbench.firecrawl.voiceProfile?.services || []} empty="No services detected yet." />
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Schema Types</p>
                <TagList items={workbench.firecrawl.schemaTypes} empty="No schema inventory captured yet." />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Captured Priority Pages</h3>
                <div className="flex flex-wrap gap-2">
                  {workbench.firecrawl.crawl?.id && (
                    <a href={`/api/clients/${clientId}/site-crawl/download?crawlId=${workbench.firecrawl.crawl.id}`}>
                      <Button variant="outline" size="sm">
                        <Download className="h-3.5 w-3.5" />
                        Design ZIP
                      </Button>
                    </a>
                  )}
                  <Link href="/site-crawl">
                    <Button variant="outline" size="sm">Open Crawl Workspace</Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {workbench.firecrawl.pages.length ? (
                  workbench.firecrawl.pages.slice(0, 8).map((page) => (
                    <div key={page.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{page.pageType}</Badge>
                        <span className="text-sm font-medium">{page.title || page.h1 || page.url}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{page.url}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{page.wordCount || 0} words</span>
                        <span>{page.indexabilityStatus || "unknown"}</span>
                        <span>{page.schemaTypes.join(", ") || "no schema"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyMini text="Run Firecrawl to capture sitemap, page, schema, and voice evidence." />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results Snapshot</CardTitle>
            <CardDescription>Latest cross-module signals for this client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SnapshotRow label="SEO/AEO/GEO" value={workbench.seoGeo.latestJob?.status || "not run"} detail={`${workbench.seoGeo.pageOptimizations} page optimizations · ${workbench.seoGeo.roadmapItems} roadmap items`} />
            <SnapshotRow label="LLM Visibility" value={scoreValue(workbench.llmVisibility.visibilityScore)} detail={`${workbench.llmVisibility.runCount} runs · ${workbench.llmVisibility.providerCount} providers`} />
            <SnapshotRow label="Workbook Metric" value={scoreValue(workbench.llmVisibility.workbookAverage)} detail="Simple 0-5 workbook-style average for owner-friendly reporting" />
            <SnapshotRow label="AIR Score" value={scoreValue(workbench.air.composite)} detail={workbench.air.band || "No AIR deliverable yet"} />
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Firecrawl data is used as context for SEO/AEO/GEO and reporting, and as verification context for LLM results. It is not injected into the clean buyer-intent prompts sent to LLM platforms.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Combined Optimization Backlog</CardTitle>
          <CardDescription>
            Prioritized recommendations merged from site crawl findings, SEO/AEO/GEO outputs, LLM Visibility gaps, and AIR quick wins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workbench.recommendations.length ? (
            <div className="space-y-3">
              {workbench.recommendations.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                        <Badge variant="outline">{sourceLabel(item.sourceTool)}</Badge>
                        <span className="text-sm font-semibold">{item.title}</span>
                      </div>
                      {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
                      {item.recommendedFix && <p className="mt-2 text-sm">{item.recommendedFix}</p>}
                    </div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyMini text="Run at least one audit tool to populate the combined action plan." />
          )}
        </CardContent>
      </Card>

      <AuditHistory
        audits={audits}
        deletingId={deletingId}
        onDelete={handleDeleteAudit}
      />

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClientDetails({ client }: { client: ClientData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {client.industry && <SmallCard label="Industry" value={client.industry} />}
      {client.primary_goal && <SmallCard label="Primary Goal" value={client.primary_goal} />}
      {client.gbp_average_rating && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">GBP Rating</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="h-4 w-4 text-warning fill-warning" />
              <span className="font-semibold">{client.gbp_average_rating}</span>
              {client.gbp_review_count && (
                <span className="text-sm text-muted-foreground">({client.gbp_review_count} reviews)</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {client.cms_platform && <SmallCard label="CMS Platform" value={client.cms_platform} />}
    </div>
  );
}

function ToolRunCardView({ run }: { run: ToolRunCard }) {
  const Icon = TOOL_ICONS[run.toolKey];
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm">{run.label}</p>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run.description}</p>
        </div>
      </div>
      <Progress className="mt-4" value={run.progressPercent} />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{run.progressPercent}%</span>
        <span>{run.updatedAt ? formatDate(run.updatedAt) : "not started"}</span>
      </div>
      {run.errorMessage && <p className="mt-2 text-xs text-destructive">{run.errorMessage}</p>}
    </div>
  );
}

function AuditHistory({
  audits,
  deletingId,
  onDelete,
}: {
  audits: AuditHistoryItem[];
  deletingId: string | null;
  onDelete: (auditId: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">SEO/AEO/GEO Audit History</h2>
      {audits.length > 0 ? (
        <div className="space-y-3">
          {audits.map((audit) => (
            <Card key={audit.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{formatDate(audit.created_at)}</span>
                      <Badge variant={audit.status === "completed" ? "success" : audit.status === "failed" ? "destructive" : "default"}>
                        {audit.status === "completed" ? "Completed" : audit.status === "failed" ? "Failed" : "Running"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                      {audit.total_pages_audited && <span>{audit.total_pages_audited} pages</span>}
                      {audit.estimated_cost && <span>${audit.estimated_cost.toFixed(2)} cost</span>}
                      {audit.current_step && <span>{audit.current_step}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {audit.status === "completed" && (
                      <>
                        <Link href={`/audits/${audit.id}/report`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                        <a href={`/api/jobs/${audit.id}/download?format=docx`}>
                          <Button variant="outline" size="sm">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        </a>
                      </>
                    )}
                    {audit.status !== "completed" && audit.status !== "failed" && (
                      <Link href={`/audits/${audit.id}`}>
                        <Button variant="outline" size="sm">View Progress</Button>
                      </Link>
                    )}
                    {(audit.status === "completed" || audit.status === "failed") && (
                      <Link href={`/audits/new?rerun=${audit.id}`}>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-run
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(audit.id)}
                      disabled={deletingId === audit.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No SEO/AEO/GEO audits have been run for this client yet.</p>
            <Link href="/audits/new" className="mt-4 inline-block">
              <Button size="sm">
                <PlusCircle className="h-4 w-4" />
                Run First Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SmallCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SmallMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ToolRunCard["status"] }) {
  if (status === "completed") return <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />Complete</Badge>;
  if (status === "failed") return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Failed</Badge>;
  if (status === "needs_review") return <Badge variant="warning">Review</Badge>;
  if (status === "running") return <Badge variant="default">Running</Badge>;
  if (status === "queued") return <Badge variant="secondary">Queued</Badge>;
  return <Badge variant="outline">Not run</Badge>;
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="mt-3 text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.slice(0, 10).map((item) => (
        <Badge key={item} variant="secondary">{item}</Badge>
      ))}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function scoreValue(value: number | null) {
  if (value === null || value === undefined) return "not run";
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}

function priorityVariant(priority: Recommendation["priority"]) {
  if (priority === "urgent" || priority === "high") return "destructive";
  if (priority === "medium") return "warning";
  return "secondary";
}

function sourceLabel(source: string) {
  if (source === "firecrawl") return "Firecrawl";
  if (source === "seo_geo") return "SEO/AEO/GEO";
  if (source === "llm_visibility") return "LLM";
  if (source === "air") return "AIR";
  return source;
}
