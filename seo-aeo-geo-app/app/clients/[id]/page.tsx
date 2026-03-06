"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Star,
  Calendar,
  PlusCircle,
  Eye,
  Download,
  RotateCcw,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const client = {
  id: "1",
  name: "Blue Lagoon Pools",
  website: "https://bluelagoonpools.com",
  businessType: "Pool construction & renovation",
  industry: "Home Services",
  location: "Houston, TX",
  primaryGoal: "Leads",
  gbpUrl: "https://g.page/bluelagoonpools",
  reviewCount: 127,
  avgRating: 4.8,
  cmsPlatform: "WordPress",
  notes: "Long-time SSP client. Very engaged owner.",
  createdAt: "2026-01-15",
};

const auditHistory = [
  {
    id: "audit-3",
    date: "2026-03-06",
    status: "completed",
    score: 34,
    projectedScore: 82,
    pages: 12,
    cost: 2.15,
  },
  {
    id: "audit-2",
    date: "2026-02-15",
    status: "completed",
    score: 31,
    projectedScore: 78,
    pages: 10,
    cost: 1.85,
  },
  {
    id: "audit-1",
    date: "2026-01-20",
    status: "completed",
    score: 28,
    projectedScore: 75,
    pages: 8,
    cost: 1.55,
  },
];

export default function ClientProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {client.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm">
                <Globe className="h-4 w-4" />
                {client.website.replace("https://", "")}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                {client.location}
              </span>
            </div>
          </div>
          <Link href="/audits/new">
            <Button>
              <PlusCircle className="h-4 w-4" />
              New Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Client details grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Industry
            </p>
            <p className="mt-1 font-semibold">{client.industry}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Primary Goal
            </p>
            <p className="mt-1 font-semibold">{client.primaryGoal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              GBP Rating
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="h-4 w-4 text-warning fill-warning" />
              <span className="font-semibold">{client.avgRating}</span>
              <span className="text-sm text-muted-foreground">
                ({client.reviewCount} reviews)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              CMS Platform
            </p>
            <p className="mt-1 font-semibold">{client.cmsPlatform}</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Audit History</h2>
        <div className="space-y-3">
          {auditHistory.map((audit) => (
            <Card key={audit.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">
                          {formatDate(audit.date)}
                        </span>
                        <Badge variant="success">Completed</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm">
                        <span className="text-muted-foreground">
                          {audit.pages} pages
                        </span>
                        <span className="text-muted-foreground">
                          ${audit.cost.toFixed(2)} cost
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-destructive">
                            {audit.score}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold text-success">
                            {audit.projectedScore}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
