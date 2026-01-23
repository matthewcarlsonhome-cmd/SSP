/**
 * Admin Service - User Roles, Email Capture, and Skill Usage Tracking
 *
 * This module handles:
 * - User role management (Free, Pro, Team, Custom)
 * - Email capture from Google sign-ins
 * - Skill usage tracking per user
 * - Admin operations and configuration
 */

import { supabase, getCurrentUser } from './supabase';
import type {
  UserRole,
  RoleConfig,
  RoleFeatures,
  RoleLimits,
  AppUser,
  SkillUsageRecord,
  CapturedEmail,
  DEFAULT_ROLE_CONFIGS,
} from './storage/types';
import { DEFAULT_ROLE_CONFIGS as DefaultConfigs } from './storage/types';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS
// For storing admin data when Supabase is not available
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  CURRENT_USER: 'skillengine_current_user',
  ROLE_CONFIGS: 'skillengine_role_configs',
  CAPTURED_EMAILS: 'skillengine_captured_emails',
  SKILL_USAGE: 'skillengine_skill_usage',
  ADMIN_EMAILS: 'skillengine_admin_emails',
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN EMAILS - Who can access the admin panel
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_ADMIN_EMAILS: string[] = [
  // Add your email here to be an admin (fallback if Supabase not configured)
];

// Cache for admin emails fetched from Supabase
let cachedAdminEmails: string[] | null = null;
let adminEmailsCacheTime = 0;
const ADMIN_EMAILS_CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear admin emails cache - useful for testing
 */
export function clearAdminEmailsCache(): void {
  cachedAdminEmails = null;
  adminEmailsCacheTime = 0;
}

/**
 * Get admin emails from localStorage (fallback)
 */
export function getAdminEmailsFromLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_EMAILS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Error loading admin emails', { error: e instanceof Error ? e.message : String(e) });
  }
  return DEFAULT_ADMIN_EMAILS;
}

/**
 * Get admin emails - sync version (uses cached/localStorage)
 */
export function getAdminEmails(): string[] {
  // Return cached if still valid
  if (cachedAdminEmails && Date.now() - adminEmailsCacheTime < ADMIN_EMAILS_CACHE_TTL) {
    return cachedAdminEmails;
  }
  return getAdminEmailsFromLocalStorage();
}

/**
 * Fetch admin emails from Supabase
 */
export async function getAdminEmailsFromSupabase(): Promise<string[]> {
  if (!supabase) return [];

  try {
    // Add a timeout to prevent hanging if table doesn't exist
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const { data, error } = await supabase
      .from('admin_settings')
      .select('admin_emails')
      .eq('id', 'default')
      .single()
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      // Don't log as error if table just doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        logger.warn('admin_settings table does not exist yet');
      } else {
        logger.warn('Error fetching admin emails from Supabase', { error: error.message });
      }
      return [];
    }

    const emails = (data?.admin_emails || []) as string[];
    // Update cache
    cachedAdminEmails = emails;
    adminEmailsCacheTime = Date.now();
    // Also sync to localStorage
    if (emails.length > 0) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_EMAILS, JSON.stringify(emails));
    }
    return emails;
  } catch (e) {
    // Handle abort/timeout gracefully
    if (e instanceof Error && e.name === 'AbortError') {
      logger.warn('Admin emails fetch timed out');
    } else {
      logger.error('Exception fetching admin emails', { error: e instanceof Error ? e.message : String(e) });
    }
    return [];
  }
}

/**
 * Save admin emails to Supabase
 */
