"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Download,
  Eye,
  Clock,
  Globe,
  BarChart3,
  FileText,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type PipelineStep = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: "completed" | "running" | "pending";
  detail?: string;
};

// Demo state — will be driven by Supabase real-time subscription
const demoSteps: PipelineStep[] = [
  {
    id: "crawl",
    label: "Site Crawl & Scoring",
    description: "Fetching pages and scoring against SEO rubric",
    icon: Globe,
    status: "completed",
    detail: "12 pages found and scored",
  },
  {
    id: "competitor",
    label: "Competitor Intelligence",
    description: "Analyzing competitors and identifying gaps",
    icon: BarChart3,
    status: "completed",
    detail: "4 competitors analyzed",
  },
  {
    id: "optimize",
    label: "Page Optimization",
    description: "Generating recommendations for each page",
    icon: Zap,
    status: "running",
    detail: "Processing page 8 of 12: /services/pool-renovation",
  },
  {
    id: "offpage",
    label: "Off-Page Strategy",
    description: "Building link, citation, and review strategy",
    icon: FileText,
    status: "pending",
  },
  {
    id: "report",
    label: "Report Generation",
    description: "Assembling deliverable package",
    icon: Download,
    status: "pending",
  },
];

export default function AuditProgressPage() {
  const [steps] = useState<PipelineStep[]>(demoSteps);
  const [elapsed, setElapsed] = useState(262);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = Math.round((completedSteps / steps.length) * 100) +
    (steps.some((s) => s.status === "running")
      ? Math.round((1 / steps.length) * 67)
      : 0);

  const isComplete = steps.every((s) => s.status === "completed");
  const isFailed = false;

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const runningStep = steps.find((s) => s.status === "running");

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Blue Lagoon Pools
            </h1>
            <p className="mt-1 text-muted-foreground">
              SEO/AEO/GEO Audit in progress
            </p>
          </div>
          {isComplete && (
            <div className="flex gap-2">
              <Link href={`/audits/1/report`}>
                <Button>
                  <Eye className="h-4 w-4" />
                  View Report
                </Button>
              </Link>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Download Package
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {!isComplete && !isFailed && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              )}
              {isComplete && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              )}
              {isFailed && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isComplete
                    ? "Audit Complete"
                    : isFailed
                    ? "Audit Failed"
                    : "Audit Running"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completedSteps} of {steps.length} steps completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatElapsed(elapsed)}
            </div>
          </div>
          <Progress value={progress} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Pipeline steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.id}
              className={
                step.status === "running"
                  ? "border-primary/30 shadow-md shadow-primary/5"
                  : ""
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className="mt-0.5 shrink-0">
                    {step.status === "completed" && (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    )}
                    {step.status === "running" && (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    )}
                    {step.status === "pending" && (
                      <Circle className="h-6 w-6 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          step.status === "pending"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </h3>
                      {step.status === "running" && (
                        <Badge variant="default">In Progress</Badge>
                      )}
                      {step.status === "completed" && (
                        <Badge variant="success">Done</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                    {step.detail && (
                      <p className="mt-2 text-xs font-medium text-muted-foreground bg-muted rounded-lg px-3 py-2 inline-block">
                        {step.detail}
                      </p>
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                      step.status === "completed"
                        ? "bg-success/10"
                        : step.status === "running"
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        step.status === "completed"
                          ? "text-success"
                          : step.status === "running"
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live output preview */}
      {runningStep && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm">Live Output Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4 font-mono text-xs text-muted-foreground space-y-1.5">
              <p>
                Currently optimizing: /services/pool-renovation
              </p>
              <p>Health Score: 28/100</p>
              <p>
                Issues found: Missing answer block, no schema, thin content (340
                words vs competitor avg 2,100), no FAQ section, title not
                keyword-optimized
              </p>
              <p className="text-primary">
                Generating optimized title tag, meta description, answer block,
                heading structure, FAQ, and JSON-LD schema...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estimated time */}
      {!isComplete && !isFailed && (
        <p className="text-center text-sm text-muted-foreground pb-8">
          Estimated time remaining: ~3 minutes
        </p>
      )}
    </div>
  );
}
