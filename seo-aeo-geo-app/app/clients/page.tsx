"use client";

import Link from "next/link";
import {
  Plus,
  Search,
  Globe,
  Calendar,
  FileBarChart,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const demoClients = [
  {
    id: "1",
    name: "Blue Lagoon Pools",
    website: "bluelagoonpools.com",
    industry: "Home Services",
    location: "Houston, TX",
    audits: 3,
    lastAudit: "2026-03-06",
    latestScore: 34,
    projectedScore: 82,
  },
  {
    id: "2",
    name: "Premier Pool Service",
    website: "premierpoolservice.com",
    industry: "Home Services",
    location: "Dallas, TX",
    audits: 1,
    lastAudit: "2026-03-06",
    latestScore: 29,
    projectedScore: null,
  },
  {
    id: "3",
    name: "Desert Oasis Pools",
    website: "desertoasispools.com",
    industry: "Home Services",
    location: "Phoenix, AZ",
    audits: 2,
    lastAudit: "2026-03-04",
    latestScore: 22,
    projectedScore: 74,
  },
  {
    id: "4",
    name: "Smith & Associates Law",
    website: "smithlawfirm.com",
    industry: "Legal",
    location: "Austin, TX",
    audits: 1,
    lastAudit: "2026-02-28",
    latestScore: 45,
    projectedScore: 78,
  },
  {
    id: "5",
    name: "Downtown Medical Group",
    website: "downtownmedical.com",
    industry: "Medical / Healthcare",
    location: "San Antonio, TX",
    audits: 1,
    lastAudit: "2026-02-25",
    latestScore: 38,
    projectedScore: 71,
  },
];

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-2 text-muted-foreground">
            {demoClients.length} clients in your portfolio
          </p>
        </div>
        <Link href="/audits/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." className="pl-10" />
      </div>

      {/* Client grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demoClients.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {client.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    {client.website}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{client.industry}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {client.location}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileBarChart className="h-3.5 w-3.5" />
                      {client.audits} audit{client.audits !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(client.lastAudit)}
                    </span>
                  </div>
                  {client.latestScore && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-semibold text-destructive">
                        {client.latestScore}
                      </span>
                      {client.projectedScore && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold text-success">
                            {client.projectedScore}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