export async function saveAdminEmailsToSupabase(emails: string[]): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        id: 'default',
        admin_emails: emails,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('Error saving admin emails to Supabase', { error: error.message });
      return false;
    }

    // Update cache
    cachedAdminEmails = emails;
    adminEmailsCacheTime = Date.now();
    return true;
  } catch (e) {
    logger.error('Exception saving admin emails', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

/**
 * Set admin emails (saves to both localStorage and Supabase)
 */
export function setAdminEmails(emails: string[]): void {
  localStorage.setItem(STORAGE_KEYS.ADMIN_EMAILS, JSON.stringify(emails));
  // Also save to Supabase (fire and forget)
  saveAdminEmailsToSupabase(emails);
  // Update cache
  cachedAdminEmails = emails;
  adminEmailsCacheTime = Date.now();
}

/**
 * Check if email is admin (sync version)
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.some(e => e.toLowerCase() === email.toLowerCase());
}

/**
 * Check if email is admin (async - checks Supabase first)
 */
export async function isAdminEmailAsync(email: string): Promise<boolean> {
  // First try Supabase
  if (supabase) {
    const supabaseEmails = await getAdminEmailsFromSupabase();
    if (supabaseEmails.length > 0) {
      return supabaseEmails.some(e => e.toLowerCase() === email.toLowerCase());
    }
  }
  // Fallback to localStorage
  return isAdminEmail(email);
}

/**
 * Check if user has admin status in their profile (Supabase)
 */
export async function checkProfileAdminStatus(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    // Add a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      // Handle missing column gracefully
      if (error.message?.includes('is_admin') || error.code === '42703') {
        logger.warn('is_admin column does not exist in profiles table yet');
      } else if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.warn('Error checking profile admin status', { error: error.message });
      }
      return false;
    }

    return data?.is_admin === true;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      logger.warn('Profile admin check timed out');
    } else {
      logger.error('Exception checking profile admin', { error: e instanceof Error ? e.message : String(e) });
    }
    return false;
  }
}

/**
 * Set user as admin in their profile
 */
export async function setProfileAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      logger.error('Error setting profile admin status', { error: error.message });
      return false;
    }

    return true;
  } catch (e) {
    logger.error('Exception setting profile admin', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

/**
 * Check if admin setup has been completed (at least one admin email configured)
 * Used for bootstrap - allows first user to access Settings tab to set up admin
 */
export function hasAdminSetup(): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.length > 0;
}

/**
 * Initialize admin check - call this on auth to sync admin status
 */
export async function initializeAdminStatus(userId: string, email: string): Promise<boolean> {
  // Check if email is in admin list (Supabase first, then localStorage)
  const isAdmin = await isAdminEmailAsync(email);

  if (isAdmin) {
    // Set admin status in profile
    await setProfileAdminStatus(userId, true);
  }

  return isAdmin;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE CONFIGURATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export function getRoleConfigs(): RoleConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ROLE_CONFIGS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Error loading role configs', { error: e instanceof Error ? e.message : String(e) });
  }
  return DefaultConfigs;
}

export function saveRoleConfigs(configs: RoleConfig[]): void {
  localStorage.setItem(STORAGE_KEYS.ROLE_CONFIGS, JSON.stringify(configs));
}

export function getRoleConfig(role: UserRole): RoleConfig {
  const configs = getRoleConfigs();
  return configs.find(c => c.role === role) || configs[0];
}

export function updateRoleConfig(role: UserRole, updates: Partial<RoleConfig>): void {
  const configs = getRoleConfigs();
  const index = configs.findIndex(c => c.role === role);
  if (index >= 0) {
    configs[index] = { ...configs[index], ...updates };
    saveRoleConfigs(configs);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export function getCurrentAppUser(): AppUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Error loading current user', { error: e instanceof Error ? e.message : String(e) });
  }
  return null;
}

export function saveCurrentAppUser(user: AppUser): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function createAppUser(
  id: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
): AppUser {
  const isAdmin = isAdminEmail(email);

  const user: AppUser = {
    id,
    email,
    displayName,
    avatarUrl,
    role: isAdmin ? 'custom' : 'free',
    roleAssignedAt: new Date().toISOString(),
    skillRunsToday: 0,
    skillRunsThisMonth: 0,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isAdmin,
  };

  return user;
}

export function updateUserRole(userId: string, newRole: UserRole): void {
  const user = getCurrentAppUser();
  if (user && user.id === userId) {
    user.role = newRole;
    user.roleAssignedAt = new Date().toISOString();
    saveCurrentAppUser(user);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL CAPTURE
// ═══════════════════════════════════════════════════════════════════════════

export function getCapturedEmails(): CapturedEmail[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CAPTURED_EMAILS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Error loading captured emails', { error: e instanceof Error ? e.message : String(e) });
  }
  return [];
}

export function saveCapturedEmails(emails: CapturedEmail[]): void {
  localStorage.setItem(STORAGE_KEYS.CAPTURED_EMAILS, JSON.stringify(emails));
}

export function captureEmail(
  email: string,
  displayName?: string,
  userId?: string,
  source: 'google' | 'email' | 'manual' = 'google'
): CapturedEmail {
  const emails = getCapturedEmails();
  const existing = emails.find(e => e.email.toLowerCase() === email.toLowerCase());

  const now = new Date().toISOString();

  if (existing) {
    // Update existing record
    existing.lastSeenAt = now;
    existing.loginCount += 1;
    if (displayName) existing.displayName = displayName;
    if (userId) existing.userId = userId;
    saveCapturedEmails(emails);
    return existing;
  }

  // Create new record
  const captured: CapturedEmail = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    displayName,
    source,
    userId,
    firstSeenAt: now,
    lastSeenAt: now,
    loginCount: 1,
    skillsUsed: 0,
    followUpStatus: 'pending',
  };

  emails.push(captured);
  saveCapturedEmails(emails);

  return captured;
}

