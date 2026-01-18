/**
 * ClientPortalPage.tsx - Marketing-Friendly Client Portal
 *
 * A dedicated landing page for B2B clients showing their curated
 * selection of skills and workflows in a polished, professional format.
 *
 * URL Pattern: /portal/:slug
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  GitBranch,
  Clock,
  ChevronRight,
  ArrowRight,
  Building2,
  Play,
  CheckCircle2,
  Target,
  TrendingUp,
  Shield,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Mail,
  Calendar,
  Calculator,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { getClientBySlug, getClientBySlugAsync } from '../lib/clients';
import { getStaticSkills } from '../lib/skills/registry';
import { WORKFLOWS } from '../lib/workflows';
import { calculateROI } from '../lib/skillTimeSavings';
import type { Client } from '../lib/storage/types';
import type { Skill } from '../types';
import type { Workflow } from '../lib/storage/types';

// Category colors for skill cards
const CATEGORY_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  'job-seeker': { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-500' },
  'governance': { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-pink-500' },
  'excel': { bg: 'bg-green-500/10', text: 'text-green-600', gradient: 'from-green-500 to-emerald-500' },
  'enterprise': { bg: 'bg-amber-500/10', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-500' },
  'sales': { bg: 'bg-red-500/10', text: 'text-red-600', gradient: 'from-red-500 to-rose-500' },
  'product': { bg: 'bg-indigo-500/10', text: 'text-indigo-600', gradient: 'from-indigo-500 to-violet-500' },
  'technical': { bg: 'bg-cyan-500/10', text: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-500' },
  'hr': { bg: 'bg-pink-500/10', text: 'text-pink-600', gradient: 'from-pink-500 to-fuchsia-500' },
  'operations': { bg: 'bg-slate-500/10', text: 'text-slate-600', gradient: 'from-slate-500 to-gray-500' },
  'default': { bg: 'bg-primary/10', text: 'text-primary', gradient: 'from-primary to-primary/70' },
};

// Value propositions for the hero section
const VALUE_PROPS = [
  { icon: Clock, title: 'Save Hours Daily', description: 'Automate repetitive tasks with AI' },
  { icon: TrendingUp, title: 'Boost Productivity', description: 'Get more done in less time' },
  { icon: Shield, title: 'Enterprise Ready', description: 'Secure, reliable, scalable' },
  { icon: Target, title: 'Results Focused', description: 'Proven templates that deliver' },
];

// ═══════════════════════════════════════════════════════════════════════════
// ROI CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a number as currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with commas
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

// ═══════════════════════════════════════════════════════════════════════════
// ROI SECTION COMPONENT (DYNAMIC CALCULATION)
// ═══════════════════════════════════════════════════════════════════════════

interface ROISectionProps {
  client: Client;
  selectedSkills: Skill[];
  selectedWorkflows: Workflow[];
}

const ROISection: React.FC<ROISectionProps> = ({ client, selectedSkills, selectedWorkflows }) => {
  // Calculate ROI dynamically based on selected skills and workflows
  // Using $50/hour as a conservative estimate (typical blended rate for professional services)
  const roi = useMemo(() => {
    if (selectedSkills.length === 0 && selectedWorkflows.length === 0) {
      return null;
    }
    return calculateROI(selectedSkills, selectedWorkflows, 50);
  }, [selectedSkills, selectedWorkflows]);

  // If no skills/workflows selected, don't show ROI section
  if (!roi) {
    return null;
  }

  const { monthlyHours, monthlyCost, annualHours, annualCost, fiveYearCost, fteEquivalent, formatted, skillCount, workflowCount } = roi;

  return (
    <section className="py-16 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30 border-y">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            Projected Return on Investment
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Transform {client.companyName}'s Productivity
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Based on the {skillCount} skills and {workflowCount} workflows selected for your organization,
            here's your projected monthly impact.
          </p>
        </div>

        {/* Main ROI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Time Savings Card */}
          <div className="rounded-2xl bg-white dark:bg-card p-8 shadow-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="font-semibold text-green-700 dark:text-green-400">Monthly Hours</p>
              </div>
            </div>

            <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-600 mb-2">
              {formatted.monthlyHours}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              per month reclaimed for high-value work
            </p>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly</span>
                <span className="font-semibold">{formatNumber(monthlyHours.avg)} hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Annually</span>
                <span className="font-semibold text-green-600">{formatNumber(annualHours.avg)} hours</span>
              </div>
              {fteEquivalent >= 0.1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FTE Equivalent</span>
                  <span className="font-semibold text-green-600">{fteEquivalent.toFixed(1)} FTE</span>
                </div>
              )}
            </div>
          </div>

          {/* Cost Savings Card */}
          <div className="rounded-2xl bg-white dark:bg-card p-8 shadow-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost Savings</p>
                <p className="font-semibold text-green-700 dark:text-green-400">Monthly Value</p>
              </div>
            </div>

            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-2 break-words">
              {formatted.monthlyCost}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              per month in labor and efficiency gains
            </p>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quarterly</span>
                <span className="font-semibold">{formatCurrency(monthlyCost.avg * 3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Annually</span>
                <span className="font-semibold text-green-600">{formatted.annualCost}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">5-Year Value</span>
                <span className="font-semibold text-green-600">{formatted.fiveYearCost}</span>
              </div>
            </div>
          </div>

          {/* ROI Summary Card */}
          <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 p-8 shadow-lg text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-green-100">Annual Impact</p>
                <p className="font-semibold">Total Value</p>
              </div>
            </div>

            <p className="text-4xl sm:text-5xl font-bold mb-2 break-words">
              {formatted.annualCost}
            </p>
            <p className="text-sm text-green-100 mb-6">
              projected first-year return
            </p>

            <div className="space-y-3 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>{skillCount} AI skills selected</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>{workflowCount} automated workflows</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Immediate productivity gains</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skill/Workflow Breakdown */}
        <div className="rounded-2xl bg-white dark:bg-card p-6 shadow-lg mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            How We Calculate Your ROI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Skills ({skillCount})</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Each AI skill automates specific tasks, saving 2-10 hours per month depending on complexity and usage frequency.
              </p>
              <p className="text-sm">
                <span className="font-semibold text-green-600">Your skills save:</span>{' '}
                {formatted.monthlyHours} monthly
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Automated Workflows ({workflowCount})</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Workflows chain multiple skills together for end-to-end automation, delivering 4-12 hours of savings each.
              </p>
              <p className="text-sm">
                <span className="font-semibold text-green-600">Cost basis:</span>{' '}
                $50/hour (conservative professional rate)
              </p>
            </div>
          </div>
        </div>

        {/* Pain Points Section */}
        {client.painPoints && (
          <div className="rounded-2xl bg-white dark:bg-card p-8 shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-center">
              Workflows We'll Automate for {client.companyName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.painPoints.split(',').map((point, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                >
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{point.trim()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            These estimates are calculated based on your specific skill and workflow selections.
            Schedule a call to discuss how these apply to your team.
          </p>
          <Button size="lg" className="bg-green-600 hover:bg-green-700 gap-2">
            <Calendar className="h-5 w-5" />
            Schedule a Custom ROI Analysis
          </Button>
        </div>
      </div>
    </section>
  );
};

const ClientPortalPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load client data (tries Supabase first for external users, falls back to localStorage)
  useEffect(() => {
    async function loadClient() {
      if (!slug) {
        setError('Invalid portal URL');
        setLoading(false);
        return;
      }

      // Try async fetch from Supabase first (works for external users without localStorage)
      const clientData = await getClientBySlugAsync(slug);
      if (!clientData) {
        // Fall back to sync localStorage check
        const localClient = getClientBySlug(slug);
        if (!localClient) {
          setError('Portal not found or inactive');
          setLoading(false);
          return;
        }
        setClient(localClient);
      } else {
        setClient(clientData);
      }
      setLoading(false);
    }

    loadClient();
  }, [slug]);

  // Get selected skills and workflows
  const allSkills = useMemo(() => getStaticSkills(), []);
  const allWorkflows = useMemo(() => Object.values(WORKFLOWS), []);

  const selectedSkills = useMemo(() => {
    if (!client) return [];
    return allSkills.filter(s => client.selectedSkillIds.includes(s.id));
  }, [client, allSkills]);

  const selectedWorkflows = useMemo(() => {
    if (!client) return [];
    return allWorkflows.filter(w => client.selectedWorkflowIds.includes(w.id));
  }, [client, allWorkflows]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, Skill[]> = {};
    selectedSkills.forEach(skill => {
      // Extract category from skill id (e.g., "job-seeker-resume" -> "job-seeker")
      const categoryMatch = skill.id.match(/^([a-z-]+?)-/);
      const category = categoryMatch ? categoryMatch[1] : 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(skill);
    });
    return grouped;
  }, [selectedSkills]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-6" />
          <h1 className="text-2xl font-bold mb-2">Portal Not Available</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'This client portal is not currently active. Please contact us for access.'}
          </p>
          <Button onClick={() => navigate('/')}>
            Visit SkillEngine
          </Button>
        </div>
      </div>
    );
  }

  const headline = client.customHeadline || `AI-Powered Solutions for ${client.companyName}`;
  const message = client.customMessage || `Welcome to your dedicated SkillEngine portal. Explore the curated AI skills and workflows selected specifically for ${client.companyName}'s needs.`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background border-b">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-500/10 to-transparent blur-3xl" />
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-20 relative">
          <div className="text-center mb-12">
            {/* Company Logo (if available) */}
            {client.logoUrl && (
              <div className="mb-6">
                <img
                  src={client.logoUrl}
                  alt={`${client.companyName} logo`}
                  className="h-16 sm:h-20 w-auto mx-auto object-contain"
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Company Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Building2 className="h-4 w-4" />
              <span>Prepared for {client.companyName}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              {headline}
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2" onClick={() => {
                const el = document.getElementById('skills-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Zap className="h-5 w-5" />
                Explore Skills
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2" onClick={() => {
                const el = document.getElementById('workflows-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <GitBranch className="h-5 w-5" />
                View Workflows
              </Button>
            </div>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {VALUE_PROPS.map((prop, i) => (
              <div
                key={i}
                className="text-center p-4 rounded-xl bg-card border hover:border-primary/50 transition-colors"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-3">
                  <prop.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{prop.title}</h3>
                <p className="text-sm text-muted-foreground">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI & Value Proposition Section - Dynamic calculation based on selected skills/workflows */}
      {(selectedSkills.length > 0 || selectedWorkflows.length > 0 || client.painPoints) && (
        <ROISection client={client} selectedSkills={selectedSkills} selectedWorkflows={selectedWorkflows} />
      )}

      {/* Skills Section */}
      <section id="skills-section" className="py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              AI Skills
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              {selectedSkills.length} Curated AI Skills
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each skill is a proven, expert-designed AI prompt that helps your team produce real work in minutes instead of hours.
            </p>
          </div>

          {selectedSkills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No skills have been selected for this portal yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSkills.map(skill => {
                const colors = CATEGORY_COLORS['default'];
                return (
                  <Link
                    key={skill.id}
                    to={`/skill/${skill.id}`}
                    className="group rounded-xl border bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white`}>
                        <Zap className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                          {skill.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    {/* Skill benefits */}
                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Saves hours</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Play className="h-4 w-4" />
                        <span>Try it now</span>
                        <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Workflows Section */}
      <section id="workflows-section" className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 text-sm font-medium mb-4">
              <GitBranch className="h-4 w-4" />
              AI Workflows
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              {selectedWorkflows.length} Automated Workflows
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Complete multi-step processes that chain AI skills together for end-to-end automation.
            </p>
          </div>

          {selectedWorkflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No workflows have been selected for this portal yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedWorkflows.map(workflow => (
                <Link
                  key={workflow.id}
                  to={`/workflow/${workflow.id}`}
                  className="group rounded-xl border bg-card p-6 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <GitBranch className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                        {workflow.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description}
                      </p>
                    </div>
                  </div>

                  {/* Workflow steps preview */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      {workflow.steps.length} Steps:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workflow.steps.slice(0, 5).map((step, i) => (
                        <span
                          key={step.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
                        >
                          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          {step.name}
                        </span>
                      ))}
                      {workflow.steps.length > 5 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                          +{workflow.steps.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Workflow meta */}
                  <div className="pt-4 border-t flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{workflow.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <Play className="h-4 w-4" />
                      <span>Start workflow</span>
                      <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/20 mb-6">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Let's discuss how SkillEngine can help {client.companyName} save time, boost productivity, and deliver better results with AI.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2">
                <Calendar className="h-5 w-5" />
                Schedule a Demo
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <Mail className="h-5 w-5" />
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">SkillEngine</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Custom portal prepared for {client.companyName}
            </p>
            <Link
              to="/"
              className="text-sm text-primary hover:underline"
            >
              Visit SkillEngine
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalPage;
