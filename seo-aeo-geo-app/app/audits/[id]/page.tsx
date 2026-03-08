"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  SkipForward,
  XCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";

type AuditLog = {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success" | "skip";
  agent: string | null;
  message: string;
  detail: string | null;
  page_url: string | null;
};

type JobData = {
  id: string;
  status: string;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  total_pages_audited: number | null;
  clients: {
    id: string;
    name: string;
    website_url: string;
  } | null;
};

const STEP_MAP: Record<
  string,
  { label: string; description: string; icon: React.ElementType }
> = {
  crawling: {
    label: "Site Crawl & Scoring",
    description: "Fetching pages and scoring against SEO rubric",
    icon: Globe,
  },
  analyzing_competitors: {
    label: "Competitor Intelligence",
    description: "Analyzing competitors and identifying gaps",
    icon: BarChart3,
  },
  optimizing_pages: {
    label: "Page Optimization",
    description: "Generating recommendations for each page",
    icon: Zap,
  },
  generating_report: {
    label: "Off-Page & Report",
    description: "Building strategy and assembling deliverables",
    icon: FileText,
  },
};

const STEP_ORDER = [
  "crawling",
  "analyzing_competitors",
  "optimizing_pages",
  "generating_report",
];

function getStepStatus(
  stepKey: string,
  currentStatus: string
): "completed" | "running" | "pending" | "failed" {
  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  const stepIdx = STEP_ORDER.indexOf(stepKey);

  if (currentStatus === "completed") return "completed";
  if (currentStatus === "failed") {
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "failed";
    return "pending";
  }
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "running";
  return "pending";
}

function levelColor(level: string) {
  switch (level) {
    case "error":
      return "text-destructive";
    case "warn":
      return "text-warning";
    case "success":
      return "text-success";
    case "skip":
      return "text-muted-foreground italic";
    default:
      return "text-foreground";
  }
}

function levelIcon(level: string) {
  switch (level) {
    case "error":
      return <XCircle className="h-3 w-3 text-destructive shrink-0" />;
    case "success":
      return <CheckCircle2 className="h-3 w-3 text-success shrink-0" />;
    case "skip":
      return <SkipForward className="h-3 w-3 text-muted-foreground shrink-0" />;
    case "warn":
      return <AlertCircle className="h-3 w-3 text-warning shrink-0" />;
    default:
      return null;
  }
}

export default function AuditProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleDelete = async () => {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  // Fetch initial job data
  useEffect(() => {
    fetch(`/api/jobs/${jobId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setJob(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  // Fetch existing logs
  useEffect(() => {
    supabase
      .from("audit_logs")
      .select("*")
      .eq("job_id", jobId)
      .order("timestamp", { ascending: true })
      .then(({ data }) => {
        if (data) setLogs(data as AuditLog[]);
      });
  }, [jobId]);

  // Subscribe to real-time job updates
  useEffect(() => {
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "audit_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          setJob((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as AuditLog]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Elapsed timer
  useEffect(() => {
    if (!job?.started_at || job.status === "completed" || job.status === "failed")
      return;
    const startTime = new Date(job.started_at).getTime();
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [job?.started_at, job?.status]);

  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";
  const clientName = job?.clients?.name || "Audit";

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h2 className="text-xl font-semibold">Audit not found</h2>
        <p className="mt-2 text-muted-foreground">
          This audit may have been deleted or the ID is invalid.
        </p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">{clientName}</h1>
            <p className="mt-1 text-muted-foreground">
              {isComplete
                ? "SEO/AEO/GEO Audit complete"
                : isFailed
                ? "SEO/AEO/GEO Audit failed"
                : "SEO/AEO/GEO Audit in progress"}
            </p>
          </div>
          <div className="flex gap-2">
            {isComplete && (
              <>
                <Link href={`/audits/${jobId}/report`}>
                  <Button>
                    <Eye className="h-4 w-4" />
                    View Report
                  </Button>
                </Link>
                <a href={`/api/jobs/${jobId}/download?format=docx`}>
                  <Button variant="outline">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </a>
              </>
            )}
            {(isComplete || isFailed) && (
              <Link href={`/audits/new?rerun=${jobId}`}>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Re-run
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
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
                  {job.current_step || "Initializing..."}
                </p>
              </div>
            </div>
            {elapsed > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatElapsed(elapsed)}
              </div>
            )}
          </div>
          <Progress value={job.progress} className="h-2.5" />
          {isFailed && job.error_message && (
            <p className="mt-3 text-sm text-destructive">{job.error_message}</p>
          )}
        </CardContent>
      </Card>

      {/* Pipeline steps */}
      <div className="space-y-3">
        {STEP_ORDER.map((stepKey) => {
          const step = STEP_MAP[stepKey];
          const status = getStepStatus(stepKey, job.status);
          const Icon = step.icon;
          return (
            <Card
              key={stepKey}
              className={
                status === "running"
                  ? "border-primary/30 shadow-md shadow-primary/5"
                  : ""
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">
                    {status === "completed" && (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    )}
                    {status === "running" && (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    )}
                    {status === "pending" && (
                      <Circle className="h-6 w-6 text-muted-foreground/30" />
                    )}
                    {status === "failed" && (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          status === "pending"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </h3>
                      {status === "running" && (
                        <Badge variant="default">In Progress</Badge>
                      )}
                      {status === "completed" && (
                        <Badge variant="success">Done</Badge>
                      )}
                      {status === "failed" && (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                      status === "completed"
                        ? "bg-success/10"
                        : status === "running"
                        ? "bg-primary/10"
                        : status === "failed"
                        ? "bg-destructive/10"
                        : "bg-muted"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        status === "completed"
                          ? "text-success"
                          : status === "running"
                          ? "text-primary"
                          : status === "failed"
                          ? "text-destructive"
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

      {/* Live output log */}
      {logs.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Live Output
              {!isComplete && !isFailed && (
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  {levelIcon(log.level)}
                  <span className="text-muted-foreground/60 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.agent && (
                    <span className="text-primary/70 shrink-0">
                      [{log.agent}]
                    </span>
                  )}
                  <span className={levelColor(log.level)}>{log.message}</span>
                  {log.page_url && (
                    <span className="text-muted-foreground/50 truncate">
                      {log.page_url}
                    </span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed actions */}
      {isComplete && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3">Download Package</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your audit is complete.{" "}
              {job.total_pages_audited
                ? `${job.total_pages_audited} pages audited.`
                : ""}{" "}
              Download your deliverables below.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/jobs/${jobId}/download?format=docx`}>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  DOCX Report
                </Button>
              </a>
              <a href={`/api/jobs/${jobId}/download?format=csv`}>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Roadmap CSV
                </Button>
              </a>
              <a href={`/api/jobs/${jobId}/download?format=schema`}>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Schema Code (.zip)
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
