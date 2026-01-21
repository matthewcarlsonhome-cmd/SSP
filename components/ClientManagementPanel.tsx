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
  Trash2,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Link2,
  Eye,
  EyeOff,
  Zap,
  GitBranch,
  Mail,
  Phone,
  Globe,
  Save,
  Cloud,
  Linkedin,
  Image,
  Sparkles,
  UserPlus,
  Calendar,
  FileText,
  MessageSquare,
  User,
  Tag,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { useToast } from '../hooks/useToast';
import {
  getClients,
  createClient,
  updateClientAsync,
  deleteClient,
  initializeDefaultClients,
  exportClientsToCSV,
  getClientPortalUrl,
  getClientStats,
} from '../lib/clients';
import { getAllLibrarySkills } from '../lib/skillLibrary';
import { WORKFLOWS } from '../lib/workflows';
import type { Client, ClientStatus, ClientIndustry, ClientPriority, ClientContact, ContactStatus } from '../lib/storage/types';
import type { Workflow } from '../lib/storage/types';
import { ClientResearchPanel } from './ClientResearchPanel';

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

const CONTACT_STATUS_OPTIONS: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'not_contacted', label: 'Not Contacted', color: 'bg-gray-400' },
  { value: 'connected', label: 'Connected', color: 'bg-blue-500' },
  { value: 'responded', label: 'Responded', color: 'bg-purple-500' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-green-500' },
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
  { value: 'legal', label: 'Legal Services' },
  { value: 'staffing', label: 'Staffing & Recruiting' },
  { value: 'engineering', label: 'Engineering' },
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
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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

  const handleCreateClient = (data: Partial<Client>) => {
    const newClient = createClient(data);
    setClients(getClients());
    setShowNewClientForm(false);
    addToast(`Created client: ${newClient.companyName}`, 'success');
  };

  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    // Use async version that waits for Supabase confirmation
    const result = await updateClientAsync(id, updates);
    if (result.client) {
      setClients(getClients());
      if (result.success) {
        // Only show toast for significant updates (skills/workflows/portal)
        const isSignificantUpdate = 'selectedSkillIds' in updates ||
                                     'selectedWorkflowIds' in updates ||
                                     'portalEnabled' in updates;
        if (isSignificantUpdate && supabaseConfigured) {
          addToast('Client synced to database', 'success');
        }
      } else {
        addToast(result.error || 'Client saved locally but failed to sync to database', 'error');
      }
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

      {/* Actions Bar - Clean toolbar with search, filters, export, and add */}
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
// Client Card Component - Redesigned with sections
// ═══════════════════════════════════════════════════════════════════════════

interface ClientCardProps {
  client: Client;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Client>) => Promise<void>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const statusOption = STATUS_OPTIONS.find(o => o.value === client.status);
  const industryOption = INDUSTRY_OPTIONS.find(o => o.value === client.industry);
  const priorityOption = PRIORITY_OPTIONS.find(o => o.value === client.priority);

  // Wrap onUpdate to show syncing state
  const handleUpdate = async (updates: Partial<Client>) => {
    setIsSyncing(true);
    try {
      await onUpdate(updates);
    } finally {
      setIsSyncing(false);
    }
  };

  // Count only valid skills/workflows that actually exist in the library
  const validSkillIds = new Set(availableSkills.map(s => s.id));
  const validWorkflowIds = new Set(availableWorkflows.map(w => w.id));
  const validSkillCount = client.selectedSkillIds.filter(id => validSkillIds.has(id)).length;
  const validWorkflowCount = client.selectedWorkflowIds.filter(id => validWorkflowIds.has(id)).length;

  // Contact management helpers
  const addContact = () => {
    if (client.contacts.length >= 3) return;
    const newContact: ClientContact = {
      id: crypto.randomUUID(),
      name: '',
      contactStatus: 'not_contacted',
      isPrimary: client.contacts.length === 0,
    };
    handleUpdate({ contacts: [...client.contacts, newContact] });
  };

  const updateContact = (contactId: string, updates: Partial<ClientContact>) => {
    const updatedContacts = client.contacts.map(c =>
      c.id === contactId ? { ...c, ...updates } : c
    );
    handleUpdate({ contacts: updatedContacts });
  };

  const removeContact = (contactId: string) => {
    const updatedContacts = client.contacts.filter(c => c.id !== contactId);
    // If we removed the primary, make the first one primary
    if (updatedContacts.length > 0 && !updatedContacts.some(c => c.isPrimary)) {
      updatedContacts[0].isPrimary = true;
    }
    handleUpdate({ contacts: updatedContacts });
  };

  const setPrimaryContact = (contactId: string) => {
    const updatedContacts = client.contacts.map(c => ({
      ...c,
      isPrimary: c.id === contactId,
    }));
    handleUpdate({ contacts: updatedContacts });
  };

  // Key use cases management
  const addKeyUseCase = (useCase: string) => {
    if (!useCase.trim()) return;
    const currentUseCases = client.keyUseCases || [];
    if (!currentUseCases.includes(useCase.trim())) {
      handleUpdate({ keyUseCases: [...currentUseCases, useCase.trim()] });
    }
  };

  const removeKeyUseCase = (useCase: string) => {
    const currentUseCases = client.keyUseCases || [];
    handleUpdate({ keyUseCases: currentUseCases.filter(u => u !== useCase) });
  };

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
            {client.location && <span>{client.location}</span>}
            <span>{validSkillCount} skills</span>
            <span>{validWorkflowCount} workflows</span>
            <span>{client.contacts.length} contact{client.contacts.length !== 1 ? 's' : ''}</span>
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

      {/* Expanded Content - Organized Sections */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION A: Company Overview */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              COMPANY OVERVIEW
              {isSyncing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-600 ml-auto">
                  <Cloud className="w-3 h-3 animate-pulse" />
                  Syncing...
                </span>
              )}
            </div>

            {/* Company Details Summary */}
            {(client.description || client.services || client.painPoints) && (
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
                </div>
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select
                  value={client.status}
                  onChange={e => handleUpdate({ status: e.target.value as ClientStatus })}
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
                  onChange={e => handleUpdate({ priority: e.target.value as ClientPriority })}
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
                  onChange={e => handleUpdate({ industry: e.target.value as ClientIndustry })}
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
                  onChange={e => handleUpdate({ website: e.target.value })}
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
                  Company LinkedIn URL
                </label>
                <Input
                  value={client.linkedInUrl || ''}
                  onChange={e => handleUpdate({ linkedInUrl: e.target.value })}
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
                  onChange={e => handleUpdate({ logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION B: Technical Research */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              TECHNICAL RESEARCH
            </div>

            <div className="rounded-lg border p-4 bg-purple-50/50 dark:bg-purple-950/20">
              <label className="text-sm font-medium text-purple-700 dark:text-purple-400">
                Company Technical Info & Key Use Cases
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Research notes about their tech stack, key use cases, and potential skill/workflow fits. Use this to determine which offerings to present.
              </p>
              <Textarea
                value={client.companyTechnicalInfo || ''}
                onChange={e => handleUpdate({ companyTechnicalInfo: e.target.value })}
                placeholder="e.g., Uses Salesforce CRM, looking to automate claims processing. Pain: Manual data entry taking 20+ hrs/week. Opportunity for document parsing, email automation..."
                rows={4}
                className="mt-1"
              />

              {/* Key Use Cases Tags */}
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Key Use Cases
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(client.keyUseCases || []).map(useCase => (
                    <span
                      key={useCase}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300"
                    >
                      {useCase}
                      <button
                        onClick={() => removeKeyUseCase(useCase)}
                        className="hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <KeyUseCaseInput onAdd={addKeyUseCase} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION B2: AI Research Assistant */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <ClientResearchPanel
              client={client}
              onApplySuggestions={(updates) => handleUpdate(updates)}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION C: Contacts (Multi-contact with per-contact messaging) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                CONTACTS ({client.contacts.length}/3)
              </div>
              {client.contacts.length < 3 && (
                <Button variant="outline" size="sm" onClick={addContact}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </div>

            {client.contacts.length === 0 ? (
              <div className="rounded-lg border p-6 bg-muted/30 text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No contacts added yet</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={addContact}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {client.contacts.map((contact, index) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    index={index}
                    onUpdate={(updates) => updateContact(contact.id, updates)}
                    onRemove={() => removeContact(contact.id)}
                    onSetPrimary={() => setPrimaryContact(contact.id)}
                    selectedSkillIds={client.selectedSkillIds}
                    availableSkills={availableSkills}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION D: Skills & Workflows */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4" />
              SKILLS & WORKFLOWS
            </div>

            {/* Skills Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-medium">Selected Skills ({client.selectedSkillIds.length})</h4>
              </div>
              <SkillSelector
                availableSkills={availableSkills}
                selectedIds={client.selectedSkillIds}
                onSelectionChange={ids => handleUpdate({ selectedSkillIds: ids })}
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
                onSelectionChange={ids => handleUpdate({ selectedWorkflowIds: ids })}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION E: Portal & Messaging */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Link2 className="h-4 w-4" />
              PORTAL & MESSAGING
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Client Portal</h4>
                <Button
                  variant={client.portalEnabled ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleUpdate({ portalEnabled: !client.portalEnabled })}
                  disabled={isSyncing}
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
                    onChange={e => handleUpdate({ portalSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Custom Headline</label>
                  <Input
                    value={client.customHeadline || ''}
                    onChange={e => handleUpdate({ customHeadline: e.target.value })}
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

            {/* Custom Welcome Message */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Custom Welcome Message (Portal)</label>
              <Textarea
                value={client.customMessage || ''}
                onChange={e => handleUpdate({ customMessage: e.target.value })}
                placeholder="A personalized message shown on the client portal..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION F: Internal Notes */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              INTERNAL NOTES
            </div>
            <Textarea
              value={client.notes || ''}
              onChange={e => handleUpdate({ notes: e.target.value })}
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
// Contact Card Component (per-contact with messaging)
// ═══════════════════════════════════════════════════════════════════════════

interface ContactCardProps {
  contact: ClientContact;
  index: number;
  onUpdate: (updates: Partial<ClientContact>) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
  selectedSkillIds: string[];
  availableSkills: SelectableSkill[];
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  index,
  onUpdate,
  onRemove,
  onSetPrimary,
  selectedSkillIds,
  availableSkills,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contactStatusOption = CONTACT_STATUS_OPTIONS.find(o => o.value === contact.contactStatus);

  // Get skill names for reference in messages
  const selectedSkillNames = selectedSkillIds
    .slice(0, 3)
    .map(id => availableSkills.find(s => s.id === id)?.name || id)
    .join(', ');

  return (
    <div className="rounded-lg border p-4 bg-cyan-50/30 dark:bg-cyan-950/10">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              contact.isPrimary ? 'bg-cyan-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {index + 1}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={contact.name}
                onChange={e => onUpdate({ name: e.target.value })}
                placeholder="Contact Name"
                className="font-medium max-w-[200px]"
              />
              <Input
                value={contact.title || ''}
                onChange={e => onUpdate({ title: e.target.value })}
                placeholder="Title"
                className="max-w-[180px]"
              />
              {contact.isPrimary && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-700">
                  Primary
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${contactStatusOption?.color}/20`}>
                <span className={`w-1.5 h-1.5 rounded-full ${contactStatusOption?.color}`} />
                {contactStatusOption?.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <Input
                  value={contact.email || ''}
                  onChange={e => onUpdate({ email: e.target.value })}
                  placeholder="email@company.com"
                  className="h-7 text-sm max-w-[180px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <Input
                  value={contact.phone || ''}
                  onChange={e => onUpdate({ phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="h-7 text-sm max-w-[140px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <Linkedin className="h-3 w-3 text-muted-foreground" />
                <Input
                  value={contact.linkedinUrl || ''}
                  onChange={e => onUpdate({ linkedinUrl: e.target.value })}
                  placeholder="linkedin.com/in/..."
                  className="h-7 text-sm max-w-[180px]"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {!contact.isPrimary && (
            <Button variant="ghost" size="sm" onClick={onSetPrimary} title="Set as primary">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive" title="Remove contact">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Contact Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Contact Status & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact Status</label>
              <Select
                value={contact.contactStatus}
                onChange={e => onUpdate({ contactStatus: e.target.value as ContactStatus })}
                className="mt-1"
              >
                {CONTACT_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                First Contacted
              </label>
              <Input
                type="date"
                value={contact.firstContactedAt ? contact.firstContactedAt.split('T')[0] : ''}
                onChange={e => onUpdate({ firstContactedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last Contacted
              </label>
              <Input
                type="date"
                value={contact.lastContactedAt ? contact.lastContactedAt.split('T')[0] : ''}
                onChange={e => onUpdate({ lastContactedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Background Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Background Notes</label>
            <Textarea
              value={contact.backgroundNotes || ''}
              onChange={e => onUpdate({ backgroundNotes: e.target.value })}
              placeholder="Research notes about this person (e.g., 15 yrs in ops, mentioned automation pain at conference...)"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* LinkedIn Connect Message (300 char) */}
          <div className="rounded-lg border p-3 bg-cyan-50/50 dark:bg-cyan-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Linkedin className="h-4 w-4 text-cyan-600" />
              <label className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                LinkedIn Connect Message
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                {contact.linkedInConnectMessage?.length || 0}/300 chars
              </span>
            </div>
            <Textarea
              value={contact.linkedInConnectMessage || ''}
              onChange={e => {
                const value = e.target.value.slice(0, 300);
                onUpdate({ linkedInConnectMessage: value });
              }}
              placeholder={`Hi ${contact.name?.split(' ')[0] || '[Name]'}, I noticed your work at [Company]. I've curated AI skills for your team...`}
              rows={3}
              className="text-sm"
              maxLength={300}
            />
          </div>

          {/* LinkedIn Followup Message (longer) */}
          <div className="rounded-lg border p-3 bg-indigo-50/50 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <label className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                LinkedIn Followup Message
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                Post-connect message with skill references
              </span>
            </div>
            <Textarea
              value={contact.linkedInFollowupMessage || ''}
              onChange={e => onUpdate({ linkedInFollowupMessage: e.target.value })}
              placeholder={`Thanks for connecting! Based on your work in [industry], I think these skills would be particularly valuable: ${selectedSkillNames}. Would you be interested in a quick demo?`}
              rows={4}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Selected skills: {selectedSkillNames || 'None selected yet'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Key Use Case Input Component
// ═══════════════════════════════════════════════════════════════════════════

interface KeyUseCaseInputProps {
  onAdd: (useCase: string) => void;
}

const KeyUseCaseInput: React.FC<KeyUseCaseInputProps> = ({ onAdd }) => {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-dashed hover:border-purple-500 hover:text-purple-600"
      >
        <Plus className="h-3 w-3" />
        Add Use Case
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g., Email Automation"
        className="h-7 text-xs w-[150px]"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') {
            setIsAdding(false);
            setValue('');
          }
        }}
      />
      <Button variant="ghost" size="sm" onClick={handleAdd} className="h-7 px-2">
        <Check className="h-3 w-3" />
      </Button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Skill Selector Component
// ═══════════════════════════════════════════════════════════════════════════

interface SkillSelectorProps {
  availableSkills: SelectableSkill[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void | Promise<void>;
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
  onSelectionChange: (ids: string[]) => void | Promise<void>;
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
