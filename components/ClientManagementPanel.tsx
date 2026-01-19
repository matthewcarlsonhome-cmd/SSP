/**
 * ClientManagementPanel Component
 *
 * Admin panel for managing B2B client outreach with:
 * - Client list with status tracking
 * - Skill and workflow selection per client
 * - Portal URL generation and management
 * - Export and bulk operations
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Link2,
  Filter,
  Eye,
  EyeOff,
  Zap,
  GitBranch,
  Mail,
  Phone,
  Globe,
  Save,
  RefreshCw,
  Cloud,
  CloudOff,
  Linkedin,
  Image,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { useToast } from '../hooks/useToast';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  initializeDefaultClients,
  exportClientsToCSV,
  getClientPortalUrl,
  getClientStats,
  syncClientsToSupabase,
  resetAllClientSelectionsToDefaults,
} from '../lib/clients';
import { isSupabaseConfigured } from '../lib/supabase';
import { getAllLibrarySkills } from '../lib/skillLibrary';
import { WORKFLOWS } from '../lib/workflows';
import type { Client, ClientStatus, ClientIndustry, ClientPriority } from '../lib/storage/types';
import type { Workflow } from '../lib/storage/types';
import type { LibrarySkill } from '../lib/skillLibrary/types';

// Simplified skill type for selection (compatible with LibrarySkill)
type SelectableSkill = { id: string; name: string; description: string };

const STATUS_OPTIONS: { value: ClientStatus; label: string; color: string }[] = [
  { value: 'prospect', label: 'Prospect', color: 'bg-gray-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-500' },
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-red-500' },
];

const PRIORITY_OPTIONS: { value: ClientPriority; label: string; color: string }[] = [
  { value: 'HIGH', label: 'High Priority', color: 'bg-green-500' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'bg-yellow-500' },
  { value: 'LOW', label: 'Low Priority', color: 'bg-gray-400' },
  { value: 'RESEARCH', label: 'Research Needed', color: 'bg-blue-400' },
];

const INDUSTRY_OPTIONS: { value: ClientIndustry; label: string }[] = [
  { value: 'marketing_advertising', label: 'Marketing & Advertising' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'biotechnology', label: 'Biotechnology' },
  { value: 'technology', label: 'Technology' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'construction', label: 'Construction' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'education', label: 'Education' },
  { value: 'nonprofit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

interface ClientManagementPanelProps {
  onViewPortal?: (client: Client) => void;
}

export const ClientManagementPanel: React.FC<ClientManagementPanelProps> = ({
  onViewPortal,
}) => {
  const { addToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  // Load clients on mount
  useEffect(() => {
    const existingClients = getClients();
    if (existingClients.length === 0) {
      // Initialize with defaults if empty
      const defaultClients = initializeDefaultClients();
      setClients(defaultClients);
    } else {
      setClients(existingClients);
    }
  }, []);

  // Get all available skills and workflows (277 skills from library)
  const availableSkills = useMemo<SelectableSkill[]>(() => {
    const librarySkills = getAllLibrarySkills();
    // Map to simpler format and sort alphabetically
    return librarySkills
      .map(s => ({ id: s.id, name: s.name, description: s.description }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const availableWorkflows = useMemo(() => Object.values(WORKFLOWS), []);

  // Stats
  const stats = useMemo(() => getClientStats(), [clients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          client.companyName.toLowerCase().includes(query) ||
          client.contacts.some(c => c.name.toLowerCase().includes(query)) ||
          client.services?.toLowerCase().includes(query) ||
          client.painPoints?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus !== 'all' && client.status !== filterStatus) {
        return false;
      }

      // Industry filter
      if (filterIndustry !== 'all' && client.industry !== filterIndustry) {
        return false;
      }

      // Priority filter
      if (filterPriority !== 'all' && client.priority !== filterPriority) {
        return false;
      }

      return true;
    });
  }, [clients, searchQuery, filterStatus, filterIndustry, filterPriority]);

  const refreshClients = () => {
    setClients(getClients());
    addToast('Clients refreshed', 'success');
  };

  const handleSyncToDatabase = async () => {
    if (!supabaseConfigured) {
      addToast('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const success = await syncClientsToSupabase();
      if (success) {
        addToast(`Successfully synced ${clients.length} clients to database`, 'success');
      } else {
        addToast('Failed to sync clients to database. Check console for details.', 'error');
      }
    } catch (error) {
      addToast('Error syncing to database: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetSelections = async () => {
    if (!confirm('This will reset all client skill and workflow selections to industry defaults (6 skills, 3 workflows max per client). Continue?')) {
      return;
    }

    setIsResetting(true);
    try {
      const updatedCount = await resetAllClientSelectionsToDefaults();
      setClients(getClients());
      addToast(`Reset selections for ${updatedCount} clients to industry defaults`, 'success');
    } catch (error) {
      addToast('Error resetting selections: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateClient = (data: Partial<Client>) => {
    const newClient = createClient(data);
    setClients(getClients());
    setShowNewClientForm(false);
    addToast(`Created client: ${newClient.companyName}`, 'success');
  };

  const handleUpdateClient = (id: string, updates: Partial<Client>) => {
    const updated = updateClient(id, updates);
    if (updated) {
      setClients(getClients());
      addToast('Client updated', 'success');
    }
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (confirm(`Delete ${name}? This cannot be undone.`)) {
      deleteClient(id);
      setClients(getClients());
      addToast('Client deleted', 'success');
    }
  };

  const handleCopyUrl = (client: Client) => {
    const url = getClientPortalUrl(client);
    navigator.clipboard.writeText(url);
    setCopiedUrl(client.id);
    setTimeout(() => setCopiedUrl(null), 2000);
    addToast('Portal URL copied to clipboard', 'success');
  };

  const handleExport = () => {
    // Build skill and workflow name maps for export
    const skillsMap = new Map<string, string>();
    availableSkills.forEach(s => skillsMap.set(s.id, s.name));

    const workflowsMap = new Map<string, string>();
    availableWorkflows.forEach(w => workflowsMap.set(w.id, w.name));

    const csv = exportClientsToCSV(skillsMap, workflowsMap);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillengine-clients-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Clients exported to CSV with skill/workflow names', 'success');
  };

  const getStatusBadge = (status: ClientStatus) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${option?.color}/20 text-${option?.color.replace('bg-', '')}-600`}>
        <span className={`w-1.5 h-1.5 rounded-full ${option?.color}`} />
        {option?.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Building2 className="h-4 w-4" />
            Total Clients
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Link2 className="h-4 w-4" />
            Active Portals
          </div>
          <p className="text-2xl font-bold">{stats.withPortals}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Mail className="h-4 w-4" />
            Contacted
          </div>
          <p className="text-2xl font-bold">{stats.contacted}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Zap className="h-4 w-4" />
            Avg Skills/Client
          </div>
          <p className="text-2xl font-bold">{stats.avgSkillsPerClient}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-[150px]"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Select
          value={filterIndustry}
          onChange={e => setFilterIndustry(e.target.value)}
          className="w-[180px]"
        >
          <option value="all">All Industries</option>
          {INDUSTRY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="w-[150px]"
        >
          <option value="all">All Priorities</option>
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Button variant="outline" onClick={refreshClients}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>

        <Button
          variant="outline"
          onClick={handleSyncToDatabase}
          disabled={isSyncing || !supabaseConfigured}
          title={supabaseConfigured ? 'Sync all clients to Supabase database' : 'Supabase not configured'}
        >
          {supabaseConfigured ? (
            <Cloud className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
          ) : (
            <CloudOff className="h-4 w-4 mr-2" />
          )}
          {isSyncing ? 'Syncing...' : 'Sync to DB'}
        </Button>

        <Button
          variant="outline"
          onClick={handleResetSelections}
          disabled={isResetting}
          title="Reset all client selections to industry defaults (6 skills, 3 workflows)"
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
          {isResetting ? 'Resetting...' : 'Reset Selections'}
        </Button>

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>

        <Button onClick={() => setShowNewClientForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* New Client Form */}
      {showNewClientForm && (
        <ClientForm
          onSave={handleCreateClient}
          onCancel={() => setShowNewClientForm(false)}
          availableSkills={availableSkills}
          availableWorkflows={availableWorkflows}
        />
      )}

      {/* Client List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No clients found</p>
            {clients.length === 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  initializeDefaultClients();
                  setClients(getClients());
                }}
              >
                Load Default Companies
              </Button>
            )}
          </div>
        ) : (
          filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              isExpanded={expandedClientId === client.id}
              onToggleExpand={() => setExpandedClientId(
                expandedClientId === client.id ? null : client.id
              )}
              onUpdate={(updates) => handleUpdateClient(client.id, updates)}
              onDelete={() => handleDeleteClient(client.id, client.companyName)}
              onCopyUrl={() => handleCopyUrl(client)}
              onViewPortal={onViewPortal}
              copiedUrl={copiedUrl === client.id}
              availableSkills={availableSkills}
              availableWorkflows={availableWorkflows}
            />
          ))
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredClients.length} of {clients.length} clients
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Client Card Component
// ═══════════════════════════════════════════════════════════════════════════

interface ClientCardProps {
  client: Client;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Client>) => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  onViewPortal?: (client: Client) => void;
  copiedUrl: boolean;
  availableSkills: SelectableSkill[];
  availableWorkflows: Workflow[];
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onCopyUrl,
  onViewPortal,
  copiedUrl,
  availableSkills,
  availableWorkflows,
}) => {
  const statusOption = STATUS_OPTIONS.find(o => o.value === client.status);
  const industryOption = INDUSTRY_OPTIONS.find(o => o.value === client.industry);
  const priorityOption = PRIORITY_OPTIONS.find(o => o.value === client.priority);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold truncate">{client.companyName}</h3>
            {client.priority && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${priorityOption?.color}/20`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityOption?.color}`} />
                {priorityOption?.label}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${statusOption?.color}/20`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusOption?.color}`} />
              {statusOption?.label}
            </span>
            {client.portalEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-600">
                <Link2 className="w-3 h-3" />
                Portal Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{industryOption?.label}</span>
            {client.companyType && <span>{client.companyType}</span>}
            {client.revenue && <span>{client.revenue}</span>}
            {client.employeeCount && <span>{client.employeeCount} employees</span>}
            <span>{client.selectedSkillIds.length} skills</span>
            <span>{client.selectedWorkflowIds.length} workflows</span>
            {client.contacts.length > 0 && (
              <span>{client.contacts[0].name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {client.portalEnabled && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopyUrl}
                title="Copy portal URL"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              {onViewPortal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewPortal(client)}
                  title="Preview portal"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive"
            title="Delete client"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* Company Details Summary */}
          {(client.description || client.services || client.painPoints || client.estimatedTimeSavings) && (
            <div className="rounded-lg border p-4 bg-blue-50/50 dark:bg-blue-950/20">
              {client.description && (
                <p className="text-sm mb-3">{client.description}</p>
              )}
              {client.services && (
                <div className="mb-3">
                  <span className="text-xs font-medium text-muted-foreground">Services: </span>
                  <span className="text-sm">{client.services}</span>
                </div>
              )}
              {client.painPoints && (
                <div className="mb-3">
                  <span className="text-xs font-medium text-muted-foreground">Pain Points: </span>
                  <span className="text-sm text-orange-700 dark:text-orange-400">{client.painPoints}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {client.estimatedTimeSavings && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-green-600">Time Savings:</span>
                    <span>{client.estimatedTimeSavings}</span>
                  </div>
                )}
                {client.estimatedCostSavings && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-green-600">Cost Savings:</span>
                    <span>{client.estimatedCostSavings}</span>
                  </div>
                )}
                {client.location && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Location:</span>
                    <span>{client.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select
                value={client.status}
                onChange={e => onUpdate({ status: e.target.value as ClientStatus })}
                className="mt-1"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              <Select
                value={client.priority || 'MEDIUM'}
                onChange={e => onUpdate({ priority: e.target.value as ClientPriority })}
                className="mt-1"
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Industry</label>
              <Select
                value={client.industry}
                onChange={e => onUpdate({ industry: e.target.value as ClientIndustry })}
                className="mt-1"
              >
                {INDUSTRY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Website</label>
              <Input
                value={client.website || ''}
                onChange={e => onUpdate({ website: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Social & Branding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Linkedin className="h-3 w-3" />
                LinkedIn URL
              </label>
              <Input
                value={client.linkedInUrl || ''}
                onChange={e => onUpdate({ linkedInUrl: e.target.value })}
                placeholder="https://linkedin.com/company/..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Image className="h-3 w-3" />
                Logo URL
              </label>
              <Input
                value={client.logoUrl || ''}
                onChange={e => onUpdate({ logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="mt-1"
              />
            </div>
          </div>

          {/* Portal Settings */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                <h4 className="font-medium">Client Portal</h4>
              </div>
              <Button
                variant={client.portalEnabled ? 'outline' : 'default'}
                size="sm"
                onClick={() => onUpdate({ portalEnabled: !client.portalEnabled })}
              >
                {client.portalEnabled ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Disable Portal
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Enable Portal
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Portal URL Slug</label>
                <Input
                  value={client.portalSlug}
                  onChange={e => onUpdate({ portalSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Custom Headline</label>
                <Input
                  value={client.customHeadline || ''}
                  onChange={e => onUpdate({ customHeadline: e.target.value })}
                  placeholder={`AI Solutions for ${client.companyName}`}
                  className="mt-1"
                />
              </div>
            </div>

            {client.portalEnabled && (
              <div className="mt-3 p-2 rounded bg-muted font-mono text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1">{getClientPortalUrl(client)}</span>
                <Button variant="ghost" size="sm" onClick={onCopyUrl}>
                  {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Custom Welcome Message</label>
            <Textarea
              value={client.customMessage || ''}
              onChange={e => onUpdate({ customMessage: e.target.value })}
              placeholder="A personalized message for this client..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Skills Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5" />
              <h4 className="font-medium">Selected Skills ({client.selectedSkillIds.length})</h4>
            </div>
            <SkillSelector
              availableSkills={availableSkills}
              selectedIds={client.selectedSkillIds}
              onSelectionChange={ids => onUpdate({ selectedSkillIds: ids })}
            />
          </div>

          {/* Workflows Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="h-5 w-5" />
              <h4 className="font-medium">Selected Workflows ({client.selectedWorkflowIds.length})</h4>
            </div>
            <WorkflowSelector
              availableWorkflows={availableWorkflows}
              selectedIds={client.selectedWorkflowIds}
              onSelectionChange={ids => onUpdate({ selectedWorkflowIds: ids })}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Internal Notes</label>
            <Textarea
              value={client.notes || ''}
              onChange={e => onUpdate({ notes: e.target.value })}
              placeholder="Internal notes about this client..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Skill Selector Component
// ═══════════════════════════════════════════════════════════════════════════

interface SkillSelectorProps {
  availableSkills: SelectableSkill[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const SkillSelector: React.FC<SkillSelectorProps> = ({
  availableSkills,
  selectedIds,
  onSelectionChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = useMemo(() => {
    if (!searchQuery) return availableSkills;
    const query = searchQuery.toLowerCase();
    return availableSkills.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query)
    );
  }, [availableSkills, searchQuery]);

  const toggleSkill = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onSelectionChange(filteredSkills.map(s => s.id));
  const clearAll = () => onSelectionChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
        {filteredSkills.map(skill => {
          const isSelected = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => toggleSkill(skill.id)}
              className={`text-left p-2 rounded-lg border text-sm transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'border'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{skill.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Workflow Selector Component
// ═══════════════════════════════════════════════════════════════════════════

interface WorkflowSelectorProps {
  availableWorkflows: Workflow[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  availableWorkflows,
  selectedIds,
  onSelectionChange,
}) => {
  const toggleWorkflow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onSelectionChange(availableWorkflows.map(w => w.id));
  const clearAll = () => onSelectionChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
        {availableWorkflows.map(workflow => {
          const isSelected = selectedIds.includes(workflow.id);
          return (
            <button
              key={workflow.id}
              onClick={() => toggleWorkflow(workflow.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 mt-0.5 rounded flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'border'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{workflow.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{workflow.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflow.steps.length} steps | {workflow.estimatedTime}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// New Client Form Component
// ═══════════════════════════════════════════════════════════════════════════

interface ClientFormProps {
  onSave: (data: Partial<Client>) => void;
  onCancel: () => void;
  availableSkills: SelectableSkill[];
  availableWorkflows: Workflow[];
  initialData?: Partial<Client>;
}

const ClientForm: React.FC<ClientFormProps> = ({
  onSave,
  onCancel,
  availableSkills,
  availableWorkflows,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    companyName: '',
    industry: 'other',
    website: '',
    contacts: [],
    selectedSkillIds: [],
    selectedWorkflowIds: [],
    ...initialData,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName?.trim()) return;
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold">Add New Client</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Company Name *</label>
          <Input
            value={formData.companyName || ''}
            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="Company name"
            required
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Industry</label>
          <Select
            value={formData.industry || 'other'}
            onChange={e => setFormData({ ...formData, industry: e.target.value as ClientIndustry })}
            className="mt-1"
          >
            {INDUSTRY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Website</label>
          <Input
            value={formData.website || ''}
            onChange={e => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://..."
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Primary Contact Name</label>
          <Input
            value={formData.contacts?.[0]?.name || ''}
            onChange={e => setFormData({
              ...formData,
              contacts: [{ ...formData.contacts?.[0], name: e.target.value, isPrimary: true }]
            })}
            placeholder="Contact name"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Create Client
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ClientManagementPanel;
