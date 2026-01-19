/**
 * AdminPage.tsx - Admin Control Panel
 *
 * A comprehensive admin dashboard for managing:
 * - User roles and permissions
 * - Captured email list for follow-up
 * - Role configuration (limits and features)
 * - Skill usage analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Mail,
  Settings,
  BarChart3,
  Download,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  Crown,
  Zap,
  Building2,
  Star,
  RefreshCw,
  Play,
  Loader2,
  Key,
  Target,
  Send,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  getRoleConfigs,
  saveRoleConfigs,
  getCapturedEmails,
  updateCapturedEmail,
  deleteCapturedEmail,
  getSkillUsageRecords,
  getAdminStats,
  exportEmailsToCSV,
  exportSkillUsageToCSV,
  getAdminEmails,
  setAdminEmails,
  isAdminEmail,
  hasAdminSetup,
  getCurrentAppUser,
} from '../lib/admin';
import type {
  RoleConfig,
  UserRole,
  CapturedEmail,
  SkillUsageRecord,
} from '../lib/storage/types';
import { getModelsForProvider, type ApiProvider, type ModelOption } from '../lib/platformKeys';
import { checkPlatformStatus, callProxyAPI, type PlatformStatus } from '../lib/platformProxy';
import { getApiKey, saveApiKey as savePersonalApiKey } from '../lib/apiKeyStorage';
import { runSkillStream as runGeminiStream } from '../lib/gemini';
import { runSkillStream as runClaudeStream } from '../lib/claude';
import { runSkillStream as runChatGPTStream, type ChatGPTModelType } from '../lib/chatgpt';
import { EmailSegmentationPanel } from '../components/EmailSegmentationPanel';
import { EmailComposer } from '../components/EmailComposer';
import { UserManagementPanel } from '../components/UserManagementPanel';
import { ClientManagementPanel } from '../components/ClientManagementPanel';
import { PortalTestPanel } from '../components/PortalTestPanel';
import { useEmailSegments } from '../hooks/useEmailSegments';
import { useSkillUsageStats } from '../hooks/useSkillUsageStats';
import { sendEmail } from '../lib/emailSegmentation';
import type { EmailSendRequest } from '../lib/emailSegmentation/types';
import { UserCheck } from 'lucide-react';

type TabId = 'overview' | 'users' | 'clients' | 'emails' | 'email-targeting' | 'roles' | 'usage' | 'api-test' | 'settings';

const ROLE_ICONS: Record<UserRole, React.FC<{ className?: string }>> = {
  free: Users,
  pro: Zap,
  team: Building2,
  custom: Crown,
};

const ROLE_COLORS: Record<UserRole, string> = {
  free: 'text-gray-500',
  pro: 'text-blue-500',
  team: 'text-purple-500',
  custom: 'text-amber-500',
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  // Check admin access
  const currentUser = getCurrentAppUser();
  const isAdmin = currentUser?.isAdmin || (user?.email && isAdminEmail(user.email));
  const adminSetupComplete = hasAdminSetup();
  const isBootstrapMode = !adminSetupComplete; // No admins configured yet

  // In bootstrap mode, default to settings tab; otherwise overview
  const [activeTab, setActiveTab] = useState<TabId>(isBootstrapMode ? 'settings' : 'overview');
  const [stats, setStats] = useState(getAdminStats());
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>(getRoleConfigs());
  const [emails, setEmails] = useState<CapturedEmail[]>(getCapturedEmails());
  const [usageRecords, setUsageRecords] = useState<SkillUsageRecord[]>(getSkillUsageRecords());
  const [adminEmailList, setAdminEmailList] = useState<string>(getAdminEmails().join('\n'));
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);

  // Email targeting state
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // Email segmentation hooks
  const emailSegments = useEmailSegments();
  const skillUsageStats = useSkillUsageStats();

  useEffect(() => {
    // If admin setup is complete and user is not admin, redirect
    if (adminSetupComplete && !isAdmin) {
      navigate('/');
      addToast('Admin access required', 'error');
    }
  }, [adminSetupComplete, isAdmin, navigate, addToast]);

  const refreshData = () => {
    setStats(getAdminStats());
    setRoleConfigs(getRoleConfigs());
    setEmails(getCapturedEmails());
    setUsageRecords(getSkillUsageRecords());
    addToast('Data refreshed', 'success');
  };

  const handleExportEmails = () => {
    const csv = exportEmailsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillengine-emails-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Emails exported', 'success');
  };

  const handleExportUsage = () => {
    const csv = exportSkillUsageToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillengine-usage-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Usage data exported', 'success');
  };

  const handleUpdateEmailStatus = (email: string, status: CapturedEmail['followUpStatus']) => {
    updateCapturedEmail(email, { followUpStatus: status });
    setEmails(getCapturedEmails());
    addToast('Status updated', 'success');
  };

  const handleDeleteEmail = (email: string) => {
    if (confirm(`Delete ${email} from the list?`)) {
      deleteCapturedEmail(email);
      setEmails(getCapturedEmails());
      addToast('Email removed', 'success');
    }
  };

  const handleSaveRoleConfig = (config: RoleConfig) => {
    const updatedConfigs = roleConfigs.map(c =>
      c.role === config.role ? config : c
    );
    saveRoleConfigs(updatedConfigs);
    setRoleConfigs(updatedConfigs);
    setEditingRole(null);
    addToast('Role configuration saved', 'success');
  };

  const handleSaveAdminEmails = () => {
    const emails = adminEmailList
      .split('\n')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));
    setAdminEmails(emails);
    addToast('Admin emails updated. Refreshing...', 'success');

    // Reload the page to apply new admin status
    // This ensures the user gets full access if they added their email
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Email targeting handlers
  const handleSendEmail = async (request: EmailSendRequest) => {
    setEmailSending(true);
    try {
      const adminUserId = currentUser?.id || user?.id || 'unknown';
      const adminEmail = currentUser?.email || user?.email || 'unknown';

      const response = await sendEmail(request, adminUserId, adminEmail);

      if (response.success) {
        addToast(`Email sent to ${response.recipientCount} recipients`, 'success');
        setShowEmailComposer(false);
        emailSegments.deselectAll();
      } else {
        addToast(response.error || 'Failed to send email', 'error');
      }

      return response;
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An error occurred';
      addToast(error, 'error');
      return { success: false, error, recipientCount: 0 };
    } finally {
      setEmailSending(false);
    }
  };

  const selectedRecipients = useMemo(() => {
    return emailSegments.filteredRecipients.filter(
      r => emailSegments.selectedRecipientIds.has(r.userId)
    );
  }, [emailSegments.filteredRecipients, emailSegments.selectedRecipientIds]);

  const tabs: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: UserCheck },
    { id: 'clients', label: 'Clients', icon: Building2 },
    { id: 'emails', label: 'Email List', icon: Mail },
    { id: 'email-targeting', label: 'Email Targeting', icon: Target },
    { id: 'roles', label: 'Role Config', icon: Crown },
    { id: 'usage', label: 'Skill Usage', icon: BarChart3 },
    { id: 'api-test', label: 'API Test', icon: Key },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Shield className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Control Panel</h1>
            <p className="text-muted-foreground">Manage users, roles, and configurations</p>
          </div>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Bootstrap Mode Notice */}
      {isBootstrapMode && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-600 dark:text-blue-400">Initial Admin Setup</p>
            <p className="text-sm text-muted-foreground mt-1">
              No admin has been configured yet. Add your email address in the Settings tab below to become the admin.
              Once saved, only admin users will be able to access this panel.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            // In bootstrap mode, only allow settings tab
            const isDisabled = isBootstrapMode && tab.id !== 'settings';
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : isDisabled
                    ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-muted-foreground">Total Users</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-muted-foreground">Total Skill Runs</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalSkillRuns}</p>
              </div>
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-medium text-muted-foreground">Emails Captured</span>
                </div>
                <p className="text-3xl font-bold">{stats.emailsCaptures}</p>
              </div>
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium text-muted-foreground">Pending Follow-ups</span>
                </div>
                <p className="text-3xl font-bold">{stats.emailsByStatus['pending'] || 0}</p>
              </div>
            </div>

            {/* Users by Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
                <div className="space-y-3">
                  {Object.entries(stats.usersByRole).map(([role, count]) => {
                    const RoleIcon = ROLE_ICONS[role as UserRole];
                    return (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RoleIcon className={`h-4 w-4 ${ROLE_COLORS[role as UserRole]}`} />
                          <span className="capitalize">{role}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Top Skills</h3>
                <div className="space-y-3">
                  {stats.topSkills.slice(0, 5).map((skill, i) => (
                    <div key={skill.skillId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="truncate max-w-[200px]">{skill.skillName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {skill.totalUsage} runs • {skill.uniqueUsers} users
                      </span>
                    </div>
                  ))}
                  {stats.topSkills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No skill usage data yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Signups */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Signups</h3>
                <Button variant="outline" size="sm" onClick={handleExportEmails}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">First Seen</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Logins</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSignups.slice(0, 10).map(email => (
                      <tr key={email.id} className="border-b last:border-0">
                        <td className="py-2 px-2 text-sm">{email.email}</td>
                        <td className="py-2 px-2 text-sm text-muted-foreground">{email.displayName || '-'}</td>
                        <td className="py-2 px-2 text-sm text-muted-foreground">
                          {new Date(email.firstSeenAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-2 text-sm">{email.loginCount}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            email.followUpStatus === 'converted'
                              ? 'bg-green-500/20 text-green-600'
                              : email.followUpStatus === 'contacted'
                              ? 'bg-blue-500/20 text-blue-600'
                              : 'bg-gray-500/20 text-gray-600'
                          }`}>
                            {email.followUpStatus || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.recentSignups.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No signups yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab - Enhanced User Management with Onboarding Data */}
        {activeTab === 'users' && (
          <UserManagementPanel
            onSelectUsers={(ids) => {
              // Update selected recipients for email targeting
              emailSegments.deselectAll();
              ids.forEach(id => emailSegments.toggleRecipient(id));
            }}
            onSendEmail={() => {
              setActiveTab('email-targeting');
              setShowEmailComposer(true);
            }}
          />
        )}

        {/* Clients Tab - B2B Client Management with Skill/Workflow Selection */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Client Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage B2B client outreach with curated skill and workflow selections. Create dedicated portal pages for each client.
              </p>
            </div>
            <ClientManagementPanel
              onViewPortal={(client) => {
                // Open portal in new tab
                window.open(`/#/portal/${client.portalSlug}`, '_blank');
              }}
            />

            {/* Portal Testing Section */}
            <div className="border-t pt-6">
              <PortalTestPanel />
            </div>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Captured Emails ({emails.length})</h2>
              <Button variant="outline" onClick={handleExportEmails}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">First Seen</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Last Seen</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Logins</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Skills</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map(email => (
                      <tr key={email.id} className="border-t">
                        <td className="py-3 px-4 text-sm font-medium">{email.email}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{email.displayName || '-'}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(email.firstSeenAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(email.lastSeenAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">{email.loginCount}</td>
                        <td className="py-3 px-4 text-sm">{email.skillsUsed}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={email.followUpStatus || 'pending'}
                            onChange={(e) => handleUpdateEmailStatus(email.email, e.target.value as CapturedEmail['followUpStatus'])}
                            className="text-xs h-8"
                          >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted</option>
                            <option value="declined">Declined</option>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmail(email.email)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {emails.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">No emails captured yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email Targeting Tab */}
        {activeTab === 'email-targeting' && (
          <div className="space-y-6">
            {showEmailComposer ? (
              <EmailComposer
                recipients={selectedRecipients}
                onSend={handleSendEmail}
                onCancel={() => setShowEmailComposer(false)}
                isLoading={emailSending}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Email Targeting</h2>
                    <p className="text-sm text-muted-foreground">
                      Segment users by skills, usage, and preferences to send targeted emails
                    </p>
                  </div>
                  {emailSegments.selectedRecipientIds.size > 0 && (
                    <Button onClick={() => setShowEmailComposer(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Compose Email ({emailSegments.selectedRecipientIds.size})
                    </Button>
                  )}
                </div>

                <EmailSegmentationPanel
                  recipients={emailSegments.recipients}
                  filteredRecipients={emailSegments.filteredRecipients}
                  selectedRecipientIds={emailSegments.selectedRecipientIds}
                  filter={emailSegments.filter}
                  isLoading={emailSegments.isLoading}
                  stats={emailSegments.stats}
                  onFilterChange={emailSegments.updateFilter}
                  onSelectRecipient={emailSegments.toggleRecipient}
                  onSelectAll={emailSegments.selectAll}
                  onDeselectAll={emailSegments.deselectAll}
                  onRefresh={emailSegments.refresh}
                />
              </>
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Role Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roleConfigs.map(config => {
                const RoleIcon = ROLE_ICONS[config.role];
                const isEditing = editingRole === config.role;

                return (
                  <div
                    key={config.role}
                    className={`rounded-xl border bg-card p-6 ${
                      isEditing ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          config.role === 'free' ? 'bg-gray-500/20' :
                          config.role === 'pro' ? 'bg-blue-500/20' :
                          config.role === 'team' ? 'bg-purple-500/20' :
                          'bg-amber-500/20'
                        }`}>
                          <RoleIcon className={`h-5 w-5 ${ROLE_COLORS[config.role]}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{config.displayName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {config.price === 0 ? 'Free' : `$${config.price}/month`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRole(isEditing ? null : config.role)}
                      >
                        {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">{config.description}</p>

                    {isEditing ? (
                      <RoleConfigEditor
                        config={config}
                        onSave={handleSaveRoleConfig}
                        onCancel={() => setEditingRole(null)}
                      />
                    ) : (
                      <>
                        {/* Limits Summary */}
                        <div className="space-y-2 mb-4">
                          <h4 className="text-sm font-medium">Limits</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Daily runs:</span>
                              <span>{config.limits.skillRunsPerDay === -1 ? '∞' : config.limits.skillRunsPerDay}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Monthly runs:</span>
                              <span>{config.limits.skillRunsPerMonth === -1 ? '∞' : config.limits.skillRunsPerMonth}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Workspaces:</span>
                              <span>{config.limits.workspacesLimit === -1 ? '∞' : config.limits.workspacesLimit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Custom skills:</span>
                              <span>{config.limits.customSkillsLimit === -1 ? '∞' : config.limits.customSkillsLimit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Features Summary */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Features</h4>
                          <div className="flex flex-wrap gap-1">
                            {config.features.canCreateCustomSkills && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600">Custom Skills</span>
                            )}
                            {config.features.canUseBatchProcessing && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-600">Batch</span>
                            )}
                            {config.features.canExportPrompts && (
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-600">Export</span>
                            )}
                            {config.features.canViewAnalytics && (
                              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-600">Analytics</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Skill Usage Analytics</h2>
              <Button variant="outline" onClick={handleExportUsage}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Top Skills */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Most Popular Skills</h3>
              <div className="space-y-3">
                {stats.topSkills.map((skill, i) => (
                  <div key={skill.skillId} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">{skill.skillName}</p>
                      <p className="text-sm text-muted-foreground">
                        {skill.totalUsage} total runs • {skill.uniqueUsers} unique users
                      </p>
                    </div>
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(skill.totalUsage / (stats.topSkills[0]?.totalUsage || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {stats.topSkills.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No usage data yet</p>
                )}
              </div>
            </div>

            {/* All Usage Records */}
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Skill</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Source</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Uses</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">First Used</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageRecords.slice(0, 50).map(record => (
                      <tr key={record.id} className="border-t">
                        <td className="py-3 px-4 text-sm">{record.userEmail}</td>
                        <td className="py-3 px-4 text-sm font-medium">{record.skillName}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            record.skillSource === 'static' ? 'bg-blue-500/20 text-blue-600' :
                            record.skillSource === 'dynamic' ? 'bg-purple-500/20 text-purple-600' :
                            'bg-green-500/20 text-green-600'
                          }`}>
                            {record.skillSource}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{record.usageCount}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(record.firstUsedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(record.lastUsedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {usageRecords.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">No usage records yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* API Test Tab */}
        {activeTab === 'api-test' && (
          <ApiTestPanel />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-semibold">Admin Settings</h2>

            {/* Admin Emails */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-2">Admin Email Addresses</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Users with these email addresses will have full admin access. One email per line.
              </p>
              <Textarea
                value={adminEmailList}
                onChange={(e) => setAdminEmailList(e.target.value)}
                rows={5}
                placeholder="admin@example.com&#10;another@example.com"
                className="mb-4"
              />
              <Button onClick={handleSaveAdminEmails}>
                <Save className="h-4 w-4 mr-2" />
                Save Admin Emails
              </Button>
            </div>

            {/* Skill Improvement Dashboard */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-2">Skill Improvement</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review AI-proposed skill improvements based on user feedback.
              </p>
              <Button onClick={() => navigate('/admin/improvements')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Open Improvement Dashboard
              </Button>
            </div>

            {/* Future: More settings */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-2">Feature Flags</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Global feature toggles (coming soon)
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Prompt export restriction toggle</p>
                <p>• New user default role setting</p>
                <p>• Email opt-in requirements</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Role Config Editor Component
// ═══════════════════════════════════════════════════════════════════════════

interface RoleConfigEditorProps {
  config: RoleConfig;
  onSave: (config: RoleConfig) => void;
  onCancel: () => void;
}

const RoleConfigEditor: React.FC<RoleConfigEditorProps> = ({ config, onSave, onCancel }) => {
  const [editedConfig, setEditedConfig] = useState<RoleConfig>(JSON.parse(JSON.stringify(config)));

  const updateLimit = (key: keyof typeof config.limits, value: string) => {
    const numValue = value === '' ? -1 : parseInt(value, 10);
    setEditedConfig(prev => ({
      ...prev,
      limits: { ...prev.limits, [key]: isNaN(numValue) ? -1 : numValue },
    }));
  };

  const toggleFeature = (key: keyof typeof config.features) => {
    setEditedConfig(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
    }));
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      {/* Limits */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Limits (-1 = unlimited)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Daily Runs</label>
            <Input
              type="number"
              value={editedConfig.limits.skillRunsPerDay === -1 ? '' : editedConfig.limits.skillRunsPerDay}
              onChange={(e) => updateLimit('skillRunsPerDay', e.target.value)}
              placeholder="∞"
              className="h-8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Monthly Runs</label>
            <Input
              type="number"
              value={editedConfig.limits.skillRunsPerMonth === -1 ? '' : editedConfig.limits.skillRunsPerMonth}
              onChange={(e) => updateLimit('skillRunsPerMonth', e.target.value)}
              placeholder="∞"
              className="h-8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Workspaces</label>
            <Input
              type="number"
              value={editedConfig.limits.workspacesLimit === -1 ? '' : editedConfig.limits.workspacesLimit}
              onChange={(e) => updateLimit('workspacesLimit', e.target.value)}
              placeholder="∞"
              className="h-8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Custom Skills</label>
            <Input
              type="number"
              value={editedConfig.limits.customSkillsLimit === -1 ? '' : editedConfig.limits.customSkillsLimit}
              onChange={(e) => updateLimit('customSkillsLimit', e.target.value)}
              placeholder="∞"
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Features</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(editedConfig.features).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggleFeature(key as keyof typeof config.features)}
                className="rounded"
              />
              <span className="truncate">{key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => onSave(editedConfig)}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// API Test Panel Component
// ═══════════════════════════════════════════════════════════════════════════

const PROVIDER_OPTIONS: { id: ApiProvider; name: string; color: string }[] = [
  { id: 'gemini', name: 'Google Gemini', color: 'bg-blue-500' },
  { id: 'claude', name: 'Anthropic Claude', color: 'bg-purple-500' },
  { id: 'chatgpt', name: 'OpenAI ChatGPT', color: 'bg-green-500' },
];

const ApiTestPanel: React.FC = () => {
  const [provider, setProvider] = useState<ApiProvider>('gemini');
  const [model, setModel] = useState<string>('');
  const [keyMode, setKeyMode] = useState<'platform' | 'personal'>('platform');
  const [personalKey, setPersonalKey] = useState<string>('');
  const [testPrompt, setTestPrompt] = useState<string>('Say hello in exactly one word.');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; time?: number } | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);

  // Get models for selected provider
  const availableModels = getModelsForProvider(provider);

  // Load platform status and stored personal key
  useEffect(() => {
    checkPlatformStatus().then(setPlatformStatus);
  }, []);

  useEffect(() => {
    // Set default model when provider changes
    if (availableModels.length > 0) {
      setModel(availableModels[0].id);
    }
    // Load stored personal key for this provider
    const storedKey = getApiKey(provider);
    if (storedKey) {
      setPersonalKey(storedKey);
    } else {
      setPersonalKey('');
    }
  }, [provider, availableModels]);

  const providerHasPlatformKey = platformStatus?.providers?.[
    provider === 'chatgpt' ? 'openai' : provider
  ] ?? false;

  const canTest = keyMode === 'platform'
    ? providerHasPlatformKey
    : personalKey.length > 10;

  const runTest = async () => {
    if (!canTest || isRunning) return;

    setIsRunning(true);
    setResult(null);
    const startTime = Date.now();

    try {
      let outputText = '';

      if (keyMode === 'platform') {
        // Use platform proxy
        const response = await callProxyAPI({
          model: model,
          prompt: testPrompt,
          systemPrompt: 'You are a helpful assistant. Respond concisely.',
          maxTokens: 100,
          temperature: 0.7,
        });
        outputText = response.output;
      } else {
        // Use personal key - direct API call
        if (provider === 'gemini') {
          const result = await runGeminiStream(
            personalKey,
            { systemInstruction: 'You are a helpful assistant. Respond concisely.', userPrompt: testPrompt },
            false
          );
          // Gemini returns a stream, collect all chunks
          for await (const chunk of result.stream) {
            outputText += chunk.text();
          }
        } else if (provider === 'claude') {
          // Find the model type from model id
          const modelType = model.includes('opus') ? 'opus' : model.includes('sonnet') ? 'sonnet' : 'haiku';
          const response = await runClaudeStream(
            personalKey,
            { systemInstruction: 'You are a helpful assistant. Respond concisely.', userPrompt: testPrompt },
            modelType as 'haiku' | 'sonnet' | 'opus'
          );
          // Claude returns a streaming response, read it
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              // Parse SSE events
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'content_block_delta' && data.delta?.text) {
                      outputText += data.delta.text;
                    }
                  } catch {
                    // Skip non-JSON lines
                  }
                }
              }
            }
          }
        } else if (provider === 'chatgpt') {
          const modelType = model as ChatGPTModelType;
          const response = await runChatGPTStream(
            personalKey,
            { systemInstruction: 'You are a helpful assistant. Respond concisely.', userPrompt: testPrompt },
            modelType
          );
          // ChatGPT returns a streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices?.[0]?.delta?.content) {
                      outputText += data.choices[0].delta.content;
                    }
                  } catch {
                    // Skip non-JSON lines
                  }
                }
              }
            }
          }
        }
      }

      const elapsed = Date.now() - startTime;
      setResult({
        success: true,
        message: outputText || '(Empty response)',
        time: elapsed,
      });

      // Save personal key if it worked
      if (keyMode === 'personal' && personalKey) {
        savePersonalApiKey(provider, personalKey);
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        time: elapsed,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">API Connection Test</h2>
      <p className="text-sm text-muted-foreground">
        Test your API connections to verify Platform Keys or Personal Keys are working correctly.
      </p>

      {/* Provider Selection */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">1. Select Provider</h3>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDER_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                provider === p.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${p.color}`} />
                <span className="font-medium text-sm">{p.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">2. Select Model</h3>
        <Select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full"
        >
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Key Mode Selection */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">3. Select Key Mode</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setKeyMode('platform')}
            disabled={!platformStatus?.available}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              keyMode === 'platform'
                ? 'border-primary bg-primary/10'
                : platformStatus?.available
                ? 'border-border hover:border-muted-foreground/50'
                : 'border-border opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Platform Key</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {providerHasPlatformKey ? 'Configured ✓' : 'Not configured'}
            </p>
          </button>

          <button
            onClick={() => setKeyMode('personal')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              keyMode === 'personal'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-4 w-4" />
              <span className="font-medium">Personal Key</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {personalKey ? 'Key entered ✓' : 'Enter your own key'}
            </p>
          </button>
        </div>

        {/* Personal Key Input */}
        {keyMode === 'personal' && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">API Key</label>
            <Input
              type="password"
              value={personalKey}
              onChange={(e) => setPersonalKey(e.target.value)}
              placeholder={
                provider === 'gemini' ? 'AIza...' :
                provider === 'claude' ? 'sk-ant-...' :
                'sk-...'
              }
            />
          </div>
        )}
      </div>

      {/* Test Prompt */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">4. Test Prompt</h3>
        <Input
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          placeholder="Enter a test prompt..."
        />
      </div>

      {/* Run Test Button */}
      <div className="rounded-xl border bg-card p-6">
        <Button
          onClick={runTest}
          disabled={!canTest || isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Test
            </>
          )}
        </Button>

        {!canTest && !isRunning && (
          <p className="text-sm text-amber-600 mt-2 text-center">
            {keyMode === 'platform'
              ? `Platform key not configured for ${PROVIDER_OPTIONS.find(p => p.id === provider)?.name}`
              : 'Please enter an API key'
            }
          </p>
        )}
      </div>

      {/* Test Result */}
      {result && (
        <div className={`rounded-xl border p-6 ${
          result.success
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {result.success ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <h3 className={`font-semibold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.success ? 'Test Passed' : 'Test Failed'}
            </h3>
            {result.time && (
              <span className="text-xs text-muted-foreground ml-auto">
                {result.time}ms
              </span>
            )}
          </div>
          <div className={`text-sm p-3 rounded-lg ${
            result.success ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            <p className="font-mono whitespace-pre-wrap break-words">{result.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
