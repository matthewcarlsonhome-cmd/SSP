// Storage types for Skill Engine

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  // Source material
  jobDescription: string;
  jdAnalysis: JDAnalysis;

  // Skill tracking
  recommendations: SkillRecommendation[];
  selectedSkillIds: string[];

  // Metadata
  roleType: string;
  company?: string;
  industry?: string;
}

export interface JDAnalysis {
  role: {
    title: string;
    department: string;
    level: string;
    type: string;
  };

  responsibilities: {
    task: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ad-hoc';
    automationPotential: 'high' | 'medium' | 'low';
    category: string;
  }[];

  toolsAndPlatforms: {
    name: string;
    category: string;
    proficiencyRequired: string;
  }[];

  workflows: {
    name: string;
    steps: string[];
    painPoints: string[];
  }[];

  stakeholders: {
    type: string;
    interactionType: string;
  }[];

  skills: {
    name: string;
    category: 'technical' | 'soft' | 'domain';
    importance: 'required' | 'preferred' | 'nice-to-have';
  }[];

  automationOpportunities: {
    area: string;
    currentProcess: string;
    proposedSkill: string;
    impactEstimate: string;
  }[];
}

export interface SkillRecommendation {
  id: string;
  name: string;
  description: string;
  category: 'automation' | 'analysis' | 'generation' | 'optimization' | 'communication';
  automationPotential: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTimeSaved: string;
  valueProposition: string;
  selected?: boolean;
}

export interface DynamicFormInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  placeholder?: string;
  helpText?: string;
  options?: string[];
  defaultValue?: string | boolean | number;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
}

export interface DynamicSkill {
  id: string;
  workspaceId: string;
  version: number;
  createdAt: string;
  updatedAt: string;

  // Skill definition
  name: string;
  description: string;
  longDescription: string;
  category: 'automation' | 'analysis' | 'generation' | 'optimization' | 'communication';
  estimatedTimeSaved: string;

  // Visual
  theme: {
    primary: string;
    secondary: string;
    gradient: string;
    iconName: string;
  };

  // Form definition
  inputs: DynamicFormInput[];

  // Prompts
  prompts: {
    systemInstruction: string;
    userPromptTemplate: string;
    outputFormat: 'markdown' | 'json' | 'table';
  };

  // Execution config
  config: {
    recommendedModel: 'gemini' | 'claude' | 'any';
    useWebSearch: boolean;
    maxTokens: number;
    temperature: number;
  };

  // Usage tracking
  executionCount: number;
  lastExecutedAt?: string;
}

export interface SkillExecution {
  id: string;
  skillId: string;
  skillName: string;
  skillSource: 'static' | 'dynamic' | 'community';
  workspaceId?: string;
  createdAt: string;

  inputs: Record<string, unknown>;
  output: string;

  model: 'gemini' | 'claude';
  durationMs: number;
}

export interface UserPreferences {
  id: 'default';
  preferredApi: 'gemini' | 'claude';
  theme: 'light' | 'dark' | 'system';
  defaultResume?: string;
  defaultJobDescription?: string;
}

export interface SavedOutput {
  id: string;
  title: string;
  notes?: string;
  skillId: string;
  skillName: string;
  skillSource: 'static' | 'dynamic' | 'community';
  output: string;
  inputs: Record<string, unknown>;
  model: 'gemini' | 'claude';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isFavorite: boolean;
}

export interface FavoriteSkill {
  id: string;
  skillId: string;
  skillName: string;
  skillDescription: string;
  skillSource: 'static' | 'dynamic' | 'community';
  category: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW TYPES
// For chaining multiple skills together in automated sequences
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Defines how an input field gets its value
 */
export type WorkflowInputSource =
  | { type: 'global'; inputId: string }           // From workflow's global inputs
  | { type: 'previous'; stepId: string; outputKey: string }  // From a previous step's output
  | { type: 'static'; value: string }             // Hardcoded value
  | { type: 'computed'; template: string };       // Template with {{placeholders}}

/**
 * Condition for conditional step execution
 */
export interface StepCondition {
  sourceStep: string;           // Step ID whose output to check
  field?: string;               // JSON path to extract (e.g., 'score', 'risk.level')
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
  value?: string | number;      // Value to compare against (not needed for exists/notExists)
}

/**
 * A single step in a workflow that runs one skill
 */
export interface WorkflowStep {
  id: string;
  skillId: string;              // Reference to skill in SKILLS
  name: string;                 // Display name for this step
  description: string;          // What this step accomplishes

