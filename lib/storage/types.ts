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
 * Client contact information
 */
export interface ClientContact {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
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

  // Contacts
  contacts: ClientContact[];

  // Selected skills and workflows for this client
  selectedSkillIds: string[];
  selectedWorkflowIds: string[];

  // Custom messaging
  customHeadline?: string;
  customMessage?: string;

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
 * Default companies to target - Madison, WI area marketing agencies and businesses
 * Priority: HIGH = Strong fit, MEDIUM = Good fit, LOW = Limited fit, RESEARCH = Needs more info
 * Skills and workflows are auto-curated based on industry via clientRecommendations.ts
 */
export const DEFAULT_TARGET_COMPANIES: Partial<Client>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH PRIORITY - MARKETING AGENCIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Pop-Dot',
    industry: 'marketing_advertising',
    companyType: 'Full-Service Marketing Agency',
    website: 'https://popdotmarketing.com',
    linkedInUrl: 'https://www.linkedin.com/company/pop-dot/',
    logoUrl: 'https://logo.clearbit.com/popdotmarketing.com',
    services: 'Branding, Marketing Planning, Digital Performance, Website Design, Traditional Advertising, Packaging',
    revenue: '$2-5M',
    employeeCount: '11-50',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Award-winning, evidence-based Systems + Design approach. Clients: Glue Dots, Lean Focus, Nonns, Grande Cheese.',
    painPoints: 'Multi-channel campaigns, performance tracking across traditional + digital, client reporting consolidation, creative approval workflows',
    estimatedTimeSavings: '18-28 hrs',
    estimatedCostSavings: '$4,500-$11,200',
    customHeadline: 'AI-Powered Marketing Automation for Pop-Dot\'s Evidence-Based Approach',
    customMessage: 'Transform your Systems + Design methodology with intelligent automation. We\'ve curated AI skills specifically for multi-channel campaign management, creative workflow optimization, and real-time performance tracking across traditional and digital channels.',
    contacts: [{ name: 'Jason Fish', title: 'Founder & CEO', email: 'jason@popdotmarketing.com', isPrimary: true }],
    // Curated for: Brand strategy, science-based marketing, multi-channel campaigns
    selectedSkillIds: ['proposal-builder', 'competitive-landscape-mapper', 'excel-marketing-dashboard', 'market-sizing-analyst'],
    selectedWorkflowIds: ['marketing-campaign-launch', 'competitive-intelligence'],
  },
  {
    companyName: 'Madison Marketing Group',
    industry: 'marketing_advertising',
    companyType: 'B2B Digital Marketing Agency',
    website: 'https://madisonmarketing.com',
    linkedInUrl: 'https://www.linkedin.com/company/madison-marketing-group/',
    logoUrl: 'https://logo.clearbit.com/madisonmarketing.com',
    services: 'Inbound Marketing, Content Strategy, Digital Ads, B2B Lead Gen, Website Design, RevOps',
    revenue: '$2-5M',
    employeeCount: '11-50',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Established B2B marketing agency since 2011. Specializes in complex industries with strong inbound methodology.',
    painPoints: 'Multi-client campaign management, lead nurture optimization, B2B reporting, content pipeline management',
    estimatedTimeSavings: '17-30 hrs',
    estimatedCostSavings: '$4,300-$12,000',
    customHeadline: 'Supercharge Your B2B Marketing Operations with AI',
    customMessage: 'Your expertise in inbound methodology for complex B2B industries is the foundation. Now amplify it with AI skills designed for lead nurturing, content pipeline acceleration, and RevOps optimization—perfectly aligned with your proven approach.',
    contacts: [{ name: 'Chris Murvine', title: 'CEO & Founder', email: 'cmurvine@madisonmarketing.com', isPrimary: true }],
    // Curated for: B2B digital, HubSpot partner, inbound marketing, data-driven
    selectedSkillIds: ['excel-data-analyzer', 'proposal-builder', 'customer-health-scorecard', 'sales-call-prep-pro'],
    selectedWorkflowIds: ['marketing-campaign-launch', 'sales-account-pursuit'],
  },
  {
    companyName: 'Shine United',
    industry: 'marketing_advertising',
    companyType: 'Full-Service Advertising Agency',
    website: 'https://shineunited.com',
    linkedInUrl: 'https://www.linkedin.com/company/shine-united/',
    logoUrl: 'https://logo.clearbit.com/shineunited.com',
    services: 'Advertising, Design, Digital, Brand Strategy, Media, PR, Social',
    revenue: '$14.3M',
    employeeCount: '32-45',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: '$14.3M revenue. Clients: Harley-Davidson, Wisconsin Cheese, GORE-TEX, Festival Foods. Outside Mag Best Places to Work.',
    painPoints: 'Large client campaigns, media planning/buying efficiency, real-time reporting dashboards, PR monitoring',
    estimatedTimeSavings: '22-36 hrs',
    estimatedCostSavings: '$5,500-$14,400',
    customHeadline: 'Enterprise-Grade AI for Award-Winning Campaigns',
    customMessage: 'Serving iconic brands like Harley-Davidson and GORE-TEX demands excellence at scale. Our AI automation suite handles the heavy lifting—media planning, PR monitoring, and campaign analytics—so your team can focus on what made you a Best Place to Work: creativity.',
    contacts: [{ name: 'Curt Hanke', title: 'Co-Founder & CEO', isPrimary: true }, { name: 'Mike Kriefski', title: 'Co-Founder & President' }],
    // Curated for: Bold creative, client-agency relationships, culture-focused, big brands
    selectedSkillIds: ['proposal-builder', 'competitive-landscape-mapper', 'sales-call-prep-pro', 'executive-communication-pack'],
    selectedWorkflowIds: ['marketing-campaign-launch', 'consulting-engagement'],
  },
  {
    companyName: 'Stephan & Brady (S/B Strategic Marketing)',
    industry: 'marketing_advertising',
    companyType: 'Full-Service Marketing Agency',
    website: 'https://stephanbrady.com',
    linkedInUrl: 'https://www.linkedin.com/company/stephan-&-brady/',
    logoUrl: 'https://logo.clearbit.com/stephanbrady.com',
    services: 'B2B & B2C Marketing, Experiential, Strategic Planning, PR, Web Design',
    revenue: '$5-10M',
    employeeCount: '40-45',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Nearly 70 years in business. Strategy-first approach. Large team with complex cross-functional workflows.',
    painPoints: 'Cross-functional coordination, project management, client health tracking, experiential event follow-up',
    estimatedTimeSavings: '17-29 hrs',
    estimatedCostSavings: '$4,300-$11,600',
    customHeadline: 'Seven Decades of Strategy, Now Turbocharged by AI',
    customMessage: 'Your strategy-first approach has built nearly 70 years of success. Now imagine AI handling cross-functional coordination, project tracking, and client health monitoring while your strategists focus on what they do best.',
    contacts: [{ name: 'Daniel Hearn', title: 'President & CEO', isPrimary: true }],
    // Curated for: 70+ years, strategic customer connections, brand-customer focus
    selectedSkillIds: ['competitive-landscape-mapper', 'proposal-builder', 'customer-health-scorecard', 'market-sizing-analyst'],
    selectedWorkflowIds: ['consulting-engagement', 'competitive-intelligence'],
  },
  {
    companyName: 'Nelson Schmidt Inc.',
    industry: 'marketing_advertising',
    companyType: 'B2B Marketing Agency',
    website: 'https://nelsonschmidt.com',
    linkedInUrl: 'https://www.linkedin.com/company/nelson-schmidt-inc/',
    logoUrl: 'https://logo.clearbit.com/nelsonschmidt.com',
    services: 'B2B Considered Purchase Marketing, Brand Consulting, Media, PR, Digital, Direct',
    revenue: '$5-10M',
    employeeCount: '35',
    location: 'Madison, WI (Milwaukee HQ)',
    priority: 'HIGH',
    description: 'Founded 1971, Milwaukee HQ + Madison. Clients: Whirlpool, WEDC. MAGNET global network member.',
    painPoints: 'B2B lead gen, considered purchase nurturing, PR/earned media tracking, media buying efficiency',
    estimatedTimeSavings: '18-31 hrs',
    estimatedCostSavings: '$4,500-$12,400',
    customHeadline: 'AI Solutions for Considered Purchase Marketing',
    customMessage: 'B2B considered purchases demand precision. Our AI skills are built for complex nurture sequences, PR tracking, and media optimization—helping you serve global clients like Whirlpool with the efficiency your MAGNET network position demands.',
    contacts: [{ name: 'Daniel H. Nelson Jr.', title: 'President & CEO', isPrimary: true }, { name: 'John Boler', title: 'Chief Marketing Officer' }],
    // Curated for: Complex marketing challenges, considered purchase, performance-based accountability
    selectedSkillIds: ['proposal-builder', 'competitive-landscape-mapper', 'excel-data-analyzer', 'budget-variance-narrator'],
    selectedWorkflowIds: ['consulting-engagement', 'marketing-campaign-launch'],
  },
  {
    companyName: 'The Digital Ring',
    industry: 'marketing_advertising',
    companyType: 'Digital Marketing Agency',
    website: 'https://thedigitalring.com',
    linkedInUrl: 'https://www.linkedin.com/company/the-digital-ring/',
    logoUrl: 'https://logo.clearbit.com/thedigitalring.com',
    services: 'Web Development, SEO, Paid Media, Video Production, Marketing Consulting',
    revenue: '$3M',
    employeeCount: '11-50',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 2015, Inc. 5000 (2x). $100M+ media managed, 330+ websites. Made Super Bowl commercial. Semrush partner.',
    painPoints: 'Paid media pacing across $100M+, SEO reporting at scale, video asset distribution, website health monitoring',
    estimatedTimeSavings: '19-32 hrs',
    estimatedCostSavings: '$4,750-$12,800',
    customHeadline: 'Scale Your $100M+ Media Operation with AI',
    customMessage: 'Managing $100M+ in media spend and 330+ websites is no small feat—your Inc. 5000 recognition proves it. Now unlock the next level with AI-powered media pacing, SEO analytics at scale, and automated website health monitoring.',
    contacts: [{ name: 'Mason Kemp', title: 'Partner', isPrimary: true }, { name: 'Nick Ring', title: 'Partner' }, { name: 'Matthew Kemp', title: 'Partner' }],
    // Curated for: Full-service digital, $100M media, data-driven, customer-centric
    selectedSkillIds: ['excel-marketing-dashboard', 'excel-data-analyzer', 'proposal-builder', 'vendor-comparison-matrix'],
    selectedWorkflowIds: ['digital-marketing-audit', 'marketing-campaign-launch'],
  },
  {
    companyName: 'KennedyC (Kennedy Communications)',
    industry: 'marketing_advertising',
    companyType: 'Full-Service Media Agency',
    website: 'https://kennedyc.com',
    linkedInUrl: 'https://www.linkedin.com/company/kennedy-communications/',
    logoUrl: 'https://logo.clearbit.com/kennedyc.com',
    services: 'Media Buying/Planning, Web Development, Creative, Digital, Data Analytics',
    revenue: '$5-10M',
    employeeCount: '33-45',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1983, 40+ years media experience. Manages ~200 websites. Won first Madison Addy for web 1996. Family-owned.',
    painPoints: 'Media buying at scale, 200+ website management, analytics consolidation, campaign reporting',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'AI Automation Built for 40 Years of Media Excellence',
    customMessage: 'From winning Madison\'s first web Addy in 1996 to managing 200+ websites today, Kennedy Communications knows digital evolution. Our AI skills streamline media buying, consolidate analytics, and automate campaign reporting—preserving the family-owned quality your clients trust.',
    contacts: [{ name: 'Katie Kennedy', title: 'President & CEO', isPrimary: true }, { name: 'Chris Kennedy', title: 'Vice President' }],
    // Curated for: Data-backed, results-accountable, outthink not outspend
    selectedSkillIds: ['excel-data-analyzer', 'excel-marketing-dashboard', 'proposal-builder', 'budget-variance-narrator'],
    selectedWorkflowIds: ['marketing-campaign-launch', 'process-improvement'],
  },
  {
    companyName: 'Mid-West Family Madison',
    industry: 'marketing_advertising',
    companyType: 'Radio + Digital Marketing',
    website: 'https://midwestfamilymadison.com',
    linkedInUrl: 'https://www.linkedin.com/company/mid-west-family-madison/',
    logoUrl: 'https://logo.clearbit.com/midwestfamilymadison.com',
    services: 'Radio Advertising (8 stations), SEO, Google Ads, Email, Web Design, Events',
    revenue: '$10-20M',
    employeeCount: '46-51',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1956, 8 radio stations + digital marketing services. Strong community engagement. Radio+digital hybrid unique position.',
    painPoints: 'Radio ad trafficking, cross-channel attribution (radio+digital), lead routing, event marketing follow-up',
    estimatedTimeSavings: '21-37 hrs',
    estimatedCostSavings: '$5,250-$14,800',
    customHeadline: 'Bridge Radio and Digital with Intelligent Automation',
    customMessage: 'Since 1956, you\'ve connected Madison through 8 radio stations. Now bridge traditional and digital with AI that handles cross-channel attribution, radio ad trafficking, and event follow-up—amplifying your unique hybrid advantage.',
    contacts: [{ name: 'Kelly NorthLee', title: 'Owner', isPrimary: true }, { name: 'Shar Hermanson', title: 'Executive VP' }],
    // Curated for: Radio + digital, local brand development, events, 50+ years
    selectedSkillIds: ['proposal-builder', 'sales-call-prep-pro', 'competitive-landscape-mapper', 'meeting-minutes-pro'],
    selectedWorkflowIds: ['marketing-campaign-launch', 'sales-account-pursuit'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM PRIORITY - MARKETING AGENCIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: '6AM Marketing',
    industry: 'marketing_advertising',
    companyType: 'Healthcare Marketing Agency',
    website: 'https://6ammarketing.com',
    linkedInUrl: 'https://www.linkedin.com/company/6ammarketing/',
    logoUrl: 'https://logo.clearbit.com/6ammarketing.com',
    services: 'Branding, Digital, Strategic Planning, Healthcare Marketing',
    revenue: '$6M',
    employeeCount: '12-14',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Founded 2000, formerly Glowac Harris Madison. $6M revenue. Healthcare & sustainability focus. Multiple MANNY Awards.',
    painPoints: 'Healthcare compliance tracking, campaign workflows, reporting across smaller client base',
    estimatedTimeSavings: '11-17 hrs',
    estimatedCostSavings: '$2,750-$6,800',
    customHeadline: 'Healthcare Marketing Meets Intelligent Automation',
    customMessage: 'Your 24+ years of healthcare marketing excellence and MANNY Award recognition speak for themselves. Now amplify that expertise with AI skills designed for healthcare compliance tracking, campaign workflows, and sustainability reporting—all with the precision your healthcare clients demand.',
    // Curated for: Creative problem solvers, brand awakening, diverse team
    selectedSkillIds: ['competitive-landscape-mapper', 'proposal-builder', 'market-sizing-analyst', 'sales-call-prep-pro'],
    selectedWorkflowIds: ['consulting-engagement', 'competitive-intelligence'],
  },
  {
    companyName: 'Rippe Keane Marketing (Market Crafters)',
    industry: 'marketing_advertising',
    companyType: 'Branding Agency',
    website: 'https://rippekeane.com',
    linkedInUrl: 'https://www.linkedin.com/company/rippe-keane-marketing/',
    logoUrl: 'https://logo.clearbit.com/rippekeane.com',
    services: 'Branding, Strategic Planning, Digital, Web Design, PR, Social Media',
    revenue: '$1-3M',
    employeeCount: '10-16',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Founded 1994, 30 years in business. Brand architecture focus. BBB A+ rated. Recently rebranded to Market Crafters.',
    painPoints: 'Brand asset management, campaign tracking, social media scheduling, PR monitoring',
    estimatedTimeSavings: '10-15 hrs',
    estimatedCostSavings: '$2,500-$6,000',
    customHeadline: 'Three Decades of Branding, Now Supercharged by AI',
    customMessage: 'Thirty years of brand architecture excellence and BBB A+ ratings prove your commitment to quality. Our AI automation helps manage brand assets, streamline social scheduling, and track PR impact—so your rebranded Market Crafters team can focus on crafting the next great brand story.',
    // Curated for: Accountability, customer experience, meticulous, cause and effect
    selectedSkillIds: ['customer-health-scorecard', 'excel-data-analyzer', 'proposal-builder', 'sop-documentation-builder'],
    selectedWorkflowIds: ['process-improvement', 'consulting-engagement'],
  },
  {
    companyName: 'The Creative Company',
    industry: 'marketing_advertising',
    companyType: 'PR & Digital Agency',
    website: 'https://thecreativecompany.com',
    linkedInUrl: 'https://www.linkedin.com/company/the-creative-company/',
    logoUrl: 'https://logo.clearbit.com/thecreativecompany.com',
    services: 'PR, Website Design, Social Media, Email Marketing, Branding, Content Strategy',
    revenue: '$1-3M',
    employeeCount: '10-12',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Founded 1989/1991, 34+ years. Strong nonprofit/cause marketing focus. BBB A+ rated. PR and digital hybrid.',
    painPoints: 'PR monitoring and reporting, social media workflows, email campaign tracking, nonprofit reporting',
    estimatedTimeSavings: '10-16 hrs',
    estimatedCostSavings: '$2,500-$6,400',
    customHeadline: 'Cause Marketing + AI: Amplify Your Nonprofit Impact',
    customMessage: 'For 34+ years, you\'ve championed nonprofits and cause marketing with BBB A+ quality. Now amplify that impact with AI skills for PR monitoring, social workflows, and nonprofit-specific reporting—helping your clients tell their stories more effectively than ever.',
  },
  {
    companyName: 'Sortis Digital Marketing',
    industry: 'marketing_advertising',
    companyType: 'Digital Marketing Agency',
    website: 'https://sortismarketing.com',
    linkedInUrl: 'https://www.linkedin.com/company/sortis-digital-marketing/',
    logoUrl: 'https://logo.clearbit.com/sortismarketing.com',
    services: 'SEO, Web Design, PPC, Content Marketing, Revenue Generation',
    revenue: '$1-3M',
    employeeCount: '8-11',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Founded 1995, nearly 30 years. Rebranded as Revenue Generation Agency. B2B focus, integrates sales + marketing + web.',
    painPoints: 'SEO reporting, lead gen attribution, sales-marketing alignment, content pipeline',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: 'Revenue Generation, Accelerated by AI',
    customMessage: 'As a Revenue Generation Agency integrating sales, marketing, and web for nearly 30 years, you understand the full funnel. Our AI skills enhance that integration—automating SEO reporting, lead attribution, and sales-marketing alignment to drive even more revenue for your B2B clients.',
    // Curated for: Since 1995, data-driven, revenue through marketing and sales, sales funnels
    selectedSkillIds: ['excel-data-analyzer', 'excel-marketing-dashboard', 'proposal-builder', 'sales-call-prep-pro'],
    selectedWorkflowIds: ['digital-marketing-audit', 'sales-account-pursuit'],
  },
  {
    companyName: 'Boost Local',
    industry: 'marketing_advertising',
    companyType: 'Local SEO Agency',
    website: 'https://boostlocal.com',
    linkedInUrl: 'https://www.linkedin.com/company/boost-local/',
    logoUrl: 'https://logo.clearbit.com/boostlocal.com',
    services: 'Local SEO, PPC, CRM, Google Business Profile, Web Design',
    revenue: '$500K-2M',
    employeeCount: '5-15',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Local business focus. SEO + PPC + CRM integration. Serves automotive, contractors, financial services.',
    painPoints: 'GBP management at scale, review monitoring, local SEO reporting, CRM workflows',
    estimatedTimeSavings: '12-19 hrs',
    estimatedCostSavings: '$3,000-$7,600',
    customHeadline: 'Scale Local SEO with Intelligent Automation',
    customMessage: 'Managing Google Business Profiles, reviews, and local SEO at scale requires precision. Our AI skills automate GBP management, review monitoring, and local reporting—helping your automotive, contractor, and financial services clients dominate their local markets.',
    // Curated for: Small business marketing, predictable systems, measurable results
    selectedSkillIds: ['proposal-builder', 'sales-call-prep-pro', 'excel-data-analyzer', 'sop-documentation-builder'],
    selectedWorkflowIds: ['marketing-campaign-launch', 'process-improvement'],
  },
  {
    companyName: 'Colony Spark',
    industry: 'marketing_advertising',
    companyType: 'Content Marketing Agency',
    website: 'https://colonyspark.com',
    linkedInUrl: 'https://www.linkedin.com/company/colonyspark/',
    logoUrl: 'https://logo.clearbit.com/colonyspark.com',
    services: 'Content Marketing: Webinars, Podcasts, White Papers, Analytics',
    revenue: '$500K-2M',
    employeeCount: '5-10',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Founded 2018. Content-focused, uses Dreamdata analytics. Featured in CBS News, Mashable. B2B content specialists.',
    painPoints: 'Content calendar, webinar management, analytics dashboards, content repurposing',
    estimatedTimeSavings: '11-17 hrs',
    estimatedCostSavings: '$2,750-$6,800',
    customHeadline: 'Content That Converts, Automated by AI',
    customMessage: 'Your B2B content expertise—from webinars to white papers—has earned CBS News and Mashable features. Our AI skills supercharge content calendars, webinar workflows, and analytics dashboards, letting your team focus on creating content that sparks growth.',
    // Curated for: Strategy + execution, full-funnel, go-to-market, AI-powered systems
    selectedSkillIds: ['proposal-builder', 'competitive-landscape-mapper', 'market-sizing-analyst', 'excel-marketing-dashboard'],
    selectedWorkflowIds: ['product-launch-gtm', 'competitive-intelligence'],
  },
  {
    companyName: 'Aspect Marketing',
    industry: 'marketing_advertising',
    companyType: 'Digital Marketing Agency',
    website: 'https://aspectmarketing.com',
    linkedInUrl: 'https://www.linkedin.com/company/aspect-marketing/',
    logoUrl: 'https://logo.clearbit.com/aspectmarketing.com',
    services: 'Digital Marketing, Marketing Automation, Brand Strategy',
    revenue: '$1-3M',
    employeeCount: '10-20',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Marketing automation specialists. Brand + web experience optimization focus.',
    painPoints: 'Marketing workflow optimization, reporting, brand asset management',
    estimatedTimeSavings: '9-14 hrs',
    estimatedCostSavings: '$2,250-$5,600',
    customHeadline: 'Marketing Automation Experts, Meet AI Acceleration',
    customMessage: 'As marketing automation specialists, you understand the power of workflows. Our AI skills take automation to the next level—optimizing marketing sequences, generating insightful reports, and managing brand assets with the precision your clients expect.',
  },
  {
    companyName: 'Ideas That Evoke',
    industry: 'marketing_advertising',
    companyType: 'Recruitment Marketing Agency',
    website: 'https://ideasthatevoke.com',
    linkedInUrl: 'https://www.linkedin.com/company/ideas-that-evoke/',
    logoUrl: 'https://logo.clearbit.com/ideasthatevoke.com',
    services: 'Social Recruitment, HR Marketing, Employer Branding',
    revenue: '$2-5M',
    employeeCount: '24',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Specializes in recruitment marketing. 24 employees per Built In. Niche HR focus.',
    painPoints: 'Recruitment marketing pipelines, candidate communication, job posting distribution',
    estimatedTimeSavings: '12-18 hrs',
    estimatedCostSavings: '$3,000-$7,200',
    customHeadline: 'Recruitment Marketing, Elevated by AI',
    customMessage: 'Your specialized focus on recruitment marketing, employer branding, and social recruitment sets you apart. Our AI skills streamline candidate communication, automate job posting distribution, and optimize recruitment pipelines—helping your clients attract top talent faster.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH PRIORITY - MADISON BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Trek Bicycle Corporation',
    industry: 'manufacturing',
    companyType: 'Manufacturing / Consumer Products',
    website: 'https://trekbikes.com',
    linkedInUrl: 'https://www.linkedin.com/company/trek-bicycle/',
    logoUrl: 'https://logo.clearbit.com/trekbikes.com',
    services: 'Bicycle design, manufacturing, global distribution, retail partnerships, racing team sponsorship',
    revenue: '$1.9B',
    employeeCount: '3,400+',
    location: 'Waterloo, WI',
    priority: 'HIGH',
    description: 'Power BI, SAP Concur, Stripe (per ZoomInfo). Expanding finance team. Global supply chain.',
    painPoints: 'Multi-location inventory, dealer network coordination, seasonal demand planning, global supply chain visibility',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'AI-Powered Operations for a Global Cycling Leader',
    customMessage: 'From Waterloo to the world, Trek sets the standard in cycling. Our AI automation suite helps manage global supply chains, coordinate your dealer network, and optimize seasonal planning—so you can focus on what you do best: getting people on bikes.',
    contacts: [{ name: 'John Burke', title: 'President', isPrimary: true }],
  },
  {
    companyName: 'Sub-Zero Group',
    industry: 'manufacturing',
    companyType: 'Manufacturing / Appliances',
    website: 'https://subzero-wolf.com',
    linkedInUrl: 'https://www.linkedin.com/company/sub-zero-group-inc-/',
    logoUrl: 'https://logo.clearbit.com/subzero-wolf.com',
    services: 'Luxury appliance manufacturing, dealer network, custom installations, warranty service',
    revenue: '$1B+',
    employeeCount: '3,000+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'CRM for dealer management. Manufacturing ERP systems. Premium brand positioning.',
    painPoints: 'Dealer network coordination, custom order tracking, warranty claim processing, installation scheduling',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Premium Automation for Premium Appliances',
    customMessage: 'Sub-Zero and Wolf represent the pinnacle of kitchen luxury. Our AI solutions match that standard—streamlining dealer coordination, custom order tracking, and warranty processing with the precision your premium brand demands.',
    contacts: [{ name: 'Jim Bakke', title: 'President & CEO', isPrimary: true }],
  },
  {
    companyName: 'CUNA Mutual Group (TruStage)',
    industry: 'insurance',
    companyType: 'Insurance / Financial Services',
    website: 'https://cunamutual.com',
    linkedInUrl: 'https://www.linkedin.com/company/trustage/',
    logoUrl: 'https://logo.clearbit.com/cunamutual.com',
    services: 'Credit union insurance, retirement services, lending protection, B2B2C distribution',
    revenue: '$4B+',
    employeeCount: '3,000+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Salesforce. B2B sales motions. Complex partner relationships. Recent rebrand to TruStage.',
    painPoints: 'Partner (credit union) onboarding, multi-tier reporting, contract management, sales enablement',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Intelligent Automation for Your Credit Union Partner Network',
    customMessage: 'Serving thousands of credit unions requires flawless partner coordination. Our AI skills accelerate onboarding, automate multi-tier reporting, and streamline contract management—helping TruStage deliver on its promise to protect what matters most.',
    contacts: [{ name: 'Robert N. Trunzo', title: 'President & CEO', isPrimary: true }],
  },
  {
    companyName: 'Promega Corporation',
    industry: 'biotechnology',
    companyType: 'Biotechnology / Life Sciences',
    website: 'https://promega.com',
    linkedInUrl: 'https://www.linkedin.com/company/promega-corporation/',
    logoUrl: 'https://logo.clearbit.com/promega.com',
    services: 'Life science reagent manufacturing, R&D, global distribution, scientific support',
    revenue: '$800M+',
    employeeCount: '1,800+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'SAP, Salesforce likely. Heavy R&D documentation requirements. Global operations.',
    painPoints: 'Order fulfillment, scientific literature distribution, customer support, inventory management',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'AI-Driven Efficiency for Life Science Innovation',
    customMessage: 'Promega\'s commitment to scientific advancement deserves automation that keeps pace. Our AI tools streamline order fulfillment, organize technical documentation, and enhance customer support—so your scientists can focus on discoveries.',
    contacts: [{ name: 'Bill Linton', title: 'Founder, Chairman & CEO', isPrimary: true }],
  },
  {
    companyName: 'Colony Brands (Swiss Colony)',
    industry: 'retail',
    companyType: 'E-commerce / Food & Gifts',
    website: 'https://colonybrands.com',
    linkedInUrl: 'https://www.linkedin.com/company/colony-brands/',
    logoUrl: 'https://logo.clearbit.com/colonybrands.com',
    services: 'Catalog/e-commerce, food manufacturing, gift fulfillment, seasonal operations',
    revenue: '$1.5B+',
    employeeCount: '2,000+ (peak seasonal)',
    location: 'Monroe, WI',
    priority: 'HIGH',
    description: 'E-commerce platforms, fulfillment systems. Heavy seasonal scaling. Multi-brand portfolio.',
    painPoints: 'Seasonal hiring automation, inventory management, order processing, customer service scaling',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Scale Your Holiday Season with Intelligent Automation',
    customMessage: 'From Swiss Colony to your entire brand portfolio, seasonal peaks demand seamless operations. Our AI suite automates hiring workflows, optimizes inventory, and scales customer service—ensuring every gift arrives on time.',
    contacts: [{ name: 'John Baumann', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Fetch Rewards',
    industry: 'technology',
    companyType: 'Technology / Consumer App',
    website: 'https://fetch.com',
    linkedInUrl: 'https://www.linkedin.com/company/fetch-rewards/',
    logoUrl: 'https://logo.clearbit.com/fetch.com',
    services: 'Consumer rewards app, brand partnerships, receipt scanning, data analytics',
    revenue: '$500M+',
    employeeCount: '700+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Modern tech stack. High-growth. Rapid scaling challenges. 55M+ users.',
    painPoints: 'Partner onboarding, campaign management, user engagement automation, data pipeline management',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Automation That Scales with 55 Million Users',
    customMessage: 'Fetch\'s explosive growth requires automation that keeps pace. Our AI skills accelerate partner onboarding, automate campaign management, and optimize user engagement workflows—built for high-growth tech companies like yours.',
    contacts: [{ name: 'Wes Schroll', title: 'Founder & CEO', isPrimary: true }],
  },
  {
    companyName: 'Lands\' End',
    industry: 'retail',
    companyType: 'Retail / E-commerce',
    website: 'https://landsend.com',
    linkedInUrl: 'https://www.linkedin.com/company/lands-end/',
    logoUrl: 'https://logo.clearbit.com/landsend.com',
    services: 'Apparel retail, e-commerce, B2B uniforms, catalog marketing',
    revenue: '$1.4B',
    employeeCount: '4,500+',
    location: 'Dodgeville, WI',
    priority: 'HIGH',
    description: 'E-commerce platform, Salesforce (B2B). Omnichannel operations. School uniforms major revenue.',
    painPoints: 'Inventory management, B2B order processing, customer service, seasonal planning',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Omnichannel Excellence Powered by AI',
    customMessage: 'From catalog heritage to e-commerce leadership, Lands\' End defines omnichannel retail. Our AI automation streamlines B2B uniform orders, enhances inventory management, and delivers the customer service quality your loyal customers expect.',
    contacts: [{ name: 'Andrew McLean', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Culver\'s (Corporate)',
    industry: 'food_beverage',
    companyType: 'Restaurant / Franchising',
    website: 'https://culvers.com',
    linkedInUrl: 'https://www.linkedin.com/company/culver\'s/',
    logoUrl: 'https://logo.clearbit.com/culvers.com',
    services: 'Franchise support, supply chain, marketing, training, real estate development',
    revenue: '$4B+ (system-wide)',
    employeeCount: '800+ (corporate)',
    location: 'Prairie du Sac, WI',
    priority: 'HIGH',
    description: 'Franchise management systems. Multi-location operations. 900+ locations.',
    painPoints: 'Franchisee onboarding, vendor coordination, training scheduling, marketing asset distribution',
    estimatedTimeSavings: '15-28 hrs',
    estimatedCostSavings: '$3,750-$11,200',
    customHeadline: 'Welcome to Better Franchise Operations',
    customMessage: 'With 900+ locations serving ButterBurgers nationwide, Culver\'s franchise operations must be flawless. Our AI skills streamline franchisee onboarding, coordinate vendor relationships, and distribute marketing assets—welcome to better efficiency.',
    contacts: [{ name: 'Craig Culver', title: 'Co-Founder & Chairman', isPrimary: true }, { name: 'Rick Silva', title: 'CEO' }],
  },
  {
    companyName: 'Findorff (J.H. Findorff & Son)',
    industry: 'construction',
    companyType: 'Construction',
    website: 'https://findorff.com',
    linkedInUrl: 'https://www.linkedin.com/company/j-h-findorff-&-son-inc/',
    logoUrl: 'https://logo.clearbit.com/findorff.com',
    services: 'Commercial construction, project management, subcontractor coordination, safety',
    revenue: '$500M+',
    employeeCount: '400+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Procore likely. Project management systems. Major Madison projects.',
    painPoints: 'Subcontractor management, RFI tracking, safety documentation, project reporting',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Building Madison\'s Future with AI-Powered Efficiency',
    customMessage: 'Findorff has shaped Madison\'s skyline for generations. Now shape the future of construction operations with AI skills that streamline subcontractor coordination, automate RFI tracking, and ensure safety documentation is always project-ready.',
    contacts: [{ name: 'Jim Yehle', title: 'President & CEO', email: 'jyehle@findorff.com', isPrimary: true }, { name: 'Dave Beck-Engel', title: 'Vice Chairman' }],
  },
  {
    companyName: 'Stark Company Realtors',
    industry: 'real_estate',
    companyType: 'Real Estate',
    website: 'https://starkhomes.com',
    linkedInUrl: 'https://www.linkedin.com/company/stark-company-realtors/',
    logoUrl: 'https://logo.clearbit.com/starkhomes.com',
    services: 'Residential real estate, commercial, property management, agent support',
    revenue: '$50M+',
    employeeCount: '200+ agents',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Real estate CRM (likely KvCORE, BoomTown, or similar). Multi-office.',
    painPoints: 'Transaction coordination, agent onboarding, lead distribution, document management',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: 'Empower 200+ Agents with Intelligent Automation',
    customMessage: 'Managing 200+ agents across multiple offices requires seamless coordination. Our AI skills automate transaction workflows, streamline agent onboarding, and ensure leads reach the right agent instantly—helping your team close more deals.',
    contacts: [{ name: 'Tim Gomoll', title: 'President', isPrimary: true }],
  },
  {
    companyName: 'Zimbrick Automotive Group',
    industry: 'automotive',
    companyType: 'Automotive Retail',
    website: 'https://zimbrick.com',
    linkedInUrl: 'https://www.linkedin.com/company/zimbrick-automotive-group/',
    logoUrl: 'https://logo.clearbit.com/zimbrick.com',
    services: 'New/used car sales, service, parts, multiple franchise brands',
    revenue: '$500M+',
    employeeCount: '800+',
    location: 'Madison, WI (multi-dealership)',
    priority: 'HIGH',
    description: 'DealerTrack, CDK, Reynolds & Reynolds likely. Multi-brand dealerships.',
    painPoints: 'Lead follow-up, service appointment scheduling, inventory management, customer reviews',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Drive Sales Excellence Across All Your Dealerships',
    customMessage: 'With 800+ employees across multiple brands and locations, Zimbrick needs automation that scales. Our AI skills accelerate lead follow-up, optimize service scheduling, and manage customer reviews—keeping every dealership running at peak performance.',
    contacts: [{ name: 'Tom Zimbrick', title: 'President', isPrimary: true }],
  },
  {
    companyName: 'National Guardian Life (NGL)',
    industry: 'insurance',
    companyType: 'Insurance',
    website: 'https://nglic.com',
    linkedInUrl: 'https://www.linkedin.com/company/national-guardian-life-insurance-company/',
    logoUrl: 'https://logo.clearbit.com/nglic.com',
    services: 'Life insurance, disability, employee benefits, worksite marketing',
    revenue: '$500M+',
    employeeCount: '500+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Insurance administration systems. Agent/broker network. Worksite sales.',
    painPoints: 'Agent onboarding, policy administration, broker communication, compliance',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Insurance Operations, Streamlined by AI',
    customMessage: 'Your agent and broker network is the heart of NGL\'s success. Our AI skills accelerate agent onboarding, streamline policy administration, and automate compliance workflows—so your team can focus on protecting families and businesses.',
    contacts: [{ name: 'Mark Solverud', title: 'President & CEO', isPrimary: true }],
  },
  {
    companyName: 'First Weber Realtors',
    industry: 'real_estate',
    companyType: 'Real Estate',
    website: 'https://firstweber.com',
    linkedInUrl: 'https://www.linkedin.com/company/first-weber-realtors/',
    logoUrl: 'https://logo.clearbit.com/firstweber.com',
    services: 'Residential/commercial real estate, relocation, property management',
    revenue: '$50M+',
    employeeCount: '1,000+ agents',
    location: 'Madison, WI (statewide)',
    priority: 'HIGH',
    description: 'Real estate CRM and transaction management. Statewide coverage.',
    painPoints: 'Agent productivity, transaction tracking, lead management, marketing automation',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Statewide Real Estate, Powered by AI',
    customMessage: 'Supporting 1,000+ agents across Wisconsin demands powerful tools. Our AI skills boost agent productivity, automate transaction tracking, and optimize lead management—helping First Weber maintain its position as Wisconsin\'s real estate leader.',
    contacts: [{ name: 'Michael Theo', title: 'President & CEO', isPrimary: true }],
  },
  {
    companyName: 'Gorman & Company',
    industry: 'real_estate',
    companyType: 'Real Estate Development',
    website: 'https://gormanusa.com',
    linkedInUrl: 'https://www.linkedin.com/company/gorman-&-company/',
    logoUrl: 'https://logo.clearbit.com/gormanusa.com',
    services: 'Affordable housing development, property management, tax credit projects',
    revenue: '$100M+',
    employeeCount: '150+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Project management, accounting systems. Compliance-heavy (LIHTC). Multi-state.',
    painPoints: 'Project tracking, compliance documentation, investor reporting, grant management',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: 'Affordable Housing Development, Streamlined',
    customMessage: 'LIHTC compliance and investor reporting across multi-state projects demands precision. Our AI skills automate compliance documentation, streamline grant management, and keep investor reports on track—so you can focus on building communities.',
    contacts: [{ name: 'Gary J. Gorman', title: 'Founder & Chairman', isPrimary: true }, { name: 'Brian Swanton', title: 'President & CEO' }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM PRIORITY - MADISON BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Exact Sciences',
    industry: 'biotechnology',
    companyType: 'Biotechnology / Healthcare',
    website: 'https://exactsciences.com',
    linkedInUrl: 'https://www.linkedin.com/company/exact-sciences/',
    logoUrl: 'https://logo.clearbit.com/exactsciences.com',
    services: 'Cancer screening test development, lab operations, physician engagement, patient outreach',
    revenue: '$3.08B',
    employeeCount: '7,000+',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    notes: 'Enterprise - likely has internal automation. High compliance requirements.',
    painPoints: 'Clinical trial coordination, physician communication workflows, compliance documentation, sales territory management',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Precision Screening, Precision Operations',
    customMessage: 'Exact Sciences is revolutionizing cancer screening. Our AI skills can support your mission with automated compliance documentation, streamlined physician communication, and efficient clinical trial coordination—precision operations for precision medicine.',
  },
  {
    companyName: 'American Family Insurance',
    industry: 'insurance',
    companyType: 'Insurance / Financial Services',
    website: 'https://amfam.com',
    linkedInUrl: 'https://www.linkedin.com/company/american-family-insurance/',
    logoUrl: 'https://logo.clearbit.com/amfam.com',
    services: 'Insurance underwriting, claims processing, agent network, customer service, corporate ventures',
    revenue: '$14B+ (group)',
    employeeCount: '3,000+ (Madison)',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    notes: 'Enterprise - Guidewire, Salesforce. May need enterprise consulting only.',
    painPoints: 'Agent onboarding, claims workflow, customer communication automation, compliance reporting',
    estimatedTimeSavings: '25-40 hrs',
    estimatedCostSavings: '$6,250-$16,000',
    customHeadline: 'Protecting Dreams with Intelligent Automation',
    customMessage: 'American Family\'s mission of protecting dreams requires flawless operations. Our AI skills can enhance agent onboarding, streamline claims workflows, and automate compliance reporting—supporting your team as they protect what matters most to families.',
  },
  {
    companyName: 'Esker (US HQ)',
    industry: 'technology',
    companyType: 'Software / Process Automation',
    website: 'https://esker.com',
    linkedInUrl: 'https://www.linkedin.com/company/esker/',
    logoUrl: 'https://logo.clearbit.com/esker.com',
    services: 'AI-driven document automation, order-to-cash, purchase-to-pay solutions, SaaS delivery',
    revenue: '$200M+ (global)',
    employeeCount: '200+ (Madison)',
    location: 'Madison, WI (US HQ)',
    priority: 'MEDIUM',
    notes: 'Already in automation space - may want internal process automation.',
    painPoints: 'Sales pipeline management, customer onboarding, partner channel coordination, support scaling',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Automation Experts Deserve Automated Operations',
    customMessage: 'Esker leads in document automation for customers worldwide. Our AI skills can optimize your internal operations—sales pipeline management, customer onboarding, and partner coordination—so your team can focus on delivering automation excellence.',
  },
  {
    companyName: 'WPS Health Solutions',
    industry: 'healthcare',
    companyType: 'Healthcare / Insurance',
    website: 'https://wpshealthsolutions.com',
    linkedInUrl: 'https://www.linkedin.com/company/wps-health-solutions/',
    logoUrl: 'https://logo.clearbit.com/wpshealthsolutions.com',
    services: 'Medicare administration, TRICARE, health insurance, government contracts',
    revenue: '$2B+',
    employeeCount: '2,500+',
    location: 'Monona, WI',
    priority: 'MEDIUM',
    notes: 'Government contractor - secure environments, heavy compliance.',
    painPoints: 'Claims processing, compliance documentation, provider communication, audit preparation',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Government-Grade Healthcare Operations',
    customMessage: 'Serving Medicare and TRICARE beneficiaries requires the highest standards of compliance and efficiency. Our AI skills support claims processing, compliance documentation, and audit preparation—meeting the rigorous demands of government healthcare contracts.',
  },
  {
    companyName: 'Alliant Energy',
    industry: 'utilities',
    companyType: 'Utilities / Energy',
    website: 'https://alliantenergy.com',
    linkedInUrl: 'https://www.linkedin.com/company/alliant-energy/',
    logoUrl: 'https://logo.clearbit.com/alliantenergy.com',
    services: 'Electric/gas utility, renewable energy projects, customer service, regulatory compliance',
    revenue: '$4B+',
    employeeCount: '3,500+',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    notes: 'Utility procurement processes - may have specific requirements.',
    painPoints: 'Customer communication, project tracking, compliance reporting, field crew scheduling',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Powering Communities with AI Efficiency',
    customMessage: 'Alliant Energy powers homes and businesses across the Midwest while leading the clean energy transition. Our AI skills support customer communication, renewable project tracking, and regulatory compliance—keeping the lights on efficiently.',
  },
  {
    companyName: 'QBE North America (Madison Office)',
    industry: 'insurance',
    companyType: 'Insurance',
    website: 'https://qbe.com',
    linkedInUrl: 'https://www.linkedin.com/company/qbe-north-america/',
    logoUrl: 'https://logo.clearbit.com/qbe.com',
    services: 'Crop insurance, specialty insurance, underwriting, claims',
    revenue: '$100M+ (Madison ops)',
    employeeCount: '500+',
    location: 'Sun Prairie, WI',
    priority: 'MEDIUM',
    description: 'Insurance platforms. Compliance-heavy. Agricultural focus.',
    painPoints: 'Policy processing, claims workflows, agent communication, compliance reporting',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Agricultural Insurance, Intelligently Automated',
    customMessage: 'Protecting America\'s farmers with crop insurance requires specialized expertise and compliance precision. Our AI skills streamline policy processing, claims workflows, and agent communication—helping QBE serve agricultural communities more efficiently.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW PRIORITY - SMALL OR NICHE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Hiebing',
    industry: 'marketing_advertising',
    companyType: 'Full-Service Advertising Agency',
    website: 'hiebing.com',
    logoUrl: 'https://logo.clearbit.com/hiebing.com',
    services: 'Brand Strategy, Research, Creative, Media, PR, Social, Digital, Production',
    revenue: '$50M+ billings',
    employeeCount: '101-200',
    location: 'Madison, WI',
    priority: 'LOW',
    notes: 'Too Large - likely has internal automation team. Enterprise consulting only.',
    description: 'Founded 1981, employee-owned. $50M+ billings. Clients: Culvers, WI Tourism, ABC Supply.',
  },
  {
    companyName: 'Bizzy Bizzy',
    industry: 'marketing_advertising',
    companyType: 'Web Design Agency',
    website: 'bizzybizzycreative.com',
    logoUrl: 'https://logo.clearbit.com/bizzybizzycreative.com',
    services: '1-Day Website, 1-Day Branding, Web Design',
    revenue: '$500K-1M',
    employeeCount: '5-8',
    location: 'Madison, WI',
    priority: 'LOW',
    notes: 'Small/Niche - Unique productized model may not need traditional workflows.',
    description: 'Founded 2009. Unique 1 Day model - very fast turnaround. Small team, niche focus on startups/entrepreneurs.',
    estimatedTimeSavings: '3-5 hrs',
    estimatedCostSavings: '$750-$2,000',
  },
  {
    companyName: 'Kramer Madison',
    industry: 'marketing_advertising',
    companyType: 'Print & Fulfillment',
    website: 'kramermadison.com',
    logoUrl: 'https://logo.clearbit.com/kramermadison.com',
    services: 'Print, Mail, Fulfillment, Brand Marketing',
    priority: 'LOW',
    location: 'Madison, WI',
    notes: 'Print Focus - Limited digital automation opportunity.',
    description: 'Design-driven, print/mail focus. More fulfillment than digital marketing.',
    estimatedTimeSavings: '2-3 hrs',
    estimatedCostSavings: '$500-$1,200',
  },
  {
    companyName: 'Gunter Agency',
    industry: 'marketing_advertising',
    companyType: 'Boutique Marketing Agency',
    website: 'gunter.agency',
    logoUrl: 'https://logo.clearbit.com/gunter.agency',
    services: 'Small-Medium Business Marketing, Pay-for-Performance',
    revenue: '<$500K',
    location: 'Madison, WI',
    priority: 'LOW',
    notes: 'Small Boutique - Pay-for-performance reduces automation ROI.',
    description: 'Pay-for-performance model. Boutique focus on SMBs.',
    estimatedTimeSavings: '3-5 hrs',
    estimatedCostSavings: '$750-$2,000',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESEARCH NEEDED
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'LAYOUTindex',
    industry: 'technology',
    companyType: 'Software/Marketing Hybrid',
    website: 'layoutindex.com',
    logoUrl: 'https://logo.clearbit.com/layoutindex.com',
    services: 'Software Development, Design, Marketing',
    location: 'Madison, WI',
    priority: 'RESEARCH',
    notes: 'Need more info on marketing service volume',
    description: 'Multifaceted tech company with marketing capabilities. Worth researching further.',
  },
  {
    companyName: 'Pilch + Barnet',
    industry: 'marketing_advertising',
    companyType: 'Destination Marketing Agency',
    website: 'pilchbarnet.com',
    logoUrl: 'https://logo.clearbit.com/pilchbarnet.com',
    services: 'Destination Marketing, Tourism, Web, Branding',
    location: 'Madison, WI',
    priority: 'RESEARCH',
    notes: 'Need more info on service volume and team size.',
    description: 'Tourism/destination marketing since 2001. Worth researching further.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES - CPA FIRMS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Wegner CPAs',
    industry: 'professional_services',
    companyType: 'CPA / Accounting Firm',
    website: 'https://wegnercpas.com',
    linkedInUrl: 'https://www.linkedin.com/company/wegnercpas/',
    logoUrl: 'https://logo.clearbit.com/wegnercpas.com',
    services: 'Accounting & Auditing, Bookkeeping & Payroll, Outsourced Accounting, Tax Compliance & Planning, Software Support',
    revenue: '$24M',
    employeeCount: '41+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Full-service CPA firm with offices in Madison, Baraboo, Pewaukee, Janesville, New York, and Washington DC. Top Workplaces USA award winner.',
    painPoints: 'Multi-client deadline management, tax document collection, audit workflow coordination, client portal adoption',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'AI-Powered Efficiency for Award-Winning CPAs',
    customMessage: 'Your Top Workplaces USA recognition proves you value efficiency and people. Our AI skills streamline tax season workflows, automate document collection, and coordinate audits across your six offices—letting your team focus on advisory relationships.',
    contacts: [{ name: 'Glenn Miller', title: 'Managing Partner', email: 'glenn.miller@wegnercpas.com', isPrimary: true }],
  },
  {
    companyName: 'Wipfli LLP',
    industry: 'professional_services',
    companyType: 'CPA / Consulting Firm',
    website: 'https://wipfli.com',
    linkedInUrl: 'https://www.linkedin.com/company/wipfli/',
    logoUrl: 'https://logo.clearbit.com/wipfli.com',
    services: 'Assurance, Accounting, Tax, Consulting, Risk Advisory, Business Valuations, Forensics, Private Wealth Services',
    revenue: '$500M+',
    employeeCount: '3,000+',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Wisconsin-based national firm with 7 offices across the state. Madison office at 2501 W Beltline Hwy specializes in risk advisory and private client services.',
    painPoints: 'Cross-office collaboration, client engagement tracking, risk assessment workflows, wealth management reporting',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Enterprise Automation for National Advisory Excellence',
    customMessage: 'Serving clients from Madison to nationwide requires seamless operations. Our AI skills enhance cross-office collaboration, streamline risk assessments, and automate wealth management reporting—supporting your growth while maintaining the Wipfli standard.',
  },
  {
    companyName: 'CLA (CliftonLarsonAllen)',
    industry: 'professional_services',
    companyType: 'CPA / Advisory Firm',
    website: 'https://claconnect.com',
    linkedInUrl: 'https://www.linkedin.com/company/cliftonlarsonallen/',
    logoUrl: 'https://logo.clearbit.com/claconnect.com',
    services: 'Wealth Advisory, Outsourcing, Audit, Tax, Consulting',
    revenue: '$2B+ (global)',
    employeeCount: '7,000+',
    location: 'Middleton, WI',
    priority: 'MEDIUM',
    description: 'Top 10 professional services firm with 120+ US locations. Madison/Middleton office serves agribusiness, construction, nonprofits, manufacturing, and distribution sectors.',
    painPoints: 'Industry-specific compliance, client onboarding, audit documentation, advisory workflow management',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Industry-Specific Automation for Top 10 Excellence',
    customMessage: 'CLA\'s deep industry expertise in agribusiness, construction, and manufacturing deserves automation that matches. Our AI skills handle compliance tracking, streamline onboarding, and accelerate audit workflows—letting your specialists focus on strategic advisory.',
  },
  {
    companyName: 'Baker Tilly',
    industry: 'professional_services',
    companyType: 'CPA / Advisory Firm',
    website: 'https://bakertilly.com',
    linkedInUrl: 'https://www.linkedin.com/company/bakertillyus/',
    logoUrl: 'https://logo.clearbit.com/bakertilly.com',
    services: 'Accounting, Advisory, Tax, Assurance, Manufacturing, Construction, Real Estate, Nonprofits',
    revenue: '$1.5B+ (US)',
    employeeCount: '5,000-10,000',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Top 10 advisory CPA firm founded 1931. Madison office at 4807 Innovate Lane. 2025 In Business Madison Executive Choice GOLD Award Winner.',
    painPoints: 'Multi-service coordination, advisory engagement tracking, sector-specific reporting, client communication',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Gold-Standard Automation for Gold Award Winners',
    customMessage: 'Your Executive Choice GOLD Award reflects 90+ years of advisory excellence. Our AI skills amplify that legacy—coordinating multi-service engagements, automating sector reporting, and enhancing client communication across your practice areas.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES - LAW FIRMS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Stafford Rosenbaum LLP',
    industry: 'legal',
    companyType: 'Law Firm',
    website: 'https://staffordlaw.com',
    linkedInUrl: 'https://www.linkedin.com/company/stafford-rosenbaum-llp/',
    logoUrl: 'https://logo.clearbit.com/staffordlaw.com',
    services: 'Business Law, Government Services, Nonprofit Services, Estate Planning, Family Law, Real Estate, Litigation',
    revenue: '$20M+',
    employeeCount: '50+ attorneys',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Full-service law firm with 140+ year history. Offices in Madison and Milwaukee. 17 attorneys recognized in 2026 Best Lawyers in America.',
    painPoints: 'Document management, case tracking, client communication, billing workflows, deadline management',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: '140 Years of Legal Excellence, Now AI-Enhanced',
    customMessage: 'With 17 Best Lawyers honorees, Stafford Rosenbaum sets the standard for Madison legal services. Our AI skills handle document management, case tracking, and billing workflows—so your attorneys can focus on the complex matters that earn recognition.',
    contacts: [{ name: 'James B. Egle', title: 'Managing Partner', isPrimary: true }],
  },
  {
    companyName: 'Godfrey & Kahn',
    industry: 'legal',
    companyType: 'Law Firm',
    website: 'https://gklaw.com',
    linkedInUrl: 'https://www.linkedin.com/company/godfreykahn/',
    logoUrl: 'https://logo.clearbit.com/gklaw.com',
    services: 'Corporate, M&A, Business Litigation, Employment, Technology, Intellectual Property, Regulatory',
    revenue: '$100M+',
    employeeCount: '190+ attorneys',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Full-service corporate law firm with 6 offices. Corporate/M&A practice ranked Band One by Chambers USA. Madison office named Top Workplace 5 consecutive years.',
    painPoints: 'M&A deal tracking, due diligence workflows, multi-office coordination, IP portfolio management, regulatory compliance',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Band One M&A Excellence Meets AI Efficiency',
    customMessage: 'Chambers Band One ranking demands flawless execution. Our AI skills accelerate due diligence, coordinate deal workflows across six offices, and manage IP portfolios—supporting your top-ranked M&A practice with the precision it deserves.',
    contacts: [{ name: 'Jennifer A. Hannon', title: 'Madison Office Managing Partner', isPrimary: true }, { name: 'Nicholas P. Wahl', title: 'President & Managing Partner' }],
  },
  {
    companyName: 'Boardman & Clark LLP',
    industry: 'legal',
    companyType: 'Law Firm',
    website: 'https://boardmanclark.com',
    linkedInUrl: 'https://www.linkedin.com/company/boardman-&-clark-llp/',
    logoUrl: 'https://logo.clearbit.com/boardmanclark.com',
    services: 'Banking, Corporate, Education, Energy & Environment, Intellectual Property, Labor & Employment, M&A, Litigation, Tax, Real Estate',
    revenue: '$15M+',
    employeeCount: '50+ attorneys',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'One of Madison\'s oldest firms, founded 1881. Six southern Wisconsin locations. Full-service firm serving individuals, businesses, and public sector.',
    painPoints: 'Multi-location case management, education law compliance, real estate transaction coordination, labor law documentation',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Madison\'s Legal Heritage, Modernized by AI',
    customMessage: 'Since 1881, Boardman & Clark has served southern Wisconsin with excellence. Our AI skills modernize operations across your six locations—managing cases, tracking compliance, and coordinating transactions while preserving the trusted relationships you\'ve built.',
    contacts: [{ name: 'Jennifer S. Mirus', title: 'Executive Committee Chair', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES - STAFFING & HR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'QTI Group',
    industry: 'staffing',
    companyType: 'HR / Staffing Firm',
    website: 'https://qtigroup.com',
    linkedInUrl: 'https://www.linkedin.com/company/the-qti-group/',
    logoUrl: 'https://logo.clearbit.com/qtigroup.com',
    services: 'Industrial & Administrative Staffing, Executive & Professional Search, HR/Compensation Consulting, PEO, Integrated HR',
    revenue: '$50M+',
    employeeCount: '65+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1957, privately owned HR firm headquartered in Madison. Four Wisconsin locations. Family-owned, consistently voted Best Place to Work.',
    painPoints: 'Candidate pipeline management, placement tracking, HR consulting workflows, compensation benchmarking, client reporting',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: '65+ Years of HR Excellence, Accelerated by AI',
    customMessage: 'QTI has connected talent with opportunity for over six decades. Our AI skills supercharge candidate pipelines, automate placement tracking, and streamline HR consulting—helping your family-owned firm maintain its Best Place to Work culture while scaling impact.',
    contacts: [{ name: 'Londa Dewey', title: 'CEO & President', isPrimary: true }],
  },
  {
    companyName: 'Carex Consulting Group',
    industry: 'staffing',
    companyType: 'IT / Healthcare Staffing',
    website: 'https://carexconsulting.com',
    linkedInUrl: 'https://www.linkedin.com/company/carex-consulting-group/',
    logoUrl: 'https://logo.clearbit.com/carexconsulting.com',
    services: 'Enterprise Staffing Solutions, Project Management, Business Analysis, Tech Talent, Healthtech Staffing',
    revenue: '$10M+',
    employeeCount: '25+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 2016, national firm headquartered in Madison. Specializes in healthtech, project management, and IT staffing. Committed to keeping Wisconsin talent in state.',
    painPoints: 'Tech candidate sourcing, healthtech compliance, project placement tracking, contractor management',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: 'Healthtech Staffing, Intelligently Automated',
    customMessage: 'Placing tech talent in healthcare requires precision matching and compliance awareness. Our AI skills accelerate candidate sourcing, automate compliance tracking, and manage contractor relationships—helping Carex keep Wisconsin\'s best talent local.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES - ENGINEERING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'GRAEF',
    industry: 'engineering',
    companyType: 'Engineering / Architecture',
    website: 'https://graef-usa.com',
    linkedInUrl: 'https://www.linkedin.com/company/graef/',
    logoUrl: 'https://logo.clearbit.com/graef-usa.com',
    services: 'Civil Engineering, Construction Management, Environmental, Landscape Architecture, MEP/Commissioning, Planning, Structural, Survey, Transportation',
    revenue: '$50M+',
    employeeCount: '200-500',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1961, private firm based in Milwaukee with downtown Madison office since 1991. Ranked #385 in ENR Top 500 and #31 in BD+C top engineering-architecture firms.',
    painPoints: 'Project resource allocation, multi-discipline coordination, CAD/BIM workflows, permit tracking, site inspection scheduling',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'ENR Top 500 Engineering, AI-Optimized',
    customMessage: 'GRAEF\'s ENR Top 500 ranking reflects 60+ years of multi-discipline excellence. Our AI skills optimize project resource allocation, coordinate across your nine service areas, and streamline permit tracking—engineering efficiency for an engineering firm.',
    contacts: [{ name: 'John Kissinger', title: 'President', isPrimary: true }, { name: 'Pat Kressin', title: 'CEO' }],
  },
  {
    companyName: 'Vierbicher',
    industry: 'engineering',
    companyType: 'Engineering / Planning',
    website: 'https://vierbicher.com',
    linkedInUrl: 'https://www.linkedin.com/company/vierbicher/',
    logoUrl: 'https://logo.clearbit.com/vierbicher.com',
    services: 'Civil Engineering, Planning, Economic Development, Landscape Architecture, Water Resources, Surveying, Building Inspection',
    revenue: '$20M+',
    employeeCount: '100+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Community planning and engineering firm with 45+ years experience. Five Wisconsin offices. Madison office at 525 Junction Rd. Trusted advisor to public and private clients.',
    painPoints: 'Municipal project coordination, TIF district tracking, public meeting documentation, inspection scheduling, grant management',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Community Engineering, Intelligently Streamlined',
    customMessage: 'Vierbicher builds communities through trusted partnerships. Our AI skills enhance municipal coordination, track TIF districts, manage grants, and schedule inspections—so your planners and engineers can focus on shaping Wisconsin\'s future.',
    contacts: [{ name: 'Rod Zubella', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Ayres Associates',
    industry: 'engineering',
    companyType: 'Engineering / Architecture',
    website: 'https://ayresassociates.com',
    linkedInUrl: 'https://www.linkedin.com/company/ayres-associates/',
    logoUrl: 'https://logo.clearbit.com/ayresassociates.com',
    services: 'Civil Engineering, Architecture, Environmental, Landscape Architecture, Planning, Municipal Engineering, Land Surveying, Transportation, Water Resources',
    revenue: '$50M+',
    employeeCount: '200-500',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1959, headquartered in Eau Claire. Ranked 310th among ENR\'s top 500 firms. Madison office provides geospatial mapping, survey, environmental management, and planning services.',
    painPoints: 'Multi-office project tracking, geospatial data management, environmental compliance, transportation project coordination',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'ENR Top 500 Excellence, Automated for Growth',
    customMessage: 'Ayres\' 65-year legacy and ENR ranking demand operational excellence. Our AI skills coordinate projects across offices, manage geospatial data, track environmental compliance, and streamline transportation planning—supporting your continued growth.',
    contacts: [{ name: 'Jay Holtz', title: 'President', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNOLOGY COMPANIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Singlewire Software',
    industry: 'technology',
    companyType: 'Software / Emergency Communications',
    website: 'https://singlewire.com',
    linkedInUrl: 'https://www.linkedin.com/company/singlewire-software/',
    logoUrl: 'https://logo.clearbit.com/singlewire.com',
    services: 'Emergency Mass Notification Systems, IP-based Voice Applications, Visitor Management, InformaCast Platform',
    revenue: '$21-25M',
    employeeCount: '100-162',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Develops InformaCast and Visitor Aware solutions enabling 5,500+ organizations across 80 countries to detect threats, notify personnel, and manage incidents. Founded 2009.',
    painPoints: 'Customer onboarding, partner channel management, support ticket workflows, product documentation, release coordination',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Protecting 5,500+ Organizations—Now Streamline Your Operations',
    customMessage: 'Singlewire keeps organizations safe across 80 countries. Our AI skills optimize customer onboarding, manage partner channels, and coordinate product releases—so your team can focus on building the safety solutions that matter most.',
    contacts: [{ name: 'Terry Swanson', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'AkitaBox',
    industry: 'technology',
    companyType: 'Software / Facility Management',
    website: 'https://akitabox.com',
    linkedInUrl: 'https://www.linkedin.com/company/akitabox/',
    logoUrl: 'https://logo.clearbit.com/akitabox.com',
    services: 'Facility Asset Lifecycle Management, Maintenance Management, Capital Planning, Inspections, AkitaBox Pulse Platform',
    revenue: '$6-12M',
    employeeCount: '40+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Award-winning facility management software serving healthcare, education, government, and real estate sectors. Founded 2015. Ranked #578 on Inc. 5000 list.',
    painPoints: 'Customer success workflows, implementation coordination, support scaling, product feedback loops, sales pipeline',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: 'Inc. 5000 Growth Demands Scalable Operations',
    customMessage: 'AkitaBox\'s Inc. 5000 ranking proves your facility management platform resonates. Our AI skills help scale that success—automating customer success workflows, coordinating implementations, and managing feedback to fuel continued growth.',
    contacts: [{ name: 'Matt Miszewski', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'EnsoData',
    industry: 'technology',
    companyType: 'Healthcare AI / Software',
    website: 'https://ensodata.com',
    linkedInUrl: 'https://www.linkedin.com/company/ensodata/',
    logoUrl: 'https://logo.clearbit.com/ensodata.com',
    services: 'AI-Powered Sleep Study Analysis, Waveform Signal Processing, FDA-Cleared Diagnostic Software, EnsoSleep Platform',
    revenue: '$17M',
    employeeCount: '71',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'First AI technology cleared to aid clinicians in sleep disorder diagnosis. EnsoSleep automates event detection with 90% agreement. Raised $51.5M including $20M Series B (June 2025).',
    painPoints: 'Clinical partner onboarding, regulatory compliance documentation, customer training, product development coordination',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'FDA-Cleared AI Meets Operational Excellence',
    customMessage: 'EnsoData pioneered FDA-cleared AI for sleep diagnostics. Our automation skills support your clinical partner onboarding, regulatory documentation, and product development coordination—so your team can focus on advancing sleep medicine.',
    contacts: [{ name: 'Justin Mortara', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Nordic Consulting Partners',
    industry: 'technology',
    companyType: 'Healthcare IT Consulting',
    website: 'https://nordicglobal.com',
    linkedInUrl: 'https://www.linkedin.com/company/nordic-consulting-partners/',
    logoUrl: 'https://logo.clearbit.com/nordicglobal.com',
    services: 'Epic EHR Consulting, Health IT Staffing, Strategic Advisory, Managed Services, Digital Transformation',
    revenue: '$210-272M',
    employeeCount: '1,000-1,300',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'Largest Epic consulting practice globally; serves 700+ healthcare clients. Acquired by Accrete Health Partners (2022). Named 2025 Major Contender in Everest Group assessment.',
    painPoints: 'Consultant deployment, project staffing, client engagement tracking, Epic certification management, delivery coordination',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Global Epic Leadership, Streamlined by AI',
    customMessage: 'As the largest Epic consulting practice globally, Nordic\'s operations must be flawless. Our AI skills optimize consultant deployment, track certifications, and coordinate delivery across 700+ clients—supporting your position as healthcare IT\'s trusted partner.',
    contacts: [{ name: 'Chris Dube', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Redox',
    industry: 'technology',
    companyType: 'Healthcare Data Platform',
    website: 'https://redoxengine.com',
    linkedInUrl: 'https://www.linkedin.com/company/redoxengine/',
    logoUrl: 'https://logo.clearbit.com/redoxengine.com',
    services: 'Healthcare Data Interoperability, EHR Integration Platform, API-Based Data Exchange, Healthcare Software Enablement',
    revenue: '$39-181M',
    employeeCount: '224',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Cloud-based platform connecting 6,700+ healthcare entities; processes 12M+ patient records daily. Serves 95% of US News Top Hospitals. Raised $98M total funding.',
    painPoints: 'Customer onboarding, integration support, API documentation, partner enablement, compliance tracking',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Connecting Healthcare at Scale—Now Optimize Your Operations',
    customMessage: 'Redox connects 6,700+ healthcare entities, processing 12M+ records daily. Our AI skills streamline customer onboarding, manage integration support, and track compliance—so your team can focus on healthcare\'s interoperability future.',
    contacts: [{ name: 'Luke Bonney', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Moxe Health',
    industry: 'technology',
    companyType: 'Healthcare Data Exchange',
    website: 'https://moxehealth.com',
    linkedInUrl: 'https://www.linkedin.com/company/moxe-health/',
    logoUrl: 'https://logo.clearbit.com/moxehealth.com',
    services: 'Clinical Data Exchange, Healthcare Data Interoperability, Payer-Provider Data Exchange, Care Management Solutions',
    revenue: '$8M',
    employeeCount: '87-112',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Streamlines bi-directional clinical data exchange for health plans and providers. Founded 2012. Raised $60.8M total funding. KLAS Award winner.',
    painPoints: 'Health plan onboarding, provider integration, data quality workflows, customer success, compliance documentation',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'KLAS Award-Winning Data Exchange, AI-Optimized',
    customMessage: 'Moxe\'s KLAS recognition validates your clinical data exchange leadership. Our AI skills accelerate health plan onboarding, streamline provider integrations, and ensure data quality—supporting your mission to simplify healthcare data sharing.',
    contacts: [{ name: 'Dan Wilson', title: 'CEO & Co-Founder', email: 'dan@moxehealth.com', isPrimary: true }],
  },
  {
    companyName: 'Raven Software',
    industry: 'technology',
    companyType: 'Video Game Development',
    website: 'https://ravensoftware.com',
    linkedInUrl: 'https://www.linkedin.com/company/raven-software/',
    logoUrl: 'https://logo.clearbit.com/ravensoftware.com',
    services: 'Video Game Development, Call of Duty Franchise Development, Game Engine Development',
    revenue: '$250-500M',
    employeeCount: '367',
    location: 'Middleton, WI',
    priority: 'MEDIUM',
    description: 'Founded 1990 in Middleton; part of Activision since 1997. Develops Call of Duty titles including Black Ops series. 35+ years in game development.',
    painPoints: 'Development pipeline coordination, QA workflow management, asset tracking, team collaboration across studios',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: '35 Years of Gaming Excellence, Streamlined',
    customMessage: 'From Middleton to global blockbusters, Raven Software defines gaming excellence. Our AI skills optimize development pipelines, coordinate QA workflows, and manage assets—supporting the creative teams behind Call of Duty\'s continued success.',
    contacts: [{ name: 'Brian Raffel', title: 'Studio Co-Head', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INSURANCE & FINANCIAL SERVICES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'M3 Insurance',
    industry: 'insurance',
    companyType: 'Insurance Brokerage',
    website: 'https://m3ins.com',
    linkedInUrl: 'https://www.linkedin.com/company/m3-insurance/',
    logoUrl: 'https://logo.clearbit.com/m3ins.com',
    services: 'Employee Benefits, Property & Casualty Insurance, Workers\' Compensation, Personal Lines, Risk Management, Retirement Plans',
    revenue: '$38-152M',
    employeeCount: '200-500',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Wisconsin\'s largest privately held insurance agency, founded 1968. Ranked in top 1% of insurance brokers nationwide. Five Wisconsin offices.',
    painPoints: 'Policy renewal workflows, benefits enrollment coordination, claims tracking, risk assessment documentation, client reporting',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Wisconsin\'s Largest Agency Deserves Top-Tier Automation',
    customMessage: 'M3\'s top 1% ranking reflects 55+ years of risk management excellence. Our AI skills streamline renewal workflows, coordinate benefits enrollment, and automate client reporting—helping Wisconsin\'s largest agency serve even more effectively.',
    contacts: [{ name: 'Mike Victorson', title: 'CEO', isPrimary: true }, { name: 'Sean LaBorde', title: 'COO' }],
  },
  {
    companyName: 'TRICOR Insurance',
    industry: 'insurance',
    companyType: 'Insurance Agency',
    website: 'https://tricorinsurance.com',
    linkedInUrl: 'https://www.linkedin.com/company/tricor/',
    logoUrl: 'https://logo.clearbit.com/tricorinsurance.com',
    services: 'Transportation Insurance, Healthcare Insurance, Construction Insurance, Home, Auto, Life Insurance',
    revenue: '$30M+',
    employeeCount: '300+',
    location: 'Lancaster, WI (Madison area)',
    priority: 'HIGH',
    description: 'Family-run insurance company founded 1945. Serves 50,000+ clients across Wisconsin, Iowa, Illinois. Great Place To Work Certified.',
    painPoints: 'Multi-line policy coordination, transportation compliance, client onboarding, claims processing, agency management',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Family Values Meet Modern Efficiency',
    customMessage: 'TRICOR\'s 80-year family legacy and Great Place To Work culture are worth protecting. Our AI skills modernize policy coordination, streamline transportation compliance, and accelerate claims—maintaining your personal touch while scaling service.',
    contacts: [{ name: 'John Keuler', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Neckerman Insurance Services',
    industry: 'insurance',
    companyType: 'Insurance Agency',
    website: 'https://neckerman.com',
    linkedInUrl: 'https://www.linkedin.com/company/neckerman-insurance-services/',
    logoUrl: 'https://logo.clearbit.com/neckerman.com',
    services: 'Business Insurance, Personal Insurance, Life Insurance, Disability Insurance',
    revenue: '$5-11M',
    employeeCount: '8-20',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: '107-year-old independent insurance agency. Partnered with McClone Insurance in 2022 to expand resources and services.',
    painPoints: 'Client relationship management, policy tracking, cross-selling workflows, partnership coordination',
    estimatedTimeSavings: '10-15 hrs',
    estimatedCostSavings: '$2,500-$6,000',
    customHeadline: 'A Century of Trust, Enhanced by AI',
    customMessage: 'Neckerman\'s 107-year legacy of trust is invaluable. Our AI skills enhance that heritage—managing client relationships, tracking policies, and coordinating with McClone partnership resources while preserving the personal service your clients expect.',
    contacts: [{ name: 'Alex Beyer', title: 'President', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT UNIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Summit Credit Union',
    industry: 'financial_services',
    companyType: 'Credit Union',
    website: 'https://summitcreditunion.com',
    linkedInUrl: 'https://www.linkedin.com/company/summit-credit-union/',
    logoUrl: 'https://logo.clearbit.com/summitcreditunion.com',
    services: 'Checking & Savings, Credit Cards, Mortgages, Auto Loans, Student Loans, Investments, Member Services',
    revenue: '$7.9B assets',
    employeeCount: '947',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Largest credit union in Wisconsin, founded 1935. Member-owned with 273,360+ members and 58 locations. Named America\'s Best Regional Credit Union by Newsweek.',
    painPoints: 'Member onboarding, loan processing workflows, branch coordination, digital banking support, compliance documentation',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Wisconsin\'s Best Credit Union, AI-Empowered',
    customMessage: 'Newsweek\'s Best Regional Credit Union recognition reflects Summit\'s member-first mission. Our AI skills streamline loan processing, coordinate 58 branches, and enhance digital banking—serving 273,000+ members even more effectively.',
    contacts: [{ name: 'Kim Sponem', title: 'President & CEO', email: 'kim.sponem@summitcreditunion.com', isPrimary: true }],
  },
  {
    companyName: 'UW Credit Union',
    industry: 'financial_services',
    companyType: 'Credit Union',
    website: 'https://uwcu.org',
    linkedInUrl: 'https://www.linkedin.com/company/uw-credit-union/',
    logoUrl: 'https://logo.clearbit.com/uwcu.org',
    services: 'Checking & Savings, Credit Cards, Mortgages, Auto Loans, Student Loans, Investments, Financial Services',
    revenue: '$5.6B assets',
    employeeCount: '827-900',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'University of Wisconsin Credit Union founded 1931. Nonprofit with 366,000+ members. Fourth largest credit union in Wisconsin. 31 full-service branches.',
    painPoints: 'Student member services, campus coordination, loan origination, member communication, digital channel management',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Serving 366,000+ Members with AI Efficiency',
    customMessage: 'UW Credit Union\'s 90+ year commitment to member service is legendary. Our AI skills enhance loan origination, coordinate campus services, and manage digital channels—helping you serve students and community members across Wisconsin.',
    contacts: [{ name: 'Paul Kundert', title: 'President & CEO', email: 'pkundert@uwcu.org', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTHCARE ORGANIZATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Group Health Cooperative of South Central Wisconsin',
    industry: 'healthcare',
    companyType: 'Integrated Healthcare',
    website: 'https://ghcscw.com',
    linkedInUrl: 'https://www.linkedin.com/company/group-health-cooperative-of-south-central-wisconsin/',
    logoUrl: 'https://logo.clearbit.com/ghcscw.com',
    services: 'Health Insurance, Primary Care, Specialty Care, Integrated Health Care Services',
    revenue: '$505M',
    employeeCount: '500+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Not-for-profit managed health care organization. Known for nationally-ranked Primary Care Clinics integrated with insurance arm. Holds "Excellent" accreditation.',
    painPoints: 'Care coordination, claims processing, member communication, provider scheduling, quality reporting',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Integrated Care Excellence, AI-Optimized',
    customMessage: 'GHC-SCW\'s integrated care model and "Excellent" accreditation set the standard. Our AI skills enhance care coordination, streamline claims, and automate quality reporting—supporting your mission to deliver nationally-ranked primary care.',
    contacts: [{ name: 'Mark Huth', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Dental Health Associates of Madison',
    industry: 'healthcare',
    companyType: 'Dental Practice Group',
    website: 'https://dhamadison.com',
    linkedInUrl: 'https://www.linkedin.com/company/dental-health-associates-of-madison/',
    logoUrl: 'https://logo.clearbit.com/dhamadison.com',
    services: 'Family Dental Services, Specialty Dental Care, General Dentistry',
    revenue: '$37M',
    employeeCount: '30+ providers',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Locally owned dental practice serving Madison for 50+ years. Operates 7 clinic locations. 100% owned by current practicing dentists.',
    painPoints: 'Multi-location scheduling, patient communication, insurance verification, treatment planning, provider coordination',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: '50 Years of Smiles, Streamlined by AI',
    customMessage: 'DHA\'s dentist-owned model ensures patient-first care across 7 locations. Our AI skills optimize multi-location scheduling, automate patient communication, and streamline insurance verification—so your providers can focus on creating healthy smiles.',
    contacts: [{ name: 'Dr. Chad Plein', title: 'Managing Partner', isPrimary: true }],
  },
  {
    companyName: 'Capitol Physical Therapy',
    industry: 'healthcare',
    companyType: 'Physical Therapy',
    website: 'https://capitolphysicaltherapy.com',
    linkedInUrl: 'https://www.linkedin.com/company/capitol-physical-therapy/',
    logoUrl: 'https://logo.clearbit.com/capitolphysicaltherapy.com',
    services: 'Physical Therapy, Rehabilitation Services, Research-Based Treatments, Innovative Therapy Technologies',
    revenue: '$10M+',
    employeeCount: '82',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Wisconsin-based private physical therapy practice group, member of Confluent Health family. Founded 2004. Operates 6 locations across Dane County.',
    painPoints: 'Patient scheduling across locations, treatment documentation, insurance authorization, outcome tracking, therapist coordination',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: 'Research-Based Rehab Meets Intelligent Operations',
    customMessage: 'Capitol PT\'s evidence-based approach and Best of Madison recognition reflect clinical excellence. Our AI skills handle scheduling, documentation, and outcome tracking—letting your therapists focus on research-driven patient care.',
    contacts: [{ name: 'Dan Erdman', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Quartz Health Solutions',
    industry: 'healthcare',
    companyType: 'Health Plan Administration',
    website: 'https://quartzbenefits.com',
    linkedInUrl: 'https://www.linkedin.com/company/quartz-health-solutions/',
    logoUrl: 'https://logo.clearbit.com/quartzbenefits.com',
    services: 'Third-Party Health Plan Services, Health Insurance Plan Management, Self-Funded Health Plan Administration, Provider Network Management',
    revenue: '$423-905M',
    employeeCount: '744-1,120',
    location: 'Madison, WI (Sauk City HQ)',
    priority: 'MEDIUM',
    description: 'Founded 1994. Provider-owned by Gundersen Health System, UW Health, UnityPoint Health, and Advocate Aurora Health. Manages services for 350,000+ customers.',
    painPoints: 'Claims adjudication, provider network coordination, customer service, enrollment processing, compliance reporting',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Provider-Owned Excellence, AI-Enhanced',
    customMessage: 'Quartz\'s unique provider ownership model aligns incentives for quality care. Our AI skills accelerate claims processing, coordinate networks, and streamline enrollment—supporting 350,000+ members with the efficiency your ownership structure enables.',
    contacts: [{ name: 'Terry Ebert', title: 'President & CEO', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTION COMPANIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'The Boldt Company',
    industry: 'construction',
    companyType: 'Construction / Development',
    website: 'https://boldt.com',
    linkedInUrl: 'https://www.linkedin.com/company/the-boldt-company/',
    logoUrl: 'https://logo.clearbit.com/boldt.com',
    services: 'General Contracting, Construction Management, Design-Build, Real Estate Development, Integrated Project Delivery',
    revenue: '$5B',
    employeeCount: '1,100',
    location: 'Madison, WI (Appleton HQ)',
    priority: 'HIGH',
    description: 'Fourth-generation family- and employee-owned construction services firm founded 1889. Pioneer in Lean construction and industrialized construction. Madison office at 660 John Nolen Drive.',
    painPoints: 'Lean construction workflows, subcontractor coordination, project documentation, safety management, resource allocation',
    estimatedTimeSavings: '20-35 hrs',
    estimatedCostSavings: '$5,000-$14,000',
    customHeadline: 'Lean Construction Pioneer Meets AI Efficiency',
    customMessage: 'Boldt pioneered Lean construction across 135 years. Our AI skills amplify that efficiency—automating subcontractor coordination, streamlining documentation, and optimizing resource allocation across your global operations.',
    contacts: [{ name: 'Greg Sabel', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'JP Cullen',
    industry: 'construction',
    companyType: 'Construction',
    website: 'https://jpcullen.com',
    linkedInUrl: 'https://www.linkedin.com/company/jpcullen/',
    logoUrl: 'https://logo.clearbit.com/jpcullen.com',
    services: 'General Contracting, Healthcare Construction, Masonry, Industrial, Steel Erection, Food Services, Prefabrication, Historic Restoration',
    revenue: '$850M+',
    employeeCount: '750+',
    location: 'Janesville, WI (Madison office)',
    priority: 'HIGH',
    description: 'Full-service construction company founded 1892. Five generations in business. Madison office at 1 S. Pinckney Street. Serves Wisconsin, Northern Illinois, and nationwide.',
    painPoints: 'Healthcare construction compliance, prefabrication coordination, historic preservation documentation, multi-trade scheduling',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Five Generations of Excellence, Now AI-Accelerated',
    customMessage: 'JP Cullen has built trust for 130+ years across healthcare, education, and historic restoration. Our AI skills modernize prefabrication coordination, compliance tracking, and scheduling—honoring your legacy with tomorrow\'s efficiency.',
    contacts: [{ name: 'George Cullen', title: 'Chairman & CEO', isPrimary: true }, { name: 'Jeannie Cullen Schultz', title: 'President' }],
  },
  {
    companyName: 'Vogel Bros. Building Co.',
    industry: 'construction',
    companyType: 'Construction',
    website: 'https://vogelbldg.com',
    linkedInUrl: 'https://www.linkedin.com/company/vogel-bros--building-co-/',
    logoUrl: 'https://logo.clearbit.com/vogelbldg.com',
    services: 'Construction Services, Education, Healthcare, Civic, Commercial, Industrial, Water Treatment',
    revenue: '$29M',
    employeeCount: '120',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Fifth-generation construction services company founded 1875. Headquarters in Madison. Award-winning builder in education, healthcare, and civic sectors.',
    painPoints: 'Project bidding workflows, subcontractor management, civic project documentation, safety compliance, quality tracking',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Building Madison Since 1875, Now AI-Enhanced',
    customMessage: 'Vogel Bros. has shaped Madison for nearly 150 years. Our AI skills support your award-winning work—streamlining bidding, managing subcontractors, and tracking quality across education, healthcare, and civic projects.',
    contacts: [{ name: 'Peter C. Vogel', title: 'President', isPrimary: true }],
  },
  {
    companyName: 'Kraemer Brothers',
    industry: 'construction',
    companyType: 'Construction',
    website: 'https://kraemerbrothers.com',
    linkedInUrl: 'https://www.linkedin.com/company/kraemer-brothers/',
    logoUrl: 'https://logo.clearbit.com/kraemerbrothers.com',
    services: 'General Contracting, Construction Management, Design-Build, Concrete, Masonry, Steel Erection, Carpentry',
    revenue: '$100M+',
    employeeCount: '200',
    location: 'Plain, WI',
    priority: 'HIGH',
    description: 'Construction leader founded 1948. Self-performs all concrete, masonry, steel, and carpentry work. Serves healthcare, life sciences, retail, hospitality, education, and manufacturing.',
    painPoints: 'Self-performed trade coordination, life sciences compliance, material scheduling, crew allocation, project reporting',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Self-Performed Excellence Meets Smart Automation',
    customMessage: 'Kraemer\'s self-performed model delivers quality control few can match. Our AI skills optimize trade coordination, schedule materials, and allocate crews—enhancing your unique integrated approach across healthcare and life sciences projects.',
    contacts: [{ name: 'Jim Kraemer', title: 'President & CEO', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IT SERVICES & TECHNOLOGY SOLUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Heartland Business Systems',
    industry: 'technology',
    companyType: 'IT Services / MSP',
    website: 'https://hbs.net',
    linkedInUrl: 'https://www.linkedin.com/company/heartland-business-systems/',
    logoUrl: 'https://logo.clearbit.com/hbs.net',
    services: 'IT Services & Consulting, Technology Solutions, Managed IT Services, Microsoft, Cisco, HPE, Lenovo Partnerships',
    revenue: '$500M+',
    employeeCount: '200-500',
    location: 'Madison, WI (Little Chute HQ)',
    priority: 'HIGH',
    description: 'Full-service technology solutions partner founded 1992. Madison office at 2810 Crossroads Dr. Serves corporate, healthcare, education, government, nonprofits, and SMBs.',
    painPoints: 'Multi-vendor coordination, service ticket management, project delivery, customer success, technology procurement',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: 'Technology Partner Excellence, AI-Optimized',
    customMessage: 'HBS delivers comprehensive technology solutions across vendors and industries. Our AI skills streamline service tickets, coordinate multi-vendor projects, and enhance customer success—supporting your mission to transform client operations.',
    contacts: [{ name: 'John Drzewiecki', title: 'CEO', isPrimary: true }],
  },
  {
    companyName: 'Clarity Technology Solutions',
    industry: 'technology',
    companyType: 'Managed Services Provider',
    website: 'https://claritytech.com',
    linkedInUrl: 'https://www.linkedin.com/company/clarity-technology-group-inc/',
    logoUrl: 'https://logo.clearbit.com/claritytech.com',
    services: 'Managed IT Services, Network Consulting & Engineering, Remote/Onsite Support, Backup/Disaster Recovery, Web Development',
    revenue: '$5M+',
    employeeCount: '25+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Managed services provider serving 100+ clients since 1999. Specializes in medical, financial, legal, manufacturing, and engineering sectors.',
    painPoints: 'Ticket prioritization, compliance documentation, client onboarding, proactive monitoring, project coordination',
    estimatedTimeSavings: '12-20 hrs',
    estimatedCostSavings: '$3,000-$8,000',
    customHeadline: '25 Years of IT Excellence, Now AI-Powered',
    customMessage: 'Clarity has served 100+ Madison clients across regulated industries since 1999. Our AI skills enhance compliance documentation, ticket prioritization, and proactive monitoring—delivering the responsiveness your medical and financial clients demand.',
    contacts: [{ name: 'Tom Klink', title: 'President', isPrimary: true }],
  },
  {
    companyName: 'Applied Tech',
    industry: 'technology',
    companyType: 'IT Services / Cybersecurity',
    website: 'https://appliedtech.us',
    linkedInUrl: 'https://www.linkedin.com/company/applied-tech/',
    logoUrl: 'https://logo.clearbit.com/appliedtech.us',
    services: 'Managed IT Support, Professional Services, Business Intelligence, Security & Recovery, Co-Managed IT, Cybersecurity',
    revenue: '$10M+',
    employeeCount: '50+',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1999 by Kurt Sippel. Full-service outsourced IT and cybersecurity provider. Offices in Madison, Milwaukee, Denver, and Wausau.',
    painPoints: 'Security incident response, multi-location coordination, compliance tracking, customer communication, service delivery',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Cybersecurity Excellence Meets Operational Efficiency',
    customMessage: 'Applied Tech protects businesses across four states. Our AI skills accelerate incident response, coordinate multi-office operations, and automate compliance tracking—so your security experts can focus on keeping clients safe.',
    contacts: [{ name: 'Kurt Sippel', title: 'Founder & CEO', isPrimary: true }],
  },
  {
    companyName: 'Gordon Flesch Company',
    industry: 'technology',
    companyType: 'Office Technology Solutions',
    website: 'https://gflesch.com',
    linkedInUrl: 'https://www.linkedin.com/company/gordon-flesch-company/',
    logoUrl: 'https://logo.clearbit.com/gflesch.com',
    services: 'Multifunction Devices, Copiers, Printers, Scanners, Production Print, IT Services, Equipment Leasing',
    revenue: '$200M+',
    employeeCount: '525',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Family-owned office technology solutions provider founded 1956. Serves WI, IL, IN, and OH. 11-time Canon U.S.A. Top Dollar Dealer. Charitable foundation has distributed nearly $1M.',
    painPoints: 'Equipment lifecycle management, service dispatching, lease administration, supplies fulfillment, customer retention',
    estimatedTimeSavings: '18-30 hrs',
    estimatedCostSavings: '$4,500-$12,000',
    customHeadline: '11-Time Canon Award Winner, AI-Enhanced',
    customMessage: 'Gordon Flesch\'s 11 Canon Top Dealer awards reflect 68 years of excellence. Our AI skills optimize equipment lifecycle management, streamline service dispatch, and enhance customer retention—supporting your charitable mission with operational efficiency.',
    contacts: [{ name: 'Patrick Flesch', title: 'President & CEO', isPrimary: true }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOSPITALITY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'The Edgewater Hotel',
    industry: 'hospitality',
    companyType: 'Luxury Hotel',
    website: 'https://theedgewater.com',
    linkedInUrl: 'https://www.linkedin.com/company/the-edgewater-madison/',
    logoUrl: 'https://logo.clearbit.com/theedgewater.com',
    services: 'Luxury Boutique Accommodations, Spa Services, Fine Dining, Weddings, Meetings & Events, Conferences',
    revenue: '$16M',
    employeeCount: '200-500',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Historic luxury boutique hotel founded 1948. Only AAA Four Diamond Award recipient in Dane County. Condé Nast Traveler Reader\'s Choice Award recipient.',
    painPoints: 'Event coordination, wedding planning workflows, guest experience management, spa scheduling, F&B operations',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'AAA Four Diamond Service, AI-Supported',
    customMessage: 'The Edgewater\'s AAA Four Diamond and Condé Nast recognition demand flawless execution. Our AI skills coordinate events, streamline wedding planning, and optimize F&B operations—supporting the luxury experience Madison\'s landmark hotel is known for.',
    contacts: [{ name: 'Judy Mullins', title: 'General Manager', isPrimary: true }],
  },
  {
    companyName: 'Madison Concourse Hotel',
    industry: 'hospitality',
    companyType: 'Convention Hotel',
    website: 'https://concoursehotel.com',
    linkedInUrl: 'https://www.linkedin.com/company/madisonconcoursehotel/',
    logoUrl: 'https://logo.clearbit.com/concoursehotel.com',
    services: 'Hotel Accommodations, Conventions, Meetings & Events, Conference Center Operations, Fine Dining',
    revenue: '$25M',
    employeeCount: '90',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'Founded 1992. City\'s largest convention hotel with 373 guest rooms and 27,000 sq ft of meeting space. Ranked "Best Service" and "Best Conference Center" by Wisconsin Meetings.',
    painPoints: 'Convention coordination, room block management, catering logistics, group billing, attendee communication',
    estimatedTimeSavings: '15-25 hrs',
    estimatedCostSavings: '$3,750-$10,000',
    customHeadline: 'Wisconsin\'s Best Conference Center, Streamlined',
    customMessage: 'The Concourse\'s "Best Conference Center" recognition and 7-year average employee tenure reflect operational excellence. Our AI skills enhance convention coordination, manage room blocks, and streamline group billing—supporting your 27,000 sq ft of meeting success.',
    contacts: [{ name: 'Greg Urban', title: 'General Manager', isPrimary: true }],
  },
];
