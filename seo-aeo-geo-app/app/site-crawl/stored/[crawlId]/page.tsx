"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Code2,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StoredPage = {
  id: string;
  url: string;
  pageType: string;
  title: string | null;
  h1: string | null;
  wordCount: number | null;
  indexabilityStatus: string | null;
  schemaTypes: string[];
};

type StoredCrawl = {
  crawl: {
    id: string;
    clientId: string;
    seedUrl: string;
    firecrawlJobId: string | null;
    status: string;
    creditsUsed: number | null;
    discoveredUrlCount: number | null;
    selectedUrlCount: number | null;
    completedAt: string | null;
  };
  client: { id: string; name: string; website_url: string } | null;
  schemaTypes: string[];
  schemaCount: number;
  pages: StoredPage[];
};

type PageContent = {
  page: {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    h1: string | null;
    pageType: string;
    wordCount: number | null;
    indexabilityStatus: string | null;
    seoSignals: Record<string, unknown>;
  };
  schema: unknown[];
  artifacts: {
    markdown: string | null;
    rawHtml: string | null;
    cleanHtml: string | null;
    paths: Record<string, string | null>;
  };
};

type ArtifactTab = "markdown" | "cleanHtml" | "rawHtml" | "schema" | "metadata";

export default function StoredSiteCrawlPage() {
  const params = useParams();
  const crawlId = params.crawlId as string;
  const [crawl, setCrawl] = useState<StoredCrawl | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("markdown");
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState("");

  const selectedPage = useMemo(
    () => crawl?.pages.find((page) => page.id === selectedPageId) || crawl?.pages[0] || null,
    [crawl?.pages, selectedPageId]
  );

  async function loadCrawl() {
    setError("");
    const response = await fetch(`/api/site-crawl/crawls/${crawlId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load stored crawl");
    setCrawl(data);
    if (!selectedPageId && data.pages?.[0]?.id) setSelectedPageId(data.pages[0].id);
  }

  async function loadPage(pageId: string) {
    setLoadingPage(true);
    setError("");
    try {
      const response = await fetch(`/api/site-crawl/crawls/${crawlId}/pages/${pageId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load page content");
      setPageContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page content");
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    loadCrawl()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stored crawl"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crawlId]);

  useEffect(() => {
    if (selectedPage?.id) loadPage(selectedPage.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!crawl) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-sm text-muted-foreground">{error || "Stored crawl not found."}</p>
        <Link href="/site-crawl" className="mt-4 inline-block">
          <Button variant="outline">Back to Site Crawl</Button>
        </Link>
      </div>
    );
  }

  const artifactText = getArtifactText(activeTab, pageContent);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/site-crawl" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Site Crawl
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Stored Firecrawl Crawl
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Stored Pages and Artifacts</h1>
              <p className="mt-2 max-w-3xl break-all text-sm text-muted-foreground">
                {crawl.client?.name || crawl.crawl.seedUrl} - {crawl.crawl.seedUrl}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadCrawl}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              {crawl.client?.id && (
                <a href={`/api/clients/${crawl.client.id}/site-crawl/download?crawlId=${crawl.crawl.id}`}>
                  <Button>
                    <Download className="h-4 w-4" />
                    Design ZIP
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-4">
          <Metric label="Pages" value={crawl.pages.length} />
          <Metric label="Schema items" value={crawl.schemaCount} />
          <Metric label="Credits" value={crawl.crawl.creditsUsed ?? 0} />
          <Metric label="Status" value={crawl.crawl.status} />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Stored Pages</CardTitle>
              <CardDescription>Click a page to inspect stored Markdown, clean HTML, raw HTML, schema, and metadata.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[720px] space-y-2 overflow-auto pr-1">
              {crawl.pages.length ? (
                crawl.pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${
                      selectedPage?.id === page.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{page.pageType}</Badge>
                      <Badge variant={page.indexabilityStatus === "indexable" ? "success" : "warning"}>
                        {page.indexabilityStatus || "unknown"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{page.title || page.h1 || "Untitled page"}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{page.url}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {page.wordCount || 0} words - {page.schemaTypes.join(", ") || "no schema"}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No page rows were stored for this crawl.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{selectedPage?.title || selectedPage?.h1 || "Page Content"}</CardTitle>
                  <CardDescription className="break-all">{selectedPage?.url || "Select a page to inspect."}</CardDescription>
                </div>
                {loadingPage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <TabButton active={activeTab === "markdown"} icon={<FileText className="h-3.5 w-3.5" />} onClick={() => setActiveTab("markdown")}>Markdown</TabButton>
                <TabButton active={activeTab === "cleanHtml"} icon={<FileCode2 className="h-3.5 w-3.5" />} onClick={() => setActiveTab("cleanHtml")}>Clean HTML</TabButton>
                <TabButton active={activeTab === "rawHtml"} icon={<Code2 className="h-3.5 w-3.5" />} onClick={() => setActiveTab("rawHtml")}>Raw HTML</TabButton>
                <TabButton active={activeTab === "schema"} icon={<FileJson className="h-3.5 w-3.5" />} onClick={() => setActiveTab("schema")}>Schema</TabButton>
                <TabButton active={activeTab === "metadata"} icon={<Globe className="h-3.5 w-3.5" />} onClick={() => setActiveTab("metadata")}>Metadata</TabButton>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Markdown: {pageContent?.artifacts.markdown ? "available" : "missing"}</span>
                  <span>Clean HTML: {pageContent?.artifacts.cleanHtml ? "available" : "missing"}</span>
                  <span>Raw HTML: {pageContent?.artifacts.rawHtml ? "available" : "missing"}</span>
                  <span>Schema: {pageContent?.schema.length || 0}</span>
                </div>
                <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-4 text-xs leading-relaxed text-foreground">
                  {artifactText || "No artifact content is available for this tab."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick}>
      {icon}
      {children}
    </Button>
  );
}

function getArtifactText(tab: ArtifactTab, content: PageContent | null) {
  if (!content) return "";
  if (tab === "markdown") return content.artifacts.markdown || "";
  if (tab === "cleanHtml") return content.artifacts.cleanHtml || "";
  if (tab === "rawHtml") return content.artifacts.rawHtml || "";
  if (tab === "schema") return JSON.stringify(content.schema, null, 2);
  return JSON.stringify(
    {
      page: content.page,
      artifactPaths: content.artifacts.paths,
    },
    null,
    2
  );
}