  // Map skill inputs to their sources
  inputMappings: {
    [skillInputId: string]: WorkflowInputSource;
  };

  // Key to store this step's output for later steps
  outputKey: string;

  // Optional settings
  optional?: boolean;           // Can be skipped
  reviewRequired?: boolean;     // Pause for user review before continuing

  // Parallel execution settings
  dependsOn?: string[];         // Step IDs that must complete before this step runs
                                // If not specified, depends on the previous step in order

  // Conditional execution
  condition?: StepCondition;    // If specified, step only runs if condition is met
}

/**
 * Profile fields that can be used for auto-prefill
 */
export type ProfilePrefillField =
  | 'resume'
  | 'jobDescription'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedInUrl'
  | 'portfolioUrl'
  | 'professionalTitle'
  | 'yearsExperience'
  | 'targetRoles'
  | 'targetIndustries'
  | 'currentCompany'
  | 'currentTitle'
  | 'keyAchievements'
  | 'highestDegree'
  | 'university'
  | 'certifications'
  | 'technicalSkills'
  | 'softSkills'
  | 'languages'
  | 'careerGoals'
  | 'salaryExpectations'
  | 'workPreference';

/**
 * Global input collected at workflow start
 */
export interface WorkflowGlobalInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  helpText?: string;
  options?: string[];           // For select type
  required: boolean;
  rows?: number;                // For textarea
  prefillFrom?: ProfilePrefillField;  // Auto-fill from user profile
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;                 // Lucide icon name
  color: string;                // Tailwind color class
  estimatedTime: string;        // e.g., "10-15 minutes"

  // What the user will receive
  outputs: string[];

  // Inputs collected once at the start
  globalInputs: WorkflowGlobalInput[];

  // Ordered sequence of skills to run
  steps: WorkflowStep[];
}

/**
 * Runtime state for a workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'collecting_inputs' | 'running' | 'paused' | 'completed' | 'error';
  currentStepIndex: number;

  // Collected global inputs
  globalInputs: Record<string, string>;

  // Outputs from each completed step
  stepOutputs: Record<string, string>;  // outputKey -> output

  // Step statuses
  stepStatuses: Record<string, 'pending' | 'running' | 'completed' | 'skipped' | 'error'>;

  // Error info if failed
  error?: string;

  // Timestamps
  startedAt: string;
  completedAt?: string;

  // Searchable metadata
  tags?: string[];
  title?: string;  // User-provided title or auto-generated
  isFavorite?: boolean;
}

/**
 * User-created custom workflow (extends base Workflow)
 */
export interface CustomWorkflow extends Workflow {
  // Ownership
  userId?: string;              // Owner (for multi-user scenarios)
  createdAt: string;
  updatedAt: string;

  // Source tracking
  sourceWorkflowId?: string;    // If duplicated from a built-in workflow
  isPublic?: boolean;           // Share with community

  // User customization
  notes?: string;               // User notes about this workflow
}

// ═══════════════════════════════════════════════════════════════════════════
// USER ROLES & ADMIN TYPES
// For managing user tiers, permissions, and admin functionality
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User subscription/role tiers
 */
export type UserRole = 'free' | 'pro' | 'team' | 'custom';

/**
 * Feature flags that can be enabled/disabled per role
 */
export interface RoleFeatures {
  // Skill access
  canAccessAllSkills: boolean;
  canCreateCustomSkills: boolean;
  canAccessCommunitySkills: boolean;
  canExportPrompts: boolean;
  canUseBatchProcessing: boolean;
  canUseWorkflows: boolean;

  // Advanced features
  canAccessAdminPanel: boolean;
  canViewAnalytics: boolean;
  canInviteTeamMembers: boolean;

  // Export features
  canDownloadOutputs: boolean;
  canExportToCSV: boolean;
}

/**
 * Usage limits per role
 */
export interface RoleLimits {
  skillRunsPerDay: number;        // -1 = unlimited
  skillRunsPerMonth: number;      // -1 = unlimited
  savedOutputsLimit: number;      // -1 = unlimited
  workspacesLimit: number;        // -1 = unlimited
  customSkillsLimit: number;      // -1 = unlimited
  batchRowsLimit: number;         // Max rows per batch job
  teamMembersLimit: number;       // For team plans
}

