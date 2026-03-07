"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Code,
  Map,
  Shield,
  Link2,
  Calendar,
  BarChart3,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const tabs = [
  { id: "summary", label: "Executive Summary", icon: FileText },
  { id: "competitors", label: "Competitive Intel", icon: BarChart3 },
  { id: "pages", label: "Page Optimization", icon: TrendingUp },
  { id: "schema", label: "Schema Code", icon: Code },
  { id: "technical", label: "Technical Audit", icon: Shield },
  { id: "offpage", label: "Off-Page Strategy", icon: Link2 },
  { id: "roadmap", label: "Roadmap", icon: Calendar },
  { id: "measurement", label: "Measurement", icon: Map },
];

type PageAudit = {
  id: string;
  page_url: string;
  page_type: string | null;
  health_score: number | null;
  primary_keyword: string | null;
  search_intent: string | null;
  current_title_tag: string | null;
  recommended_title: string | null;
  current_meta_description: string | null;
  recommended_meta: string | null;
  recommended_h1: string | null;
  answer_block_text: string | null;
  generated_schema_code: string | null;
  optimization_spec: Record<string, unknown> | null;
};

type JobData = {
  id: string;
  status: string;
  created_at: string;
  total_pages_audited: number | null;
  site_crawl_results: Record<string, unknown> | null;
  competitor_analysis: Record<string, unknown> | null;
  gap_analysis: Record<string, unknown> | null;
  topical_architecture: Record<string, unknown> | null;
  page_optimizations: unknown[] | null;
  technical_audit: Record<string, unknown> | null;
  offpage_strategy: Record<string, unknown> | null;
  roadmap: Record<string, unknown> | null;
  measurement_framework: Record<string, unknown> | null;
  clients: { id: string; name: string; website_url: string } | null;
  page_audits: PageAudit[];
  link_opportunities: Array<Record<string, unknown>>;
  citation_tasks: Array<Record<string, unknown>>;
};

function ScoreCircle({
  score,
  size = "sm",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const color =
    score >= 80
      ? "text-success"
      : score >= 60
      ? "text-warning"
      : "text-destructive";
  const bg =
    score >= 80
      ? "bg-success/10"
      : score >= 60
      ? "bg-warning/10"
      : "bg-destructive/10";
  const dim = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={`flex items-center justify-center rounded-full ${bg} ${color} ${dim} font-bold`}
    >
      {score}
    </div>
  );
}

