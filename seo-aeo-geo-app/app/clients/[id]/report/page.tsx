"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  FileSearch,
  Globe,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

const MODULE_ICONS: Record<string, typeof Globe> = {
  firecrawl: FileSearch,
  seo_geo: Globe,
  llm_visibility: Bot,
  air: Sparkles,
};

export default function ClientIntegratedReportPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/clients/${clientId}/workbench`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load client report");
        setPayload(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client report");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !payload?.workbench?.executiveReport) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-sm text-muted-foreground">{error || "Client report not found."}</p>
        <Link href={`/clients/${clientId}`} className="mt-4 inline-block">
          <Button variant="outline">Back to Client</Button>
        </Link>
      </div>
    );
  }

  const client = payload.client;
  const workbench = payload.workbench;
  const report = workbench.executiveReport;

  return (
    <main className="mx-auto max-w-7xl space-y-6 print:max-w-none">
      <div className="print:hidden">
        <Link
          href={`/clients/${clientId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrated Client Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Executive dashboard, module summaries, key insights, and next actions for {client.name}.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">SSP Unified Visibility Report</p>
              <CardTitle className="mt-2 text-3xl">{client.name}</CardTitle>
              <CardDescription className="mt-2">
                {client.website_url} {client.target_geography ? `- ${client.target_geography}` : ""}
              </CardDescription>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-right">
              <p className="text-xs text-muted-foreground">Generated</p>
              <p className="font-semibold">{formatDate(report.generatedAt)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-lg bg-primary p-6 text-primary-foreground">
              <p className="text-sm opacity-80">Integrated Score</p>
              <p className="mt-3 text-6xl font-bold">{report.executiveScore}</p>
              <p className="mt-2 text-lg font-semibold">{report.readinessLabel}</p>
            </div>
            <div className="rounded-lg border p-5">
              <h2 className="text-xl font-semibold">Executive Summary</h2>
              <p className="mt-3 text-muted-foreground">{report.headline}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {report.metrics.map((metric: any) => (
                  <div key={metric.key} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                      <Badge variant={metricVariant(metric.status)}>{metric.status}</Badge>
                    </div>
                    <p className="mt-2 text-xl font-bold">{metric.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>The highest-signal readout across all completed modules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.keyInsights.map((insight: any) => (
              <div key={`${insight.source}-${insight.title}`} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={insight.severity === "risk" ? "destructive" : insight.severity === "watch" ? "warning" : "success"}>
                    {sourceLabel(insight.source)}
                  </Badge>
                  <h3 className="font-semibold">{insight.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{insight.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence Inventory</CardTitle>
            <CardDescription>What this report can currently cite and reuse.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InventoryRow label="Stored crawl pages" value={report.evidenceInventory.crawlPages} />
            <InventoryRow label="Schema types" value={report.evidenceInventory.schemaTypes.length} />
            <InventoryRow label="LLM responses" value={report.evidenceInventory.llmRuns} />
            <InventoryRow label="Recommendations" value={report.evidenceInventory.recommendations} />
            <TagBlock title="Services Detected" items={report.evidenceInventory.services} />
            <TagBlock title="Differentiators" items={report.evidenceInventory.differentiators} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Summaries</CardTitle>
          <CardDescription>What each audit layer contributes to the client story.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {report.moduleSummaries.map((module: any) => {
            const Icon = MODULE_ICONS[module.key] || Globe;
            return (
              <div key={module.key} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{module.label}</h3>
                      <Badge variant={module.status === "completed" ? "success" : module.status === "failed" ? "destructive" : "outline"}>
                        {module.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{module.summary}</p>
                    <p className="mt-3 text-sm">{module.nextStep}</p>
                    {typeof module.score === "number" && (
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Score</span>
                          <span>{Math.round(module.score)}/100</span>
                        </div>
                        <Progress value={module.score} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prioritized Next Actions</CardTitle>
          <CardDescription>Recommended fixes merged from Firecrawl, SEO/AEO/GEO, LLM Visibility, and AIR.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.topActions.length ? (
            report.topActions.map((action: any) => (
              <div key={action.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
                      <Badge variant="outline">{sourceLabel(action.sourceTool)}</Badge>
                      <h3 className="font-semibold">{action.title}</h3>
                    </div>
                    {action.description && <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>}
                    {action.recommendedFix && <p className="mt-2 text-sm">{action.recommendedFix}</p>}
                  </div>
                  <Badge variant="secondary">{action.status}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No recommended actions yet. Run one or more audit modules to populate this report.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function InventoryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function TagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {items?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.slice(0, 10).map((item) => (
            <Badge key={item} variant="secondary">{item}</Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No signals captured yet.</p>
      )}
    </div>
  );
}

function metricVariant(status: string) {
  if (status === "good") return "success";
  if (status === "watch") return "warning";
  if (status === "risk") return "destructive";
  return "outline";
}

function priorityVariant(priority: string) {
  if (priority === "urgent" || priority === "high") return "destructive";
  if (priority === "medium") return "warning";
  return "secondary";
}

function sourceLabel(source: string) {
  if (source === "firecrawl") return "Firecrawl";
  if (source === "seo_geo") return "SEO/AEO/GEO";
  if (source === "llm_visibility") return "LLM Visibility";
  if (source === "air") return "AIR";
  if (source === "workbench") return "Workbench";
  return source;
}
