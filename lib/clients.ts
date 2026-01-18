/**
 * clients.ts - Client Management for B2B Outreach
 *
 * Manages client records for targeted marketing with curated
 * skill and workflow selections per client.
 *
 * Uses Supabase for persistent storage when available,
 * falls back to localStorage for offline/unconfigured scenarios.
 */

import type { Client, ClientStatus, ClientIndustry } from './storage/types';
import { DEFAULT_TARGET_COMPANIES as defaultCompanies } from './storage/types';
import { getRecommendedSkills, getRecommendedWorkflows } from './clientRecommendations';
import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

const CLIENTS_STORAGE_KEY = 'skillengine_clients';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE CONVERSION HELPERS (camelCase <-> snake_case)
// ═══════════════════════════════════════════════════════════════════════════

interface SupabaseClient {
  id: string;
  company_name: string;
  industry: string;
  website: string | null;
  description: string | null;
  company_type: string | null;
  services: string | null;
  revenue: string | null;
  employee_count: string | null;
  location: string | null;
  priority: string | null;
  estimated_time_savings: string | null;
  estimated_cost_savings: string | null;
  pain_points: string | null;
  contacts: unknown;
  selected_skill_ids: string[] | null;
  selected_workflow_ids: string[] | null;
  custom_headline: string | null;
  custom_message: string | null;
  portal_slug: string;
  portal_enabled: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
}

function supabaseToClient(row: SupabaseClient): Client {
  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry as ClientIndustry,
    website: row.website || undefined,
    description: row.description || undefined,
    companyType: row.company_type || undefined,
    services: row.services || undefined,
    revenue: row.revenue || undefined,
    employeeCount: row.employee_count || undefined,
    location: row.location || undefined,
    priority: row.priority as Client['priority'] || undefined,
    estimatedTimeSavings: row.estimated_time_savings || undefined,
    estimatedCostSavings: row.estimated_cost_savings || undefined,
    painPoints: row.pain_points || undefined,
    contacts: Array.isArray(row.contacts) ? row.contacts as Client['contacts'] : [],
    selectedSkillIds: row.selected_skill_ids || [],
    selectedWorkflowIds: row.selected_workflow_ids || [],
    customHeadline: row.custom_headline || undefined,
    customMessage: row.custom_message || undefined,
    portalSlug: row.portal_slug,
    portalEnabled: row.portal_enabled,
    status: row.status as ClientStatus,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastContactedAt: row.last_contacted_at || undefined,
  };
}

