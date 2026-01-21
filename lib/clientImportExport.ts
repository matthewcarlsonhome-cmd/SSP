/**
 * Bulk Import/Export for Clients
 *
 * Features:
 * - CSV import with automatic field mapping
 * - Industry auto-detection from company description
 * - Skill/workflow auto-assignment based on industry
 * - CSV/JSON export with all client data
 * - Contact data included in exports
 */

import { logger } from './logger';
import type { Client, ClientContact, ClientIndustry, ClientStatus, ClientPriority, ContactStatus } from './storage/types';
import { getPersonalizedSkillRecommendations, getPersonalizedWorkflowRecommendations } from './clientRecommendations';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ImportedClient {
  companyName: string;
  industry?: ClientIndustry;
  website?: string;
  description?: string;
  companyType?: string;
  services?: string;
  revenue?: string;
  employeeCount?: string;
  location?: string;
  priority?: ClientPriority;
  logoUrl?: string;
  linkedInUrl?: string;
  painPoints?: string;
  // Contact fields (primary contact)
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  // Additional contacts
  contact2Name?: string;
  contact2Title?: string;
  contact2Email?: string;
  contact2LinkedIn?: string;
  contact3Name?: string;
  contact3Title?: string;
  contact3Email?: string;
  contact3LinkedIn?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  clients: Partial<Client>[];
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeContacts: boolean;
  includeSkills: boolean;
  includeWorkflows: boolean;
  includeNotes: boolean;
  statusFilter?: ClientStatus[];
  industryFilter?: ClientIndustry[];
}

// ═══════════════════════════════════════════════════════════════════════════
// INDUSTRY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

const INDUSTRY_KEYWORDS: Record<ClientIndustry, string[]> = {
  insurance: ['insurance', 'underwriting', 'claims', 'policy', 'actuary', 'risk', 'broker', 'coverage'],
  financial_services: ['financial', 'banking', 'investment', 'wealth', 'asset', 'advisory', 'capital', 'fund'],
  healthcare: ['healthcare', 'medical', 'health', 'hospital', 'clinic', 'patient', 'physician', 'pharma', 'biotech'],
  technology: ['software', 'technology', 'tech', 'saas', 'cloud', 'digital', 'platform', 'app', 'developer'],
  retail: ['retail', 'store', 'shop', 'ecommerce', 'e-commerce', 'consumer', 'merchandise'],
  manufacturing: ['manufacturing', 'factory', 'production', 'industrial', 'machinery', 'assembly'],
  professional_services: ['consulting', 'advisory', 'professional services', 'legal', 'accounting', 'strategy'],
  marketing_advertising: ['marketing', 'advertising', 'agency', 'creative', 'media', 'branding', 'pr', 'communications'],
  real_estate: ['real estate', 'property', 'realty', 'brokerage', 'commercial real estate', 'residential'],
  hospitality: ['hospitality', 'hotel', 'restaurant', 'food service', 'catering', 'event'],
  education: ['education', 'school', 'university', 'college', 'training', 'learning', 'academic'],
  nonprofit: ['nonprofit', 'non-profit', 'foundation', 'charity', 'ngo', 'association'],
  construction: ['construction', 'building', 'contractor', 'architecture', 'engineering', 'infrastructure'],
  automotive: ['automotive', 'auto', 'vehicle', 'car', 'dealership', 'transportation'],
  food_beverage: ['food', 'beverage', 'restaurant', 'brewery', 'winery', 'catering', 'qsr'],
  utilities: ['utility', 'energy', 'power', 'electric', 'gas', 'water', 'renewable'],
  biotechnology: ['biotech', 'biotechnology', 'life sciences', 'genomics', 'pharma', 'clinical'],
  legal: ['law firm', 'legal', 'attorney', 'lawyer', 'litigation', 'corporate law'],
  staffing: ['staffing', 'recruiting', 'recruitment', 'talent', 'employment', 'hr services'],
  engineering: ['engineering', 'civil', 'mechanical', 'electrical', 'structural'],
  other: [],
};

/**
 * Detect industry from company description and services
 */
export function detectIndustry(description?: string, services?: string, companyType?: string): ClientIndustry {
  const text = [description, services, companyType].filter(Boolean).join(' ').toLowerCase();

  if (!text) return 'other';

  // Score each industry by keyword matches
  const scores: Array<{ industry: ClientIndustry; score: number }> = [];

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += keyword.length; // Longer keywords are more specific
      }
    }
    if (score > 0) {
      scores.push({ industry: industry as ClientIndustry, score });
    }
  }

  // Return highest scoring industry
  scores.sort((a, b) => b.score - a.score);
  return scores.length > 0 ? scores[0].industry : 'other';
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse CSV string into rows
 */
