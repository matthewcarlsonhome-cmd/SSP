"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const demoPages = [
  {
    url: "/",
    title: "Homepage",
    type: "homepage",
    currentScore: 41,
    projectedScore: 88,
    issues: 6,
    currentTitle: "Blue Lagoon Pools - Home",
    recommendedTitle:
      "Blue Lagoon Pools | Custom Pool Builder in Houston, TX",
    currentMeta: "",
    recommendedMeta:
      "Houston's trusted pool builder since 2005. Custom inground pools, renovations, and maintenance. Get a free quote from our award-winning team.",
  },
  {
    url: "/services/pool-construction",
    title: "Pool Construction",
    type: "service",
    currentScore: 28,
    projectedScore: 85,
    issues: 9,
    currentTitle: "Pool Construction",
    recommendedTitle:
      "Custom Pool Construction Houston | Inground Pool Builder | Blue Lagoon",
    currentMeta: "We build pools.",
    recommendedMeta:
      "Expert inground pool construction in Houston, TX. Concrete, fiberglass, and vinyl pools with 3D design. Licensed, insured, 15+ year warranty.",
  },
  {
    url: "/services/pool-renovation",
    title: "Pool Renovation",
    type: "service",
    currentScore: 22,
    projectedScore: 79,
    issues: 11,
    currentTitle: "Pool Renovation",
    recommendedTitle:
      "Pool Renovation & Remodeling Houston | Resurface, Retile, Redesign",
    currentMeta: "",
    recommendedMeta:
      "Transform your outdated pool with Houston's top renovation experts. Resurfacing, retiling, equipment upgrades, and complete remodels.",
  },
  {
    url: "/about",
    title: "About Us",
    type: "about",
    currentScore: 35,
    projectedScore: 72,
    issues: 5,
    currentTitle: "About Us",
    recommendedTitle:
      "About Blue Lagoon Pools | Houston's Trusted Pool Builder Since 2005",
    currentMeta: "",
    recommendedMeta:
      "Meet the Blue Lagoon Pools team. 20+ years of experience building Houston's finest pools. Licensed, bonded, and award-winning craftsmanship.",
  },
];

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

