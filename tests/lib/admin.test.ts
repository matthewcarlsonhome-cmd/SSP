/**
 * Tests for lib/admin.ts
 *
 * Tests cover:
 * - Admin email management
 * - Role configuration
 * - User management
 * - Email capture
 * - Skill usage tracking
 * - Feature gating
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAdminEmails,
  setAdminEmails,
  isAdminEmail,
  hasAdminSetup,
  getRoleConfigs,
  saveRoleConfigs,
  getRoleConfig,
  getCurrentAppUser,
  saveCurrentAppUser,
  createAppUser,
  captureEmail,
  getCapturedEmails,
  updateCapturedEmail,
  deleteCapturedEmail,
  trackSkillUsage,
  getSkillUsageRecords,
  getSkillUsageForUser,
  canUserAccessFeature,
  isWithinLimit,
  handleUserSignIn,
  getAdminStats,
  exportEmailsToCSV,
  exportSkillUsageToCSV,
  clearAdminEmailsCache,
} from '../../lib/admin';
import type { AppUser, RoleConfig } from '../../lib/storage/types';

describe('Admin Email Management', () => {
  beforeEach(() => {
    // Clear the module-level cache before each test
    clearAdminEmailsCache();
  });

  describe('getAdminEmails', () => {
    it('returns empty array when no admins configured', () => {
      const emails = getAdminEmails();
      expect(emails).toEqual([]);
    });

    it('returns stored admin emails', () => {
      setAdminEmails(['admin@test.com', 'super@test.com']);
      const emails = getAdminEmails();
      expect(emails).toEqual(['admin@test.com', 'super@test.com']);
    });
  });

  describe('setAdminEmails', () => {
    it('stores admin emails in localStorage', () => {
      setAdminEmails(['admin@test.com']);
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(getAdminEmails()).toContain('admin@test.com');
    });

    it('overwrites existing admin emails', () => {
      setAdminEmails(['old@test.com']);
      setAdminEmails(['new@test.com']);
      expect(getAdminEmails()).toEqual(['new@test.com']);
    });
  });

  describe('isAdminEmail', () => {
    beforeEach(() => {
      // Store emails in lowercase (as the UI does when saving)
      setAdminEmails(['admin@test.com', 'super@test.com']);
    });

    it('returns true for admin email (case insensitive)', () => {
      expect(isAdminEmail('admin@test.com')).toBe(true);
      expect(isAdminEmail('ADMIN@TEST.COM')).toBe(true);
      expect(isAdminEmail('super@test.com')).toBe(true);
      expect(isAdminEmail('SUPER@TEST.COM')).toBe(true);
    });

    it('returns false for non-admin email', () => {
      expect(isAdminEmail('user@test.com')).toBe(false);
    });
  });

  describe('hasAdminSetup', () => {
    it('returns false when no admins configured', () => {
      expect(hasAdminSetup()).toBe(false);
    });

    it('returns true when admins are configured', () => {
      setAdminEmails(['admin@test.com']);
      expect(hasAdminSetup()).toBe(true);
    });
  });
});

describe('Role Configuration', () => {
  describe('getRoleConfigs', () => {
    it('returns default configs when none stored', () => {
      const configs = getRoleConfigs();
      expect(configs).toHaveLength(4);
      expect(configs.map(c => c.role)).toEqual(['free', 'pro', 'team', 'custom']);
    });

    it('returns stored configs', () => {
      const customConfigs: RoleConfig[] = [
        {
          role: 'free',
          displayName: 'Custom Free',
          description: 'Test',
          price: 0,
          limits: {
            skillRunsPerDay: 5,
            skillRunsPerMonth: 50,
            savedOutputsLimit: 10,
            workspacesLimit: 1,
            customSkillsLimit: 0,
            batchRowsLimit: 10,
            teamMembersLimit: 1,
          },
          features: {
            canAccessAllSkills: false,
            canCreateCustomSkills: false,
            canAccessCommunitySkills: true,
            canExportPrompts: true,
            canUseBatchProcessing: false,
            canUseWorkflows: false,
            canAccessAdminPanel: false,
            canViewAnalytics: false,
            canInviteTeamMembers: false,
            canDownloadOutputs: true,
            canExportToCSV: false,
          },
        },
      ];
      saveRoleConfigs(customConfigs);
      const configs = getRoleConfigs();
      expect(configs[0].displayName).toBe('Custom Free');
    });
  });

  describe('getRoleConfig', () => {
    it('returns config for specific role', () => {
      const freeConfig = getRoleConfig('free');
      expect(freeConfig.role).toBe('free');
    });

    it('returns first config for unknown role', () => {
      const config = getRoleConfig('unknown' as any);
      expect(config).toBeDefined();
    });
  });
});

describe('User Management', () => {
  describe('createAppUser', () => {
    it('creates a new user with default role', () => {
      const user = createAppUser('user-123', 'test@example.com', 'Test User');
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBe('Test User');
      expect(user.role).toBe('free');
      expect(user.isAdmin).toBe(false);
    });

    it('creates admin user when email is in admin list', () => {
      setAdminEmails(['admin@example.com']);
      const user = createAppUser('admin-123', 'admin@example.com', 'Admin');
      expect(user.role).toBe('custom');
      expect(user.isAdmin).toBe(true);
    });
  });

  describe('getCurrentAppUser / saveCurrentAppUser', () => {
    it('returns null when no user saved', () => {
      expect(getCurrentAppUser()).toBeNull();
    });

    it('saves and retrieves user', () => {
      const user = createAppUser('user-123', 'test@example.com');
      saveCurrentAppUser(user);
      const retrieved = getCurrentAppUser();
      expect(retrieved?.id).toBe('user-123');
      expect(retrieved?.email).toBe('test@example.com');
    });
  });
});

describe('Email Capture', () => {
  describe('captureEmail', () => {
    it('captures new email', () => {
      const captured = captureEmail('new@test.com', 'New User', 'user-123');
      expect(captured.email).toBe('new@test.com');
      expect(captured.displayName).toBe('New User');
      expect(captured.loginCount).toBe(1);
      expect(captured.followUpStatus).toBe('pending');
    });

    it('updates existing email on repeat capture', () => {
      captureEmail('repeat@test.com', 'User');
      const updated = captureEmail('repeat@test.com', 'Updated Name');
      expect(updated.loginCount).toBe(2);
      expect(updated.displayName).toBe('Updated Name');
    });

    it('normalizes email to lowercase', () => {
      const captured = captureEmail('UPPER@TEST.COM');
      expect(captured.email).toBe('upper@test.com');
    });
  });

  describe('getCapturedEmails', () => {
    it('returns empty array when none captured', () => {
      expect(getCapturedEmails()).toEqual([]);
    });

    it('returns all captured emails', () => {
      captureEmail('one@test.com');
      captureEmail('two@test.com');
      const emails = getCapturedEmails();
      expect(emails).toHaveLength(2);
    });
  });

  describe('updateCapturedEmail', () => {
    it('updates email properties', () => {
      captureEmail('update@test.com');
      updateCapturedEmail('update@test.com', { followUpStatus: 'contacted' });
      const emails = getCapturedEmails();
      expect(emails[0].followUpStatus).toBe('contacted');
    });
  });

  describe('deleteCapturedEmail', () => {
    it('removes email from list', () => {
      captureEmail('delete@test.com');
      captureEmail('keep@test.com');
      deleteCapturedEmail('delete@test.com');
      const emails = getCapturedEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].email).toBe('keep@test.com');
    });
  });
});

describe('Skill Usage Tracking', () => {
  describe('trackSkillUsage', () => {
    it('creates new usage record', () => {
      trackSkillUsage('user-1', 'user@test.com', 'skill-1', 'Resume Parser', 'static');
      const records = getSkillUsageRecords();
      expect(records).toHaveLength(1);
      expect(records[0].skillId).toBe('skill-1');
      expect(records[0].usageCount).toBe(1);
    });

    it('increments existing usage record', () => {
      trackSkillUsage('user-1', 'user@test.com', 'skill-1', 'Resume Parser', 'static');
      trackSkillUsage('user-1', 'user@test.com', 'skill-1', 'Resume Parser', 'static');
      const records = getSkillUsageRecords();
      expect(records).toHaveLength(1);
      expect(records[0].usageCount).toBe(2);
    });

    it('tracks different skills separately', () => {
      trackSkillUsage('user-1', 'user@test.com', 'skill-1', 'Skill 1', 'static');
      trackSkillUsage('user-1', 'user@test.com', 'skill-2', 'Skill 2', 'static');
      const records = getSkillUsageRecords();
      expect(records).toHaveLength(2);
    });
  });

  describe('getSkillUsageForUser', () => {
    it('returns only records for specific user', () => {
      trackSkillUsage('user-1', 'user1@test.com', 'skill-1', 'Skill 1', 'static');
      trackSkillUsage('user-2', 'user2@test.com', 'skill-1', 'Skill 1', 'static');
      const user1Records = getSkillUsageForUser('user-1');
      expect(user1Records).toHaveLength(1);
      expect(user1Records[0].userId).toBe('user-1');
    });
  });
});

describe('Feature Gating', () => {
  describe('canUserAccessFeature', () => {
    it('allows access when no user logged in', () => {
      expect(canUserAccessFeature('canExportPrompts')).toBe(true);
    });

    it('checks user role features', () => {
      const user = createAppUser('user-1', 'free@test.com');
      saveCurrentAppUser(user);
      // Free users can export prompts (currently)
      expect(canUserAccessFeature('canExportPrompts')).toBe(true);
    });
  });

  describe('isWithinLimit', () => {
    it('returns true when no user logged in', () => {
      expect(isWithinLimit('skillRunsPerDay')).toBe(true);
    });

    it('checks daily limits for logged in user', () => {
      const user = createAppUser('user-1', 'free@test.com');
      user.skillRunsToday = 5;
      saveCurrentAppUser(user);
      // Free tier has 10 runs/day limit
      expect(isWithinLimit('skillRunsPerDay')).toBe(true);
    });
  });
});

describe('Auth Integration', () => {
  describe('handleUserSignIn', () => {
    it('creates new user and captures email', () => {
      const user = handleUserSignIn('new-user', 'new@test.com', 'New User');
      expect(user.id).toBe('new-user');
      expect(user.email).toBe('new@test.com');

      const emails = getCapturedEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].email).toBe('new@test.com');
    });

    it('updates existing user on re-login', () => {
      handleUserSignIn('user-1', 'user@test.com', 'Original');
      const updated = handleUserSignIn('user-1', 'user@test.com', 'Updated');
      expect(updated.displayName).toBe('Updated');

      const emails = getCapturedEmails();
      expect(emails[0].loginCount).toBe(2);
    });

    it('promotes user to admin if email is in admin list', () => {
      setAdminEmails(['admin@test.com']);
      const user = handleUserSignIn('admin-1', 'admin@test.com', 'Admin');
      expect(user.isAdmin).toBe(true);
      expect(user.role).toBe('custom');
    });
  });
});

describe('Admin Statistics', () => {
  describe('getAdminStats', () => {
    it('returns stats with empty data', () => {
      const stats = getAdminStats();
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalSkillRuns).toBe(0);
      expect(stats.emailsCaptures).toBe(0);
    });

    it('calculates stats from captured data', () => {
      captureEmail('user1@test.com');
      captureEmail('user2@test.com');
      trackSkillUsage('user-1', 'user1@test.com', 'skill-1', 'Skill 1', 'static');
      trackSkillUsage('user-1', 'user1@test.com', 'skill-1', 'Skill 1', 'static');

      const stats = getAdminStats();
      expect(stats.totalUsers).toBe(2);
      expect(stats.emailsCaptures).toBe(2);
      expect(stats.totalSkillRuns).toBe(2);
      expect(stats.topSkills).toHaveLength(1);
      expect(stats.topSkills[0].totalUsage).toBe(2);
    });
  });
});

describe('Data Export', () => {
  describe('exportEmailsToCSV', () => {
    it('exports empty CSV with headers when no data', () => {
      const csv = exportEmailsToCSV();
      expect(csv).toContain('Email,Display Name,Source');
    });

    it('exports email data as CSV', () => {
      captureEmail('export@test.com', 'Export User', 'user-1', 'google');
      const csv = exportEmailsToCSV();
      expect(csv).toContain('export@test.com');
      expect(csv).toContain('Export User');
    });
  });

  describe('exportSkillUsageToCSV', () => {
    it('exports skill usage data as CSV', () => {
      trackSkillUsage('user-1', 'user@test.com', 'skill-1', 'Test Skill', 'static');
      const csv = exportSkillUsageToCSV();
      expect(csv).toContain('user@test.com');
      expect(csv).toContain('Test Skill');
      expect(csv).toContain('static');
    });
  });
});
