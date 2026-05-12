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
  BookOpen,
  Globe,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
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
  { id: "formatted", label: "Full Report", icon: BookOpen },
  { id: "summary", label: "Executive Summary", icon: FileText },
  { id: "crawl", label: "Site Crawl", icon: Globe },
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
  formatted_report: string | null;
  site_crawl_results: Record<string, unknown> | null;
  competitor_analysis: Record<string, unknown> | null;
  gap_analysis: Record<string, unknown> | null;
  topical_architecture: Record<string, unknown> | null;
  page_optimizations: unknown[] | null;
  technical_audit: Record<string, unknown> | null;
  offpage_strategy: Record<string, unknown> | null;
  roadmap: Record<string, unknown> | null;
  measurement_framework: Record<string, unknown> | null;
  input_brief: Record<string, unknown> | null;
  clients: { id: string; name: string; website_url: string } | null;
  page_audits: PageAudit[];
  link_opportunities: Array<Record<string, unknown>>;
  citation_tasks: Array<Record<string, unknown>>;
  site_crawls?: Array<{
    id: string;
    seed_url: string;
    status: string;
    crawl_limit: number;
    max_depth: number;
    credits_used: number | null;
    discovered_url_count: number | null;
    selected_url_count: number | null;
    client_site_page?: Array<{
      id: string;
      url: string;
      title: string | null;
      page_type: string;
      word_count: number | null;
      indexability_status: string | null;
      client_schema_item?: Array<{ id: string; schema_type: string; warnings: string[] | null }>;
    }>;
    client_voice_profile?: Array<Record<string, unknown>>;
    seo_geo_finding?: Array<Record<string, unknown>>;
  }>;
};

// ─── Utility Components ───

