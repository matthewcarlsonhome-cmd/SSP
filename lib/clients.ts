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
import {
  getRecommendedSkills,
  getRecommendedWorkflows,
  getPersonalizedSkillRecommendations,
  getPersonalizedWorkflowRecommendations,
} from './clientRecommendations';
import { applyPersuasiveMessaging } from './persuasiveMessaging';
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
  logo_url: string | null;
  linkedin_url: string | null;
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
    logoUrl: row.logo_url || undefined,
    linkedInUrl: row.linkedin_url || undefined,
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
  if (client.logoUrl !== undefined) result.logo_url = client.logoUrl || null;
  if (client.linkedInUrl !== undefined) result.linkedin_url = client.linkedInUrl || null;
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

  const ensuredClient = ensureClientUuid(client);
  const supabaseData = clientToSupabase(ensuredClient);
  supabaseData.id = ensuredClient.id;
  supabaseData.created_at = ensuredClient.createdAt;
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
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Per RFC 4122 section 4.4
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function ensureClientUuid(client: Client): Client {
  if (isValidUuid(client.id)) {
    return client;
  }

  const updatedClient = { ...client, id: generateUuid() };
  const clients = getClientsFromLocalStorage();
  const index = clients.findIndex(c => c.id === client.id);
  if (index !== -1) {
    clients[index] = updatedClient;
    saveClientsToLocalStorage(clients);
  }

  return updatedClient;
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
    id: generateUuid(),
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
    logoUrl: data.logoUrl,
    linkedInUrl: data.linkedInUrl,
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
    id: generateUuid(),
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
    logoUrl: data.logoUrl,
    linkedInUrl: data.linkedInUrl,
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
      id: generateUuid(),
      companyName: company.companyName || 'Unknown',
      industry,
      companyType: company.companyType,
      services: company.services,
      revenue: company.revenue,
      employeeCount: company.employeeCount,
      location: company.location,
      priority: company.priority,
      logoUrl: company.logoUrl,
      linkedInUrl: company.linkedInUrl,
      description: company.description,
      painPoints: company.painPoints,
      estimatedTimeSavings: company.estimatedTimeSavings,
      estimatedCostSavings: company.estimatedCostSavings,
      website: company.website,
      customHeadline: company.customHeadline,
      customMessage: company.customMessage,
      notes: company.notes,
      contacts: company.contacts || [],
      // Use personalized recommendations based on ALL client attributes including company name
      selectedSkillIds: company.selectedSkillIds || getPersonalizedSkillRecommendations({
        companyName: company.companyName,
        industry,
        painPoints: company.painPoints,
        services: company.services,
        description: company.description,
        companyType: company.companyType,
        employeeCount: company.employeeCount,
        revenue: company.revenue,
      }),
      selectedWorkflowIds: company.selectedWorkflowIds || getPersonalizedWorkflowRecommendations({
        companyName: company.companyName,
        industry,
        painPoints: company.painPoints,
        services: company.services,
        description: company.description,
        companyType: company.companyType,
      }),
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
      id: generateUuid(),
      companyName: company.companyName || 'Unknown',
      industry,
      companyType: company.companyType,
      services: company.services,
      revenue: company.revenue,
      employeeCount: company.employeeCount,
      location: company.location,
      priority: company.priority,
      logoUrl: company.logoUrl,
      linkedInUrl: company.linkedInUrl,
      description: company.description,
      painPoints: company.painPoints,
      estimatedTimeSavings: company.estimatedTimeSavings,
      estimatedCostSavings: company.estimatedCostSavings,
      website: company.website,
      customHeadline: company.customHeadline,
      customMessage: company.customMessage,
      notes: company.notes,
      contacts: company.contacts || [],
      // Use personalized recommendations based on ALL client attributes including company name
      selectedSkillIds: company.selectedSkillIds || getPersonalizedSkillRecommendations({
        companyName: company.companyName,
        industry,
        painPoints: company.painPoints,
        services: company.services,
        description: company.description,
        companyType: company.companyType,
        employeeCount: company.employeeCount,
        revenue: company.revenue,
      }),
      selectedWorkflowIds: company.selectedWorkflowIds || getPersonalizedWorkflowRecommendations({
        companyName: company.companyName,
        industry,
        painPoints: company.painPoints,
        services: company.services,
        description: company.description,
        companyType: company.companyType,
      }),
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
 * Export clients to CSV with full skill and workflow names
 */
export function exportClientsToCSV(skillsMap?: Map<string, string>, workflowsMap?: Map<string, string>): string {
  const clients = getClients();
  const headers = [
    'Company Name',
    'Industry',
    'Status',
    'Priority',
    'Website',
    'LinkedIn URL',
    'Portal Slug',
    'Portal Enabled',
    'Portal URL',
    'Primary Contact',
    'Primary Email',
    'Custom Headline',
    'Custom Message',
    'Location',
    'Revenue',
    'Employee Count',
    'Est. Time Savings',
    'Est. Cost Savings',
    'Pain Points',
    'Skills Count',
    'Skill IDs',
    'Skill Names',
    'Workflows Count',
    'Workflow IDs',
    'Workflow Names',
    'Last Contacted',
    'Created',
  ];

  const rows = clients.map(c => {
    const primary = c.contacts.find(contact => contact.isPrimary) || c.contacts[0];

    // Build skill names list
    const skillNames = skillsMap
      ? c.selectedSkillIds.map(id => skillsMap.get(id) || id).join('; ')
      : c.selectedSkillIds.join('; ');

    // Build workflow names list
    const workflowNames = workflowsMap
      ? c.selectedWorkflowIds.map(id => workflowsMap.get(id) || id).join('; ')
      : c.selectedWorkflowIds.join('; ');

    // Build portal URL
    const portalUrl = c.portalEnabled
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/#/portal/${c.portalSlug}`
      : '';

    return [
      c.companyName,
      c.industry,
      c.status,
      c.priority || '',
      c.website || '',
      c.linkedInUrl || '',
      c.portalSlug,
      c.portalEnabled ? 'Yes' : 'No',
      portalUrl,
      primary?.name || '',
      primary?.email || '',
      c.customHeadline || '',
      c.customMessage || '',
      c.location || '',
      c.revenue || '',
      c.employeeCount || '',
      c.estimatedTimeSavings || '',
      c.estimatedCostSavings || '',
      c.painPoints || '',
      c.selectedSkillIds.length,
      c.selectedSkillIds.join('; '),
      skillNames,
      c.selectedWorkflowIds.length,
      c.selectedWorkflowIds.join('; '),
      workflowNames,
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

// ═══════════════════════════════════════════════════════════════════════════
// RESET CLIENT SELECTIONS TO PERSONALIZED DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reset all client skill/workflow selections to personalized defaults
 * Uses full client attributes (industry, painPoints, services, etc.)
 */
export async function resetAllClientSelectionsToDefaults(): Promise<number> {
  const clients = getClients();
  let updatedCount = 0;

  for (const client of clients) {
    // Use personalized recommendations based on ALL client attributes including company name
    const newSkills = getPersonalizedSkillRecommendations({
      companyName: client.companyName,
      industry: client.industry,
      painPoints: client.painPoints,
      services: client.services,
      description: client.description,
      companyType: client.companyType,
      employeeCount: client.employeeCount,
      revenue: client.revenue,
    });
    const newWorkflows = getPersonalizedWorkflowRecommendations({
      companyName: client.companyName,
      industry: client.industry,
      painPoints: client.painPoints,
      services: client.services,
      description: client.description,
      companyType: client.companyType,
    });

    // Only update if selections differ
    const skillsChanged = JSON.stringify(client.selectedSkillIds.sort()) !== JSON.stringify(newSkills.sort());
    const workflowsChanged = JSON.stringify(client.selectedWorkflowIds.sort()) !== JSON.stringify(newWorkflows.sort());

    if (skillsChanged || workflowsChanged) {
      client.selectedSkillIds = newSkills;
      client.selectedWorkflowIds = newWorkflows;
      client.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    saveClientsToLocalStorage(clients);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      await syncClientsToSupabase(clients);
    }
  }

  return updatedCount;
}

/**
 * Reset a single client's selections to personalized defaults
 */
export function resetClientSelectionsToDefaults(clientId: string): Client | null {
  const client = getClientById(clientId);
  if (!client) return null;

  const clients = getClients();
  const index = clients.findIndex(c => c.id === clientId);
  if (index === -1) return null;

  // Use personalized recommendations including company name for uniqueness
  clients[index].selectedSkillIds = getPersonalizedSkillRecommendations({
    companyName: client.companyName,
    industry: client.industry,
    painPoints: client.painPoints,
    services: client.services,
    description: client.description,
    companyType: client.companyType,
    employeeCount: client.employeeCount,
    revenue: client.revenue,
  });
  clients[index].selectedWorkflowIds = getPersonalizedWorkflowRecommendations({
    companyName: client.companyName,
    industry: client.industry,
    painPoints: client.painPoints,
    services: client.services,
    description: client.description,
    companyType: client.companyType,
  });
  clients[index].updatedAt = new Date().toISOString();

  saveClients(clients);
  return clients[index];
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH FROM DEFAULTS - Sync with updated DEFAULT_TARGET_COMPANIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Refresh clients from DEFAULT_TARGET_COMPANIES
 * - Adds new companies that don't exist
 * - Updates existing companies with new data (contacts, customizations, etc.)
 * - Updates skill/workflow selections to current industry defaults
 * Returns { added: number, updated: number }
 */
export async function refreshClientsFromDefaults(): Promise<{ added: number; updated: number }> {
  const clients = getClients();
  const existingByName = new Map(clients.map(c => [c.companyName.toLowerCase(), c]));

  let added = 0;
  let updated = 0;

  for (const company of defaultCompanies) {
    const companyName = company.companyName || 'Unknown';
    const existing = existingByName.get(companyName.toLowerCase());
    const industry = company.industry || 'other';

    if (existing) {
      // Update existing client with new data from defaults
      let hasChanges = false;

      // Update contacts if provided in defaults
      if (company.contacts && company.contacts.length > 0) {
        existing.contacts = company.contacts;
        hasChanges = true;
      }

      // Update custom headline/message if provided
      if (company.customHeadline && company.customHeadline !== existing.customHeadline) {
        existing.customHeadline = company.customHeadline;
        hasChanges = true;
      }
      if (company.customMessage && company.customMessage !== existing.customMessage) {
        existing.customMessage = company.customMessage;
        hasChanges = true;
      }

      // Update LinkedIn URL if provided
      if (company.linkedInUrl && company.linkedInUrl !== existing.linkedInUrl) {
        existing.linkedInUrl = company.linkedInUrl;
        hasChanges = true;
      }

      // Update other fields
      if (company.logoUrl && !existing.logoUrl) {
        existing.logoUrl = company.logoUrl;
        hasChanges = true;
      }
      if (company.painPoints && !existing.painPoints) {
        existing.painPoints = company.painPoints;
        hasChanges = true;
      }
      if (company.estimatedTimeSavings && !existing.estimatedTimeSavings) {
        existing.estimatedTimeSavings = company.estimatedTimeSavings;
        hasChanges = true;
      }
      if (company.estimatedCostSavings && !existing.estimatedCostSavings) {
        existing.estimatedCostSavings = company.estimatedCostSavings;
        hasChanges = true;
      }

      // Update skill/workflow selections to personalized defaults (unique per company)
      const newSkills = getPersonalizedSkillRecommendations({
        companyName: existing.companyName,
        industry,
        painPoints: existing.painPoints || company.painPoints,
        services: existing.services || company.services,
        description: existing.description || company.description,
        companyType: existing.companyType || company.companyType,
        employeeCount: existing.employeeCount || company.employeeCount,
        revenue: existing.revenue || company.revenue,
      });
      const newWorkflows = getPersonalizedWorkflowRecommendations({
        companyName: existing.companyName,
        industry,
        painPoints: existing.painPoints || company.painPoints,
        services: existing.services || company.services,
        description: existing.description || company.description,
        companyType: existing.companyType || company.companyType,
      });

      if (JSON.stringify(existing.selectedSkillIds.sort()) !== JSON.stringify(newSkills.sort())) {
        existing.selectedSkillIds = newSkills;
        hasChanges = true;
      }
      if (JSON.stringify(existing.selectedWorkflowIds.sort()) !== JSON.stringify(newWorkflows.sort())) {
        existing.selectedWorkflowIds = newWorkflows;
        hasChanges = true;
      }

      if (hasChanges) {
        existing.updatedAt = new Date().toISOString();
        updated++;
      }
    } else {
      // Add new client
      const newClient: Client = {
        id: generateUuid(),
        companyName,
        industry,
        companyType: company.companyType,
        services: company.services,
        revenue: company.revenue,
        employeeCount: company.employeeCount,
        location: company.location,
        priority: company.priority,
        logoUrl: company.logoUrl,
        linkedInUrl: company.linkedInUrl,
        description: company.description,
        painPoints: company.painPoints,
        estimatedTimeSavings: company.estimatedTimeSavings,
        estimatedCostSavings: company.estimatedCostSavings,
        website: company.website,
        customHeadline: company.customHeadline,
        customMessage: company.customMessage,
        notes: company.notes,
        contacts: company.contacts || [],
        // Use personalized recommendations based on ALL client attributes (unique per company)
        selectedSkillIds: getPersonalizedSkillRecommendations({
          companyName,
          industry,
          painPoints: company.painPoints,
          services: company.services,
          description: company.description,
          companyType: company.companyType,
          employeeCount: company.employeeCount,
          revenue: company.revenue,
        }),
        selectedWorkflowIds: getPersonalizedWorkflowRecommendations({
          companyName,
          industry,
          painPoints: company.painPoints,
          services: company.services,
          description: company.description,
          companyType: company.companyType,
        }),
        portalSlug: generateSlug(companyName),
        portalEnabled: false,
        status: 'prospect' as ClientStatus,
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
      existingByName.set(companyName.toLowerCase(), newClient);
      added++;
    }
  }

  // Save all changes
  if (added > 0 || updated > 0) {
    saveClientsToLocalStorage(clients);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      await Promise.all(clients.map(c => saveClientToSupabase(c)));
    }
  }

  logger.info('Refreshed clients from defaults', { added, updated, total: clients.length });
  return { added, updated };
}

/**
 * Force reinitialize all clients from DEFAULT_TARGET_COMPANIES
 * WARNING: This will delete all existing clients and recreate from defaults
 */
export async function forceReinitializeClients(): Promise<Client[]> {
  // Clear existing clients
  saveClientsToLocalStorage([]);

  // Delete from Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('clients').delete().neq('id', '');
  }

  // Reinitialize from defaults
  return initializeDefaultClientsAsync();
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSUASIVE MESSAGING - Apply science-backed marketing messages
// Based on 7 persuasion principles: why, social proof, questions, etc.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply persuasive marketing messages to all clients
 * Uses 7 science-backed persuasion principles to generate unique messages
 *
 * @returns Number of clients updated
 */
export async function applyPersuasiveMessagesToAllClients(): Promise<number> {
  const clients = getClients();
  let updatedCount = 0;

  for (const client of clients) {
    // Generate persuasive content based on client attributes
    const { customHeadline, customMessage } = applyPersuasiveMessaging({
      companyName: client.companyName,
      industry: client.industry,
      companyType: client.companyType,
      services: client.services,
      description: client.description,
      painPoints: client.painPoints,
      revenue: client.revenue,
      employeeCount: client.employeeCount,
      estimatedTimeSavings: client.estimatedTimeSavings,
      estimatedCostSavings: client.estimatedCostSavings,
    });

    // Only update if messages have changed
    if (client.customHeadline !== customHeadline || client.customMessage !== customMessage) {
      client.customHeadline = customHeadline;
      client.customMessage = customMessage;
      client.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    saveClientsToLocalStorage(clients);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      await Promise.all(clients.map(c => saveClientToSupabase(c)));
    }
  }

  logger.info('Applied persuasive messaging to clients', { updatedCount, total: clients.length });
  return updatedCount;
}

/**
 * Apply persuasive messaging to a single client
 */
export function applyPersuasiveMessageToClient(clientId: string): Client | null {
  const client = getClientById(clientId);
  if (!client) return null;

  const clients = getClients();
  const index = clients.findIndex(c => c.id === clientId);
  if (index === -1) return null;

  // Generate persuasive content
  const { customHeadline, customMessage } = applyPersuasiveMessaging({
    companyName: client.companyName,
    industry: client.industry,
    companyType: client.companyType,
    services: client.services,
    description: client.description,
    painPoints: client.painPoints,
    revenue: client.revenue,
    employeeCount: client.employeeCount,
    estimatedTimeSavings: client.estimatedTimeSavings,
    estimatedCostSavings: client.estimatedCostSavings,
  });

  clients[index].customHeadline = customHeadline;
  clients[index].customMessage = customMessage;
  clients[index].updatedAt = new Date().toISOString();

  saveClients(clients);
  return clients[index];
}