export function updateCapturedEmail(
  email: string,
  updates: Partial<CapturedEmail>
): void {
  const emails = getCapturedEmails();
  const index = emails.findIndex(e => e.email.toLowerCase() === email.toLowerCase());

  if (index >= 0) {
    emails[index] = { ...emails[index], ...updates };
    saveCapturedEmails(emails);
  }
}

export function deleteCapturedEmail(email: string): void {
  const emails = getCapturedEmails();
  const filtered = emails.filter(e => e.email.toLowerCase() !== email.toLowerCase());
  saveCapturedEmails(filtered);
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export function getSkillUsageRecords(): SkillUsageRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SKILL_USAGE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Error loading skill usage', { error: e instanceof Error ? e.message : String(e) });
  }
  return [];
}

export function saveSkillUsageRecords(records: SkillUsageRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.SKILL_USAGE, JSON.stringify(records));
}

export function trackSkillUsage(
  userId: string,
  userEmail: string,
  skillId: string,
  skillName: string,
  skillSource: 'static' | 'dynamic' | 'community'
): void {
  const records = getSkillUsageRecords();
  const now = new Date().toISOString();

  // Find existing record for this user + skill combo
  const existing = records.find(
    r => r.userId === userId && r.skillId === skillId
  );

  if (existing) {
    existing.usageCount += 1;
    existing.lastUsedAt = now;
  } else {
    records.push({
      id: crypto.randomUUID(),
      userId,
      userEmail,
      skillId,
      skillName,
      skillSource,
      usageCount: 1,
      firstUsedAt: now,
      lastUsedAt: now,
    });
  }

  saveSkillUsageRecords(records);

  // Also update the captured email's skills count
  const emails = getCapturedEmails();
  const emailRecord = emails.find(e => e.email.toLowerCase() === userEmail.toLowerCase());
  if (emailRecord) {
    emailRecord.skillsUsed = records.filter(r => r.userEmail.toLowerCase() === userEmail.toLowerCase()).length;
    saveCapturedEmails(emails);
  }

  // Update user's daily/monthly runs
  const user = getCurrentAppUser();
  if (user && user.id === userId) {
    const today = new Date().toDateString();
    const lastRunDate = user.lastSkillRunAt ? new Date(user.lastSkillRunAt).toDateString() : null;

    // Reset daily count if it's a new day
    if (lastRunDate !== today) {
      user.skillRunsToday = 0;
    }

    // Reset monthly count if it's a new month
    const thisMonth = new Date().getMonth();
    const lastRunMonth = user.lastSkillRunAt ? new Date(user.lastSkillRunAt).getMonth() : -1;
    if (lastRunMonth !== thisMonth) {
      user.skillRunsThisMonth = 0;
    }

    user.skillRunsToday += 1;
    user.skillRunsThisMonth += 1;
    user.lastSkillRunAt = now;

    saveCurrentAppUser(user);
  }
}

export function getSkillUsageForUser(userId: string): SkillUsageRecord[] {
  const records = getSkillUsageRecords();
  return records
    .filter(r => r.userId === userId)
    .sort((a, b) => b.usageCount - a.usageCount);
}

