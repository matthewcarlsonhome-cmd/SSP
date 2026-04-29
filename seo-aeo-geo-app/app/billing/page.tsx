"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  LogIn,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

// Credit costs per model
const MODEL_COSTS = {
  haiku: { credits: 1, label: "Haiku", description: "Fast & affordable", speed: "~3-5 min" },
  sonnet: { credits: 5, label: "Sonnet", description: "Premium quality", speed: "~5-8 min" },
};

// Pricing info (matches migration seed data)
const PACKAGES = [
  {
    name: "Starter",
    credits: 5,
    priceCents: 999,
    popular: false,
    description: "Perfect for trying it out",
    audits: { haiku: 5, sonnet: 1 },
  },
  {
    name: "Professional",
    credits: 15,
    priceCents: 2499,
    popular: true,
    description: "Best value for regular use",
    audits: { haiku: 15, sonnet: 3 },
  },
  {
    name: "Agency",
    credits: 50,
    priceCents: 6999,
    popular: false,
    description: "For teams and agencies",
    audits: { haiku: 50, sonnet: 10 },
  },
];

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  model_used: string | null;
  created_at: string;
};

export default function BillingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setLoadingTx(true);
      fetch("/api/billing/transactions", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
        })
        .catch(() => {})
        .finally(() => setLoadingTx(false));
    }
  }, [user]);

  const handlePurchase = async (packageName: string) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setPurchasing(packageName);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handle error
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
        <p className="mt-2 text-muted-foreground">
          Purchase credits to run SEO audits. Each audit uses credits based on the AI model selected.
        </p>
      </div>

      {/* Current balance (if logged in) */}
      {user && profile && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-4xl font-bold text-primary mt-1">
                  {profile.credits} <span className="text-lg font-normal text-muted-foreground">credits</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  = {profile.credits} Haiku audits or {Math.floor(profile.credits / 5)} Sonnet audits
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Audit Cost by Model</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(MODEL_COSTS).map(([key, model]) => (
            <Card key={key}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{model.label}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{model.description}</p>
                  </div>
                  <Badge variant={key === "sonnet" ? "default" : "secondary"}>
                    {model.credits} {model.credits === 1 ? "credit" : "credits"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {model.speed}
                  </span>
                  {key === "sonnet" && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Higher quality output
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Estimated API cost: <span className="font-medium">
                      {key === "haiku" ? "~$0.15-0.30" : "~$1.50-3.00"}
                    </span> per audit
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing packages */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Buy Credits</h2>
        {!user && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <LogIn className="h-3.5 w-3.5 inline mr-1" />
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              {" "}to purchase credits and track your usage. New users get 3 free credits.
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.name}
              className={pkg.popular ? "border-primary shadow-md shadow-primary/10 relative" : ""}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="shadow-sm">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">${(pkg.priceCents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground ml-1">USD</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span><strong>{pkg.credits}</strong> credits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>{pkg.audits.haiku} Haiku audits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>{pkg.audits.sonnet} Sonnet audits</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span>${(pkg.priceCents / 100 / pkg.credits).toFixed(2)}/credit</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.name)}
                  disabled={purchasing === pkg.name}
                >
                  {purchasing === pkg.name ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Buy ${pkg.credits} Credits`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction history (if logged in) */}
      {user && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
          <Card>
            <CardContent className="p-0">
              {loadingTx ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No transactions yet. Purchase credits to get started.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()} &middot;{" "}
                          {tx.type === "usage" ? "Used" : tx.type === "purchase" ? "Purchased" : tx.type}
                          {tx.model_used && ` (${tx.model_used})`}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          tx.amount > 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAQ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pricing FAQ</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Why two models?</p>
              <p className="text-muted-foreground mt-0.5">
                <strong>Haiku</strong> is fast and affordable — great for initial audits and regular monitoring.
                <strong> Sonnet</strong> produces higher-quality analysis with more nuanced recommendations — ideal for premium client deliverables.
              </p>
            </div>
            <div>
              <p className="font-medium">What does one credit get me?</p>
              <p className="text-muted-foreground mt-0.5">
                One credit runs a complete 5-agent SEO/AEO/GEO audit using Haiku. This includes site crawl,
                competitor analysis, page optimization, off-page strategy, and a formatted report — typically
                20-40 hours of manual work.
              </p>
            </div>
            <div>
              <p className="font-medium">Do credits expire?</p>
              <p className="text-muted-foreground mt-0.5">
                No. Credits never expire and can be used anytime.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
