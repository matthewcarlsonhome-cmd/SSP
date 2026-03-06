"use client";

import Link from "next/link";
import {
  PlusCircle,
  Download,
  Eye,
  RotateCcw,
  TrendingUp,
  Users,
  FileBarChart,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, getStatusColor } from "@/lib/utils";

// Demo data — will be replaced with Supabase queries
type Audit = {
  id: string;
  clientName: string;
  location: string;
  date: string;
  status: string;
  currentScore?: number;
  projectedScore?: number;
  pagesAudited: number;
  progress?: number;
  currentStep?: string;
};

const recentAudits: Audit[] = [
  {
    id: "1",
    clientName: "Blue Lagoon Pools",
    location: "Houston, TX",
    date: "2026-03-06",
    status: "completed",
    currentScore: 34,
    projectedScore: 82,
    pagesAudited: 12,
  },
  {
    id: "2",
    clientName: "Premier Pool Service",
    location: "Dallas, TX",
    date: "2026-03-06",
    status: "crawling",
    progress: 78,
    currentStep: "Optimizing pages (6/11)",
    pagesAudited: 11,
  },
  {
    id: "3",
    clientName: "Desert Oasis Pools",
    location: "Phoenix, AZ",
    date: "2026-03-04",
    status: "completed",
    currentScore: 22,
    projectedScore: 74,
    pagesAudited: 8,
  },
];

const stats = [
  {
    label: "Total Clients",
    value: "8",
    icon: Users,
    change: "+2 this month",
  },
  {
    label: "Audits Run",
    value: "12",
    icon: FileBarChart,
    change: "3 this week",
  },
  {
    label: "Avg. Score Lift",
    value: "31 → 77",
    icon: TrendingUp,
    change: "+46 points avg",
  },
];

export default function DashboardPage() {
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.change}
                    </p>
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
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Recent Audits
          </h2>
          <Link
            href="/clients"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all clients
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentAudits.map((audit) => (
            <Card
              key={audit.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Client info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {audit.clientName}
                      </h3>
                      <Badge
                        variant={
                          audit.status === "completed"
                            ? "success"
                            : audit.status === "failed"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {audit.status === "completed"
                          ? "Completed"
                          : audit.status === "failed"
                          ? "Failed"
                          : "Running"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {audit.location} &middot; {formatDate(audit.date)} &middot;{" "}
                      {audit.pagesAudited} pages
                    </p>

                    {/* Running state */}
                    {audit.status !== "completed" &&
                      audit.status !== "failed" && (
                        <div className="mt-3 max-w-md">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{audit.currentStep}</span>
                            <span>{audit.progress}%</span>
                          </div>
                          <Progress value={audit.progress} />
                        </div>
                      )}

                    {/* Completed score */}
                    {audit.status === "completed" && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-semibold text-destructive">
                          {audit.currentScore}/100
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-success">
                          {audit.projectedScore}/100
                        </span>
                        <span className="text-xs text-muted-foreground">
                          projected
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {audit.status === "completed" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/audits/${audit.id}/report`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Re-run
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty state (shown when no audits exist) */}
      {recentAudits.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <FileBarChart className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No audits yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Start your first client audit to generate a comprehensive
              SEO/AEO/GEO optimization package.
            </p>
            <Link href="/audits/new" className="mt-6">
              <Button>
                <PlusCircle className="h-4 w-4" />
                Create Your First Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
