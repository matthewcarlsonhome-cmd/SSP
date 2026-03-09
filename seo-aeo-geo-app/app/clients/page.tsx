"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Globe,
  Calendar,
  FileBarChart,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type ClientItem = {
  id: string;
  name: string;
  website_url: string;
  industry: string | null;
  target_geography: string | null;
  audit_count: number;
  last_audit_date: string | null;
  last_audit_status: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (clientId: string, clientName: string) => {
    if (!confirm(`Delete "${clientName}" and all their audits? This cannot be undone.`)) return;
    setDeletingId(clientId);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete client");
      }
    } catch {
      alert("Failed to delete client");
    }
    setDeletingId(null);
  };

  useEffect(() => {
    fetch("/api/clients", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.website_url.toLowerCase().includes(search.toLowerCase()) ||
          (c.industry || "").toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-2 text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""} in your
            portfolio
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
      {clients.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Client grid */}
      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <Card key={client.id} className="h-full transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <Link href={`/clients/${client.id}`} className="flex-1 min-w-0 cursor-pointer">
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      {client.website_url.replace(/^https?:\/\//, "")}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(client.id, client.name)}
                    disabled={deletingId === client.id}
                    className="shrink-0 text-muted-foreground hover:text-destructive -mr-2 -mt-2"
                  >
                    {deletingId === client.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Link href={`/clients/${client.id}`} className="block cursor-pointer">
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.industry && (
                      <Badge variant="secondary">{client.industry}</Badge>
                    )}
                    {client.target_geography && (
                      <span className="text-xs text-muted-foreground">
                        {client.target_geography}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-4 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileBarChart className="h-3.5 w-3.5" />
                        {client.audit_count} audit
                        {client.audit_count !== 1 ? "s" : ""}
                      </span>
                      {client.last_audit_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(client.last_audit_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <FileBarChart className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No clients yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first audit to add a client to your portfolio.
            </p>
            <Link href="/audits/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Create Your First Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {search && filtered.length === 0 && clients.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No clients match &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}
