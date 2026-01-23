/**
 * Workflows Page - Browse and launch production-ready workflow automations
 *
 * A library of professional-grade workflows organized by role and category.
 * Each workflow chains multiple AI skills together for complete solutions.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  Briefcase,
  MessageSquare,
  Mail,
  GraduationCap,
  Rocket,
  TrendingUp,
  Target,
  Megaphone,
  Users,
  Zap,
  Package,
  CheckCircle2,
  ArrowRight,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { WORKFLOW_LIST, type Workflow } from '../lib/workflows';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW CATEGORIES
// Organize workflows by professional domain/role
// ═══════════════════════════════════════════════════════════════════════════

interface WorkflowCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  workflowIds: string[];
}

const WORKFLOW_CATEGORIES: WorkflowCategory[] = [
  {
    id: 'job-search',
    name: 'Job Search',
    description: 'Complete workflows for job seekers',
    icon: Briefcase,
    color: 'text-blue-500',
    workflowIds: ['job-application', 'interview-prep', 'post-interview'],
  },
  {
    id: 'sales-business',
    name: 'Sales & Business Development',
    description: 'Strategic sales and account pursuit workflows',
    icon: Target,
    color: 'text-orange-500',
    workflowIds: ['sales-account-pursuit', 'consulting-engagement'],
  },
  {
    id: 'marketing',
    name: 'Marketing & Growth',
    description: 'Digital marketing and campaign workflows',
    icon: Megaphone,
    color: 'text-pink-500',
    workflowIds: ['marketing-campaign', 'seo-client-onboarding'],
  },
  {
    id: 'training-education',
    name: 'Training & Education',
    description: 'Workshop and training program creation',
    icon: GraduationCap,
    color: 'text-amber-500',
    workflowIds: ['training-workshop'],
  },
  {
    id: 'entrepreneurship',
    name: 'Entrepreneurship & Startups',
    description: 'Investor pitch and startup workflows',
    icon: Rocket,
    color: 'text-emerald-500',
    workflowIds: ['startup-investor-pitch'],
  },
];

// Icon mapping for workflows
const WORKFLOW_ICONS: Record<string, React.ElementType> = {
  Briefcase,
  MessageSquare,
  Mail,
  GraduationCap,
  Search,
  Rocket,
  TrendingUp,
  Target,
};

// Color mapping for workflows
const WORKFLOW_COLORS: Record<string, string> = {
  blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  green: 'text-green-500 bg-green-500/10 border-green-500/20',
  amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  pink: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOWS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
  });

  // Filter workflows (using debounced search for performance)
  const filteredWorkflows = useMemo(() => {
    let workflows = WORKFLOW_LIST;

    // Filter by category
    if (selectedCategory) {
      const category = WORKFLOW_CATEGORIES.find((c) => c.id === selectedCategory);
      if (category) {
        workflows = workflows.filter((w) => category.workflowIds.includes(w.id));
      }
    }

    // Filter by search - comprehensive search across all workflow content
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      workflows = workflows.filter((w) => {
        // Search in name, description, and long description
        if (
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.longDescription.toLowerCase().includes(query)
        ) {
          return true;
        }

        // Search in outputs (what you'll get)
        if (w.outputs.some((output) => output.toLowerCase().includes(query))) {
          return true;
        }

        // Search in step names and descriptions
        if (
          w.steps.some(
            (step) =>
              step.name.toLowerCase().includes(query) ||
              step.description.toLowerCase().includes(query)
          )
        ) {
          return true;
        }

        return false;
      });
    }

    return workflows;
  }, [selectedCategory, debouncedSearchQuery]);

  // Get workflow count per category
  const getWorkflowCount = (categoryId: string) => {
    const category = WORKFLOW_CATEGORIES.find((c) => c.id === categoryId);
    return category?.workflowIds.length || 0;
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory || searchQuery;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Layers className="h-8 w-8 text-primary" />
                Workflow Library
              </h1>
              <p className="text-muted-foreground mt-1">
                {WORKFLOW_LIST.length} production-ready workflows across {WORKFLOW_CATEGORIES.length} professional categories
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows, steps, outputs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick category selector chips with descriptions */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                All Workflows
              </button>
              {WORKFLOW_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {category.name}
                  </button>
                );
              })}
            </div>
            {/* Show selected category description */}
            {selectedCategory && (
              <p className="text-sm text-muted-foreground pl-1">
                {WORKFLOW_CATEGORIES.find((c) => c.id === selectedCategory)?.description}
              </p>
            )}
          </div>

          {/* Quick Start - Top 3 workflows for repeat access */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Start
              </h3>
              <span className="text-xs text-muted-foreground">Most popular workflows</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {WORKFLOW_LIST.slice(0, 3).map((workflow) => {
                const Icon = WORKFLOW_ICONS[workflow.icon] || Layers;
                return (
                  <button
                    key={workflow.id}
                    onClick={() => navigate(`/workflow/${workflow.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${WORKFLOW_COLORS[workflow.color] || WORKFLOW_COLORS.blue}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{workflow.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{workflow.steps.length} steps</span>
                        <span>•</span>
                        <span>{workflow.estimatedTime}</span>
                      </div>
                    </div>
                    <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-6 rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Categories</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="border-b border-border pb-4">
                <button
                  onClick={() => toggleSection('categories')}
                  className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <span>By Professional Role</span>
                  {expandedSections.categories ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedSections.categories && (
                  <div className="mt-2 space-y-1">
                    {WORKFLOW_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      const isSelected = selectedCategory === category.id;
                      const count = getWorkflowCount(category.id);
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                          className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{category.name}</span>
                          </div>
                          <span
                            className={`text-xs ${
                              isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Library Stats
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Workflows</span>
                    <span className="font-medium">{WORKFLOW_LIST.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Categories</span>
                    <span className="font-medium">{WORKFLOW_CATEGORIES.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Steps</span>
                    <span className="font-medium">
                      {WORKFLOW_LIST.reduce((acc, w) => acc + w.steps.length, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}
                  {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
                </span>
                {selectedCategory && (
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                    {WORKFLOW_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="hover:text-primary/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Workflows Grid */}
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Workflows Found</h3>
                <p className="text-muted-foreground mt-1">
                  Try adjusting your filters or search query
                </p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onLaunch={() => navigate(`/workflow/${workflow.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Category Sections (when no filter active) */}
            {!hasActiveFilters && (
              <div className="mt-12 space-y-10">
                {WORKFLOW_CATEGORIES.map((category) => {
                  const categoryWorkflows = WORKFLOW_LIST.filter((w) =>
                    category.workflowIds.includes(w.id)
                  );
                  if (categoryWorkflows.length === 0) return null;

                  const Icon = category.icon;
                  return (
                    <section key={category.id}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-10 w-10 rounded-lg ${category.color} bg-current/10 flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${category.color}`} />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">{category.name}</h2>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {categoryWorkflows.map((workflow) => (
                          <WorkflowCard
                            key={workflow.id}
                            workflow={workflow}
                            onLaunch={() => navigate(`/workflow/${workflow.id}`)}
                            compact
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface WorkflowCardProps {
  workflow: Workflow;
  onLaunch: () => void;
  compact?: boolean;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onLaunch, compact = false }) => {
  const Icon = WORKFLOW_ICONS[workflow.icon] || Layers;
  const colorClasses = WORKFLOW_COLORS[workflow.color] || WORKFLOW_COLORS.blue;

  return (
    <div
      className={`group rounded-xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            {workflow.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {workflow.description}
          </p>
        </div>
      </div>

      {/* Workflow Details */}
      {!compact && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">{workflow.longDescription}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4" />
          <span>{workflow.steps.length} steps</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{workflow.estimatedTime}</span>
        </div>
      </div>

      {/* Outputs Preview */}
      {!compact && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            What You'll Get
          </h4>
          <div className="space-y-1">
            {workflow.outputs.slice(0, 4).map((output, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span className="line-clamp-1">{output}</span>
              </div>
            ))}
            {workflow.outputs.length > 4 && (
              <p className="text-xs text-muted-foreground ml-5">
                +{workflow.outputs.length - 4} more deliverables
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          {workflow.steps.slice(0, 3).map((step, index) => (
            <div
              key={step.id}
              className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium"
              title={step.name}
            >
              {index + 1}
            </div>
          ))}
          {workflow.steps.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{workflow.steps.length - 3} more
            </span>
          )}
        </div>
        <Button onClick={onLaunch}>
          <Play className="h-4 w-4 mr-1" />
          Start Workflow
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default WorkflowsPage;