function clientToSupabase(client: Partial<Client>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (client.companyName !== undefined) result.company_name = client.companyName;
  if (client.industry !== undefined) result.industry = client.industry;
  if (client.website !== undefined) result.website = client.website || null;
  if (client.description !== undefined) result.description = client.description || null;
  if (client.companyType !== undefined) result.company_type = client.companyType || null;
  if (client.services !== undefined) result.services = client.services || null;
  if (client.revenue !== undefined) result.revenue = client.revenue || null;
  if (client.employeeCount !== undefined) result.employee_count = client.employeeCount || null;
  if (client.location !== undefined) result.location = client.location || null;
  if (client.priority !== undefined) result.priority = client.priority || null;
  if (client.estimatedTimeSavings !== undefined) result.estimated_time_savings = client.estimatedTimeSavings || null;
  if (client.estimatedCostSavings !== undefined) result.estimated_cost_savings = client.estimatedCostSavings || null;
  if (client.painPoints !== undefined) result.pain_points = client.painPoints || null;
  if (client.contacts !== undefined) result.contacts = client.contacts || [];
  if (client.selectedSkillIds !== undefined) result.selected_skill_ids = client.selectedSkillIds || [];
  if (client.selectedWorkflowIds !== undefined) result.selected_workflow_ids = client.selectedWorkflowIds || [];
  if (client.customHeadline !== undefined) result.custom_headline = client.customHeadline || null;
  if (client.customMessage !== undefined) result.custom_message = client.customMessage || null;
  if (client.portalSlug !== undefined) result.portal_slug = client.portalSlug;
  if (client.portalEnabled !== undefined) result.portal_enabled = client.portalEnabled;
  if (client.status !== undefined) result.status = client.status;
  if (client.notes !== undefined) result.notes = client.notes || null;
  if (client.lastContactedAt !== undefined) result.last_contacted_at = client.lastContactedAt || null;

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE OPERATIONS (Fallback)
// ═══════════════════════════════════════════════════════════════════════════

function getClientsFromLocalStorage(): Client[] {
  try {
    const stored = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load clients from localStorage', { error });
  }
  return [];
}

function saveClientsToLocalStorage(clients: Client[]): void {
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  } catch (error) {
    logger.error('Failed to save clients to localStorage', { error });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all clients from Supabase
 */
async function getClientsFromSupabase(): Promise<Client[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch clients from Supabase', { error: error.message });
    return [];
  }

  return (data as SupabaseClient[]).map(supabaseToClient);
}

/**
 * Save a client to Supabase (upsert)
 */
async function saveClientToSupabase(client: Client): Promise<Client | null> {
  if (!supabase) return null;

  const supabaseData = clientToSupabase(client);
  supabaseData.id = client.id;
  supabaseData.created_at = client.createdAt;
  supabaseData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('clients')
    .upsert(supabaseData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    logger.error('Failed to save client to Supabase', { error: error.message });
    return null;
  }

  return supabaseToClient(data as SupabaseClient);
}

/**
 * Delete a client from Supabase
 */
async function deleteClientFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Failed to delete client from Supabase', { error: error.message });
    return false;
  }

  return true;
}

/**
 * Get a client by portal slug from Supabase (public access for portal pages)
 */
async function getClientBySlugFromSupabase(slug: string): Promise<Client | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_slug', slug)
    .eq('portal_enabled', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is expected
      logger.error('Failed to fetch client by slug from Supabase', { error: error.message });
    }
    return null;
  }

  return supabaseToClient(data as SupabaseClient);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API - Uses Supabase with localStorage fallback
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all clients (async for Supabase, falls back to localStorage)
 */
export async function getClientsAsync(): Promise<Client[]> {
  if (isSupabaseConfigured()) {
    const clients = await getClientsFromSupabase();
    if (clients.length > 0) {
      // Sync to localStorage for offline access
      saveClientsToLocalStorage(clients);
      return clients;
    }
  }
  return getClientsFromLocalStorage();
}

/**
 * Get all clients (sync - localStorage only, for backwards compatibility)
 */
export function getClients(): Client[] {
  return getClientsFromLocalStorage();
}

/**
 * Save clients to storage (both Supabase and localStorage)
 */
export function saveClients(clients: Client[]): void {
  // Always save to localStorage for immediate access
  saveClientsToLocalStorage(clients);

  // Also save to Supabase if configured (async, fire-and-forget)
  if (isSupabaseConfigured()) {
    Promise.all(clients.map(c => saveClientToSupabase(c)))
      .catch(err => logger.error('Failed to sync clients to Supabase', { error: err }));
  }
}

/**
 * Get a single client by ID
 */
export function getClientById(id: string): Client | null {
  const clients = getClients();
  return clients.find(c => c.id === id) || null;
}

/**
 * Get a client by their portal slug (async - checks Supabase first for external users)
 */
export async function getClientBySlugAsync(slug: string): Promise<Client | null> {
  // Try Supabase first (for external users without localStorage)
  if (isSupabaseConfigured()) {
    const client = await getClientBySlugFromSupabase(slug);
    if (client) return client;
  }
  // Fall back to localStorage
  return getClientBySlug(slug);
}

/**
 * Get a client by their portal slug (sync - localStorage only)
 */
export function getClientBySlug(slug: string): Client | null {
  const clients = getClients();
  return clients.find(c => c.portalSlug === slug && c.portalEnabled) || null;
}

/**
 * Generate a URL-friendly slug from company name
 */
export function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new client
 */
