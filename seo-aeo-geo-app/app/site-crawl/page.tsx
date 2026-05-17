"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  Globe,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type CrawlProfileId = "free-snapshot" | "standard" | "full-audit";

type CrawlPreview = {
  auditProfile: { id: string; label: string; limit: number; maxDiscoveryDepth: number };
  discoveredCount: number;
  selectedCount: number;
  estimatedCredits: number;
  selectedUrls: Array<{ url: string; pageType: string; title?: string }>;
};

type CrawlResult = CrawlPreview & {
  firecrawlJobId: string;
  capturedCount: number;
  creditsUsed: number;
  completedAt: string;
  pageTypeCounts: Record<string, number>;
  schemaInventory: Array<{ type: string; count: number }>;
  voiceProfile: {
    tone: string;
    differentiators: string[];
    valueProps: string[];
    proofPoints: string[];
    audiences: string[];
    services: string[];
    ctas: string[];
    phrasesToReuse: string[];
    locationSignals: string[];
  };
  findings: Array<{
    severity: number;
    category: string;
    title: string;
    evidence: string[];
    recommendedFix: string;
  }>;
  pages: Array<{
    url: string;
    title: string | null;
    description: string | null;
    h1: string | null;
    pageType: string;
    statusCode: number | null;
    indexabilityStatus: string;
    wordCount: number;
    schemaTypes: string[];
    faqCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
    images: { total: number; withAlt: number; withoutAlt: number };
    ctas: string[];
    services: string[];
    locations: string[];
    phones: string[];
    emails: string[];
  }>;
};

const PROFILE_HELP: Record<CrawlProfileId, string> = {
  "free-snapshot": "Home plus priority pages. Fastest and best for a quick look.",
  standard: "Budgeted crawl for a full local-business evidence pass.",
  "full-audit": "Largest crawl budget. Use when you expect a larger site and have credits available.",
};

