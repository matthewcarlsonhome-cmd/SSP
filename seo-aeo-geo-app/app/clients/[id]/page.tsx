"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type ClientData = {
  id: string;
  name: string;
  website_url: string;
  business_type: string | null;
  industry: string | null;
  target_geography: string | null;
  primary_goal: string | null;
  gbp_url: string | null;
  gbp_review_count: number | null;
  gbp_average_rating: number | null;
  cms_platform: string | null;
  notes: string | null;
  created_at: string;
  audits: Array<{
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    total_pages_audited: number | null;
    estimated_cost: number | null;
  }>;
};

export default function ClientProfilePage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAudit = async (auditId: string) => {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    setDeletingId(auditId);
    try {
      const res = await fetch(`/api/jobs/${auditId}`, { method: "DELETE" });
      if (res.ok && client) {
        setClient({
          ...client,
          audits: client.audits.filter((a) => a.id !== auditId),
        });
      }
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  useEffect(() => {
    fetch(`/api/clients/${clientId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setClient(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <Link href="/clients" className="mt-4 inline-block">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
    );
  }

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
                {client.website_url.replace(/^https?:\/\//, "")}
              </span>
              {client.target_geography && (
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {client.target_geography}
                </span>
              )}
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
        {client.industry && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                Industry
              </p>
              <p className="mt-1 font-semibold">{client.industry}</p>
            </CardContent>
          </Card>
        )}
        {client.primary_goal && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                Primary Goal
              </p>
              <p className="mt-1 font-semibold">{client.primary_goal}</p>
            </CardContent>
          </Card>
        )}
        {client.gbp_average_rating && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                GBP Rating
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="h-4 w-4 text-warning fill-warning" />
                <span className="font-semibold">
                  {client.gbp_average_rating}
                </span>
                {client.gbp_review_count && (
                  <span className="text-sm text-muted-foreground">
                    ({client.gbp_review_count} reviews)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {client.cms_platform && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                CMS Platform
              </p>
              <p className="mt-1 font-semibold">{client.cms_platform}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Audit History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Audit History</h2>
        {client.audits.length > 0 ? (
          <div className="space-y-3">
            {client.audits.map((audit) => (
              <Card
                key={audit.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">
                            {formatDate(audit.created_at)}
                          </span>
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
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          {audit.total_pages_audited && (
                            <span>{audit.total_pages_audited} pages</span>
                          )}
                          {audit.estimated_cost && (
                            <span>
                              ${audit.estimated_cost.toFixed(2)} cost
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {audit.status === "completed" && (
                        <>
                          <Link href={`/audits/${audit.id}/report`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                          <a
                            href={`/api/jobs/${audit.id}/download?format=docx`}
                          >
                            <Button variant="outline" size="sm">
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          </a>
                        </>
                      )}
                      {audit.status !== "completed" &&
                        audit.status !== "failed" && (
                          <Link href={`/audits/${audit.id}`}>
                            <Button variant="outline" size="sm">
                              View Progress
                            </Button>
                          </Link>
                        )}
                      {(audit.status === "completed" || audit.status === "failed") && (
                        <Link href={`/audits/new?rerun=${audit.id}`}>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Re-run
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAudit(audit.id)}
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
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No audits have been run for this client yet.
              </p>
              <Link href="/audits/new" className="mt-4 inline-block">
                <Button size="sm">
                  <PlusCircle className="h-4 w-4" />
                  Run First Audit
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
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
