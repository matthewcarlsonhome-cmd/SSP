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
  },
  {
    companyName: 'Madison Marketing Group',
    industry: 'marketing_advertising',
    companyType: 'B2B Digital Marketing Agency',
    website: 'https://madisonmarketing.com',
    linkedInUrl: 'https://www.linkedin.com/company/madison-marketing-group/',
    logoUrl: 'https://logo.clearbit.com/madisonmarketing.com',
    services: 'HubSpot Services, Inbound Content, Digital Ads, B2B Lead Gen, Website Design, RevOps',
    revenue: '$2-5M',
    employeeCount: '11-50',
    location: 'Madison, WI',
    priority: 'HIGH',
    description: 'HubSpot Platinum Partner since 2011. B2B focused, complex industries. Strong inbound methodology.',
    painPoints: 'HubSpot portal management across clients, lead nurture optimization, B2B reporting, content pipeline management',
    estimatedTimeSavings: '17-30 hrs',
    estimatedCostSavings: '$4,300-$12,000',
    customHeadline: 'Supercharge Your HubSpot Operations with AI',
    customMessage: 'As a HubSpot Platinum Partner, you know the power of automation. Now amplify it with AI skills designed for B2B lead nurturing, content pipeline acceleration, and RevOps optimization—perfectly aligned with your inbound methodology.',
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
    description: 'Founded 1956, 8 radio stations + digital. HubSpot user. Strong community engagement. Radio+digital hybrid unique position.',
    painPoints: 'Radio ad trafficking, cross-channel attribution (radio+digital), lead routing, event marketing follow-up',
    estimatedTimeSavings: '21-37 hrs',
    estimatedCostSavings: '$5,250-$14,800',
    customHeadline: 'Bridge Radio and Digital with Intelligent Automation',
    customMessage: 'Since 1956, you\'ve connected Madison through 8 radio stations. Now bridge traditional and digital with AI that handles cross-channel attribution, radio ad trafficking, and event follow-up—amplifying your unique hybrid advantage.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM PRIORITY - MARKETING AGENCIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: '6AM Marketing',
    industry: 'marketing_advertising',
    companyType: 'Healthcare Marketing Agency',
    website: '6ammarketing.com',
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
  },
  {
    companyName: 'Rippe Keane Marketing (Market Crafters)',
    industry: 'marketing_advertising',
    companyType: 'Branding Agency',
    website: 'rippekeane.com',
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
  },
  {
    companyName: 'The Creative Company',
    industry: 'marketing_advertising',
    companyType: 'PR & Digital Agency',
    website: 'thecreativecompany.com',
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
  },
  {
    companyName: 'Sortis Digital Marketing',
    industry: 'marketing_advertising',
    companyType: 'Digital Marketing Agency',
    website: 'sortismarketing.com',
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
  },
  {
    companyName: 'Boost Local',
    industry: 'marketing_advertising',
    companyType: 'Local SEO Agency',
    website: 'boostlocal.com',
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
  },
  {
    companyName: 'Colony Spark',
    industry: 'marketing_advertising',
    companyType: 'Content Marketing Agency',
    website: 'colonyspark.com',
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
  },
  {
    companyName: 'Aspect Marketing',
    industry: 'marketing_advertising',
    companyType: 'Digital Marketing Agency',
    website: 'aspectmarketing.com',
    logoUrl: 'https://logo.clearbit.com/aspectmarketing.com',
    services: 'Digital Marketing, HubSpot Services, Brand Strategy',
    revenue: '$1-3M',
    employeeCount: '10-20',
    location: 'Madison, WI',
    priority: 'MEDIUM',
    description: 'HubSpot-certified. Brand + web experience optimization focus.',
    painPoints: 'HubSpot workflow optimization, reporting, brand asset management',
    estimatedTimeSavings: '9-14 hrs',
    estimatedCostSavings: '$2,250-$5,600',
  },
  {
    companyName: 'Ideas That Evoke',
    industry: 'marketing_advertising',
    companyType: 'Recruitment Marketing Agency',
    website: 'ideasthatevoke.com',
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
  },
  {
    companyName: 'Findorff (J.H. Findorff & Son)',
    industry: 'construction',
    companyType: 'Construction',
    website: 'findorff.com',
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
  },
  {
    companyName: 'Stark Company Realtors',
    industry: 'real_estate',
    companyType: 'Real Estate',
    website: 'starkhomes.com',
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
  },
  {
    companyName: 'Zimbrick Automotive Group',
    industry: 'automotive',
    companyType: 'Automotive Retail',
    website: 'zimbrick.com',
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
  },
  {
    companyName: 'National Guardian Life (NGL)',
    industry: 'insurance',
    companyType: 'Insurance',
    website: 'nglic.com',
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
  },
  {
    companyName: 'First Weber Realtors',
    industry: 'real_estate',
    companyType: 'Real Estate',
    website: 'firstweber.com',
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
  },
  {
    companyName: 'Gorman & Company',
    industry: 'real_estate',
    companyType: 'Real Estate Development',
    website: 'gormanusa.com',
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
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM PRIORITY - MADISON BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    companyName: 'Exact Sciences',
    industry: 'biotechnology',
    companyType: 'Biotechnology / Healthcare',
    website: 'exactsciences.com',
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
  },
  {
    companyName: 'American Family Insurance',
    industry: 'insurance',
    companyType: 'Insurance / Financial Services',
    website: 'amfam.com',
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
  },
  {
    companyName: 'Esker (US HQ)',
    industry: 'technology',
    companyType: 'Software / Process Automation',
    website: 'esker.com',
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
  },
  {
    companyName: 'WPS Health Solutions',
    industry: 'healthcare',
    companyType: 'Healthcare / Insurance',
    website: 'wpshealthsolutions.com',
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
  },
  {
    companyName: 'Alliant Energy',
    industry: 'utilities',
    companyType: 'Utilities / Energy',
    website: 'alliantenergy.com',
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
  },
  {
    companyName: 'QBE North America (Madison Office)',
    industry: 'insurance',
    companyType: 'Insurance',
    website: 'qbe.com',
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
];
