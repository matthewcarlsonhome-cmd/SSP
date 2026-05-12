/**
 * ProspectingPanel - Bulk Prospect Discovery and Import
 *
 * Enables rapid prospect list building:
 * - Search for companies by industry/location
 * - Auto-populate all fields via enrichment
 * - Bulk create clients with pre-filled data
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Building2,
  MapPin,
  Loader2,
  Plus,
  Sparkles,
  Target,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Phone,
  DollarSign,
  Clock,
  Database,
  Star,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { cn } from '../lib/theme';
import {
  parseSearchResults,
  enrichProspect,
  createClientsFromProspects,
  getSuggestedQueries,
  type EnrichedProspect,
} from '../lib/prospecting';
import {
  assessAutomationCampaignFit,
  buildClientProspectImportPreview,
  localBusinessRecordsToEnrichedProspects,
  lookupLocalBusinesses,
  type LocalBusinessLookupProvider,
} from '../lib/localBusinessLookup';
import type { Client, ClientIndustry, ClientPriority } from '../lib/storage/types';
import { useToast } from '../hooks/useToast';

interface ProspectingPanelProps {
  existingClients?: Client[];
  onProspectsCreated?: (count: number) => void;
  className?: string;
}

const INDUSTRIES: { value: ClientIndustry; label: string }[] = [
  { value: 'marketing_advertising', label: 'Marketing & Advertising' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'legal', label: 'Legal' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'staffing', label: 'Staffing & Recruiting' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'construction', label: 'Construction' },
  { value: 'education', label: 'Education' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: ClientPriority; label: string; color: string }[] = [
  { value: 'HIGH', label: 'High Priority', color: 'text-red-500' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'text-yellow-500' },
  { value: 'LOW', label: 'Low Priority', color: 'text-green-500' },
  { value: 'RESEARCH', label: 'Research', color: 'text-blue-500' },
];

const LOOKUP_PROVIDERS: { value: LocalBusinessLookupProvider; label: string }[] = [
  { value: 'demo', label: 'Demo lookup' },
  { value: 'supabase_proxy', label: 'Supabase Places proxy' },
  { value: 'google_places', label: 'Direct Google Places' },
];

export const ProspectingPanel: React.FC<ProspectingPanelProps> = ({
  existingClients = [],
  onProspectsCreated,
  className,
}) => {
  const { addToast } = useToast();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<ClientIndustry>('marketing_advertising');
  const [location, setLocation] = useState('Milwaukee, WI');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupProvider, setLookupProvider] = useState<LocalBusinessLookupProvider>('demo');
  const [maxResults, setMaxResults] = useState(12);
  const [minRating, setMinRating] = useState('');
  const [googlePlacesApiKey, setGooglePlacesApiKey] = useState('');

  // Results state
  const [prospects, setProspects] = useState<EnrichedProspect[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [expandedProspect, setExpandedProspect] = useState<string | null>(null);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [defaultPriority, setDefaultPriority] = useState<ClientPriority>('RESEARCH');
  const [enablePortals, setEnablePortals] = useState(false);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualResults, setManualResults] = useState('');

  // Get suggested queries
  const suggestedQueries = getSuggestedQueries(selectedIndustry, location);
  const importPreview = useMemo(
    () => buildClientProspectImportPreview(prospects, existingClients),
    [prospects, existingClients],
  );
  const previewByName = useMemo(
    () => new Map(importPreview.rows.map((row) => [row.prospect.companyName, row])),
    [importPreview],
  );

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      addToast('Please enter a search query', 'error');
      return;
    }

    setIsSearching(true);
    setProspects([]);
    setSelectedProspects(new Set());

    try {
      const lookup = await lookupLocalBusinesses({
        businessType: searchQuery,
        location,
        industry: selectedIndustry,
        provider: lookupProvider,
        maxResults,
        minRating: minRating ? Number(minRating) : undefined,
        apiKey: googlePlacesApiKey.trim() || undefined,
      });

      const enriched = localBusinessRecordsToEnrichedProspects(lookup.records, selectedIndustry);

      setProspects(enriched);
      setSelectedProspects(new Set(enriched.map(p => p.companyName)));
      setShowManualEntry(false);

      if (lookup.warnings.length > 0) {
        addToast(lookup.warnings[0], 'info');
      }
      addToast(`Found ${enriched.length} prospects from ${lookup.query}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lookup failed. Please try again.';
      addToast(message, 'error');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, location, selectedIndustry, lookupProvider, maxResults, minRating, googlePlacesApiKey, addToast]);

  // Handle manual results parsing
  const handleParseManualResults = useCallback(() => {
    if (!manualResults.trim()) {
      addToast('Please paste search results', 'error');
      return;
    }

    try {
      // Try to parse as JSON first (from search API results)
      let searchData: Array<{ title: string; url: string; snippet: string }> = [];

      try {
        const parsed = JSON.parse(manualResults);
        if (Array.isArray(parsed)) {
          searchData = parsed;
        } else if (parsed.results) {
          searchData = parsed.results;
        } else if (parsed.organic) {
          searchData = parsed.organic;
        }
      } catch {
        // Parse as plain text (copy-pasted search results)
        const lines = manualResults.split('\n').filter(l => l.trim());
        let currentResult: { title: string; url: string; snippet: string } | null = null;

        for (const line of lines) {
          const trimmed = line.trim();

          // Check if this looks like a URL
          if (trimmed.match(/^https?:\/\//)) {
            if (currentResult) {
              searchData.push(currentResult);
            }
            currentResult = { title: '', url: trimmed, snippet: '' };
          } else if (currentResult) {
            // Add to current result
            if (!currentResult.title) {
              currentResult.title = trimmed;
            } else {
              currentResult.snippet += (currentResult.snippet ? ' ' : '') + trimmed;
            }
          } else {
            // Start a new result with title
            currentResult = { title: trimmed, url: '', snippet: '' };
          }
        }
        if (currentResult && currentResult.title) {
          searchData.push(currentResult);
        }
      }

      if (searchData.length === 0) {
        addToast('Could not parse any results. Try a different format.', 'error');
        return;
      }

      // Parse into prospects
      const discovered = parseSearchResults(searchData, selectedIndustry, location);

      // Enrich each prospect
      const enriched = discovered.map(p => enrichProspect(p));

      setProspects(enriched);
      setSelectedProspects(new Set(enriched.map(p => p.companyName)));
      setShowManualEntry(false);
      setManualResults('');

      addToast(`Found ${enriched.length} prospects`, 'success');
    } catch (error) {
      addToast('Failed to parse results', 'error');
    }
  }, [manualResults, selectedIndustry, location, addToast]);

  // Toggle prospect selection
  const toggleProspect = (name: string) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Select/deselect all
  const selectAll = () => {
    setSelectedProspects(new Set(prospects.map(p => p.companyName)));
  };

  const deselectAll = () => {
    setSelectedProspects(new Set());
  };

  // Import selected prospects
  const handleImport = async () => {
    const selectedRows = prospects
      .filter(p => selectedProspects.has(p.companyName))
      .map((prospect) => previewByName.get(prospect.companyName))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const skippedDuplicates = selectedRows.filter((row) => row.recommendation === 'skip');
    const toImport = selectedRows
      .filter((row) => row.recommendation !== 'skip')
      .map((row) => row.prospect);

    if (selectedRows.length === 0) {
      addToast('Select at least one prospect to import', 'error');
      return;
    }

    if (toImport.length === 0) {
      addToast('Selected prospects already match existing clients', 'error');
      return;
    }

    setIsImporting(true);

    try {
      const result = await createClientsFromProspects(toImport, {
        priority: defaultPriority,
        portalEnabled: enablePortals,
      });

      if (skippedDuplicates.length > 0) {
        addToast(`Skipped ${skippedDuplicates.length} exact duplicate prospect${skippedDuplicates.length !== 1 ? 's' : ''}`, 'info');
      }

      if (result.totalCreated > 0) {
        addToast(`Created ${result.totalCreated} clients`, 'success');
        onProspectsCreated?.(result.totalCreated);

        // Remove imported prospects from the list
        const importedNames = new Set(result.created.map(c => c.companyName));
        setProspects(prev => prev.filter(p => !importedNames.has(p.companyName)));
        setSelectedProspects(prev => {
          const next = new Set(prev);
          importedNames.forEach(name => next.delete(name));
          return next;
        });
      }

      if (result.totalFailed > 0) {
        addToast(`Failed to create ${result.totalFailed} clients`, 'error');
      }
    } catch (error) {
      addToast('Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <Target className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Prospect Discovery</h3>
            <p className="text-sm text-muted-foreground">
              Find and import prospects with auto-populated fields
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Industry */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Industry</label>
            <Select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value as ClientIndustry)}
            >
              {INDUSTRIES.map(ind => (
                <option key={ind.value} value={ind.value}>{ind.label}</option>
              ))}
            </Select>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Milwaukee, WI"
                className="pl-9"
              />
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Type</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., marketing agencies"
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Lookup Provider */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Lookup Source</label>
            <Select
              value={lookupProvider}
              onChange={(e) => setLookupProvider(e.target.value as LocalBusinessLookupProvider)}
            >
              {LOOKUP_PROVIDERS.map(provider => (
                <option key={provider.value} value={provider.value}>{provider.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Max Results</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Minimum Rating</label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                placeholder="Optional"
                className="pl-9"
              />
            </div>
          </div>

          {lookupProvider === 'google_places' && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Google Places API Key</label>
              <Input
                type="password"
                value={googlePlacesApiKey}
                onChange={(e) => setGooglePlacesApiKey(e.target.value)}
                placeholder="Local development only"
              />
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Suggested searches:</label>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.slice(0, 4).map((query, i) => (
              <button
                key={i}
                onClick={() => setSearchQuery(query)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Looking up...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Lookup Businesses
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Paste Results Manually
          </Button>
        </div>
      </div>

      {/* Manual Entry */}
      {showManualEntry && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Paste Search Results</h4>
              <p className="text-sm text-muted-foreground">
                Copy search results from Google, LinkedIn, or directories and paste below
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(false)}>
              Cancel
            </Button>
          </div>

          <textarea
            value={manualResults}
            onChange={(e) => setManualResults(e.target.value)}
            placeholder={`Paste search results here. Supported formats:

1. Plain text (copied from search results):
   Company Name
   https://website.com
   Description text...

2. JSON array:
   [{"title": "Company Name", "url": "https://...", "snippet": "..."}]

The system will extract company names, websites, and descriptions.`}
            className="w-full h-48 p-3 rounded-lg border bg-background font-mono text-sm resize-none"
          />

          <div className="flex items-center gap-3">
            <Button onClick={handleParseManualResults}>
              <Sparkles className="h-4 w-4 mr-2" />
              Parse & Enrich Results
            </Button>
            <span className="text-sm text-muted-foreground">
              Auto-populates: contact path, industry, pain points, skills, savings estimates
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {prospects.length > 0 && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="font-medium">
                Found {prospects.length} Prospects
              </h4>
              <span className="text-sm text-muted-foreground">
                ({selectedProspects.size} selected)
              </span>
              {importPreview.skipCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-700">
                  {importPreview.skipCount} duplicate
                </span>
              )}
              {importPreview.reviewCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-700">
                  {importPreview.reviewCount} review
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          {/* Prospect Cards */}
          <div className="space-y-3">
            {prospects.map((prospect) => {
              const isSelected = selectedProspects.has(prospect.companyName);
              const isExpanded = expandedProspect === prospect.companyName;
              const campaignFit = assessAutomationCampaignFit(prospect);
              const previewRow = previewByName.get(prospect.companyName);

              return (
                <div
                  key={prospect.companyName}
                  className={cn(
                    'rounded-lg border transition-all',
                    isSelected ? 'border-primary bg-primary/5' : 'bg-card'
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Selection */}
                      <label className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProspect(prospect.companyName)}
                          className="rounded border-input"
                        />
                      </label>

                      {/* Company Icon */}
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Company Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium truncate">{prospect.companyName}</h5>
                          {previewRow?.recommendation === 'skip' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700">
                              Duplicate
                            </span>
                          )}
                          {previewRow?.recommendation === 'review' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700">
                              Review
                            </span>
                          )}
                          {prospect.website && (
                            <a
                              href={prospect.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="capitalize">{prospect.industry.replace(/_/g, ' ')}</span>
                          {prospect.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {prospect.location}
                              </span>
                            </>
                          )}
                          {prospect.phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {prospect.phone}
                              </span>
                            </>
                          )}
                        </div>
                        {prospect.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {prospect.description}
                          </p>
                        )}
                      </div>

                      {/* Savings Preview */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-purple-500">
                            <Database className="h-4 w-4" />
                            <span className="font-medium">{campaignFit.score}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Fit score</span>
                        </div>
                        {prospect.estimatedTimeSavings && (
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-blue-500">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{prospect.estimatedTimeSavings}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Time saved</span>
                          </div>
                        )}
                        {prospect.estimatedCostSavings && (
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-green-500">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-medium">{prospect.estimatedCostSavings}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Cost saved</span>
                          </div>
                        )}
                      </div>

                      {/* Expand Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedProspect(isExpanded ? null : prospect.companyName)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pain Points */}
                        {prospect.painPoints && (
                          <div>
                            <h6 className="text-xs font-medium text-muted-foreground mb-1.5">
                              Identified Pain Points
                            </h6>
                            <p className="text-sm">{prospect.painPoints}</p>
                          </div>
                        )}

                        {/* Services */}
                        {prospect.services && (
                          <div>
                            <h6 className="text-xs font-medium text-muted-foreground mb-1.5">
                              Services
                            </h6>
                            <p className="text-sm">{prospect.services}</p>
                          </div>
                        )}

                        {/* Duplicate Preview */}
                        {previewRow && previewRow.duplicateMatches.length > 0 && (
                          <div className="md:col-span-2">
                            <h6 className="text-xs font-medium text-muted-foreground mb-1.5">
                              Existing Client Match
                            </h6>
                            <div className="rounded-lg border bg-background p-3 space-y-1">
                              {previewRow.duplicateMatches.slice(0, 3).map((match) => (
                                <p key={`${match.clientId}-${match.reason}`} className="text-sm">
                                  {match.companyName} - {match.confidence} match by {match.reason.replace(/-/g, ' ')}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Key Use Cases */}
                        {prospect.keyUseCases && prospect.keyUseCases.length > 0 && (
                          <div className="md:col-span-2">
                            <h6 className="text-xs font-medium text-muted-foreground mb-1.5">
                              Key Use Cases
                            </h6>
                            <div className="flex flex-wrap gap-1">
                              {prospect.keyUseCases.map((useCase, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded bg-muted"
                                >
                                  {useCase}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Campaign Fit */}
                        <div className="md:col-span-2">
                          <h6 className="text-xs font-medium text-muted-foreground mb-1.5">
                            Campaign Fit
                          </h6>
                          <div className="rounded-lg border bg-background p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium capitalize">
                                {campaignFit.level} automation campaign fit
                              </span>
                              <span className="text-sm font-semibold">{campaignFit.score}/100</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{campaignFit.recommendedAngle}</p>
                            {campaignFit.reasons.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {campaignFit.reasons.slice(0, 3).map((reason, i) => (
                                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Suggested Skills */}
                        {prospect.suggestedSkillIds.length > 0 && (
                          <div className="md:col-span-2">
                            <h6 className="text-xs font-medium text-muted-foreground mb-1.5">
                              Recommended Skills ({prospect.suggestedSkillIds.length})
                            </h6>
                            <div className="flex flex-wrap gap-1">
                              {prospect.suggestedSkillIds.slice(0, 6).map(skillId => (
                                <span
                                  key={skillId}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600"
                                >
                                  <Zap className="h-3 w-3" />
                                  {skillId.replace(/-/g, ' ')}
                                </span>
                              ))}
                              {prospect.suggestedSkillIds.length > 6 && (
                                <span className="text-xs text-muted-foreground px-2 py-1">
                                  +{prospect.suggestedSkillIds.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confidence Score */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Data confidence:</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-32">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              prospect.confidence >= 0.8 ? 'bg-green-500' :
                              prospect.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-orange-500'
                            )}
                            style={{ width: `${prospect.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {Math.round(prospect.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Import Options */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h4 className="font-medium">Import Options</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Default Priority */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Default Priority</label>
                <Select
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as ClientPriority)}
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </Select>
              </div>

              {/* Portal Setting */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Portal Pages</label>
                <label className="flex items-center gap-2 p-2 rounded border bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePortals}
                    onChange={(e) => setEnablePortals(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Enable portal pages</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              Import preview: {importPreview.importableCount} ready, {importPreview.reviewCount} review, {importPreview.skipCount} exact duplicate.
              Exact duplicates are skipped automatically.
            </div>

            {/* Import Button */}
            <div className="flex items-center gap-4 pt-2">
              <Button
                onClick={handleImport}
                disabled={isImporting || selectedProspects.size === 0}
                className="min-w-40"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create {selectedProspects.size} Client{selectedProspects.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Clients will be created with auto-populated fields, skills, and workflows
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {prospects.length === 0 && !showManualEntry && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h4 className="font-medium mb-2">Discover New Prospects</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Look up local companies by business type and location, or paste results from Google,
            LinkedIn, or directories to auto-populate client records with enriched data.
          </p>
          <Button variant="outline" onClick={() => setShowManualEntry(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Paste Search Results
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProspectingPanel;