function parseCSV(csvString: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }

  // Don't forget the last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Map header names to our field names
 */
const HEADER_MAPPINGS: Record<string, keyof ImportedClient> = {
  // Company fields
  'company': 'companyName',
  'company name': 'companyName',
  'companyname': 'companyName',
  'name': 'companyName',
  'organization': 'companyName',
  'business': 'companyName',

  'industry': 'industry',
  'sector': 'industry',
  'vertical': 'industry',

  'website': 'website',
  'url': 'website',
  'site': 'website',
  'web': 'website',

  'description': 'description',
  'about': 'description',
  'overview': 'description',
  'summary': 'description',

  'type': 'companyType',
  'company type': 'companyType',
  'companytype': 'companyType',
  'business type': 'companyType',

  'services': 'services',
  'offerings': 'services',
  'products': 'services',

  'revenue': 'revenue',
  'annual revenue': 'revenue',
  'arr': 'revenue',

  'employees': 'employeeCount',
  'employee count': 'employeeCount',
  'employeecount': 'employeeCount',
  'size': 'employeeCount',
  'company size': 'employeeCount',
  'headcount': 'employeeCount',

  'location': 'location',
  'city': 'location',
  'hq': 'location',
  'headquarters': 'location',
  'address': 'location',

  'priority': 'priority',
  'tier': 'priority',

  'logo': 'logoUrl',
  'logo url': 'logoUrl',
  'logourl': 'logoUrl',

  'linkedin': 'linkedInUrl',
  'linkedin url': 'linkedInUrl',
  'linkedinurl': 'linkedInUrl',
  'company linkedin': 'linkedInUrl',

  'pain points': 'painPoints',
  'painpoints': 'painPoints',
  'challenges': 'painPoints',
  'problems': 'painPoints',

  // Primary contact fields
  'contact': 'contactName',
  'contact name': 'contactName',
  'contactname': 'contactName',
  'primary contact': 'contactName',
  'first name': 'contactName',
  'full name': 'contactName',

  'title': 'contactTitle',
  'contact title': 'contactTitle',
  'job title': 'contactTitle',
  'position': 'contactTitle',
  'role': 'contactTitle',

  'email': 'contactEmail',
  'contact email': 'contactEmail',
  'email address': 'contactEmail',

  'phone': 'contactPhone',
  'contact phone': 'contactPhone',
  'phone number': 'contactPhone',

  'contact linkedin': 'contactLinkedIn',
  'personal linkedin': 'contactLinkedIn',

  // Secondary contacts
  'contact 2': 'contact2Name',
  'contact2': 'contact2Name',
  'secondary contact': 'contact2Name',
  'contact 2 name': 'contact2Name',

  'contact 2 title': 'contact2Title',
  'contact2 title': 'contact2Title',

  'contact 2 email': 'contact2Email',
  'contact2 email': 'contact2Email',

  'contact 2 linkedin': 'contact2LinkedIn',
  'contact2 linkedin': 'contact2LinkedIn',

  'contact 3': 'contact3Name',
  'contact3': 'contact3Name',
  'contact 3 name': 'contact3Name',

  'contact 3 title': 'contact3Title',
  'contact3 title': 'contact3Title',

  'contact 3 email': 'contact3Email',
  'contact3 email': 'contact3Email',

  'contact 3 linkedin': 'contact3LinkedIn',
  'contact3 linkedin': 'contact3LinkedIn',
};

/**
 * Map CSV headers to field names
 */
function mapHeaders(headers: string[]): Map<number, keyof ImportedClient> {
  const mapping = new Map<number, keyof ImportedClient>();

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const fieldName = HEADER_MAPPINGS[normalizedHeader];
    if (fieldName) {
      mapping.set(index, fieldName);
    }
  });

  return mapping;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Import clients from CSV string
 */