export async function createClientAsync(data: Partial<Client>): Promise<Client> {
  const clients = getClients();

  const newClient: Client = {
    id: generateId(),
    companyName: data.companyName || 'New Company',
    industry: data.industry || 'other',
    website: data.website,
    description: data.description,
    companyType: data.companyType,
    services: data.services,
    revenue: data.revenue,
    employeeCount: data.employeeCount,
    location: data.location,
    priority: data.priority,
    estimatedTimeSavings: data.estimatedTimeSavings,
    estimatedCostSavings: data.estimatedCostSavings,
    painPoints: data.painPoints,
    contacts: data.contacts || [],
    selectedSkillIds: data.selectedSkillIds || [],
    selectedWorkflowIds: data.selectedWorkflowIds || [],
    customHeadline: data.customHeadline,
    customMessage: data.customMessage,
    portalSlug: data.portalSlug || generateSlug(data.companyName || 'new-company'),
    portalEnabled: data.portalEnabled ?? false,
    status: data.status || 'prospect',
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure slug is unique
  let slug = newClient.portalSlug;
  let counter = 1;
  while (clients.some(c => c.portalSlug === slug)) {
    slug = `${newClient.portalSlug}-${counter}`;
    counter++;
  }
  newClient.portalSlug = slug;

  // Save to localStorage
  clients.push(newClient);
  saveClientsToLocalStorage(clients);

  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    await saveClientToSupabase(newClient);
  }

  return newClient;
}

/**
 * Create a new client (sync version for backwards compatibility)
 */