export default function ReportViewerPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

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
            <h1 className="text-3xl font-bold tracking-tight">
              Blue Lagoon Pools
            </h1>
            <p className="mt-1 text-muted-foreground">
              SEO/AEO/GEO Optimization Report &middot; March 6, 2026
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Download DOCX
            </Button>
            <Button>
              <Download className="h-4 w-4" />
              Full Package (.zip)
            </Button>
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

      {/* Tab content */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Score overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Current Score
                </p>
                <div className="flex justify-center">
                  <ScoreCircle score={34} size="lg" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across 12 pages
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Projected Score
                </p>
                <div className="flex justify-center">
                  <ScoreCircle score={82} size="lg" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  After implementation
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Score Improvement
                </p>
                <div className="flex items-center justify-center h-16">
                  <span className="text-4xl font-bold text-success">+48</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  points average lift
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: "Add Answer Blocks & FAQ Sections",
                  impact: "High",
                  description:
                    "10 of 12 pages are missing answer blocks. Adding these positions content for AI engine citations and featured snippets.",
                },
                {
                  title: "Implement Comprehensive Schema Markup",
                  impact: "High",
                  description:
                    "Only 1 page has any schema. Adding LocalBusiness, Service, FAQPage, and Review schema across all pages improves rich result eligibility.",
                },
                {
                  title: "Build Topical Authority with Content Clusters",
                  impact: "Medium-High",
                  description:
                    "Currently 12 pages with weak internal linking. Building 3 content clusters with pillar pages will establish topical authority.",
                },
              ].map((opp, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-xl bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{opp.title}</h4>
                      <Badge
                        variant={
                          opp.impact === "High" ? "destructive" : "warning"
                        }
                      >
                        {opp.impact} Impact
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {opp.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "pages" && (
        <div className="space-y-3">
          {/* Title tag comparison table */}
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
                    {demoPages.map((page) => (
                      <tr key={page.url}>
                        <td className="py-3 pr-4 font-medium whitespace-nowrap">
                          {page.title}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {page.currentTitle || (
                            <span className="italic text-destructive/60">
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-foreground">
                          {page.recommendedTitle}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Individual page cards */}
          {demoPages.map((page) => (
            <Card key={page.url}>
              <CardContent className="p-0">
                <button
                  onClick={() =>
                    setExpandedPage(
                      expandedPage === page.url ? null : page.url
                    )
                  }
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <ScoreCircle score={page.currentScore} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">
                          {page.title}
                        </h3>
                        <Badge variant="secondary">{page.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {page.url} &middot; {page.issues} issues
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        Projected
                      </p>
                      <p className="text-sm font-semibold text-success">
                        {page.projectedScore}/100
                      </p>
                    </div>
                    {expandedPage === page.url ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedPage === page.url && (
                  <div className="border-t p-5 space-y-4">
                    {/* Meta comparison */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Current Title
                        </p>
                        <p className="text-sm p-2 rounded bg-destructive/5 text-foreground">
                          {page.currentTitle || (
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
                          <button
                            onClick={() =>
                              handleCopy(
                                page.recommendedTitle,
                                `title-${page.url}`
                              )
                            }
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {copied === `title-${page.url}` ? (
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
                        <p className="text-sm p-2 rounded bg-success/5 text-foreground">
                          {page.recommendedTitle}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Current Meta
                        </p>
                        <p className="text-sm p-2 rounded bg-destructive/5 text-foreground">
                          {page.currentMeta || (
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
                          <button
                            onClick={() =>
                              handleCopy(
                                page.recommendedMeta,
                                `meta-${page.url}`
                              )
                            }
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {copied === `meta-${page.url}` ? (
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
                        <p className="text-sm p-2 rounded bg-success/5 text-foreground">
                          {page.recommendedMeta}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "schema" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Schema Code</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Download All (.zip)
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Ready-to-paste JSON-LD structured data for each page. Copy
                individual blocks or download the complete package.
              </p>

              {[
                {
                  page: "Homepage",
                  types: ["LocalBusiness", "WebSite"],
                  code: `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Blue Lagoon Pools",
  "description": "Houston's trusted pool builder since 2005.",
  "url": "https://bluelagoonpools.com",
  "telephone": "(713) 555-0123",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Pool Lane",
    "addressLocality": "Houston",
    "addressRegion": "TX",
    "postalCode": "77001"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 29.7604,
    "longitude": -95.3698
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  }
}`,
                },
                {
                  page: "Pool Construction",
                  types: ["Service", "FAQPage"],
                  code: `{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Custom Pool Construction",
  "description": "Expert inground pool construction in Houston, TX.",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Blue Lagoon Pools"
  },
  "areaServed": {
    "@type": "City",
    "name": "Houston"
  },
  "serviceType": "Pool Construction"
}`,
                },
              ].map((schema) => (
                <div key={schema.page} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {schema.page}
                      </h4>
                      {schema.types.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(schema.code, `schema-${schema.page}`)
                      }
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {copied === `schema-${schema.page}` ? (
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
                  <pre className="rounded-lg bg-foreground/[0.03] border p-4 overflow-x-auto text-xs font-mono text-foreground">
                    {schema.code}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "roadmap" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Implementation Roadmap</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[
                {
                  phase: "Foundation",
                  weeks: "Weeks 1-2",
                  tasks: [
                    {
                      task: "Fix robots.txt to allow AI crawlers",
                      priority: "Critical",
                      role: "Developer",
                    },
                    {
                      task: "Claim and optimize GBP listing",
                      priority: "Critical",
                      role: "SEO Manager",
                    },
                    {
                      task: "Add missing title tags and meta descriptions",
                      priority: "High",
                      role: "Content Writer",
                    },
                    {
                      task: "Implement site-wide schema markup",
                      priority: "High",
                      role: "Developer",
                    },
                  ],
                },
                {
                  phase: "Content Sprint",
                  weeks: "Weeks 3-6",
                  tasks: [
                    {
                      task: "Add answer blocks to all service pages",
                      priority: "High",
                      role: "Content Writer",
                    },
                    {
                      task: "Write FAQ sections (5+ Q&As per page)",
                      priority: "High",
                      role: "Content Writer",
                    },
                    {
                      task: "Expand thin pages to 1,500+ words",
                      priority: "Medium",
                      role: "Content Writer",
                    },
                    {
                      task: "Build pillar content cluster pages",
                      priority: "Medium",
                      role: "Content Strategist",
                    },
                  ],
                },
                {
                  phase: "Authority Building",
                  weeks: "Weeks 7-12",
                  tasks: [
                    {
                      task: "Execute link building outreach",
                      priority: "Medium",
                      role: "SEO Manager",
                    },
                    {
                      task: "Submit to local directories",
                      priority: "Medium",
                      role: "SEO Manager",
                    },
                    {
                      task: "Launch review generation campaign",
                      priority: "High",
                      role: "Account Manager",
                    },
                    {
                      task: "Publish 4-6 new blog posts",
                      priority: "Medium",
                      role: "Content Writer",
                    },
                  ],
                },
              ].map((phase) => (
                <div key={phase.phase}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-base font-semibold">
                      {phase.phase}
                    </h3>
                    <Badge variant="secondary">{phase.weeks}</Badge>
                  </div>
                  <div className="space-y-2">
                    {phase.tasks.map((task, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                          <span className="text-sm">{task.task}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              task.priority === "Critical"
                                ? "destructive"
                                : task.priority === "High"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {task.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholder for other tabs */}
      {!["summary", "pages", "schema", "roadmap"].includes(activeTab) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              This section will be populated with data from the AI pipeline
              once connected to Supabase.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