/**
 * Complete role configuration
 */
export interface RoleConfig {
  role: UserRole;
  displayName: string;
  description: string;
  price: number;                  // Monthly price in dollars, 0 = free
  features: RoleFeatures;
  limits: RoleLimits;
  isDefault?: boolean;
}

/**
 * User's primary interest in automation
 */
export type AutomationInterest =
  | 'work'        // Automation for my job/career
  | 'education'   // Automation for learning/school
  | 'personal'    // Automation for home life/personal projects
  | 'business'    // Automation for my own business
  | 'general';    // General interest / exploring

/**
 * Professional role categories the user resonates with
 */
export type RoleCategory =
  | 'marketing'
  | 'sales'
  | 'copywriting'
  | 'management'
  | 'analysis'
  | 'engineering'
  | 'design'
  | 'operations'
  | 'hr'
  | 'finance'
  | 'consulting'
  | 'other';

/**
 * Workflow categories for user interest selection
 */
export type WorkflowCategory =
  | 'job-search'           // Job applications, interviews, career
  | 'marketing-campaigns'  // Marketing, SEO, social media
  | 'sales-business'       // Sales, proposals, client work
  | 'project-management'   // Planning, tracking, reporting
  | 'content-creation'     // Writing, copywriting, content
  | 'data-analysis'        // Research, analytics, insights
  | 'business-strategy'    // Business cases, strategy, consulting
  | 'training-education'   // Workshops, courses, learning
  | 'governance-compliance'; // Policies, compliance, risk

/**
 * User onboarding and preference profile
 */
export interface UserOnboardingProfile {
  // Step 1: Primary interest in automation
  automationInterest?: AutomationInterest;

  // Step 2: Role categories that resonate (multi-select)
  roleCategories?: RoleCategory[];

  // Step 3: Workflow categories of interest (multi-select)
  workflowInterests?: WorkflowCategory[];

  // Specific selections (optional deeper engagement)
  specificRoleTitle?: string;       // e.g., "Marketing Director"
  specificSkillIds?: string[];      // Specific skills they've bookmarked
  specificWorkflowIds?: string[];   // Specific workflows they want to use

  // Onboarding status
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  onboardingSkippedAt?: string;     // If they skipped onboarding
}

/**
 * Email preferences for marketing communications
 */
export interface EmailPreferences {
  marketingOptIn: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'never';
  unsubscribedAt?: string;
}

/**
 * User profile with role and tracking
 */
export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;

  // Role & subscription
  role: UserRole;
  roleAssignedAt: string;
  roleExpiresAt?: string;         // For time-limited subscriptions

  // Custom role config (for 'custom' role)
  customConfig?: Partial<RoleFeatures & RoleLimits>;

  // Usage tracking
  skillRunsToday: number;
  skillRunsThisMonth: number;
  lastSkillRunAt?: string;

  // Timestamps
  createdAt: string;
  lastLoginAt: string;

  // Admin notes
  adminNotes?: string;
  isAdmin?: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Onboarding & Profile (added for user interest tracking)
  // ═══════════════════════════════════════════════════════════════════════════

  // User's onboarding profile with interests
  onboarding?: UserOnboardingProfile;

  // Email communication preferences
  emailPreferences?: EmailPreferences;

  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
}

/**
 * Track individual skill usage per user
 */
export interface SkillUsageRecord {
  id: string;
  userId: string;
  userEmail: string;

  skillId: string;
  skillName: string;
  skillSource: 'static' | 'dynamic' | 'community';

  usageCount: number;
  lastUsedAt: string;
  firstUsedAt: string;
}

/**
 * Email captured from sign-ins for marketing/follow-up
 */
export interface CapturedEmail {
  id: string;
  email: string;
  displayName?: string;
  source: 'google' | 'email' | 'manual';

  // User info
  userId?: string;
  role?: UserRole;

  // Engagement
  firstSeenAt: string;
  lastSeenAt: string;
  loginCount: number;
  skillsUsed: number;

  // Marketing
  hasOptedIn?: boolean;
  followUpStatus?: 'pending' | 'contacted' | 'converted' | 'declined';
  followUpNotes?: string;