export function importFromCSV(
  csvString: string,
  options: { autoDetectIndustry?: boolean; autoAssignSkills?: boolean } = {}
): ImportResult {
  const { autoDetectIndustry = true, autoAssignSkills = true } = options;

  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [],
    clients: [],
  };

  try {
    const rows = parseCSV(csvString);
    if (rows.length < 2) {
      result.errors.push({ row: 0, error: 'CSV must have a header row and at least one data row' });
      return result;
    }

    const headers = rows[0];
    const headerMapping = mapHeaders(headers);

    if (!headerMapping.has(Array.from(headerMapping.entries()).find(([_, v]) => v === 'companyName')?.[0] ?? -1)) {
      // Find company name column
      const companyColIndex = headers.findIndex(h =>
        ['company', 'company name', 'name', 'organization', 'business'].includes(h.toLowerCase().trim())
      );
      if (companyColIndex === -1) {
        result.errors.push({ row: 0, error: 'Could not find company name column' });
        return result;
      }
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Build imported client object
        const imported: ImportedClient = { companyName: '' };

        headerMapping.forEach((fieldName, colIndex) => {
          const value = row[colIndex]?.trim();
          if (value) {
            (imported as Record<string, string>)[fieldName] = value;
          }
        });

        // Skip rows without company name
        if (!imported.companyName) {
          result.skipped++;
          continue;
        }

        // Auto-detect industry if not provided
        let industry: ClientIndustry = imported.industry || 'other';
        if (autoDetectIndustry && (!imported.industry || imported.industry === 'other')) {
          industry = detectIndustry(imported.description, imported.services, imported.companyType);
        }

        // Validate industry
        const validIndustries: ClientIndustry[] = [
          'insurance', 'financial_services', 'healthcare', 'technology', 'retail',
          'manufacturing', 'professional_services', 'marketing_advertising', 'real_estate',
          'hospitality', 'education', 'nonprofit', 'construction', 'automotive',
          'food_beverage', 'utilities', 'biotechnology', 'legal', 'staffing', 'engineering', 'other'
        ];
        if (!validIndustries.includes(industry)) {
          industry = 'other';
        }

        // Build contacts array
        const contacts: ClientContact[] = [];

        if (imported.contactName) {
          contacts.push({
            id: crypto.randomUUID(),
            name: imported.contactName,
            title: imported.contactTitle,
            email: imported.contactEmail,
            phone: imported.contactPhone,
            linkedinUrl: imported.contactLinkedIn,
            isPrimary: true,
            contactStatus: 'not_contacted' as ContactStatus,
          });
        }

        if (imported.contact2Name) {
          contacts.push({
            id: crypto.randomUUID(),
            name: imported.contact2Name,
            title: imported.contact2Title,
            email: imported.contact2Email,
            linkedinUrl: imported.contact2LinkedIn,
            contactStatus: 'not_contacted' as ContactStatus,
          });
        }

        if (imported.contact3Name) {
          contacts.push({
            id: crypto.randomUUID(),
            name: imported.contact3Name,
            title: imported.contact3Title,
            email: imported.contact3Email,
            linkedinUrl: imported.contact3LinkedIn,
            contactStatus: 'not_contacted' as ContactStatus,
          });
        }

        // Generate portal slug
        const portalSlug = imported.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);

        // Build client object
        const client: Partial<Client> = {
          id: crypto.randomUUID(),
          companyName: imported.companyName,
          industry,
          website: imported.website,
          description: imported.description,
          companyType: imported.companyType,
          services: imported.services,
          revenue: imported.revenue,
          employeeCount: imported.employeeCount,
          location: imported.location,
          priority: (imported.priority as ClientPriority) || 'MEDIUM',
          logoUrl: imported.logoUrl,
          linkedInUrl: imported.linkedInUrl,
          painPoints: imported.painPoints,
          contacts,
          portalSlug,
          portalEnabled: false,
          status: 'prospect' as ClientStatus,
          selectedSkillIds: [],
          selectedWorkflowIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Auto-assign skills and workflows if enabled
        if (autoAssignSkills) {
          client.selectedSkillIds = getPersonalizedSkillRecommendations({
            companyName: client.companyName,
            industry: client.industry!,
            painPoints: client.painPoints,
            services: client.services,
            description: client.description,
            companyType: client.companyType,
          });
          client.selectedWorkflowIds = getPersonalizedWorkflowRecommendations({
            companyName: client.companyName,
            industry: client.industry!,
            painPoints: client.painPoints,
            services: client.services,
            description: client.description,
            companyType: client.companyType,
          });
        }

        result.clients.push(client);
        result.imported++;
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.imported > 0;
  } catch (error) {
    logger.error('CSV import failed', { error });
    result.errors.push({ row: 0, error: 'Failed to parse CSV' });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export clients to CSV string
 */
export function exportToCSV(
  clients: Client[],
  options: Partial<ExportOptions> = {}
): string {
  const {
    includeContacts = true,
    includeSkills = false,
    includeWorkflows = false,
    includeNotes = false,
  } = options;

  // Build headers
  const headers: string[] = [
    'Company Name',
    'Industry',
    'Website',
    'Description',
    'Company Type',
    'Services',
    'Revenue',
    'Employee Count',
    'Location',
    'Priority',
    'Status',
    'Company LinkedIn',
    'Logo URL',
    'Pain Points',
    'Estimated Time Savings',
    'Estimated Cost Savings',
    'Portal Slug',
    'Portal Enabled',
    'Created At',
    'Updated At',
    'Last Contacted At',
  ];

  if (includeContacts) {
    headers.push(
      'Contact 1 Name', 'Contact 1 Title', 'Contact 1 Email', 'Contact 1 Phone', 'Contact 1 LinkedIn', 'Contact 1 Status',
      'Contact 2 Name', 'Contact 2 Title', 'Contact 2 Email', 'Contact 2 LinkedIn', 'Contact 2 Status',
      'Contact 3 Name', 'Contact 3 Title', 'Contact 3 Email', 'Contact 3 LinkedIn', 'Contact 3 Status',
    );
  }

  if (includeSkills) {
    headers.push('Selected Skills');
  }

  if (includeWorkflows) {
    headers.push('Selected Workflows');
  }

  if (includeNotes) {
    headers.push('Notes', 'Technical Info', 'Key Use Cases');
  }

  // Helper to escape CSV fields
  const escapeField = (value: string | undefined | null): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build rows
  const rows: string[] = [headers.join(',')];

  for (const client of clients) {
    const row: string[] = [
      escapeField(client.companyName),
      escapeField(client.industry),
      escapeField(client.website),
      escapeField(client.description),
      escapeField(client.companyType),
      escapeField(client.services),
      escapeField(client.revenue),
      escapeField(client.employeeCount),
      escapeField(client.location),
      escapeField(client.priority),
      escapeField(client.status),
      escapeField(client.linkedInUrl),
      escapeField(client.logoUrl),
      escapeField(client.painPoints),
      escapeField(client.estimatedTimeSavings),
      escapeField(client.estimatedCostSavings),
      escapeField(client.portalSlug),
      escapeField(String(client.portalEnabled)),
      escapeField(client.createdAt),
      escapeField(client.updatedAt),
      escapeField(client.lastContactedAt),
    ];

    if (includeContacts) {
      const contacts = client.contacts || [];
      for (let i = 0; i < 3; i++) {
        const contact = contacts[i];
        if (contact) {
          row.push(
            escapeField(contact.name),
            escapeField(contact.title),
            escapeField(contact.email),
            i === 0 ? escapeField(contact.phone) : '',
            escapeField(contact.linkedinUrl),
            escapeField(contact.contactStatus),
          );
        } else {
          row.push('', '', '', '', '', '');
          if (i === 0) row.splice(-1, 0, ''); // Extra phone field for contact 1
        }
      }
    }

    if (includeSkills) {
      row.push(escapeField(client.selectedSkillIds?.join('; ')));
    }

    if (includeWorkflows) {
      row.push(escapeField(client.selectedWorkflowIds?.join('; ')));
    }

    if (includeNotes) {
      row.push(
        escapeField(client.notes),
        escapeField(client.companyTechnicalInfo),
        escapeField(client.keyUseCases?.join('; ')),
      );
    }

    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Export clients to JSON string
 */
export function exportToJSON(
  clients: Client[],
  options: Partial<ExportOptions> = {}
): string {
  const {
    includeContacts = true,
    includeSkills = true,
    includeWorkflows = true,
    includeNotes = true,
  } = options;

  const exportData = clients.map(client => {
    const exported: Partial<Client> = {
      id: client.id,
      companyName: client.companyName,
      industry: client.industry,
      website: client.website,
      description: client.description,
      companyType: client.companyType,
      services: client.services,
      revenue: client.revenue,
      employeeCount: client.employeeCount,
      location: client.location,
      priority: client.priority,
      status: client.status,
      linkedInUrl: client.linkedInUrl,
      logoUrl: client.logoUrl,
      painPoints: client.painPoints,
      estimatedTimeSavings: client.estimatedTimeSavings,
      estimatedCostSavings: client.estimatedCostSavings,
      portalSlug: client.portalSlug,
      portalEnabled: client.portalEnabled,
      customHeadline: client.customHeadline,
      customMessage: client.customMessage,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      lastContactedAt: client.lastContactedAt,
    };

    if (includeContacts) {
      exported.contacts = client.contacts;
    }

    if (includeSkills) {
      exported.selectedSkillIds = client.selectedSkillIds;
    }

    if (includeWorkflows) {
      exported.selectedWorkflowIds = client.selectedWorkflowIds;
    }

    if (includeNotes) {
      exported.notes = client.notes;
      exported.companyTechnicalInfo = client.companyTechnicalInfo;
      exported.keyUseCases = client.keyUseCases;
    }

    return exported;
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger browser download of file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export clients and download as CSV
 */
export function downloadCSV(clients: Client[], filename?: string, options?: Partial<ExportOptions>): void {
  const csv = exportToCSV(clients, options);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, filename || `clients_export_${date}.csv`, 'text/csv');
}

/**
 * Export clients and download as JSON
 */
export function downloadJSON(clients: Client[], filename?: string, options?: Partial<ExportOptions>): void {
  const json = exportToJSON(clients, options);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(json, filename || `clients_export_${date}.json`, 'application/json');
}