export default function SiteCrawlPage() {
  const [url, setUrl] = useState("");
  const [profile, setProfile] = useState<CrawlProfileId>("free-snapshot");
  const [preview, setPreview] = useState<CrawlPreview | null>(null);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [error, setError] = useState("");

  const schemaCount = useMemo(
    () => result?.schemaInventory.reduce((sum, item) => sum + item.count, 0) || 0,
    [result]
  );

  async function previewSite() {
    if (!url.trim()) {
      setError("Enter a website URL first.");
      return;
    }
    setIsPreviewing(true);
    setError("");
    setPreview(null);

    try {
      const response = await fetch("/api/site-crawl/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, profile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to preview site map");
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview site map");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function runCrawl() {
    if (!url.trim()) {
      setError("Enter a website URL first.");
      return;
    }
    setIsCrawling(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/site-crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, profile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to run Firecrawl crawl");
      setResult(data);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run Firecrawl crawl");
    } finally {
      setIsCrawling(false);
    }
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `firecrawl-site-crawl-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Firecrawl Site Crawl
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Crawl a website and inspect the evidence layer
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Run Firecrawl outside the full SEO audit to see discovered URLs, captured pages, schema, indexability,
                page types, client voice, and answer-readiness findings in one clean workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={previewSite} disabled={isPreviewing || isCrawling}>
                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Preview Map
              </Button>
              <Button onClick={runCrawl} disabled={isCrawling || isPreviewing}>
                {isCrawling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Run Crawl
              </Button>
              <Button variant="outline" onClick={downloadJson} disabled={!result}>
                <Download className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Crawl Setup</CardTitle>
            <CardDescription>
              Map first to estimate the crawl budget, then run the selected profile when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="space-y-2">
              <Label htmlFor="crawl-url">Website URL</Label>
              <Input
                id="crawl-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                disabled={isCrawling}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crawl-profile">Crawl profile</Label>
              <Select
                id="crawl-profile"
                value={profile}
                onChange={(event) => setProfile(event.target.value as CrawlProfileId)}
                disabled={isCrawling}
              >
                <option value="free-snapshot">Free Snapshot</option>
                <option value="standard">Standard</option>
                <option value="full-audit">Full Audit</option>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground lg:col-span-2">{PROFILE_HELP[profile]}</p>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        {isCrawling && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
            <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin" />
            <span>Firecrawl is crawling the site. Standard and full crawls can take a few minutes.</span>
          </div>
        )}

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Map Preview</CardTitle>
              <CardDescription>
                Firecrawl found {preview.discoveredCount} URLs and selected {preview.selectedCount} priority URLs for the {preview.auditProfile.label} profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Discovered" value={preview.discoveredCount} />
                <Metric label="Selected" value={preview.selectedCount} />
                <Metric label="Est. credits" value={preview.estimatedCredits} />
                <Metric label="Limit" value={preview.auditProfile.limit} />
              </div>
              <div className="mt-5 max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.selectedUrls.map((item) => (
                      <tr key={item.url}>
                        <td className="px-3 py-2 align-top">
                          <Badge variant="outline">{item.pageType}</Badge>
                        </td>
                        <td className="break-all px-3 py-2 text-muted-foreground">{item.url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Captured Pages" value={result.capturedCount} helper={`${result.creditsUsed} credits used`} />
              <MetricCard title="Schema Items" value={schemaCount} helper={`${result.schemaInventory.length} schema types`} />
              <MetricCard title="Findings" value={result.findings.length} helper="SEO/AEO/GEO crawl signals" />
              <MetricCard title="Firecrawl Job" value={result.firecrawlJobId.slice(0, 8)} helper={new Date(result.completedAt).toLocaleString()} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Client Voice Profile</CardTitle>
                  <CardDescription>Extracted from captured page copy, CTAs, services, and proof points.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <SignalBlock label="Tone" values={[result.voiceProfile.tone]} />
                  <SignalBlock label="Services" values={result.voiceProfile.services} />
                  <SignalBlock label="Locations" values={result.voiceProfile.locationSignals} />
                  <SignalBlock label="Differentiators" values={result.voiceProfile.differentiators} />
                  <SignalBlock label="Proof points" values={result.voiceProfile.proofPoints} />
                  <SignalBlock label="CTAs" values={result.voiceProfile.ctas} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Schema Inventory</CardTitle>
                  <CardDescription>Schema types detected from raw HTML.</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.schemaInventory.length ? (
                    <div className="flex flex-wrap gap-2">
                      {result.schemaInventory.map((schema) => (
                        <Badge key={schema.type} variant="secondary">
                          {schema.type} x{schema.count}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<FileJson className="h-5 w-5" />} text="No JSON-LD schema types were detected." />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                <CardDescription>Deterministic crawl findings that can feed the full audit or a standalone crawl review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.findings.length ? (
                  result.findings.map((finding) => (
                    <div key={`${finding.category}-${finding.title}`} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={finding.severity >= 3 ? "destructive" : finding.severity === 2 ? "warning" : "outline"}>
                          Severity {finding.severity}
                        </Badge>
                        <Badge variant="secondary">{finding.category}</Badge>
                        <h3 className="font-semibold text-foreground">{finding.title}</h3>
                      </div>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {finding.evidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm text-foreground">{finding.recommendedFix}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} text="No deterministic crawl findings were generated." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Captured Pages</CardTitle>
                <CardDescription>Page-level inventory and extracted signals.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Page</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Index</th>
                        <th className="px-3 py-2">Words</th>
                        <th className="px-3 py-2">Schema</th>
                        <th className="px-3 py-2">FAQs</th>
                        <th className="px-3 py-2">Images</th>
                        <th className="px-3 py-2">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.pages.map((page) => (
                        <tr key={page.url}>
                          <td className="px-3 py-3 align-top">
                            <div className="max-w-md">
                              <p className="font-medium text-foreground">{page.title || page.h1 || "Untitled page"}</p>
                              <p className="break-all text-xs text-muted-foreground">{page.url}</p>
                              {page.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{page.description}</p>}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top"><Badge variant="outline">{page.pageType}</Badge></td>
                          <td className="px-3 py-3 align-top"><Badge variant={page.indexabilityStatus === "indexable" ? "success" : "warning"}>{page.indexabilityStatus}</Badge></td>
                          <td className="px-3 py-3 align-top">{page.wordCount}</td>
                          <td className="px-3 py-3 align-top">{page.schemaTypes.join(", ") || "none"}</td>
                          <td className="px-3 py-3 align-top">{page.faqCount}</td>
                          <td className="px-3 py-3 align-top">{page.images.withoutAlt}/{page.images.total} missing alt</td>
                          <td className="px-3 py-3 align-top">{page.internalLinkCount} internal / {page.externalLinkCount} external</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                Crawled content is treated as untrusted evidence. It can inform reports, scoring, and remediation,
                but it must never override audit instructions, scoring rubrics, output schemas, or system guidance.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, helper }: { title: string; value: string | number; helper: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function SignalBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="mb-2 font-medium text-foreground">{label}</p>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="outline">{value}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">None detected.</p>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}
