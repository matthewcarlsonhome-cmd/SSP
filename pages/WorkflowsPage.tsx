/**
 * Workflows Page - Redesigned to match Skill Library UX
 *
 * A task-first, browsable workflow repository with improved UX:
 * - Category tabs as primary navigation (no sidebar)
 * - Prominent centered search with suggestions
 * - Featured Workflows section at top
 * - "Recommended for You" personalization section
 * - Clean grid layout for workflow cards
 * - View mode toggle and sort options
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import {
  Search,
  ChevronDown,
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
  Zap,
  Package,
  CheckCircle2,
  ArrowRight,
  Layers,
  X,
  Sparkles,
  Lightbulb,
  History,
  Star,
  ChevronRight,
  Settings,
  User,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { WORKFLOW_LIST, type Workflow } from '../lib/workflows';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW CATEGORIES
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
// FEATURED WORKFLOW COLLECTIONS
// ═══════════════════════════════════════════════════════════════════════════

interface WorkflowCollection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  workflowIds: string[];
  featured: boolean;
}

const WORKFLOW_COLLECTIONS: WorkflowCollection[] = [
  {
    id: 'job-seeker-complete',
    name: 'Complete Job Seeker Package',
    description: 'Everything you need from application to offer acceptance',
    icon: Briefcase,
    color: 'text-blue-500',
    workflowIds: ['job-application', 'interview-prep', 'post-interview'],
    featured: true,
  },
  {
    id: 'sales-accelerator',
    name: 'Sales Accelerator Bundle',
    description: 'Close deals faster with strategic sales workflows',
    icon: Target,
    color: 'text-orange-500',
    workflowIds: ['sales-account-pursuit', 'consulting-engagement'],
    featured: true,
  },
  {
    id: 'growth-marketing',
    name: 'Growth Marketing Suite',
    description: 'Launch and scale marketing campaigns effectively',
    icon: TrendingUp,
    color: 'text-pink-500',
    workflowIds: ['marketing-campaign', 'seo-client-onboarding'],
    featured: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

const SEARCH_SUGGESTIONS = [
  'job application',
  'interview prep',
  'sales pitch',
  'marketing campaign',
  'investor pitch',
  'workshop',
  'onboarding',
  'follow-up',
];

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  recentWorkflows: 'workflowLibrary_recentWorkflows',
  viewMode: 'workflowLibrary_viewMode',
  preferredCategory: 'workflowLibrary_preferredCategory',
};

// ═══════════════════════════════════════════════════════════════════════════
// SORT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

type SortOption = 'name' | 'steps' | 'time' | 'category';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOWS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.viewMode);
    return (stored as 'grid' | 'grouped') || 'grid';
  });
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [preferredCategory, setPreferredCategory] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.preferredCategory);
  });

  // Get recently used workflows from localStorage
  const recentWorkflowIds = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.recentWorkflows);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    let workflows = [...WORKFLOW_LIST];

    // Filter by collection
    if (selectedCollection) {
      const collection = WORKFLOW_COLLECTIONS.find((c) => c.id === selectedCollection);
      if (collection) {
        workflows = workflows.filter((w) => collection.workflowIds.includes(w.id));
      }
    }

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
        if (
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.longDescription.toLowerCase().includes(query)
        ) {
          return true;
        }
        if (w.outputs.some((output) => output.toLowerCase().includes(query))) {
          return true;
        }
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

    // Sort workflows
    workflows.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'steps':
          return b.steps.length - a.steps.length;
        case 'time':
          return (parseInt(a.estimatedTime) || 0) - (parseInt(b.estimatedTime) || 0);
        case 'category':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return workflows;
  }, [selectedCategory, selectedCollection, debouncedSearchQuery, sortBy]);

  // Get workflow count per category
  const getWorkflowCount = (categoryId: string) => {
    const category = WORKFLOW_CATEGORIES.find((c) => c.id === categoryId);
    return category?.workflowIds.length || 0;
  };

  // Compute "Recommended for You" workflows
  const forYouWorkflows = useMemo(() => {
    const recommendations: Workflow[] = [];

    // Add recently used workflows
    const recentWorkflows = recentWorkflowIds
      .slice(0, 2)
      .map((id: string) => WORKFLOW_LIST.find((w) => w.id === id))
      .filter(Boolean) as Workflow[];

    // If user has a preferred category, prioritize those
    if (preferredCategory) {
      const category = WORKFLOW_CATEGORIES.find((c) => c.id === preferredCategory);
      if (category) {
        const categoryWorkflows = WORKFLOW_LIST.filter(
          (w) => category.workflowIds.includes(w.id) && !recentWorkflowIds.includes(w.id)
        ).slice(0, 2);
        recommendations.push(...categoryWorkflows);
      }
    }

    // Add popular workflows (first few that aren't already included)
    const popularWorkflows = WORKFLOW_LIST.filter(
      (w) => !recentWorkflowIds.includes(w.id) && !recommendations.find((r) => r.id === w.id)
    ).slice(0, 4 - recentWorkflows.length - recommendations.length);

    recommendations.push(...recentWorkflows, ...popularWorkflows);

    // Dedupe and limit
    const seen = new Set<string>();
    return recommendations
      .filter((w) => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        return true;
      })
      .slice(0, 4);
  }, [recentWorkflowIds, preferredCategory]);

  // Group workflows by category for grouped view
  const groupedWorkflows = useMemo(() => {
    const groups: Record<string, Workflow[]> = {};
    WORKFLOW_CATEGORIES.forEach((cat) => {
      groups[cat.id] = [];
    });

    filteredWorkflows.forEach((workflow) => {
      const category = WORKFLOW_CATEGORIES.find((c) => c.workflowIds.includes(workflow.id));
      if (category && groups[category.id]) {
        groups[category.id].push(workflow);
      }
    });

    return groups;
  }, [filteredWorkflows]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode]);

  // Save preferred category
  useEffect(() => {
    if (preferredCategory) {
      localStorage.setItem(STORAGE_KEYS.preferredCategory, preferredCategory);
    } else {
      localStorage.removeItem(STORAGE_KEYS.preferredCategory);
    }
  }, [preferredCategory]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedCollection(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory || selectedCollection || searchQuery;

  const handleSearchSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSearchFocused(false);
  };

  const handleLaunchWorkflow = (workflow: Workflow) => {
    // Track recently used
    const recent = [workflow.id, ...recentWorkflowIds.filter((id: string) => id !== workflow.id)].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.recentWorkflows, JSON.stringify(recent));
    navigate(`/workflow/${workflow.id}`);
  };

  const handleCollectionClick = (collectionId: string) => {
    if (selectedCollection === collectionId) {
      setSelectedCollection(null);
    } else {
      setSelectedCollection(collectionId);
      setSelectedCategory(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION - Search & Navigation                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="border-b bg-gradient-to-b from-card to-background">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Layers className="h-8 w-8 text-primary" />
                Workflow Library
              </h1>
              <p className="text-muted-foreground mt-1">
                {WORKFLOW_LIST.length} production-ready workflows to automate complex tasks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategorySettings(!showCategorySettings)}
                title="Personalization settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* PROMINENT SEARCH                                                */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="What do you want to accomplish?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {searchFocused && !searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border rounded-xl shadow-lg z-10">
                <p className="text-xs text-muted-foreground mb-2 px-1">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearchSuggestion(suggestion)}
                      className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* CATEGORY TABS (Primary Navigation)                              */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedCollection(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !selectedCategory && !selectedCollection
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              All Workflows
            </button>
            {WORKFLOW_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              const count = getWorkflowCount(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(isSelected ? null : category.id);
                    setSelectedCollection(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                  <span
                    className={`text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CATEGORY PERSONALIZATION PANEL                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showCategorySettings && (
        <div className="border-b bg-card">
          <div className="container mx-auto max-w-6xl px-4 py-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-2">Personalize Recommendations</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Select your focus area to get personalized workflow suggestions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPreferredCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      !preferredCategory
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    No preference
                  </button>
                  {WORKFLOW_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setPreferredCategory(category.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        preferredCategory === category.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowCategorySettings(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* FEATURED COLLECTIONS (Always visible at top when no filters)       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {!hasActiveFilters && (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Featured Workflows
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {WORKFLOW_COLLECTIONS.filter((c) => c.featured).map((collection) => {
                  const Icon = collection.icon;
                  const workflowCount = collection.workflowIds.length;
                  const isSelected = selectedCollection === collection.id;
                  return (
                    <button
                      key={collection.id}
                      onClick={() => handleCollectionClick(collection.id)}
                      className={`group p-5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left ${
                        isSelected ? 'border-primary shadow-lg' : ''
                      }`}
                    >
                      <div
                        className={`h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ${collection.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mt-4 group-hover:text-primary transition-colors">
                        {collection.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-muted">{workflowCount} workflows</span>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* RECOMMENDED FOR YOU SECTION (Personalized)                         */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {forYouWorkflows.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Recommended for You
                    {preferredCategory && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        Based on {WORKFLOW_CATEGORIES.find((c) => c.id === preferredCategory)?.name}
                      </span>
                    )}
                  </h2>
                  {recentWorkflowIds.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Includes recently used
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {forYouWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onLaunch={() => handleLaunchWorkflow(workflow)}
                      isRecent={recentWorkflowIds.includes(workflow.id)}
                      compact
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RESULTS HEADER                                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">
              {hasActiveFilters ? `${filteredWorkflows.length} results` : `All ${filteredWorkflows.length} Workflows`}
            </span>
            {selectedCollection && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                {WORKFLOW_COLLECTIONS.find((c) => c.id === selectedCollection)?.name}
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
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
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid view"
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'grouped' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grouped by category"
              >
                <Layers className="h-3 w-3" />
                Grouped
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            >
              <option value="name">Sort: A-Z</option>
              <option value="steps">Sort: Most Steps</option>
              <option value="time">Sort: Shortest First</option>
            </select>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* WORKFLOWS DISPLAY                                                   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Workflows Found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or search query</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          </div>
        ) : viewMode === 'grouped' && !hasActiveFilters ? (
          /* GROUPED VIEW */
          <div className="space-y-8">
            {WORKFLOW_CATEGORIES.map((category) => {
              const categoryWorkflows = groupedWorkflows[category.id] || [];
              if (categoryWorkflows.length === 0) return null;

              const Icon = category.icon;
              return (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  Icon={Icon}
                  workflows={categoryWorkflows}
                  onLaunchWorkflow={handleLaunchWorkflow}
                  onViewAll={() => setSelectedCategory(category.id)}
                  recentWorkflowIds={recentWorkflowIds}
                />
              );
            })}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onLaunch={() => handleLaunchWorkflow(workflow)}
                isRecent={recentWorkflowIds.includes(workflow.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY GROUP COMPONENT (for grouped view)
// ═══════════════════════════════════════════════════════════════════════════

interface CategoryGroupProps {
  category: WorkflowCategory;
  Icon: React.ElementType;
  workflows: Workflow[];
  onLaunchWorkflow: (workflow: Workflow) => void;
  onViewAll: () => void;
  recentWorkflowIds: string[];
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  Icon,
  workflows,
  onLaunchWorkflow,
  onViewAll,
  recentWorkflowIds,
}) => {
  const [expanded, setExpanded] = useState(false);
  const displayWorkflows = expanded ? workflows : workflows.slice(0, 2);
  const hasMore = workflows.length > 2;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center ${category.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{category.name}</h3>
            <p className="text-xs text-muted-foreground">{workflows.length} workflows • {category.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View all
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onLaunch={() => onLaunchWorkflow(workflow)}
              isRecent={recentWorkflowIds.includes(workflow.id)}
              compact
            />
          ))}
        </div>
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            Show {workflows.length - 2} more
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
        {expanded && hasMore && (
          <button
            onClick={() => setExpanded(false)}
            className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            Show less
          </button>
        )}
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
  isRecent?: boolean;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onLaunch, compact = false, isRecent }) => {
  const Icon = WORKFLOW_ICONS[workflow.icon] || Layers;
  const colorClasses = WORKFLOW_COLORS[workflow.color] || WORKFLOW_COLORS.blue;

  if (compact) {
    return (
      <div className="group rounded-xl border bg-background p-4 hover:border-primary/50 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                {workflow.name}
              </h4>
              {isRecent && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] flex items-center gap-0.5 shrink-0">
                  <History className="h-2.5 w-2.5" />
                  Recent
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{workflow.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {workflow.steps.length} steps
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {workflow.estimatedTime}
              </span>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onLaunch} className="shrink-0">
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all p-5">
      <div className="flex items-start gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {workflow.name}
            </h3>
            {isRecent && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs flex items-center gap-1">
                <History className="h-3 w-3" />
                Recent
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {workflow.description}
          </p>
        </div>
      </div>

      {/* Workflow Details */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground line-clamp-3">{workflow.longDescription}</p>
      </div>

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