  // Onboarding data (from wizard) - for email targeting
  automationInterest?: AutomationInterest;
  roleCategories?: RoleCategory[];
  workflowInterests?: WorkflowCategory[];
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
}

/**
 * Admin audit log entry
 */
export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'role' | 'config' | 'skill';
  targetId: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL DEFINITION TYPE
// For defining skills in enterprise.ts, excel.ts, and other skill modules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input field configuration for a skill
 */
export interface SkillInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  rows?: number;
  minLength?: number;
  helpText?: string;
}

/**
 * Defines a skill for enterprise, excel, and testing purposes
 * More structured than the legacy Skill type for better maintainability
 */
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  icon: string;
  color: string;
  estimatedTime: string;
  tags: string[];
  inputs: SkillInput[];
  generatePrompt: (inputs: Record<string, string>) => {
    systemInstruction: string;
    userPrompt: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT ROLE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_ROLE_CONFIGS: RoleConfig[] = [
  {
    role: 'free',
    displayName: 'Free',
    description: 'Basic access to get started with AI-powered job search tools',
    price: 0,
    isDefault: true,
    features: {
      canAccessAllSkills: true,
      canCreateCustomSkills: false,
      canAccessCommunitySkills: true,
      canExportPrompts: true,        // Currently free, will be restricted later
      canUseBatchProcessing: false,
      canUseWorkflows: true,
      canAccessAdminPanel: false,
      canViewAnalytics: false,
      canInviteTeamMembers: false,
      canDownloadOutputs: true,
      canExportToCSV: false,
    },
    limits: {
      skillRunsPerDay: 10,
      skillRunsPerMonth: 100,
      savedOutputsLimit: 25,
      workspacesLimit: 2,
      customSkillsLimit: 0,
      batchRowsLimit: 0,
      teamMembersLimit: 0,
    },
  },
  {
    role: 'pro',
    displayName: 'Pro',
    description: 'Full access for serious job seekers with unlimited usage',
    price: 19,
    features: {
      canAccessAllSkills: true,
      canCreateCustomSkills: true,
      canAccessCommunitySkills: true,
      canExportPrompts: true,
      canUseBatchProcessing: true,
      canUseWorkflows: true,
      canAccessAdminPanel: false,
      canViewAnalytics: true,
      canInviteTeamMembers: false,
      canDownloadOutputs: true,
      canExportToCSV: true,
    },
    limits: {
      skillRunsPerDay: -1,           // Unlimited
      skillRunsPerMonth: -1,
      savedOutputsLimit: -1,
      workspacesLimit: -1,
      customSkillsLimit: 50,
      batchRowsLimit: 100,
      teamMembersLimit: 0,
    },
  },
  {
    role: 'team',
    displayName: 'Team',
    description: 'Collaborate with your team on job search and career development',
    price: 49,
    features: {
      canAccessAllSkills: true,
      canCreateCustomSkills: true,
      canAccessCommunitySkills: true,
      canExportPrompts: true,
      canUseBatchProcessing: true,
      canUseWorkflows: true,
      canAccessAdminPanel: false,
      canViewAnalytics: true,
      canInviteTeamMembers: true,
      canDownloadOutputs: true,
      canExportToCSV: true,
    },
    limits: {
      skillRunsPerDay: -1,
      skillRunsPerMonth: -1,
      savedOutputsLimit: -1,
      workspacesLimit: -1,
      customSkillsLimit: -1,
      batchRowsLimit: 500,
      teamMembersLimit: 10,
    },
  },
  {
    role: 'custom',
    displayName: 'Custom',
    description: 'Custom configuration for special arrangements',
    price: 0,
    features: {
      canAccessAllSkills: true,
      canCreateCustomSkills: true,
      canAccessCommunitySkills: true,
      canExportPrompts: true,
      canUseBatchProcessing: true,
      canUseWorkflows: true,
      canAccessAdminPanel: true,
      canViewAnalytics: true,
      canInviteTeamMembers: true,
      canDownloadOutputs: true,
      canExportToCSV: true,
    },
    limits: {
      skillRunsPerDay: -1,
      skillRunsPerMonth: -1,
      savedOutputsLimit: -1,
      workspacesLimit: -1,
      customSkillsLimit: -1,
      batchRowsLimit: -1,
      teamMembersLimit: -1,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT MANAGEMENT TYPES
// For managing B2B client outreach with curated skill/workflow selections
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Status of client outreach
 */
export type ClientStatus = 'prospect' | 'contacted' | 'demo_scheduled' | 'active' | 'inactive';

/**
 * Industry categories for clients
 */
export type ClientIndustry =
  | 'insurance'
  | 'financial_services'
  | 'healthcare'
  | 'technology'
  | 'retail'
  | 'manufacturing'
  | 'professional_services'
  | 'marketing_advertising'
  | 'real_estate'
  | 'hospitality'
  | 'education'
  | 'nonprofit'
  | 'construction'
  | 'automotive'
  | 'food_beverage'
  | 'utilities'
  | 'biotechnology'
  | 'legal'
  | 'staffing'
  | 'engineering'
  | 'other';

/**
 * Priority level for client outreach
 */
export type ClientPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'RESEARCH';

/**
 * Contact status for tracking outreach progress
 */
export type ContactStatus = 'not_contacted' | 'connected' | 'responded' | 'meeting_scheduled';

/**
 * Client contact information with enhanced tracking
 * Supports up to 3 contacts per client with per-contact messaging
 */
export interface ClientContact {
  id: string;                    // UUID for each contact
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;          // Contact's personal LinkedIn URL
  isPrimary?: boolean;
  firstContactedAt?: string;     // ISO date of first outreach
  lastContactedAt?: string;      // ISO date of last outreach
  backgroundNotes?: string;      // Research notes about this person
  contactStatus: ContactStatus;  // Outreach status for this contact
  linkedInConnectMessage?: string;     // 300 char first connect message
  linkedInFollowupMessage?: string;    // Longer post-connect message with skill references
}

/**
 * Client/Company record for B2B outreach
 */
export interface Client {
  id: string;
  companyName: string;
  industry: ClientIndustry;
  website?: string;
  description?: string;

  // Company details
  companyType?: string;        // e.g., "Marketing Agency", "Madison Business"
  services?: string;           // Comma-separated services offered
  revenue?: string;            // e.g., "$2-5M", "$1B+"
  employeeCount?: string;      // e.g., "11-50", "3,000+"
  location?: string;           // e.g., "Madison, WI"
  priority?: ClientPriority;   // HIGH, MEDIUM, LOW, RESEARCH

  // Company branding & social
  logoUrl?: string;            // URL to company logo image
  linkedInUrl?: string;        // Company LinkedIn profile URL

  // Estimated value
  estimatedTimeSavings?: string;  // e.g., "18-28 hrs"
  estimatedCostSavings?: string;  // e.g., "$4,500-$11,200"
  painPoints?: string;            // Key challenges to address

  // Technical research
  companyTechnicalInfo?: string;  // Technical stack, key use cases, research notes
  keyUseCases?: string[];         // Array of identified use cases for quick scanning

  // Lookup provenance for imported prospects
  sourceProvider?: string;         // e.g., "google_places", "demo", "manual"
  sourceExternalId?: string;       // Provider-specific external ID/place ID
  sourceUrl?: string;              // Provider, maps, website, or directory URL used for import
  lookupConfidence?: number;       // 0-1 confidence score from lookup/enrichment
  lookupRaw?: unknown;             // Provider raw record for audit/debugging

  // Contacts (supports 1-3 contacts with per-contact messaging)
  contacts: ClientContact[];

  // Selected skills and workflows for this client
  selectedSkillIds: string[];
  selectedWorkflowIds: string[];

  // Custom messaging (portal-level)
  customHeadline?: string;
  customMessage?: string;
  // Note: LinkedIn messages are now per-contact in the contacts array

  // Portal settings
  portalSlug: string;  // URL-friendly identifier for their portal page
  portalEnabled: boolean;

  // Status tracking
  status: ClientStatus;
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
}

/**
 * SECURITY FIX: Hardcoded client data has been removed.
 *
 * Client data must now be managed exclusively through the Supabase database.
 * This prevents sensitive business intelligence (company names, contacts,
 * emails, pain points) from being bundled into the public JavaScript.
 *
 * To add clients: Use the admin interface or import via Supabase.
 *
 * @deprecated This constant is kept for backwards compatibility but is empty.
 * All code should migrate to fetching clients from Supabase directly.
 */
export const DEFAULT_TARGET_COMPANIES: Partial<Client>[] = [
  // Client data removed for security - manage via Supabase admin interface
];