function renderJsonSection(
  data: Record<string, unknown> | null,
  title: string
) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No {title.toLowerCase()} data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-sm capitalize">
              {key.replace(/_/g, " ")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeof value === "string" ? (
              <p className="text-sm text-muted-foreground">{value}</p>
            ) : Array.isArray(value) ? (
              <ul className="space-y-2">
                {value.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm p-3 rounded-lg bg-muted/50"
                  >
                    {typeof item === "string"
                      ? item
                      : typeof item === "object" && item !== null
                      ? Object.entries(item as Record<string, unknown>)
                          .map(
                            ([k, v]) =>
                              `${k.replace(/_/g, " ")}: ${String(v)}`
                          )
                          .join(" | ")
                      : String(item)}
                  </li>
                ))}
              </ul>
            ) : typeof value === "object" && value !== null ? (
              <div className="space-y-2">
                {Object.entries(value as Record<string, unknown>).map(
                  ([k, v]) => (
                    <div key={k} className="text-sm">
                      <span className="font-medium capitalize">
                        {k.replace(/_/g, " ")}:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{String(value)}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ReportViewerPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setJob(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Report not found</h2>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const clientName = job.clients?.name || "Client";
  const pages = job.page_audits || [];
  const avgScore =
    pages.length > 0
      ? Math.round(
          pages.reduce((sum, p) => sum + (p.health_score || 0), 0) /
            pages.length
        )
      : 0;

  const competitors = (
    job.competitor_analysis as { competitors?: Array<Record<string, unknown>> }
  )?.competitors;

  const roadmap = job.roadmap as Record<string, unknown> | null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{clientName}</h1>
            <p className="mt-1 text-muted-foreground">
              SEO/AEO/GEO Optimization Report &middot;{" "}
              {formatDate(job.created_at)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href={`/api/jobs/${jobId}/download?format=docx`}>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Download DOCX
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=schema`}>
              <Button>
                <Download className="h-4 w-4" />
                Schema Package (.zip)
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Average Health Score
                </p>
                <div className="flex justify-center">
                  <ScoreCircle score={avgScore} size="lg" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across {pages.length} pages
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Pages Audited
                </p>
                <div className="flex items-center justify-center h-16">
                  <span className="text-4xl font-bold text-foreground">
                    {job.total_pages_audited || pages.length}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Competitors Analyzed
                </p>
                <div className="flex items-center justify-center h-16">
                  <span className="text-4xl font-bold text-foreground">
                    {competitors?.length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {job.site_crawl_results && (
            <Card>
              <CardHeader>
                <CardTitle>Site Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {renderJsonSection(
                  (job.site_crawl_results as { site_overview?: Record<string, unknown> })
                    ?.site_overview || null,
                  "site overview"
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Competitors Tab */}
      {activeTab === "competitors" && (
        <div className="space-y-4">
          {competitors && competitors.length > 0 ? (
            competitors.map((comp, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {(comp.name as string) || `Competitor ${i + 1}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {comp.url as string}
                      </p>
                    </div>
                    {comp.review_count ? (
                      <Badge variant="secondary">
                        {String(comp.review_count)} reviews
                      </Badge>
                    ) : null}
                  </div>
                  {Array.isArray(comp.strengths) && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Strengths
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(comp.strengths as string[]).map((s, j) => (
                          <Badge key={j} variant="success">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(comp.weaknesses) && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Weaknesses
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(comp.weaknesses as string[]).map((w, j) => (
                          <Badge key={j} variant="destructive">
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No competitor data available.
                </p>
              </CardContent>
            </Card>
          )}

          {job.gap_analysis &&
            renderJsonSection(
              job.gap_analysis as Record<string, unknown>,
              "Gap Analysis"
            )}
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === "pages" && (
        <div className="space-y-3">
          {pages.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Title Tag Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground pr-4">
                          Page
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground pr-4">
                          Current
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground">
                          Recommended
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pages.map((page) => (
                        <tr key={page.id}>
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">
                            {page.page_url}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {page.current_title_tag || (
                              <span className="italic text-destructive/60">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-foreground">
                            {page.recommended_title || "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="p-0">
                <button
                  onClick={() =>
                    setExpandedPage(
                      expandedPage === page.page_url ? null : page.page_url
                    )
                  }
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {page.health_score !== null && (
                      <ScoreCircle score={page.health_score} />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">
                          {page.page_url}
                        </h3>
                        {page.page_type && (
                          <Badge variant="secondary">{page.page_type}</Badge>
                        )}
                      </div>
                      {page.primary_keyword && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Keyword: {page.primary_keyword}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {page.search_intent && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {page.search_intent}
                      </span>
                    )}
                    {expandedPage === page.page_url ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedPage === page.page_url && (
                  <div className="border-t p-5 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Current Title
                        </p>
                        <p className="text-sm p-2 rounded bg-destructive/5">
                          {page.current_title_tag || (
                            <span className="italic text-destructive">
                              Missing
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Recommended Title
                          </p>
                          {page.recommended_title && (
                            <button
                              onClick={() =>
                                handleCopy(
                                  page.recommended_title!,
                                  `title-${page.id}`
                                )
                              }
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {copied === `title-${page.id}` ? (
                                <>
                                  <Check className="h-3 w-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-sm p-2 rounded bg-success/5">
                          {page.recommended_title || "\u2014"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Current Meta
                        </p>
                        <p className="text-sm p-2 rounded bg-destructive/5">
                          {page.current_meta_description || (
                            <span className="italic text-destructive">
                              Missing
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Recommended Meta
                          </p>
                          {page.recommended_meta && (
                            <button
                              onClick={() =>
                                handleCopy(
                                  page.recommended_meta!,
                                  `meta-${page.id}`
                                )
                              }
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {copied === `meta-${page.id}` ? (
                                <>
                                  <Check className="h-3 w-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-sm p-2 rounded bg-success/5">
                          {page.recommended_meta || "\u2014"}
                        </p>
                      </div>
                    </div>

                    {page.answer_block_text && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Answer Block
                        </p>
                        <p className="text-sm p-3 rounded bg-muted/50 whitespace-pre-wrap">
                          {page.answer_block_text}
                        </p>
                      </div>
                    )}

                    {page.generated_schema_code && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Schema Code
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(
                                page.generated_schema_code!,
                                `schema-${page.id}`
                              )
                            }
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {copied === `schema-${page.id}` ? (
                              <>
                                <Check className="h-3 w-3" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono">
                          {page.generated_schema_code}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {pages.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No page audit data available.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Schema Tab */}
      {activeTab === "schema" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Schema Code</CardTitle>
                <a href={`/api/jobs/${jobId}/download?format=schema`}>
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5" />
                    Download All (.zip)
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Ready-to-paste JSON-LD structured data for each page.
              </p>
              {pages.filter((p) => p.generated_schema_code).length > 0 ? (
                pages
                  .filter((p) => p.generated_schema_code)
                  .map((page) => (
                    <div key={page.id} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">
                          {page.page_url}
                        </h4>
                        <button
                          onClick={() =>
                            handleCopy(
                              page.generated_schema_code!,
                              `schema-tab-${page.id}`
                            )
                          }
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {copied === `schema-tab-${page.id}` ? (
                            <>
                              <Check className="h-3 w-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono">
                        {page.generated_schema_code}
                      </pre>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No schema code generated yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Technical Tab */}
      {activeTab === "technical" &&
        renderJsonSection(
          job.technical_audit as Record<string, unknown> | null,
          "Technical Audit"
        )}

      {/* Off-Page Tab */}
      {activeTab === "offpage" && (
        <div className="space-y-6">
          {renderJsonSection(
            job.offpage_strategy as Record<string, unknown> | null,
            "Off-Page Strategy"
          )}

          {job.link_opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Link Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {job.link_opportunities.map((link, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {(link.target_domain as string) ||
                            (link.target_url as string)}
                        </p>
                        {typeof link.outreach_approach === "string" && link.outreach_approach && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {link.outreach_approach}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {link.opportunity_type as string}
                        </Badge>
                        <Badge
                          variant={
                            link.priority === "high"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {link.priority as string}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {job.citation_tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Citation Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {job.citation_tasks.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {task.directory_name as string}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.action_needed as string}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {task.current_status as string}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Roadmap Tab */}
      {activeTab === "roadmap" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div />
            <a href={`/api/jobs/${jobId}/download?format=csv`}>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </a>
          </div>
          {renderJsonSection(roadmap, "Roadmap")}
        </div>
      )}

      {/* Measurement Tab */}
      {activeTab === "measurement" &&
        renderJsonSection(
          job.measurement_framework as Record<string, unknown> | null,
          "Measurement Framework"
        )}
    </div>
  );
}