function ScoreCircle({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const bg = score >= 80 ? "bg-success/10" : score >= 60 ? "bg-warning/10" : "bg-destructive/10";
  const dim = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";
  return (
    <div className={`flex items-center justify-center rounded-full ${bg} ${color} ${dim} font-bold`}>
      {score}
    </div>
  );
}

function CharCount({ text, limit }: { text: string | null | undefined; limit: number }) {
  if (!text) return <span className="text-xs text-destructive">(missing)</span>;
  const len = text.length;
  const over = len > limit;
  return (
    <span className={`text-xs font-mono ${over ? "text-destructive font-bold" : "text-muted-foreground"}`}>
      {len}/{limit} chars{over ? " ⚠️ OVER LIMIT" : ""}
    </span>
  );
}

function CopyButton({ text, id, copied, onCopy }: { text: string; id: string; copied: string | null; onCopy: (text: string, id: string) => void }) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="text-xs text-primary hover:underline flex items-center gap-1"
    >
      {copied === id ? (
        <><Check className="h-3 w-3" /> Copied</>
      ) : (
        <><Copy className="h-3 w-3" /> Copy</>
      )}
    </button>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asText(value: unknown, fallback = "No data"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function severityLabel(value: unknown) {
  if (value === 3 || value === "3" || value === "critical") return "critical";
  if (value === 2 || value === "2" || value === "high") return "high";
  return "info";
}

// ─── Simple Markdown Renderer ───

function SimpleMarkdown({ content }: { content: string }) {
  // Convert Markdown to HTML-like rendering using simple splits
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono my-3">
            {codeBlockContent.join("\n")}
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-bold mt-8 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-6 mb-3 border-b pb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-semibold mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(5)}</h4>);
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-6 border-border" />);
    }
    // Table
    else if (line.startsWith("|")) {
      // Collect all table lines
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      i = j - 1;

      // Parse table
      const headerCells = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
      const dataRows = tableLines.slice(2); // skip header and separator

      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="border border-border px-3 py-2 text-left font-medium text-muted-foreground">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = row.split("|").filter(c => c.trim()).map(c => c.trim());
                return (
                  <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                    {cells.map((cell, ci) => (
                      <td key={ci} className="border border-border px-3 py-2">
                        <InlineMarkdown text={cell} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    // Blockquote
    else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-primary/30 pl-4 py-2 my-3 italic bg-primary/5 rounded-r-lg">
          <InlineMarkdown text={line.slice(2)} />
        </blockquote>
      );
    }
    // List items
    else if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const text = line.replace(/^\s*[-*]\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 my-1" style={{ paddingLeft: `${indent * 4 + 8}px` }}>
          <span className="text-muted-foreground shrink-0">•</span>
          <span className="text-sm"><InlineMarkdown text={text} /></span>
        </div>
      );
    }
    // Numbered list
    else if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)/);
      if (match) {
        const indent = match[1].length;
        elements.push(
          <div key={i} className="flex gap-2 my-1" style={{ paddingLeft: `${indent * 4 + 8}px` }}>
            <span className="text-muted-foreground shrink-0 font-mono text-xs mt-0.5">{match[2]}.</span>
            <span className="text-sm"><InlineMarkdown text={match[3]} /></span>
          </div>
        );
      }
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} className="text-sm my-1"><InlineMarkdown text={line} /></p>);
    }
  }

  return <div className="space-y-0">{elements}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle inline formatting: bold, italic, code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find the earliest match
    const matches = [
      boldMatch ? { type: "bold", index: remaining.indexOf(boldMatch[0]), match: boldMatch } : null,
      codeMatch ? { type: "code", index: remaining.indexOf(codeMatch[0]), match: codeMatch } : null,
      linkMatch ? { type: "link", index: remaining.indexOf(linkMatch[0]), match: linkMatch } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      // Handle italic for remaining text
      const italicParts = remaining.split(/\*([^*]+)\*/);
      for (let j = 0; j < italicParts.length; j++) {
        if (j % 2 === 1) {
          parts.push(<em key={key++}>{italicParts[j]}</em>);
        } else if (italicParts[j]) {
          parts.push(<span key={key++}>{italicParts[j]}</span>);
        }
      }
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold">{first.match![1]}</strong>);
      remaining = remaining.slice(first.index + first.match![0].length);
    } else if (first.type === "code") {
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{first.match![1]}</code>);
      remaining = remaining.slice(first.index + first.match![0].length);
    } else if (first.type === "link") {
      parts.push(
        <a key={key++} href={first.match![2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
          {first.match![1]}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
      remaining = remaining.slice(first.index + first.match![0].length);
    }
  }

  return <>{parts}</>;
}

// ─── Main Component ───

export default function ReportViewerPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("formatted");
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setJob(data);
          // Default to summary if no formatted report
          if (!data.formatted_report) {
            setActiveTab("summary");
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const togglePage = (url: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
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
  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + (p.health_score || 0), 0) / pages.length)
    : 0;
  const competitors = (job.competitor_analysis as { competitors?: Array<Record<string, unknown>> })?.competitors;
  const pageOpts = (job.page_optimizations || []) as Array<Record<string, unknown>>;
  const roadmap = job.roadmap as Record<string, unknown> | null;
  const offpage = job.offpage_strategy as Record<string, unknown> | null;
  const techAudit = job.technical_audit as Record<string, unknown> | null;
  const measurement = job.measurement_framework as Record<string, unknown> | null;
  const siteCrawl = job.site_crawls?.[0];
  const siteCrawlPages = siteCrawl?.client_site_page || [];
  const schemaItemCount = siteCrawlPages.reduce((sum, page) => sum + (page.client_schema_item?.length || 0), 0);
  const voiceProfile = siteCrawl?.client_voice_profile?.[0];
  const seoGeoFindings = siteCrawl?.seo_geo_finding || [];

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
              SEO/AEO/GEO Optimization Report &middot; {formatDate(job.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <a href={`/api/jobs/${jobId}/download?format=markdown`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Markdown
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=docx`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                DOCX
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=pdf`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=schema`}>
              <Button size="sm">
                <Download className="h-4 w-4" />
                Schema (.zip)
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=csv`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Roadmap CSV
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=links-csv`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Links CSV
              </Button>
            </a>
            <a href={`/api/jobs/${jobId}/download?format=citations-csv`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Citations CSV
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          // Hide formatted tab if no formatted report
          if (tab.id === "formatted" && !job.formatted_report) return null;
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

      {/* ─── Formatted Report Tab (Agent 5 output) ─── */}
      {activeTab === "formatted" && job.formatted_report && (
        <Card>
          <CardContent className="p-6 sm:p-8 max-w-none prose-sm">
            <SimpleMarkdown content={job.formatted_report} />
          </CardContent>
        </Card>
      )}

      {/* Site Crawl Tab */}
      {activeTab === "crawl" && (
        <div className="space-y-6">
          {siteCrawl ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="text-center">
                  <CardContent className="py-6">
                    <p className="text-sm text-muted-foreground">Captured Pages</p>
                    <p className="mt-2 text-3xl font-bold">{siteCrawlPages.length}</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="py-6">
                    <p className="text-sm text-muted-foreground">Discovered URLs</p>
                    <p className="mt-2 text-3xl font-bold">{siteCrawl.discovered_url_count || "No data"}</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="py-6">
                    <p className="text-sm text-muted-foreground">Schema Items</p>
                    <p className="mt-2 text-3xl font-bold">{schemaItemCount}</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="py-6">
                    <p className="text-sm text-muted-foreground">Credits Used</p>
                    <p className="mt-2 text-3xl font-bold">{siteCrawl.credits_used || "Pending"}</p>
                  </CardContent>
                </Card>
              </div>

              {voiceProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Client Voice Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <p className="text-sm font-medium">Tone</p>
                      <p className="mt-1 text-sm text-muted-foreground">{asText(voiceProfile.tone)}</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium">Services Found</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {asStringArray(voiceProfile.services).slice(0, 18).map((service) => (
                            <Badge key={service} variant="secondary">{service}</Badge>
                          ))}
                          {asStringArray(voiceProfile.services).length === 0 && (
                            <span className="text-sm text-muted-foreground">No services detected.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Proof Points</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {asStringArray(voiceProfile.proof_points).slice(0, 5).map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                          {asStringArray(voiceProfile.proof_points).length === 0 && <li>No proof points detected.</li>}
                        </ul>
                      </div>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium">Value Props</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {asStringArray(voiceProfile.value_props).slice(0, 5).map((prop) => (
                            <li key={prop}>{prop}</li>
                          ))}
                          {asStringArray(voiceProfile.value_props).length === 0 && <li>No value props detected.</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium">CTAs Found</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {asStringArray(voiceProfile.ctas).slice(0, 8).map((cta) => (
                            <Badge key={cta} variant="outline">{cta}</Badge>
                          ))}
                          {asStringArray(voiceProfile.ctas).length === 0 && (
                            <span className="text-sm text-muted-foreground">No CTAs detected.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {seoGeoFindings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>SEO/AEO/GEO Evidence Findings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {seoGeoFindings.map((finding, index) => (
                        <div key={String(finding.id || index)} className="rounded-lg border p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={severityLabel(finding.severity) === "critical" ? "destructive" : "secondary"}>
                              {severityLabel(finding.severity)}
                            </Badge>
                            <Badge variant="outline">{asText(finding.category)}</Badge>
                            <p className="font-medium">{asText(finding.title)}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{asText(finding.evidence)}</p>
                          <p className="mt-2 text-sm">
                            <span className="font-medium">Recommended fix: </span>
                            {asText(finding.recommended_fix)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Firecrawl Page Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  {siteCrawlPages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-3 text-left font-medium text-muted-foreground">Page</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Type</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Words</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Indexability</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Schema</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {siteCrawlPages.map((page) => (
                            <tr key={page.id}>
                              <td className="py-3">
                                <a
                                  href={page.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-primary hover:underline"
                                >
                                  {page.title || page.url}
                                </a>
                                <div className="max-w-xl truncate text-xs text-muted-foreground">{page.url}</div>
                              </td>
                              <td className="py-3"><Badge variant="secondary">{page.page_type}</Badge></td>
                              <td className="py-3 text-muted-foreground">{page.word_count || 0}</td>
                              <td className="py-3 text-muted-foreground">{page.indexability_status || "unknown"}</td>
                              <td className="py-3">
                                {page.client_schema_item && page.client_schema_item.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {page.client_schema_item.map((item) => (
                                      <Badge key={item.id} variant={item.warnings?.length ? "outline" : "secondary"}>
                                        {item.schema_type}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No pages were stored for this crawl.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Globe className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-lg font-semibold">No Firecrawl site evidence yet</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  Enable Site Crawl on the new audit form to map the website, crawl the priority pages,
                  parse schema and page evidence, and feed that evidence into the SEO/AEO/GEO report.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Summary Tab ─── */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">Average Health Score</p>
                <div className="flex justify-center">
                  <ScoreCircle score={avgScore} size="lg" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Across {pages.length} pages</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">Pages Audited</p>
                <div className="flex items-center justify-center h-16">
                  <span className="text-4xl font-bold text-foreground">{job.total_pages_audited || pages.length}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">Competitors Analyzed</p>
                <div className="flex items-center justify-center h-16">
                  <span className="text-4xl font-bold text-foreground">{competitors?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Page Health Summary Table */}
          {pages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Page Health Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-left font-medium text-muted-foreground">Score</th>
                        <th className="pb-3 text-left font-medium text-muted-foreground">Page</th>
                        <th className="pb-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="pb-3 text-left font-medium text-muted-foreground">Keyword</th>
                        <th className="pb-3 text-left font-medium text-muted-foreground">Intent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pages.sort((a, b) => (a.health_score || 0) - (b.health_score || 0)).map((page) => (
                        <tr key={page.id}>
                          <td className="py-2.5">
                            {page.health_score !== null && <ScoreCircle score={page.health_score} />}
                          </td>
                          <td className="py-2.5 font-medium">{page.page_url}</td>
                          <td className="py-2.5"><Badge variant="secondary">{page.page_type || "—"}</Badge></td>
                          <td className="py-2.5 text-muted-foreground">{page.primary_keyword || "—"}</td>
                          <td className="py-2.5 text-muted-foreground">{page.search_intent || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Competitors Tab ─── */}
      {activeTab === "competitors" && (
        <div className="space-y-6">
          {competitors && competitors.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Competitor Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-3 text-left font-medium text-muted-foreground">Competitor</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Reviews</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Rating</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Est. Pages</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Blog Freq.</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Schema</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {competitors.map((comp, i) => (
                          <tr key={i}>
                            <td className="py-2.5">
                              <div className="font-medium">{comp.name as string}</div>
                              <div className="text-xs text-muted-foreground">{comp.url as string}</div>
                            </td>
                            <td className="py-2.5">{comp.review_count?.toString() || "—"}</td>
                            <td className="py-2.5">{comp.average_rating ? `${comp.average_rating}/5` : "—"}</td>
                            <td className="py-2.5">{comp.indexed_pages_estimate?.toString() || "—"}</td>
                            <td className="py-2.5">{(comp.blog_frequency as string) || "—"}</td>
                            <td className="py-2.5">
                              {Array.isArray(comp.schema_types) && (comp.schema_types as string[]).length > 0
                                ? (comp.schema_types as string[]).map((s, j) => <Badge key={j} variant="secondary" className="mr-1 mb-1">{s}</Badge>)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {competitors.map((comp, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{comp.name as string}</h3>
                        <p className="text-sm text-muted-foreground">{comp.url as string}</p>
                      </div>
                      {comp.review_count ? <Badge variant="secondary">{String(comp.review_count)} reviews</Badge> : null}
                    </div>
                    {Array.isArray(comp.strengths) && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                        <div className="flex flex-wrap gap-1">
                          {(comp.strengths as string[]).map((s, j) => <Badge key={j} variant="success">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    {Array.isArray(comp.weaknesses) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Weaknesses</p>
                        <div className="flex flex-wrap gap-1">
                          {(comp.weaknesses as string[]).map((w, j) => <Badge key={j} variant="destructive">{w}</Badge>)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm text-muted-foreground">No competitor data available.</p>
              </CardContent>
            </Card>
          )}

          {/* Gap Analysis */}
          {job.gap_analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Gap Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(job.gap_analysis as Record<string, unknown>).map(([gapType, gapData]) => (
                  <div key={gapType}>
                    <h4 className="text-sm font-semibold mb-2 capitalize">{gapType.replace(/_/g, " ")}</h4>
                    {Array.isArray(gapData) && gapData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              {typeof gapData[0] === "object" && gapData[0] !== null &&
                                Object.keys(gapData[0] as Record<string, unknown>).map(k => (
                                  <th key={k} className="pb-2 text-left font-medium text-muted-foreground pr-3 capitalize">
                                    {k.replace(/_/g, " ")}
                                  </th>
                                ))
                              }
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {gapData.slice(0, 10).map((item, idx) => (
                              <tr key={idx}>
                                {typeof item === "object" && item !== null &&
                                  Object.values(item as Record<string, unknown>).map((v, vi) => (
                                    <td key={vi} className="py-1.5 pr-3 text-sm">
                                      {typeof v === "boolean" ? (v ? "✅" : "❌") : String(v ?? "—")}
                                    </td>
                                  ))
                                }
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : typeof gapData === "object" && gapData !== null ? (
                      <div className="space-y-1">
                        {Object.entries(gapData as Record<string, unknown>).map(([k, v]) => (
                          <p key={k} className="text-sm">
                            <span className="font-medium capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                            <span className="text-muted-foreground">{String(v)}</span>
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Pages Tab ─── */}
      {activeTab === "pages" && (
        <div className="space-y-3">
          {/* Title Tag Summary Table */}
          {pages.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Title Tag & Meta Description Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground pr-4">Page</th>
                        <th className="pb-3 font-medium text-muted-foreground pr-4">Current Title</th>
                        <th className="pb-3 font-medium text-muted-foreground pr-4">Chars</th>
                        <th className="pb-3 font-medium text-muted-foreground pr-4">Recommended Title</th>
                        <th className="pb-3 font-medium text-muted-foreground">Chars</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pages.map((page) => (
                        <tr key={page.id}>
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">{page.page_url}</td>
                          <td className="py-3 pr-4 text-muted-foreground text-xs">{page.current_title_tag || <span className="italic text-destructive">Missing</span>}</td>
                          <td className="py-3 pr-4"><CharCount text={page.current_title_tag} limit={60} /></td>
                          <td className="py-3 pr-4 text-xs">{page.recommended_title || "—"}</td>
                          <td className="py-3"><CharCount text={page.recommended_title} limit={60} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Page Cards */}
          {pages.map((page) => {
            const isExpanded = expandedPages.has(page.page_url);
            const opt = pageOpts.find(o => o.url === page.page_url);
            const schemaCode = opt?.schema_code as Array<{ type: string; json_ld: string }> | undefined;
            const headings = opt?.heading_structure as Array<{ level: string; text: string; direct_answer?: string; content_guidance?: string }> | undefined;
            const contentReqs = opt?.content_requirements as Record<string, unknown> | undefined;
            const internalLinks = opt?.internal_linking as { link_to_this_page?: Array<Record<string, unknown>>; link_from_this_page?: Array<Record<string, unknown>> } | undefined;
            const faqQuestions = contentReqs?.faq_questions as Array<{ question: string; answer: string }> | undefined;
            const eeat = opt?.eeat_signals as Record<string, unknown> | undefined;

            return (
              <Card key={page.id}>
                <CardContent className="p-0">
                  <button
                    onClick={() => togglePage(page.page_url)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {page.health_score !== null && <ScoreCircle score={page.health_score} />}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{page.page_url}</h3>
                          {page.page_type && <Badge variant="secondary">{page.page_type}</Badge>}
                        </div>
                        {page.primary_keyword && (
                          <p className="text-xs text-muted-foreground mt-0.5">Keyword: {page.primary_keyword} | Intent: {page.search_intent || "—"}</p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t p-5 space-y-5">
                      {/* Step 1: Title Tag */}
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="default">Step 1</Badge>
                          <span className="text-sm font-semibold">Title Tag</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-muted-foreground">Current</p>
                              <CharCount text={page.current_title_tag} limit={60} />
                            </div>
                            <p className="text-sm p-2 rounded bg-destructive/5 font-mono text-xs">
                              {page.current_title_tag || <span className="italic text-destructive">Missing</span>}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-muted-foreground">Change to</p>
                              <div className="flex items-center gap-2">
                                <CharCount text={page.recommended_title} limit={60} />
                                {page.recommended_title && <CopyButton text={page.recommended_title} id={`title-${page.id}`} copied={copied} onCopy={handleCopy} />}
                              </div>
                            </div>
                            <p className="text-sm p-2 rounded bg-success/5 font-mono text-xs">{page.recommended_title || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Meta Description */}
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="default">Step 2</Badge>
                          <span className="text-sm font-semibold">Meta Description</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-muted-foreground">Current</p>
                              <CharCount text={page.current_meta_description} limit={155} />
                            </div>
                            <p className="text-sm p-2 rounded bg-destructive/5 font-mono text-xs">
                              {page.current_meta_description || <span className="italic text-destructive">Missing</span>}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-muted-foreground">Change to</p>
                              <div className="flex items-center gap-2">
                                <CharCount text={page.recommended_meta} limit={155} />
                                {page.recommended_meta && <CopyButton text={page.recommended_meta} id={`meta-${page.id}`} copied={copied} onCopy={handleCopy} />}
                              </div>
                            </div>
                            <p className="text-sm p-2 rounded bg-success/5 font-mono text-xs">{page.recommended_meta || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: H1 Tag */}
                      {page.recommended_h1 && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Step 3</Badge>
                            <span className="text-sm font-semibold">H1 Tag</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-mono">{page.recommended_h1}</p>
                            <CopyButton text={page.recommended_h1} id={`h1-${page.id}`} copied={copied} onCopy={handleCopy} />
                          </div>
                        </div>
                      )}

                      {/* Step 4: Answer Block */}
                      {page.answer_block_text && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">Step 4</Badge>
                              <span className="text-sm font-semibold">Answer Block</span>
                              <span className="text-xs text-muted-foreground">
                                ({page.answer_block_text.split(/\s+/).length} words)
                              </span>
                            </div>
                            <CopyButton text={page.answer_block_text} id={`answer-${page.id}`} copied={copied} onCopy={handleCopy} />
                          </div>
                          <blockquote className="border-l-4 border-primary/30 pl-4 py-2 italic bg-primary/5 rounded-r-lg text-sm">
                            {page.answer_block_text}
                          </blockquote>
                          <p className="text-xs text-muted-foreground mt-2">Paste this as the first paragraph after the H1 tag.</p>
                        </div>
                      )}

                      {/* Step 5: Heading Structure */}
                      {headings && headings.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Step 5</Badge>
                            <span className="text-sm font-semibold">Heading Structure</span>
                          </div>
                          <div className="space-y-1">
                            {headings.map((h, idx) => (
                              <div key={idx} className={`text-sm ${h.level === "h3" ? "ml-6" : ""}`}>
                                <span className="font-mono text-xs text-primary mr-2">{h.level.toUpperCase()}</span>
                                <span className="font-medium">{h.text}</span>
                                {h.direct_answer && <p className="ml-8 text-xs text-muted-foreground italic mt-0.5">{h.direct_answer}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 6: FAQ */}
                      {faqQuestions && faqQuestions.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Step 6</Badge>
                            <span className="text-sm font-semibold">FAQ Section</span>
                          </div>
                          <div className="space-y-3">
                            {faqQuestions.map((faq, idx) => (
                              <div key={idx} className="bg-background rounded-lg p-3">
                                <p className="text-sm font-semibold">Q: {faq.question}</p>
                                <p className="text-sm text-muted-foreground mt-1">A: {faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 7: Schema Code */}
                      {schemaCode && schemaCode.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Step 7</Badge>
                            <span className="text-sm font-semibold">Schema Markup</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">Add each of these to the page &lt;head&gt; section:</p>
                          {schemaCode.map((schema, idx) => {
                            let formatted: string;
                            try {
                              formatted = JSON.stringify(JSON.parse(schema.json_ld), null, 2);
                            } catch {
                              formatted = schema.json_ld;
                            }
                            const fullCode = `<script type="application/ld+json">\n${formatted}\n</script>`;
                            return (
                              <div key={idx} className="mb-4 last:mb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="secondary">{schema.type}</Badge>
                                  <CopyButton text={fullCode} id={`schema-${page.id}-${idx}`} copied={copied} onCopy={handleCopy} />
                                </div>
                                <pre className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                                  {fullCode}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Step 8: Internal Links */}
                      {internalLinks && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Step 8</Badge>
                            <span className="text-sm font-semibold">Internal Links</span>
                          </div>
                          {internalLinks.link_from_this_page && internalLinks.link_from_this_page.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Add links FROM this page to:</p>
                              {internalLinks.link_from_this_page.map((link, idx) => (
                                <p key={idx} className="text-sm ml-4">→ <strong>{link.to as string}</strong> with anchor text: <code className="px-1 py-0.5 bg-muted rounded text-xs">{link.anchor_text as string}</code></p>
                              ))}
                            </div>
                          )}
                          {internalLinks.link_to_this_page && internalLinks.link_to_this_page.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Add links TO this page from:</p>
                              {internalLinks.link_to_this_page.map((link, idx) => (
                                <p key={idx} className="text-sm ml-4">← <strong>{link.from as string}</strong> with anchor text: <code className="px-1 py-0.5 bg-muted rounded text-xs">{link.anchor_text as string}</code></p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content Requirements */}
                      {contentReqs && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Step 9</Badge>
                            <span className="text-sm font-semibold">Content Requirements</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            {contentReqs.target_word_count ? <p>Target word count: <strong>{String(contentReqs.target_word_count)}</strong> words</p> : null}
                            {contentReqs.comparison_table ? <p>Add comparison table: {String(contentReqs.comparison_table)}</p> : null}
                            {contentReqs.author_byline ? <p>Author byline: {String(contentReqs.author_byline)}</p> : null}
                            {contentReqs.unique_experience ? <p>Unique experience: {String(contentReqs.unique_experience)}</p> : null}
                            {Array.isArray(contentReqs.statistics_needed) && (contentReqs.statistics_needed as string[]).length > 0 && (
                              <p>Statistics to include: {(contentReqs.statistics_needed as string[]).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* E-E-A-T Signals */}
                      {eeat && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary">E-E-A-T</Badge>
                            <span className="text-sm font-semibold">Trust Signals to Add</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            {eeat.author ? <p><strong>Author:</strong> {String(eeat.author)}</p> : null}
                            {Array.isArray(eeat.experience_evidence) && <p><strong>Experience:</strong> {(eeat.experience_evidence as string[]).join("; ")}</p>}
                            {Array.isArray(eeat.trust_signals) && <p><strong>Trust:</strong> {(eeat.trust_signals as string[]).join("; ")}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {pages.length === 0 && (
            <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">No page audit data available.</p></CardContent></Card>
          )}
        </div>
      )}

      {/* ─── Schema Tab ─── */}
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
              <p className="text-sm text-muted-foreground mb-2">
                Ready-to-paste JSON-LD structured data wrapped in <code className="px-1 py-0.5 bg-muted rounded text-xs">&lt;script&gt;</code> tags. Copy and paste directly into your page&apos;s <code className="px-1 py-0.5 bg-muted rounded text-xs">&lt;head&gt;</code> section.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                CMS: <strong>{(job.input_brief as Record<string, unknown>)?.cms_platform as string || "Unknown"}</strong> — see the downloaded ZIP for CMS-specific installation instructions.
              </p>

              {pageOpts.filter(p => {
                const sc = p.schema_code as Array<{ type: string }> | undefined;
                return sc && sc.length > 0;
              }).length > 0 ? (
                pageOpts.filter(p => {
                  const sc = p.schema_code as Array<{ type: string }> | undefined;
                  return sc && sc.length > 0;
                }).map((page, pageIdx) => {
                  const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }>;
                  return (
                    <div key={pageIdx} className="mb-8 last:mb-0">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        {page.url as string}
                        <Badge variant="secondary">{schemaCode.length} schema{schemaCode.length > 1 ? "s" : ""}</Badge>
                      </h4>
                      {schemaCode.map((schema, idx) => {
                        let formatted: string;
                        try {
                          formatted = JSON.stringify(JSON.parse(schema.json_ld), null, 2);
                        } catch {
                          formatted = schema.json_ld;
                        }
                        const fullCode = `<script type="application/ld+json">\n${formatted}\n</script>`;
                        return (
                          <div key={idx} className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary">{schema.type}</Badge>
                              <CopyButton text={fullCode} id={`schema-tab-${pageIdx}-${idx}`} copied={copied} onCopy={handleCopy} />
                            </div>
                            <pre className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                              {fullCode}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                // Fallback to page_audits data
                pages.filter(p => p.generated_schema_code).length > 0 ? (
                  pages.filter(p => p.generated_schema_code).map((page) => (
                    <div key={page.id} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">{page.page_url}</h4>
                        <CopyButton text={`<script type="application/ld+json">\n${page.generated_schema_code}\n</script>`} id={`schema-tab-${page.id}`} copied={copied} onCopy={handleCopy} />
                      </div>
                      <pre className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                        {`<script type="application/ld+json">\n${page.generated_schema_code}\n</script>`}
                      </pre>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No schema code generated yet.</p>
                )
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Technical Audit Tab ─── */}
      {activeTab === "technical" && (
        <div className="space-y-4">
          {techAudit ? (
            <>
              {/* Crawl & Index Health */}
              {(techAudit as Record<string, unknown>).crawl_index && (
                <Card>
                  <CardHeader><CardTitle>Crawl & Index Health</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-3 text-left font-medium text-muted-foreground w-10">Status</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Item</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Severity</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Current</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Fix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {((techAudit as Record<string, unknown>).crawl_index as Array<Record<string, unknown>>).map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5"><StatusIcon status={item.status as string} /></td>
                              <td className="py-2.5 font-medium">{item.item as string}</td>
                              <td className="py-2.5">
                                <Badge variant={(item.priority as string) === "critical" ? "destructive" : (item.priority as string) === "high" ? "warning" : "secondary"}>
                                  {(item.priority || item.severity || "—") as string}
                                </Badge>
                              </td>
                              <td className="py-2.5 text-muted-foreground text-xs">{(item.current || "—") as string}</td>
                              <td className="py-2.5 text-xs">{(item.fix || "No action needed") as string}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Core Web Vitals */}
              {(techAudit as Record<string, unknown>).core_web_vitals && (
                <Card>
                  <CardHeader><CardTitle>Core Web Vitals</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {((techAudit as Record<string, unknown>).core_web_vitals as Array<Record<string, unknown>>).map((metric, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <p className="text-sm font-semibold">{metric.metric as string}</p>
                          <p className="text-xs text-muted-foreground">Target: {metric.target as string}</p>
                          <p className="text-xs text-muted-foreground">Status: {metric.estimated_status as string}</p>
                          {metric.fix ? <p className="text-xs mt-1">{String(metric.fix)}</p> : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schema Strategy */}
              {(techAudit as Record<string, unknown>).schema_strategy && (
                <Card>
                  <CardHeader><CardTitle>Schema Implementation Status</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-3 text-left font-medium text-muted-foreground">Type</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Pages</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="pb-3 text-left font-medium text-muted-foreground">Priority</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {((techAudit as Record<string, unknown>).schema_strategy as Array<Record<string, unknown>>).map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 font-medium">{item.type as string}</td>
                              <td className="py-2.5 text-xs text-muted-foreground">{Array.isArray(item.pages) ? (item.pages as string[]).join(", ") : "—"}</td>
                              <td className="py-2.5">
                                <Badge variant={item.status === "implemented" ? "success" : item.status === "partial" ? "warning" : "destructive"}>
                                  {item.status as string}
                                </Badge>
                              </td>
                              <td className="py-2.5">{(item.priority || "—") as string}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">No technical audit data available.</p></CardContent></Card>
          )}
        </div>
      )}

      {/* ─── Off-Page Tab ─── */}
      {activeTab === "offpage" && (
        <div className="space-y-6">
          {offpage ? (
            <>
              {/* GBP */}
              {(offpage as Record<string, unknown>).gbp_optimization && (
                <Card>
                  <CardHeader><CardTitle>Google Business Profile</CardTitle></CardHeader>
                  <CardContent>
                    {Array.isArray(((offpage as Record<string, unknown>).gbp_optimization as Record<string, unknown>).tasks) && (
                      <div className="space-y-2">
                        {(((offpage as Record<string, unknown>).gbp_optimization as Record<string, unknown>).tasks as Array<Record<string, unknown>>).map((task, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                              <StatusIcon status={task.status === "done" ? "pass" : task.status === "partial" ? "warning" : "fail"} />
                              <span className="text-sm">{task.task as string}</span>
                            </div>
                            <Badge variant={(task.priority as string) === "high" ? "destructive" : "secondary"}>{task.priority as string}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Review Strategy */}
              {(offpage as Record<string, unknown>).review_strategy && (() => {
                const reviews = (offpage as Record<string, unknown>).review_strategy as Record<string, unknown>;
                return (
                  <Card>
                    <CardHeader><CardTitle>Review Strategy</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-3 mb-4">
                        <div className="text-center p-3 border rounded-lg">
                          <p className="text-2xl font-bold">{String(reviews.current_reviews || 0)}</p>
                          <p className="text-xs text-muted-foreground">Current Reviews</p>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <p className="text-2xl font-bold">{String(reviews.current_rating || 0)}/5</p>
                          <p className="text-xs text-muted-foreground">Current Rating</p>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <p className="text-2xl font-bold text-primary">{String(reviews.target_reviews_90_days || 0)}</p>
                          <p className="text-xs text-muted-foreground">90-Day Target</p>
                        </div>
                      </div>
                      {Array.isArray(reviews.review_coaching_tips) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Coaching Tips</p>
                          {(reviews.review_coaching_tips as string[]).map((tip, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground ml-4">• {tip}</p>
                          ))}
                        </div>
                      )}
                      {Array.isArray(reviews.multi_platform_targets) && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Multi-Platform Targets</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b"><th className="pb-2 text-left font-medium text-muted-foreground">Platform</th><th className="pb-2 text-left font-medium text-muted-foreground">Priority</th><th className="pb-2 text-left font-medium text-muted-foreground">Action</th></tr></thead>
                              <tbody className="divide-y">
                                {(reviews.multi_platform_targets as Array<Record<string, unknown>>).map((p, idx) => (
                                  <tr key={idx}><td className="py-2">{p.platform as string}</td><td className="py-2"><Badge variant="secondary">{p.priority as string}</Badge></td><td className="py-2 text-xs">{p.action as string}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Link Opportunities */}
              {job.link_opportunities.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Link Building Targets</CardTitle>
                      <a href={`/api/jobs/${jobId}/download?format=links-csv`}>
                        <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export CSV</Button>
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="pb-3 text-left font-medium text-muted-foreground">Target</th><th className="pb-3 text-left font-medium text-muted-foreground">Type</th><th className="pb-3 text-left font-medium text-muted-foreground">Approach</th><th className="pb-3 text-left font-medium text-muted-foreground">Priority</th></tr></thead>
                        <tbody className="divide-y">
                          {job.link_opportunities.map((link, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 font-medium">{(link.target_domain || link.target_url) as string}</td>
                              <td className="py-2.5"><Badge variant="secondary">{link.opportunity_type as string}</Badge></td>
                              <td className="py-2.5 text-xs text-muted-foreground">{(link.outreach_approach || "—") as string}</td>
                              <td className="py-2.5"><Badge variant={(link.priority as string) === "high" ? "destructive" : "secondary"}>{link.priority as string}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Citations */}
              {job.citation_tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Citation Tasks</CardTitle>
                      <a href={`/api/jobs/${jobId}/download?format=citations-csv`}>
                        <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export CSV</Button>
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="pb-3 text-left font-medium text-muted-foreground">Directory</th><th className="pb-3 text-left font-medium text-muted-foreground">Status</th><th className="pb-3 text-left font-medium text-muted-foreground">Action</th></tr></thead>
                        <tbody className="divide-y">
                          {job.citation_tasks.map((task, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 font-medium">{task.directory_name as string}</td>
                              <td className="py-2.5"><Badge variant={(task.current_status as string) === "listed" ? "success" : (task.current_status as string) === "inconsistent" ? "warning" : "destructive"}>{task.current_status as string}</Badge></td>
                              <td className="py-2.5 text-xs">{task.action_needed as string}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Velocity */}
              {(offpage as Record<string, unknown>).content_velocity && (() => {
                const cv = (offpage as Record<string, unknown>).content_velocity as Record<string, unknown>;
                const calendar = (cv.content_calendar_3_months || []) as Array<Record<string, unknown>>;
                return (
                  <Card>
                    <CardHeader><CardTitle>Content Velocity Plan</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">Recommended cadence: <strong>{cv.recommended_cadence as string}</strong></p>
                      {calendar.map((month, idx) => (
                        <div key={idx} className="mb-4">
                          <h4 className="text-sm font-semibold mb-2">Month {month.month as number}</h4>
                          <div className="space-y-1">
                            {((month.pieces || []) as Array<Record<string, unknown>>).map((piece, pi) => (
                              <p key={pi} className="text-sm ml-4">• <strong>{piece.title as string}</strong> ({piece.type as string}) — keyword: {(piece.target_keyword || "—") as string}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          ) : (
            <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">No off-page strategy data available.</p></CardContent></Card>
          )}
        </div>
      )}

      {/* ─── Roadmap Tab ─── */}
      {activeTab === "roadmap" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <a href={`/api/jobs/${jobId}/download?format=csv`}>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export CSV</Button>
            </a>
          </div>
          {roadmap && (roadmap as Record<string, unknown>).phases ? (
            ((roadmap as Record<string, unknown>).phases as Array<Record<string, unknown>>).map((phase, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{idx + 1}</div>
                    <div>
                      <div>{phase.name as string}</div>
                      <p className="text-xs text-muted-foreground font-normal">{phase.timeframe as string}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-3 text-left font-medium text-muted-foreground w-8">#</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Task</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Priority</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Assignee</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Page/URL</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {((phase.tasks || []) as Array<Record<string, unknown>>).map((task, ti) => (
                          <tr key={ti}>
                            <td className="py-2.5 text-muted-foreground">{ti + 1}</td>
                            <td className="py-2.5">{task.task as string}</td>
                            <td className="py-2.5">
                              <Badge variant={(task.priority as string) === "critical" ? "destructive" : (task.priority as string) === "high" ? "warning" : "secondary"}>
                                {task.priority as string}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground">{(task.assignee_role || "—") as string}</td>
                            <td className="py-2.5 text-xs text-muted-foreground">{(task.page_url || "—") as string}</td>
                            <td className="py-2.5 text-xs">{task.estimated_hours ? `${task.estimated_hours}h` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">No roadmap data available.</p></CardContent></Card>
          )}
        </div>
      )}

      {/* ─── Measurement Tab ─── */}
      {activeTab === "measurement" && (
        <div className="space-y-4">
          {measurement ? (
            <>
              {["seo_metrics", "aeo_metrics", "geo_metrics", "local_metrics"].map(category => {
                const metrics = (measurement as Record<string, unknown>)[category] as Array<Record<string, unknown>>;
                if (!metrics?.length) return null;
                const label = category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <Card key={category}>
                    <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="pb-3 text-left font-medium text-muted-foreground">Metric</th>
                              <th className="pb-3 text-left font-medium text-muted-foreground">Tool</th>
                              <th className="pb-3 text-left font-medium text-muted-foreground">Frequency</th>
                              <th className="pb-3 text-left font-medium text-muted-foreground">Target</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {metrics.map((m, idx) => (
                              <tr key={idx}>
                                <td className="py-2.5 font-medium">{m.metric as string}</td>
                                <td className="py-2.5 text-muted-foreground">{m.tool as string}</td>
                                <td className="py-2.5 text-muted-foreground">{m.frequency as string}</td>
                                <td className="py-2.5">{m.target as string}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {(measurement as Record<string, unknown>).reporting_cadence && (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm"><strong>Reporting cadence:</strong> {(measurement as Record<string, unknown>).reporting_cadence as string}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">No measurement framework data available.</p></CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
