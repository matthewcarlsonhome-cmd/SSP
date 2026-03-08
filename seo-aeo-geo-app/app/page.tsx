"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Download,
  Eye,
  TrendingUp,
  Users,
  FileBarChart,
  ArrowRight,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

type AuditClient = {
  id: string;
  name: string;
  website_url: string;
  target_geography: string | null;
  industry: string | null;
};

type Audit = {
  id: string;
  status: string;
  progress: number;
  current_step: string | null;
  created_at: string;
  total_pages_audited: number | null;
  clients: AuditClient | null;
};

export default function DashboardPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAudits(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAudits((prev) => prev.filter((a) => a.id !== id));
      }
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  const completedCount = audits.filter((a) => a.status === "completed").length;
  const clientCount = new Set(audits.map((a) => a.clients?.id).filter(Boolean)).size;
  return (
    <div className="space-y-10">
      {/* Hero section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-2 text-base text-muted-foreground max-w-lg">
            Manage your client audits and generate comprehensive SEO, AEO, and
            GEO optimization packages.
          </p>
        </div>
        <Link href="/audits/new">
          <Button size="lg" className="shadow-md">
            <PlusCircle className="h-5 w-5" />
            New Audit
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Clients", value: clientCount, icon: Users },
          { label: "Audits Run", value: audits.length, icon: FileBarChart },
          { label: "Completed", value: completedCount, icon: TrendingUp },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Audits */}
      {audits.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Recent Audits</h2>
            <Link href="/clients" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all clients <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {audits.map((audit) => (
              <Card key={audit.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {audit.clients?.name || "Unknown Client"}
                        </h3>
                        <Badge variant={audit.status === "completed" ? "success" : audit.status === "failed" ? "destructive" : "default"}>
                          {audit.status === "completed" ? "Completed" : audit.status === "failed" ? "Failed" : "Running"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {audit.clients?.target_geography || audit.clients?.industry || ""} &middot; {formatDate(audit.created_at)}
                        {audit.total_pages_audited ? ` · ${audit.total_pages_audited} pages` : ""}
                      </p>
                      {audit.status !== "completed" && audit.status !== "failed" && (
                        <div className="mt-3 max-w-md">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{audit.current_step || "Processing..."}</span>
                            <span>{audit.progress}%</span>
                          </div>
                          <Progress value={audit.progress} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {audit.status === "completed" && (
                        <>
                          <Link href={`/audits/${audit.id}/report`}>
                            <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button>
                          </Link>
                          <a href={`/api/jobs/${audit.id}/download?format=docx`}>
                            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Download</Button>
                          </a>
                        </>
                      )}
                      {(audit.status === "completed" || audit.status === "failed") && audit.clients && (
                        <Link href={`/audits/new?rerun=${audit.id}`}>
                          <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" /> Re-run</Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(audit.id)}
                        disabled={deletingId === audit.id}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && audits.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <FileBarChart className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No audits yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Start your first client audit to generate a comprehensive SEO/AEO/GEO optimization package.
            </p>
            <Link href="/audits/new" className="mt-6">
              <Button><PlusCircle className="h-4 w-4" /> Create Your First Audit</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