export function getTopSkillsAcrossUsers(limit = 10): { skillId: string; skillName: string; totalUsage: number; uniqueUsers: number }[] {
  const records = getSkillUsageRecords();

  // Aggregate by skill
  const skillMap = new Map<string, { skillName: string; totalUsage: number; users: Set<string> }>();

  for (const record of records) {
    const existing = skillMap.get(record.skillId);
    if (existing) {
      existing.totalUsage += record.usageCount;
      existing.users.add(record.userId);
    } else {
      skillMap.set(record.skillId, {
        skillName: record.skillName,
        totalUsage: record.usageCount,
        users: new Set([record.userId]),
      });
    }
  }

  // Convert to array and sort
  return Array.from(skillMap.entries())
    .map(([skillId, data]) => ({
      skillId,
      skillName: data.skillName,
      totalUsage: data.totalUsage,
      uniqueUsers: data.users.size,
    }))
    .sort((a, b) => b.totalUsage - a.totalUsage)
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE GATING
// Check if current user can access a feature
// ═══════════════════════════════════════════════════════════════════════════

export function canUserAccessFeature(feature: keyof RoleFeatures): boolean {
  const user = getCurrentAppUser();
  if (!user) return true; // Allow anonymous access for now

  const config = getRoleConfig(user.role);
  return config.features[feature];
}

export function getUserRemainingLimit(limitType: keyof RoleLimits): number {
  const user = getCurrentAppUser();
  if (!user) return -1; // Unlimited for anonymous

  const config = getRoleConfig(user.role);
  const limit = config.limits[limitType];

  if (limit === -1) return -1; // Unlimited

  switch (limitType) {
    case 'skillRunsPerDay':
      return Math.max(0, limit - user.skillRunsToday);
    case 'skillRunsPerMonth':
      return Math.max(0, limit - user.skillRunsThisMonth);
    default:
      return limit;
  }
}

export function isWithinLimit(limitType: keyof RoleLimits, currentCount: number = 0): boolean {
  const user = getCurrentAppUser();
  if (!user) return true;

  const config = getRoleConfig(user.role);
  const limit = config.limits[limitType];

  if (limit === -1) return true; // Unlimited

  switch (limitType) {
    case 'skillRunsPerDay':
      return user.skillRunsToday < limit;
    case 'skillRunsPerMonth':
      return user.skillRunsThisMonth < limit;
    default:
      return currentCount < limit;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH INTEGRATION
// Call this when a user signs in
// ═══════════════════════════════════════════════════════════════════════════

export function handleUserSignIn(
  id: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
): AppUser {
  // Capture email for follow-up
  captureEmail(email, displayName, id, 'google');

  // Get or create app user
  let user = getCurrentAppUser();

  if (user && user.id === id) {
    // Existing user - update last login
    user.lastLoginAt = new Date().toISOString();
    user.displayName = displayName || user.displayName;
    user.avatarUrl = avatarUrl || user.avatarUrl;

    // Check if they should be admin
    if (isAdminEmail(email) && !user.isAdmin) {
      user.isAdmin = true;
      user.role = 'custom';
    }
  } else {
    // New user
    user = createAppUser(id, email, displayName, avatarUrl);
  }

  saveCurrentAppUser(user);
  return user;
}

export function handleUserSignOut(): void {
  // Keep the user data but mark as signed out
  // This preserves their role and usage history
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

export interface AdminStats {
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
  totalSkillRuns: number;
  emailsCaptures: number;
  emailsByStatus: Record<string, number>;
  topSkills: { skillId: string; skillName: string; totalUsage: number; uniqueUsers: number }[];
  recentSignups: CapturedEmail[];
}

export function getAdminStats(): AdminStats {
  const emails = getCapturedEmails();
  const usageRecords = getSkillUsageRecords();

  // Count users by role
  const usersByRole: Record<UserRole, number> = {
    free: 0,
    pro: 0,
    team: 0,
    custom: 0,
  };

  for (const email of emails) {
    const role = email.role || 'free';
    usersByRole[role] = (usersByRole[role] || 0) + 1;
  }

  // Count emails by follow-up status
  const emailsByStatus: Record<string, number> = {};
  for (const email of emails) {
    const status = email.followUpStatus || 'pending';
    emailsByStatus[status] = (emailsByStatus[status] || 0) + 1;
  }

  // Total skill runs
  const totalSkillRuns = usageRecords.reduce((sum, r) => sum + r.usageCount, 0);

  // Recent signups (last 30)
  const recentSignups = [...emails]
    .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime())
    .slice(0, 30);

  return {
    totalUsers: emails.length,
    usersByRole,
    totalSkillRuns,
    emailsCaptures: emails.length,
    emailsByStatus,
    topSkills: getTopSkillsAcrossUsers(10),
    recentSignups,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT DATA
// ═══════════════════════════════════════════════════════════════════════════

export function exportEmailsToCSV(): string {
  const emails = getCapturedEmails();

  const headers = ['Email', 'Display Name', 'Source', 'First Seen', 'Last Seen', 'Login Count', 'Skills Used', 'Status', 'Notes'];

  const rows = emails.map(e => [
    e.email,
    e.displayName || '',
    e.source,
    e.firstSeenAt,
    e.lastSeenAt,
    e.loginCount.toString(),
    e.skillsUsed.toString(),
    e.followUpStatus || 'pending',
    e.followUpNotes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function exportSkillUsageToCSV(): string {
  const records = getSkillUsageRecords();

  const headers = ['User Email', 'Skill ID', 'Skill Name', 'Source', 'Usage Count', 'First Used', 'Last Used'];

  const rows = records.map(r => [
    r.userEmail,
    r.skillId,
    r.skillName,
    r.skillSource,
    r.usageCount.toString(),
    r.firstUsedAt,
    r.lastUsedAt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED USER EXPORT WITH ONBOARDING DATA
// ═══════════════════════════════════════════════════════════════════════════

import {
  getAutomationInterestLabel,
  getRoleCategoryLabel,
  getWorkflowCategoryLabel,
} from './onboardingConfig';

/**
 * Get all users with their full profile data including onboarding
 */
export function getAllUsersWithProfiles(): AppUser[] {
  // In localStorage mode, we only have the current user
  // In a real implementation, this would fetch from Supabase
  const currentUser = getCurrentAppUser();
  if (currentUser) {
    return [currentUser];
  }
  return [];
}

/**
 * Export users with full profile and onboarding data to CSV
 */
export function exportUsersWithOnboardingToCSV(): string {
  const emails = getCapturedEmails();

  const headers = [
    'Email',
    'Display Name',
    'Role',
    'Automation Interest',
    'Role Categories',
    'Workflow Interests',
    'Onboarding Completed',
    'First Seen',
    'Last Seen',
    'Login Count',
    'Skills Used',
    'Status',
    'Email Opt-In',
  ];

  const rows = emails.map(e => {
    // Onboarding data is now stored directly in CapturedEmail
    return [
      e.email,
      e.displayName || '',
      e.role || 'free',
      e.automationInterest
        ? getAutomationInterestLabel(e.automationInterest)
        : 'Not set',
      e.roleCategories?.map(getRoleCategoryLabel).join('; ') || 'Not set',
      e.workflowInterests?.map(getWorkflowCategoryLabel).join('; ') || 'Not set',
      e.onboardingCompleted ? 'Yes' : 'No',
      e.firstSeenAt,
      e.lastSeenAt,
      e.loginCount.toString(),
      e.skillsUsed.toString(),
      e.followUpStatus || 'pending',
      e.hasOptedIn ? 'Yes' : 'Unknown',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Get user statistics by onboarding interest
 */
export function getOnboardingStats(): {
  byAutomationInterest: Record<string, number>;
  byRoleCategory: Record<string, number>;
  byWorkflowInterest: Record<string, number>;
  onboardingCompletionRate: number;
} {
  const emails = getCapturedEmails();

  // Aggregate stats from all captured emails (onboarding data is now stored in CapturedEmail)
  const byAutomationInterest: Record<string, number> = {};
  const byRoleCategory: Record<string, number> = {};
  const byWorkflowInterest: Record<string, number> = {};
  let completedOnboarding = 0;

  for (const email of emails) {
    // Count completed onboarding
    if (email.onboardingCompleted) {
      completedOnboarding++;
    }

    // Count by automation interest
    if (email.automationInterest) {
      const label = getAutomationInterestLabel(email.automationInterest);
      byAutomationInterest[label] = (byAutomationInterest[label] || 0) + 1;
    }

    // Count by role categories
    if (email.roleCategories) {
      for (const role of email.roleCategories) {
        const label = getRoleCategoryLabel(role);
        byRoleCategory[label] = (byRoleCategory[label] || 0) + 1;
      }
    }

    // Count by workflow interests
    if (email.workflowInterests) {
      for (const workflow of email.workflowInterests) {
        const label = getWorkflowCategoryLabel(workflow);
        byWorkflowInterest[label] = (byWorkflowInterest[label] || 0) + 1;
      }
    }
  }

  return {
    byAutomationInterest,
    byRoleCategory,
    byWorkflowInterest,
    onboardingCompletionRate: emails.length > 0 ? (completedOnboarding / emails.length) * 100 : 0,
  };
}