export function createClient(data: Partial<Client>): Client {
  const clients = getClients();

  const newClient: Client = {
    id: generateId(),
    companyName: data.companyName || 'New Company',
    industry: data.industry || 'other',
    website: data.website,
    description: data.description,
    companyType: data.companyType,
    services: data.services,
    revenue: data.revenue,
    employeeCount: data.employeeCount,
    location: data.location,
    priority: data.priority,
    estimatedTimeSavings: data.estimatedTimeSavings,
    estimatedCostSavings: data.estimatedCostSavings,
    painPoints: data.painPoints,
    contacts: data.contacts || [],
    selectedSkillIds: data.selectedSkillIds || [],
    selectedWorkflowIds: data.selectedWorkflowIds || [],
    customHeadline: data.customHeadline,
    customMessage: data.customMessage,
    portalSlug: data.portalSlug || generateSlug(data.companyName || 'new-company'),
    portalEnabled: data.portalEnabled ?? false,
    status: data.status || 'prospect',
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure slug is unique
  let slug = newClient.portalSlug;
  let counter = 1;
  while (clients.some(c => c.portalSlug === slug)) {
    slug = `${newClient.portalSlug}-${counter}`;
    counter++;
  }
  newClient.portalSlug = slug;

  clients.push(newClient);
  saveClients(clients);

  return newClient;
}

/**
 * Update an existing client
 */
export async function updateClientAsync(id: string, updates: Partial<Client>): Promise<Client | null> {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === id);

  if (index === -1) return null;

  const updatedClient = {
    ...clients[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // If slug changed, ensure uniqueness
  if (updates.portalSlug && updates.portalSlug !== clients[index].portalSlug) {
    let slug = updates.portalSlug;
    let counter = 1;
    while (clients.some((c, i) => i !== index && c.portalSlug === slug)) {
      slug = `${updates.portalSlug}-${counter}`;
      counter++;
    }
    updatedClient.portalSlug = slug;
  }

  clients[index] = updatedClient;
  saveClientsToLocalStorage(clients);

  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    await saveClientToSupabase(updatedClient);
  }

  return updatedClient;
}

/**
 * Update an existing client (sync version)
 */
export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === id);

  if (index === -1) return null;

  const updatedClient = {
    ...clients[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // If slug changed, ensure uniqueness
  if (updates.portalSlug && updates.portalSlug !== clients[index].portalSlug) {
    let slug = updates.portalSlug;
    let counter = 1;
    while (clients.some((c, i) => i !== index && c.portalSlug === slug)) {
      slug = `${updates.portalSlug}-${counter}`;
      counter++;
    }
    updatedClient.portalSlug = slug;
  }

  clients[index] = updatedClient;
  saveClients(clients);

  return updatedClient;
}

/**
 * Delete a client
 */
export async function deleteClientAsync(id: string): Promise<boolean> {
  const clients = getClients();
  const filtered = clients.filter(c => c.id !== id);

  if (filtered.length === clients.length) return false;

  saveClientsToLocalStorage(filtered);

  // Delete from Supabase if configured
  if (isSupabaseConfigured()) {
    await deleteClientFromSupabase(id);
  }

  return true;
}

/**
 * Delete a client (sync version)
 */
export function deleteClient(id: string): boolean {
  const clients = getClients();
  const filtered = clients.filter(c => c.id !== id);

  if (filtered.length === clients.length) return false;

  saveClients(filtered);
  return true;
}

/**
 * Mark client as contacted
 */
export function markClientContacted(id: string, notes?: string): Client | null {
  return updateClient(id, {
    status: 'contacted',
    lastContactedAt: new Date().toISOString(),
    notes: notes ? `${notes}\n[Contacted: ${new Date().toLocaleString()}]` : undefined,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL/WORKFLOW SELECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update selected skills for a client
 */
export function updateClientSkills(id: string, skillIds: string[]): Client | null {
  return updateClient(id, { selectedSkillIds: skillIds });
}

/**
 * Update selected workflows for a client
 */
export function updateClientWorkflows(id: string, workflowIds: string[]): Client | null {
  return updateClient(id, { selectedWorkflowIds: workflowIds });
}

/**
 * Toggle portal enabled status
 */
export function toggleClientPortal(id: string, enabled: boolean): Client | null {
  return updateClient(id, { portalEnabled: enabled });
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize with default target companies if no clients exist
 * Auto-applies curated skills and workflows based on company industry
 */
export async function initializeDefaultClientsAsync(): Promise<Client[]> {
  // Check Supabase first
  if (isSupabaseConfigured()) {
    const existing = await getClientsFromSupabase();
    if (existing.length > 0) {
      saveClientsToLocalStorage(existing);
      return existing;
    }
  }

  // Check localStorage
  const localExisting = getClientsFromLocalStorage();
  if (localExisting.length > 0) return localExisting;

  // Create default clients
  const clients: Client[] = defaultCompanies.map(company => {
    const industry = company.industry || 'other';
    return {
      id: generateId(),
      companyName: company.companyName || 'Unknown',
      industry,
      companyType: company.companyType,
      services: company.services,
      revenue: company.revenue,
      employeeCount: company.employeeCount,
      location: company.location,
      priority: company.priority,
      description: company.description,
      painPoints: company.painPoints,
      estimatedTimeSavings: company.estimatedTimeSavings,
      estimatedCostSavings: company.estimatedCostSavings,
      website: company.website,
      notes: company.notes,
      contacts: [],
      selectedSkillIds: company.selectedSkillIds || getRecommendedSkills(industry),
      selectedWorkflowIds: company.selectedWorkflowIds || getRecommendedWorkflows(industry),
      portalSlug: generateSlug(company.companyName || 'unknown'),
      portalEnabled: false,
      status: 'prospect' as ClientStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Save to localStorage
  saveClientsToLocalStorage(clients);

  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    await Promise.all(clients.map(c => saveClientToSupabase(c)));
  }

  return clients;
}

/**
 * Initialize with default target companies (sync version)
 */
export function initializeDefaultClients(): Client[] {
  const existing = getClients();
  if (existing.length > 0) return existing;

  const clients: Client[] = defaultCompanies.map(company => {
    const industry = company.industry || 'other';
    return {
      id: generateId(),
      companyName: company.companyName || 'Unknown',
      industry,
      companyType: company.companyType,
      services: company.services,
      revenue: company.revenue,
      employeeCount: company.employeeCount,
      location: company.location,
      priority: company.priority,
      description: company.description,
      painPoints: company.painPoints,
      estimatedTimeSavings: company.estimatedTimeSavings,
      estimatedCostSavings: company.estimatedCostSavings,
      website: company.website,
      notes: company.notes,
      contacts: [],
      selectedSkillIds: company.selectedSkillIds || getRecommendedSkills(industry),
      selectedWorkflowIds: company.selectedWorkflowIds || getRecommendedWorkflows(industry),
      portalSlug: generateSlug(company.companyName || 'unknown'),
      portalEnabled: false,
      status: 'prospect' as ClientStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  saveClients(clients);
  return clients;
}

/**
 * Sync clients from localStorage to Supabase (manual sync)
 */
export async function syncClientsToSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const clients = getClientsFromLocalStorage();
  if (clients.length === 0) return true;

  try {
    await Promise.all(clients.map(c => saveClientToSupabase(c)));
    logger.info('Successfully synced clients to Supabase', { count: clients.length });
    return true;
  } catch (error) {
    logger.error('Failed to sync clients to Supabase', { error });
    return false;
  }
}

/**
 * Get clients by status
 */
export function getClientsByStatus(status: ClientStatus): Client[] {
  return getClients().filter(c => c.status === status);
}

/**
 * Get clients by industry
 */
export function getClientsByIndustry(industry: ClientIndustry): Client[] {
  return getClients().filter(c => c.industry === industry);
}

/**
 * Get clients with active portals
 */
export function getClientsWithPortals(): Client[] {
  return getClients().filter(c => c.portalEnabled);
}

/**
 * Export clients to CSV
 */
export function exportClientsToCSV(): string {
  const clients = getClients();
  const headers = [
    'Company Name',
    'Industry',
    'Status',
    'Website',
    'Portal Slug',
    'Portal Enabled',
    'Primary Contact',
    'Primary Email',
    'Skills Count',
    'Workflows Count',
    'Last Contacted',
    'Created',
  ];

  const rows = clients.map(c => {
    const primary = c.contacts.find(contact => contact.isPrimary) || c.contacts[0];
    return [
      c.companyName,
      c.industry,
      c.status,
      c.website || '',
      c.portalSlug,
      c.portalEnabled ? 'Yes' : 'No',
      primary?.name || '',
      primary?.email || '',
      c.selectedSkillIds.length,
      c.selectedWorkflowIds.length,
      c.lastContactedAt || '',
      c.createdAt,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Get client portal URL
 */
export function getClientPortalUrl(client: Client): string {
  return `${window.location.origin}/#/portal/${client.portalSlug}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

export interface ClientStats {
  total: number;
  byStatus: Record<ClientStatus, number>;
  byIndustry: Record<ClientIndustry, number>;
  withPortals: number;
  contacted: number;
  avgSkillsPerClient: number;
  avgWorkflowsPerClient: number;
}

/**
 * Get client statistics
 */
export function getClientStats(): ClientStats {
  const clients = getClients();

  const byStatus: Record<ClientStatus, number> = {
    prospect: 0,
    contacted: 0,
    demo_scheduled: 0,
    active: 0,
    inactive: 0,
  };

  const byIndustry: Partial<Record<ClientIndustry, number>> = {};

  let totalSkills = 0;
  let totalWorkflows = 0;

  clients.forEach(c => {
    byStatus[c.status]++;
    byIndustry[c.industry] = (byIndustry[c.industry] || 0) + 1;
    totalSkills += c.selectedSkillIds.length;
    totalWorkflows += c.selectedWorkflowIds.length;
  });

  return {
    total: clients.length,
    byStatus,
    byIndustry: byIndustry as Record<ClientIndustry, number>,
    withPortals: clients.filter(c => c.portalEnabled).length,
    contacted: clients.filter(c => c.lastContactedAt).length,
    avgSkillsPerClient: clients.length > 0 ? Math.round(totalSkills / clients.length * 10) / 10 : 0,
    avgWorkflowsPerClient: clients.length > 0 ? Math.round(totalWorkflows / clients.length * 10) / 10 : 0,
  };
}
