"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  Plus,
  Trash2,
  Rocket,
  ArrowLeft,
  FileText,
  GripVertical,
  Globe,
  Star,
  BarChart3,
  MessageSquare,
  Settings,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const INDUSTRIES = [
  "Home Services",
  "Legal",
  "Medical / Healthcare",
  "E-commerce",
  "SaaS",
  "Restaurant / Hospitality",
  "Real Estate",
  "Automotive",
  "Financial Services",
  "Education",
  "Construction",
  "Other",
];

const CMS_PLATFORMS = [
  "WordPress",
  "Shopify",
  "Squarespace",
  "Wix",
  "Webflow",
  "Custom",
  "Other",
  "Unknown",
];

const PRIMARY_GOALS = [
  { value: "leads", label: "Leads" },
  { value: "sales", label: "Sales" },
  { value: "calls", label: "Phone Calls" },
  { value: "foot_traffic", label: "Foot Traffic" },
  { value: "brand_awareness", label: "Brand Awareness" },
];

type Competitor = { url: string; name: string };
type Keyword = { keyword: string; priority: string; currentRanking: string };
type SiteCrawlPreview = {
  auditProfile: { id: string; label: string; limit: number; maxDiscoveryDepth: number };
  discoveredCount: number;
  selectedCount: number;
  estimatedCredits: number;
  selectedUrls: Array<{ url: string; pageType: string; title?: string }>;
};

export default function NewAuditPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <NewAuditPage />
    </Suspense>
  );
}

function NewAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rerunJobId = searchParams.get("rerun");
  const [mode, setMode] = useState<"form" | "upload">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRerun, setIsRerun] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetGeography, setTargetGeography] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { url: "", name: "" },
  ]);
  const [keywords, setKeywords] = useState<Keyword[]>([
    { keyword: "", priority: "medium", currentRanking: "" },
  ]);
  const [gbpClaimed, setGbpClaimed] = useState("");
  const [gbpUrl, setGbpUrl] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [avgRating, setAvgRating] = useState("");
  const [monthlyTraffic, setMonthlyTraffic] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [topLandingPages, setTopLandingPages] = useState("");
  const [cmsPlatform, setCmsPlatform] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [previousSeo, setPreviousSeo] = useState("");
  const [budget, setBudget] = useState("");

  // Model selection
  const [selectedModel, setSelectedModel] = useState<"haiku" | "sonnet">("haiku");

  // Firecrawl site evidence layer
  const [siteCrawlEnabled, setSiteCrawlEnabled] = useState(true);
  const [siteCrawlProfile, setSiteCrawlProfile] = useState<"free-snapshot" | "standard" | "full-audit">("standard");
  const [siteCrawlPreview, setSiteCrawlPreview] = useState<SiteCrawlPreview | null>(null);
  const [isPreviewingSiteCrawl, setIsPreviewingSiteCrawl] = useState(false);
  const [siteCrawlPreviewError, setSiteCrawlPreviewError] = useState("");

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-populate state
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [autoPopulateStatus, setAutoPopulateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [autoPopulateError, setAutoPopulateError] = useState("");

  // Shared function to populate form fields from parsed data
  const populateFromData = (data: Record<string, unknown>) => {
    if (data.client_name) setClientName(data.client_name as string);
    if (data.website_url) setWebsiteUrl(data.website_url as string);
    if (data.business_type) setBusinessType(data.business_type as string);
    if (data.industry) setIndustry(data.industry as string);
    if (data.target_geography) {
      const geo = data.target_geography;
      setTargetGeography(Array.isArray(geo) ? geo.join(", ") : String(geo));
    }
    if (data.primary_goal) setPrimaryGoal(data.primary_goal as string);
    if (data.cms_platform) setCmsPlatform(data.cms_platform as string);
    if (data.pain_points) setPainPoints(data.pain_points as string);
    if (data.previous_seo) setPreviousSeo(data.previous_seo as string);
    if (data.budget) setBudget(data.budget as string);

    const comps = data.competitors as { url: string; name: string }[] | undefined;
    if (comps?.length) {
      setCompetitors(comps.map((c) => ({ url: c.url || "", name: c.name || "" })));
    }

    const kws = data.keywords as { keyword: string; priority: string }[] | undefined;
    if (kws?.length) {
      setKeywords(kws.map((k) => ({
        keyword: k.keyword || "",
        priority: k.priority || "medium",
        currentRanking: "",
      })));
    }

    const gbp = data.gbp as Record<string, string> | undefined;
    if (gbp) {
      if (gbp.claimed) setGbpClaimed(gbp.claimed);
      if (gbp.url) setGbpUrl(gbp.url);
      if (gbp.reviewCount) setReviewCount(gbp.reviewCount);
      if (gbp.avgRating) setAvgRating(gbp.avgRating);
    }

    const analytics = data.analytics as Record<string, string> | undefined;
    if (analytics) {
      if (analytics.monthlyTraffic) setMonthlyTraffic(analytics.monthlyTraffic);
      if (analytics.conversionRate) setConversionRate(analytics.conversionRate);
      if (analytics.topLandingPages) setTopLandingPages(analytics.topLandingPages);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadFile(file);
    setIsUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse document");
      }

      const data = await res.json();
      populateFromData(data);
      setUploadSuccess(true);
      // Switch to form mode so user can review
      setMode("form");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAutoPopulate = async () => {
    if (!websiteUrl) return;
    setIsAutoPopulating(true);
    setAutoPopulateStatus("loading");
    setAutoPopulateError("");

    try {
      const res = await fetch("/api/autopopulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to research business");
      }

      const data = await res.json();
      populateFromData(data);
      setAutoPopulateStatus("success");
      // Reset success indicator after 5 seconds
      setTimeout(() => setAutoPopulateStatus("idle"), 5000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setAutoPopulateError(msg);
      setAutoPopulateStatus("error");
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const handlePreviewSiteCrawl = async () => {
    if (!websiteUrl) return;
    setIsPreviewingSiteCrawl(true);
    setSiteCrawlPreviewError("");
    setSiteCrawlPreview(null);

    try {
      const res = await fetch("/api/site-crawl/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, profile: siteCrawlProfile }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to preview site crawl");
      setSiteCrawlPreview(data);
    } catch (error) {
      setSiteCrawlPreviewError(error instanceof Error ? error.message : "Failed to preview site crawl");
    } finally {
      setIsPreviewingSiteCrawl(false);
    }
  };

  // Pre-fill form when re-running a previous audit
  useEffect(() => {
    if (!rerunJobId) return;
    fetch(`/api/jobs/${rerunJobId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const brief = data.input_brief;
        if (!brief) return;
        setIsRerun(true);
        setClientName(brief.client_name || "");
        setWebsiteUrl(brief.website_url || "");
        setBusinessType(brief.business_type || "");
        setIndustry(brief.industry || "");
        setTargetGeography(brief.target_geography || "");
        setPrimaryGoal(brief.primary_goal || "");
        if (brief.competitors?.length) {
          setCompetitors(brief.competitors.map((c: Competitor) => ({ url: c.url || "", name: c.name || "" })));
        }
        if (brief.keywords?.length) {
          setKeywords(brief.keywords.map((k: Keyword) => ({
            keyword: k.keyword || "",
            priority: k.priority || "medium",
            currentRanking: k.currentRanking || "",
          })));
        }
        if (brief.gbp) {
          setGbpClaimed(brief.gbp.claimed || "");
          setGbpUrl(brief.gbp.url || "");
          setReviewCount(brief.gbp.reviewCount || "");
          setAvgRating(brief.gbp.avgRating || "");
        }
        if (brief.analytics) {
          setMonthlyTraffic(brief.analytics.monthlyTraffic || "");
          setConversionRate(brief.analytics.conversionRate || "");
          setTopLandingPages(brief.analytics.topLandingPages || "");
        }
        setCmsPlatform(brief.cms_platform || "");
        setPainPoints(brief.pain_points || "");
        setPreviousSeo(brief.previous_seo || "");
        setBudget(brief.budget || "");
        if (brief.site_crawl) {
          setSiteCrawlEnabled(brief.site_crawl.enabled !== false);
          if (["free-snapshot", "standard", "full-audit"].includes(brief.site_crawl.profile)) {
            setSiteCrawlProfile(brief.site_crawl.profile);
          }
        }
      })
      .catch(() => {});
  }, [rerunJobId]);

  const addCompetitor = () =>
    setCompetitors([...competitors, { url: "", name: "" }]);
  const removeCompetitor = (i: number) =>
    setCompetitors(competitors.filter((_, idx) => idx !== i));
  const updateCompetitor = (i: number, field: keyof Competitor, val: string) =>
    setCompetitors(
      competitors.map((c, idx) => (idx === i ? { ...c, [field]: val } : c))
    );

  const addKeyword = () =>
    setKeywords([
      ...keywords,
      { keyword: "", priority: "medium", currentRanking: "" },
    ]);
  const removeKeyword = (i: number) =>
    setKeywords(keywords.filter((_, idx) => idx !== i));
  const updateKeyword = (i: number, field: keyof Keyword, val: string) =>
    setKeywords(
      keywords.map((k, idx) => (idx === i ? { ...k, [field]: val } : k))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const brief = {
      client_name: clientName,
      website_url: websiteUrl,
      business_type: businessType,
      industry,
      target_geography: targetGeography,
      primary_goal: primaryGoal,
      competitors: competitors.filter((c) => c.url),
      keywords: keywords.filter((k) => k.keyword),
      gbp: { claimed: gbpClaimed, url: gbpUrl, reviewCount, avgRating },
      analytics: { monthlyTraffic, conversionRate, topLandingPages },
      cms_platform: cmsPlatform,
      pain_points: painPoints,
      previous_seo: previousSeo,
      budget,
      model: selectedModel,
      site_crawl: {
        enabled: siteCrawlEnabled,
        profile: siteCrawlProfile,
        preview: siteCrawlPreview
          ? {
              discoveredCount: siteCrawlPreview.discoveredCount,
              selectedCount: siteCrawlPreview.selectedCount,
              estimatedCredits: siteCrawlPreview.estimatedCredits,
            }
          : null,
      },
    };

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      const data = await res.json();
      router.push(`/audits/${data.id}`);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {isRerun ? "Re-run Client Audit" : "New Client Audit"}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          {isRerun
            ? "Review and update the details below, then re-run the audit to track changes over time."
            : "Enter your client\u2019s details below or upload a brief document. The AI pipeline will generate a complete optimization package."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl w-fit">
        <button
          onClick={() => setMode("form")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "form"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Enter Details
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "upload"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload Brief
        </button>
      </div>

      {/* Upload mode */}
      {mode === "upload" && (
        <Card>
          <CardContent className="p-8">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : isUploading
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/50 cursor-pointer"
              }`}
              onClick={() => {
                if (!isUploading) {
                  document.getElementById("file-upload-input")?.click();
                }
              }}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".txt,.csv,.json,.md,.docx,.xlsx,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = ""; // reset so same file can be re-uploaded
                }}
              />

              {isUploading ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    Parsing {uploadFile?.name}...
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    AI is extracting client details from your document. This takes about 10-15 seconds.
                  </p>
                </>
              ) : uploadSuccess ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 mb-4">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    Brief parsed successfully
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    Form fields have been populated. Switch to &ldquo;Enter Details&rdquo; to review and edit before running the audit.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={(e) => { e.stopPropagation(); setMode("form"); }}
                  >
                    Review Form
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {isDragging ? "Drop your file here" : "Drop your brief here"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    Supports .txt, .csv, .json, .md, .docx, .xlsx, and .pdf files.
                    AI will extract client details and pre-fill the form.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("file-upload-input")?.click();
                    }}
                  >
                    Browse Files
                  </Button>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Upload failed</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{uploadError}</p>
                </div>
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                Want to upload a different file? Just drag and drop or click the area above.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form mode */}
      {mode === "form" && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Required Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <CardTitle>Client Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clientName"
                    placeholder="Blue Lagoon Pools"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">
                    Website URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="websiteUrl"
                    placeholder="https://example.com"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => {
                      setWebsiteUrl(e.target.value);
                      // Reset auto-populate status when URL changes
                      if (autoPopulateStatus !== "idle") setAutoPopulateStatus("idle");
                    }}
                    required
                  />
                </div>
              </div>

              {/* Auto-populate button */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Auto-fill from website
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Uses AI to research the business and fill in all fields automatically
                  </p>
                </div>
                <Button
                  type="button"
                  variant={autoPopulateStatus === "success" ? "outline" : "default"}
                  size="sm"
                  onClick={handleAutoPopulate}
                  disabled={!websiteUrl || isAutoPopulating}
                  className="shrink-0"
                >
                  {isAutoPopulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Researching...
                    </>
                  ) : autoPopulateStatus === "success" ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      Filled
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      Auto-fill
                    </>
                  )}
                </Button>
              </div>
              {autoPopulateStatus === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Auto-fill failed</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{autoPopulateError}</p>
                    <p className="text-xs text-muted-foreground mt-1">You can still fill in the fields manually.</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Firecrawl site evidence layer</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Maps the sitemap first, then runs a server-side crawl for schema, page inventory,
                      client voice, and SEO/AEO/GEO evidence before the AI audit runs.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={siteCrawlEnabled}
                      onChange={(e) => setSiteCrawlEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="siteCrawlProfile">Crawl budget profile</Label>
                    <Select
                      id="siteCrawlProfile"
                      value={siteCrawlProfile}
                      onChange={(e) => {
                        setSiteCrawlProfile(e.target.value as "free-snapshot" | "standard" | "full-audit");
                        setSiteCrawlPreview(null);
                      }}
                      disabled={!siteCrawlEnabled}
                    >
                      <option value="free-snapshot">Free Snapshot - up to 10 pages</option>
                      <option value="standard">Standard Audit - up to 50 pages</option>
                      <option value="full-audit">Full Audit - up to 150 pages</option>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreviewSiteCrawl}
                      disabled={!websiteUrl || !siteCrawlEnabled || isPreviewingSiteCrawl}
                    >
                      {isPreviewingSiteCrawl ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Mapping...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-3.5 w-3.5" />
                          Preview Crawl
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {siteCrawlPreviewError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                    {siteCrawlPreviewError}
                  </div>
                )}

                {siteCrawlPreview && (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div>
                        <p className="text-lg font-bold">{siteCrawlPreview.discoveredCount}</p>
                        <p className="text-xs text-muted-foreground">URLs discovered</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{siteCrawlPreview.selectedCount}</p>
                        <p className="text-xs text-muted-foreground">Priority pages</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{siteCrawlPreview.estimatedCredits}</p>
                        <p className="text-xs text-muted-foreground">Est. credits</p>
                      </div>
                    </div>
                    <div className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t pt-3">
                      {siteCrawlPreview.selectedUrls.slice(0, 8).map((item) => (
                        <div key={item.url} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">{item.url}</span>
                          <Badge variant="outline" className="shrink-0 capitalize">{item.pageType}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input
                    id="businessType"
                    placeholder="Pool construction & renovation"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="geography">Target Geography</Label>
                  <Input
                    id="geography"
                    placeholder="Houston, TX metro area"
                    value={targetGeography}
                    onChange={(e) => setTargetGeography(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Goal</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PRIMARY_GOALS.map((goal) => (
                      <button
                        key={goal.value}
                        type="button"
                        onClick={() => setPrimaryGoal(goal.value)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all border ${
                          primaryGoal === goal.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {goal.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Competitors</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Auto-discovered if left blank
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {competitors.map((comp, i) => (
                <div key={i} className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <Input
                    placeholder="https://competitor.com"
                    value={comp.url}
                    onChange={(e) => updateCompetitor(i, "url", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Competitor name"
                    value={comp.name}
                    onChange={(e) => updateCompetitor(i, "name", e.target.value)}
                    className="flex-1"
                  />
                  {competitors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCompetitor}
                className="mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Competitor
              </Button>
            </CardContent>
          </Card>

          {/* Target Keywords */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Target Keywords</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Add the keywords you want to rank for
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_100px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                <span>Keyword</span>
                <span>Priority</span>
                <span>Current Rank</span>
                <span></span>
              </div>
              {keywords.map((kw, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_40px] gap-3 items-center"
                >
                  <Input
                    placeholder="e.g. pool builder houston"
                    value={kw.keyword}
                    onChange={(e) => updateKeyword(i, "keyword", e.target.value)}
                  />
                  <Select
                    value={kw.priority}
                    onChange={(e) =>
                      updateKeyword(i, "priority", e.target.value)
                    }
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                  <Input
                    placeholder="#"
                    value={kw.currentRanking}
                    onChange={(e) =>
                      updateKeyword(i, "currentRanking", e.target.value)
                    }
                  />
                  {keywords.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeKeyword(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyword}
                className="mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Keyword
              </Button>
            </CardContent>
          </Card>

          {/* Google Business Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <CardTitle>Google Business Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>GBP Claimed?</Label>
                <div className="flex gap-3 pt-1">
                  {["yes", "no", "unknown"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGbpClaimed(val)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all border ${
                        gbpClaimed === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="gbpUrl">GBP URL</Label>
                  <Input
                    id="gbpUrl"
                    placeholder="https://g.page/..."
                    value={gbpUrl}
                    onChange={(e) => setGbpUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewCount">Review Count</Label>
                  <Input
                    id="reviewCount"
                    type="number"
                    placeholder="0"
                    value={reviewCount}
                    onChange={(e) => setReviewCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avgRating">Average Rating</Label>
                  <Input
                    id="avgRating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="4.5"
                    value={avgRating}
                    onChange={(e) => setAvgRating(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics (optional) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Analytics</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    Optional
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="traffic">Monthly Organic Traffic</Label>
                  <Input
                    id="traffic"
                    type="number"
                    placeholder="5000"
                    value={monthlyTraffic}
                    onChange={(e) => setMonthlyTraffic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvr">Current Conversion Rate (%)</Label>
                  <Input
                    id="cvr"
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landingPages">Top Landing Pages</Label>
                <Textarea
                  id="landingPages"
                  placeholder="List your top performing pages..."
                  rows={3}
                  value={topLandingPages}
                  onChange={(e) => setTopLandingPages(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Context */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Additional Context</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    Optional
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cms">CMS Platform</Label>
                <Select
                  id="cms"
                  value={cmsPlatform}
                  onChange={(e) => setCmsPlatform(e.target.value)}
                >
                  <option value="">Select CMS...</option>
                  {CMS_PLATFORMS.map((cms) => (
                    <option key={cms} value={cms}>
                      {cms}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="painPoints">Known Pain Points</Label>
                <Textarea
                  id="painPoints"
                  placeholder="What challenges does this client face with their online presence?"
                  rows={3}
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousSeo">Previous SEO Work</Label>
                <Textarea
                  id="previousSeo"
                  placeholder="Any prior SEO work, agencies, or efforts?"
                  rows={3}
                  value={previousSeo}
                  onChange={(e) => setPreviousSeo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget / Capacity</Label>
                <Input
                  id="budget"
                  placeholder="e.g. $2,000/mo or 10 hours/week"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Rocket className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>AI Model</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Choose quality vs. speed
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedModel("haiku")}
                  className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
                    selectedModel === "haiku"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Haiku</span>
                    <Badge variant="secondary">1 credit</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Fast &amp; affordable. Great for initial audits and regular monitoring.
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>~3-5 min</span>
                    <span>&middot;</span>
                    <span>~$0.15-0.30 API cost</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModel("sonnet")}
                  className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
                    selectedModel === "sonnet"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Sonnet</span>
                    <Badge variant="default">5 credits</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Premium quality. More nuanced analysis — ideal for client deliverables.
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>~5-8 min</span>
                    <span>&middot;</span>
                    <span>~$1.50-3.00 API cost</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <Link href="/">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={!clientName || !websiteUrl || isSubmitting}
              className="shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Starting Audit...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  {isRerun ? "Re-run Audit" : "Run Audit"}
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
