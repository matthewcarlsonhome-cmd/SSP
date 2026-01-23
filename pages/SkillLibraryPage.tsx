/**
 * Skill Library Page - Redesigned
 *
 * A task-first, browsable skill repository with improved UX:
 * - Category tabs as primary navigation (replacing role sidebar)
 * - Use case filter chips for context
 * - Prominent search with suggestions
 * - Featured collections at top
 * - Grouped results view
 * - "For You" personalization section
 * - Roles moved to optional personalization
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import {
  Search,
  X,
  Sparkles,
  Clock,
  Star,
  Play,
  Briefcase,
  Users,
  BarChart3,
  Zap,
  TrendingUp,
  MessageSquare,
  Calendar,
  Rocket,
  Network,
  DollarSign,
  ArrowUpRight,
  Download,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Settings,
  User,
  History,
  Lightbulb,
  BookOpen,
  Layers,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  getAllLibrarySkills,
  filterSkills,
  sortSkills,
  getSkillCountByCategory,
  SKILL_COLLECTIONS,
  ROLE_DEFINITIONS,
  getCollectionSkills,
} from '../lib/skillLibrary';
import {
  SKILL_CATEGORIES,
  SKILL_USE_CASES,
  DEFAULT_FILTERS,
  type LibraryFilters,
  type LibrarySortOption,
  type LibrarySkill,
  type SkillCategory,
  type SkillUseCase,
} from '../lib/skillLibrary/types';

// ═══════════════════════════════════════════════════════════════════════════
// ICON MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  analysis: BarChart3,
  generation: Sparkles,
  automation: Zap,
  optimization: TrendingUp,
  communication: MessageSquare,
  research: Search,
};

const USE_CASE_ICONS: Record<string, React.ElementType> = {
  'job-search': Briefcase,
  'interview-prep': Users,
  'daily-work': Calendar,
  onboarding: Rocket,
  'career-growth': TrendingUp,
  networking: Network,
};

const COLLECTION_ICONS: Record<string, React.ElementType> = {
  Briefcase,
  Users,
  TrendingUp,
  DollarSign,
  Rocket,
};

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

const SEARCH_SUGGESTIONS = [
  'meeting notes',
  'resume',
  'interview',
  'email',
  'presentation',
  'analysis',
  'report',
  'documentation',
];

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  preferredRole: 'skillLibrary_preferredRole',
  recentSkills: 'skillLibrary_recentSkills',
  viewMode: 'skillLibrary_viewMode',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SkillLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromQuiz = searchParams.get('fromQuiz') === 'true';

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState<LibraryFilters>(() => {
    const categoryParam = searchParams.get('category');
    const useCaseParam = searchParams.get('useCase');
    const useCasesParam = searchParams.get('useCases');

    const categories: SkillCategory[] = [];
    if (categoryParam) {
      categories.push(categoryParam as SkillCategory);
    }

    const useCases: SkillUseCase[] = [];
    if (useCasesParam) {
      useCases.push(...(useCasesParam.split(',').filter(Boolean) as SkillUseCase[]));
    } else if (useCaseParam) {
      useCases.push(useCaseParam as SkillUseCase);
    }

    return {
      ...DEFAULT_FILTERS,
      categories,
      useCases,
    };
  });

  const [sortBy, setSortBy] = useState<LibrarySortOption>('name');
  const [showQuizBanner, setShowQuizBanner] = useState(fromQuiz);
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.viewMode);
    return (stored as 'grid' | 'grouped') || 'grid';
  });
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [preferredRole, setPreferredRole] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.preferredRole);
  });

  // Debounce search
  const debouncedSearch = useDebounce(filters.search, 150);
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  // Get all skills
  const allSkills = useMemo(() => getAllLibrarySkills(), []);
  const filteredSkills = useMemo(
    () => sortSkills(filterSkills(allSkills, debouncedFilters), sortBy),
    [allSkills, debouncedFilters, sortBy]
  );

  // Get skill counts by category
  const skillCountByCategory = useMemo(() => getSkillCountByCategory(), []);

  // Get recently used skills from localStorage
  const recentSkillIds = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.recentSkills);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Compute "For You" recommendations
  const forYouSkills = useMemo(() => {
    const recommendations: LibrarySkill[] = [];

    // Add recently used skills
    const recentSkills = recentSkillIds
      .slice(0, 3)
      .map((id: string) => allSkills.find((s) => s.id === id))
      .filter(Boolean) as LibrarySkill[];

    // Add popular skills user hasn't used
    const popularSkills = [...allSkills]
      .sort((a, b) => b.useCount - a.useCount)
      .filter((s) => !recentSkillIds.includes(s.id))
      .slice(0, 6 - recentSkills.length);

    // If user has a preferred role, prioritize those
    if (preferredRole) {
      const roleSkills = allSkills
        .filter((s) => s.tags.roles.includes(preferredRole))
        .filter((s) => !recentSkillIds.includes(s.id))
        .slice(0, 3);
      recommendations.push(...roleSkills);
    }

    recommendations.push(...recentSkills, ...popularSkills);

    // Dedupe and limit
    const seen = new Set<string>();
    return recommendations.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    }).slice(0, 6);
  }, [allSkills, recentSkillIds, preferredRole]);

  // Group skills by category for grouped view
  const groupedSkills = useMemo(() => {
    const groups: Record<SkillCategory, LibrarySkill[]> = {
      generation: [],
      analysis: [],
      research: [],
      automation: [],
      optimization: [],
      communication: [],
    };

    filteredSkills.forEach((skill) => {
      if (groups[skill.tags.category]) {
        groups[skill.tags.category].push(skill);
      }
    });

    return groups;
  }, [filteredSkills]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  // Update URL when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.categories.length === 1) {
      params.category = filters.categories[0];
    }
    if (filters.useCases.length === 1) {
      params.useCase = filters.useCases[0];
    }
    setSearchParams(params);
  }, [filters.categories, filters.useCases, setSearchParams]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode]);

  // Save preferred role
  useEffect(() => {
    if (preferredRole) {
      localStorage.setItem(STORAGE_KEYS.preferredRole, preferredRole);
    } else {
      localStorage.removeItem(STORAGE_KEYS.preferredRole);
    }
  }, [preferredRole]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const selectCategory = (category: SkillCategory | null) => {
    setFilters((prev) => ({
      ...prev,
      categories: category ? [category] : [],
    }));
  };

  const toggleUseCase = (useCase: SkillUseCase) => {
    setFilters((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(useCase)
        ? prev.useCases.filter((uc) => uc !== useCase)
        : [...prev.useCases, useCase],
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters =
    filters.search ||
    filters.categories.length > 0 ||
    filters.useCases.length > 0 ||
    filters.levels.length > 0 ||
    filters.skillIds.length > 0;

  const handleLaunchSkill = (skill: LibrarySkill) => {
    // Track recently used
    const recent = [skill.id, ...recentSkillIds.filter((id: string) => id !== skill.id)].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.recentSkills, JSON.stringify(recent));

    if (skill.source === 'builtin') {
      navigate(`/skill/${skill.id}`);
    } else {
      sessionStorage.setItem('librarySkillToRun', JSON.stringify(skill));
      navigate('/library-skill-runner');
    }
  };

  const handleSearchSuggestion = (suggestion: string) => {
    setFilters((prev) => ({ ...prev, search: suggestion }));
    setSearchFocused(false);
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
                <BookOpen className="h-8 w-8 text-primary" />
                Skill Library
              </h1>
              <p className="text-muted-foreground mt-1">
                {allSkills.length} AI-powered skills to accelerate your work
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/export-skills">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRoleSettings(!showRoleSettings)}
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
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 focus:border-primary"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {searchFocused && !filters.search && (
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
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            <button
              onClick={() => selectCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.categories.length === 0
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              All Skills
            </button>
            {SKILL_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.value];
              const isSelected = filters.categories.includes(category.value);
              const count = skillCountByCategory[category.value] || 0;
              return (
                <button
                  key={category.value}
                  onClick={() => selectCategory(isSelected ? null : category.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                  <span className={`text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* USE CASE CHIPS (Context Filter)                                 */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Context:</span>
            {SKILL_USE_CASES.map((useCase) => {
              const Icon = USE_CASE_ICONS[useCase.value];
              const isSelected = filters.useCases.includes(useCase.value);
              return (
                <button
                  key={useCase.value}
                  onClick={() => toggleUseCase(useCase.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-transparent hover:bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {useCase.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROLE PERSONALIZATION PANEL                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showRoleSettings && (
        <div className="border-b bg-card">
          <div className="container mx-auto max-w-6xl px-4 py-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-2">Personalize Recommendations</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Select your role to get personalized skill suggestions in the "For You" section.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPreferredRole(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      !preferredRole
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    No preference
                  </button>
                  {[...ROLE_DEFINITIONS]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setPreferredRole(role.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          preferredRole === role.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {role.name}
                      </button>
                    ))}
                </div>
              </div>
              <button
                onClick={() => setShowRoleSettings(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Results Banner */}
      {showQuizBanner && (
        <div className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="container mx-auto max-w-6xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Personalized Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredSkills.length} skills based on your quiz answers.{' '}
                    <button onClick={clearFilters} className="text-primary hover:underline">
                      Clear filters
                    </button>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuizBanner(false)}
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
        {/* FEATURED COLLECTIONS (Always visible at top)                        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {!hasActiveFilters && (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Featured Collections
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SKILL_COLLECTIONS.filter((c) => c.featured).map((collection) => {
                  const Icon = COLLECTION_ICONS[collection.icon] || Sparkles;
                  const skills = getCollectionSkills(collection.id);
                  return (
                    <button
                      key={collection.id}
                      onClick={() => {
                        setFilters({
                          ...DEFAULT_FILTERS,
                          skillIds: collection.skillIds,
                        });
                      }}
                      className="group p-5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left"
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
                        <span className="px-2 py-0.5 rounded-full bg-muted">{skills.length} skills</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* FOR YOU SECTION (Personalized)                                      */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {forYouSkills.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Recommended for You
                    {preferredRole && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        Based on {ROLE_DEFINITIONS.find((r) => r.id === preferredRole)?.name}
                      </span>
                    )}
                  </h2>
                  {recentSkillIds.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Includes recently used
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {forYouSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      onLaunch={() => handleLaunchSkill(skill)}
                      isRecent={recentSkillIds.includes(skill.id)}
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
              {hasActiveFilters ? `${filteredSkills.length} results` : `All ${filteredSkills.length} Skills`}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
            {filters.skillIds.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs font-medium flex items-center gap-1">
                {SKILL_COLLECTIONS.find(
                  (c) =>
                    c.skillIds.length === filters.skillIds.length &&
                    c.skillIds.every((id) => filters.skillIds.includes(id))
                )?.name || `${filters.skillIds.length} selected`}
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, skillIds: [] }))}
                  className="hover:text-blue-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
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
              onChange={(e) => setSortBy(e.target.value as LibrarySortOption)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            >
              <option value="name">Sort: A-Z</option>
              <option value="popular">Sort: Popular</option>
              <option value="rating">Sort: Top Rated</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SKILLS DISPLAY                                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {filteredSkills.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Skills Found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or search query</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          </div>
        ) : viewMode === 'grouped' && !hasActiveFilters ? (
          /* GROUPED VIEW */
          <div className="space-y-8">
            {(Object.entries(groupedSkills) as [SkillCategory, LibrarySkill[]][])
              .filter(([, skills]) => skills.length > 0)
              .map(([category, skills]) => {
                const categoryInfo = SKILL_CATEGORIES.find((c) => c.value === category);
                const Icon = CATEGORY_ICONS[category] || Sparkles;
                return (
                  <CategoryGroup
                    key={category}
                    category={category}
                    categoryLabel={categoryInfo?.label || category}
                    Icon={Icon}
                    skills={skills}
                    onLaunchSkill={handleLaunchSkill}
                    onViewAll={() => selectCategory(category)}
                  />
                );
              })}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onLaunch={() => handleLaunchSkill(skill)} />
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
  category: SkillCategory;
  categoryLabel: string;
  Icon: React.ElementType;
  skills: LibrarySkill[];
  onLaunchSkill: (skill: LibrarySkill) => void;
  onViewAll: () => void;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  categoryLabel,
  Icon,
  skills,
  onLaunchSkill,
  onViewAll,
}) => {
  const [expanded, setExpanded] = useState(false);
  const displaySkills = expanded ? skills : skills.slice(0, 3);
  const hasMore = skills.length > 3;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{categoryLabel}</h3>
            <p className="text-xs text-muted-foreground">{skills.length} skills</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View all
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displaySkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onLaunch={() => onLaunchSkill(skill)} compact />
          ))}
        </div>
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            Show {skills.length - 3} more
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
// SKILL CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SkillCardProps {
  skill: LibrarySkill;
  onLaunch: () => void;
  compact?: boolean;
  isRecent?: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onLaunch, compact, isRecent }) => {
  const [copied, setCopied] = useState(false);
  const avgRating = skill.rating.count > 0 ? skill.rating.sum / skill.rating.count : 0;
  const CategoryIcon = CATEGORY_ICONS[skill.tags.category] || Sparkles;

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = skill.prompts.systemInstruction;
    if (prompt) {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className="group rounded-lg border bg-background p-4 hover:border-primary/50 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${skill.theme.secondary}`}>
            <CategoryIcon className={`h-4 w-4 ${skill.theme.primary}`} />
          </div>
          {skill.rating.count > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              {avgRating.toFixed(1)}
            </div>
          )}
        </div>
        <h4 className="font-medium text-sm mt-2 group-hover:text-primary transition-colors line-clamp-1">
          {skill.name}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="px-2 py-0.5 rounded bg-muted text-xs capitalize">{skill.tags.category}</span>
          <Button size="sm" variant="ghost" onClick={onLaunch} className="h-7 px-2">
            <Play className="h-3 w-3 mr-1" />
            Launch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${skill.theme.secondary}`}>
          <CategoryIcon className={`h-5 w-5 ${skill.theme.primary}`} />
        </div>
        <div className="flex items-center gap-2">
          {isRecent && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs flex items-center gap-1">
              <History className="h-3 w-3" />
              Recent
            </span>
          )}
          {skill.rating.count > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>{avgRating.toFixed(1)}</span>
            </div>
          )}
          {skill.prompts.systemInstruction && (
            <button
              onClick={handleCopyPrompt}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Copy system prompt"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="font-semibold mt-3 group-hover:text-primary transition-colors">{skill.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="px-2 py-0.5 rounded bg-muted text-xs capitalize">{skill.tags.category}</span>
        {skill.source === 'builtin' && (
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-xs">Built-in</span>
        )}
        {skill.config?.useWebSearch && (
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs flex items-center gap-1">
            <Search className="h-3 w-3" />
            Web
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {skill.estimatedTimeSaved && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {skill.estimatedTimeSaved}
            </span>
          )}
        </div>
        <Button size="sm" onClick={onLaunch}>
          <Play className="h-4 w-4 mr-1" />
          Launch
        </Button>
      </div>
    </div>
  );
};

export default SkillLibraryPage;
