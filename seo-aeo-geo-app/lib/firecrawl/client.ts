import { normalizeAuditUrl } from "@/lib/site-crawl/analyzer";

const FIRECRAWL_API_BASE = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev/v2";
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_POLL_TIMEOUT_MS = 180000;

export type FirecrawlMapLink = {
  url: string;
  title?: string;
  description?: string;
};

export type FirecrawlDocument = {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    url?: string;
    statusCode?: number;
    error?: string | null;
    scrapeId?: string;
    [key: string]: unknown;
  };
};

export type FirecrawlCrawlStatus = {
  success?: boolean;
  status?: "scraping" | "completed" | "failed" | "cancelled" | "processing";
  completed?: number;
  total?: number;
  creditsUsed?: number;
  expiresAt?: string;
  next?: string | null;
  data?: FirecrawlDocument[];
  error?: string | null;
};

export type FirecrawlCrawlConfig = {
  url: string;
  limit: number;
  maxDiscoveryDepth?: number;
  crawlEntireDomain?: boolean;
  allowSubdomains?: boolean;
  allowExternalLinks?: boolean;
  sitemap?: "include" | "skip" | "only";
  ignoreQueryParameters?: boolean;
  scrapeOptions?: Record<string, unknown>;
};

export function isFirecrawlConfigured() {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

export function getFirecrawlAuditProfile(profile?: string) {
  switch (profile) {
    case "free-snapshot":
      return { id: "free-snapshot", label: "Free Snapshot", limit: 10, maxDiscoveryDepth: 1 };
    case "full-audit":
      return { id: "full-audit", label: "Full Audit", limit: 150, maxDiscoveryDepth: 3 };
    case "standard":
    default:
      return { id: "standard", label: "Standard Audit", limit: 50, maxDiscoveryDepth: 2 };
  }
}

export async function mapWebsite(url: string, options?: { limit?: number; sitemap?: "include" | "skip" | "only" }) {
  const payload = {
    url: normalizeAuditUrl(url),
    sitemap: options?.sitemap || "include",
    includeSubdomains: false,
    limit: options?.limit || 500,
    ignoreQueryParameters: true,
  };

  const data = await firecrawlFetch<{ success: boolean; links?: Array<FirecrawlMapLink | string> }>("/map", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return (data.links || []).map((link) => (typeof link === "string" ? { url: link } : link));
}

export function buildDefaultCrawlConfig(url: string, profile?: string): FirecrawlCrawlConfig {
  const auditProfile = getFirecrawlAuditProfile(profile);
  return {
    url: normalizeAuditUrl(url),
    limit: auditProfile.limit,
    maxDiscoveryDepth: auditProfile.maxDiscoveryDepth,
    crawlEntireDomain: true,
    allowSubdomains: false,
    allowExternalLinks: false,
    sitemap: "include",
    ignoreQueryParameters: true,
    scrapeOptions: {
      formats: ["markdown", "html", "rawHtml", "links"],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      storeInCache: false,
    },
  };
}

export async function startCrawl(config: FirecrawlCrawlConfig) {
  const data = await firecrawlFetch<{ success: boolean; id: string; url?: string }>("/crawl", {
    method: "POST",
    body: JSON.stringify(config),
  });

  if (!data.id) throw new Error("Firecrawl did not return a crawl job id.");
  return data;
}

export async function getCrawlStatus(id: string) {
  return firecrawlFetch<FirecrawlCrawlStatus>(`/crawl/${id}`, { method: "GET" });
}

export async function waitForCrawl(id: string, options?: { pollIntervalMs?: number; timeoutMs?: number }) {
  const pollIntervalMs = options?.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs || DEFAULT_POLL_TIMEOUT_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getCrawlStatus(id);
    if (status.status === "completed") return await hydratePaginatedCrawl(status);
    if (status.status === "failed" || status.status === "cancelled") {
      throw new Error(status.error || `Firecrawl crawl ${status.status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Firecrawl crawl ${id} timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

async function hydratePaginatedCrawl(firstPage: FirecrawlCrawlStatus) {
  const allData = [...(firstPage.data || [])];
  let next = firstPage.next || null;

  while (next) {
    const page = await firecrawlFetch<FirecrawlCrawlStatus>(next, { method: "GET" }, true);
    allData.push(...(page.data || []));
    next = page.next || null;
  }

  return { ...firstPage, data: allData, next: null };
}

async function firecrawlFetch<T>(pathOrUrl: string, init: RequestInit, absoluteUrl = false): Promise<T> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured.");

  const url = absoluteUrl ? pathOrUrl : `${FIRECRAWL_API_BASE}${pathOrUrl}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? safeJson(text) : {};

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      data?.code ||
      `${response.status} ${response.statusText}`;
    throw new Error(`Firecrawl request failed: ${errorMessage}`);
  }

  return data as T;
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
