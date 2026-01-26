/**
 * ClientOverviewDashboard - Client Statistics Overview
 *
 * Displays key metrics and insights about clients:
 * - Total clients by status, industry, and priority
 * - Portal engagement stats
 * - Contact outreach progress
 * - Recent activity
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Globe,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Linkedin,
  AlertCircle,
  Loader2,
  RefreshCw,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/theme';
import type { Client, ClientStatus, ClientIndustry } from '../lib/storage/types';
import { getClientsAsync, getClientStats, type ClientStats } from '../lib/clients';

interface ClientOverviewDashboardProps {
  clients: Client[];
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

// Status colors and labels
const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bgColor: string }> = {
  prospect: { label: 'Prospect', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  contacted: { label: 'Contacted', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  demo_scheduled: { label: 'Demo Scheduled', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  active: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  inactive: { label: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-500/10' },
};

// Priority colors
const PRIORITY_CONFIG = {
  HIGH: { label: 'High', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  LOW: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  RESEARCH: { label: 'Research', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
};

export const ClientOverviewDashboard: React.FC<ClientOverviewDashboardProps> = ({
  clients,
  onRefresh,
  isLoading = false,
  className,
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const byStatus: Record<ClientStatus, number> = {
      prospect: 0,
      contacted: 0,
      demo_scheduled: 0,
      active: 0,
      inactive: 0,
    };

    const byPriority: Record<string, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      RESEARCH: 0,
      unset: 0,
    };

    const byIndustry: Record<string, number> = {};

    let totalContacts = 0;
    let contactsReached = 0;
    let contactsResponded = 0;
    let meetingsScheduled = 0;
    let portalsEnabled = 0;
    let totalSkills = 0;
    let totalWorkflows = 0;
    let recentlyContacted = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    clients.forEach(client => {
      // Count by status
      byStatus[client.status]++;

      // Count by priority
      const priority = client.priority || 'unset';
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      // Count by industry
      const industry = client.industry.replace(/_/g, ' ');
      byIndustry[industry] = (byIndustry[industry] || 0) + 1;

      // Count contacts and their statuses
      client.contacts.forEach(contact => {
        totalContacts++;
        if (contact.contactStatus === 'connected' || contact.contactStatus === 'responded' || contact.contactStatus === 'meeting_scheduled') {
          contactsReached++;
        }
        if (contact.contactStatus === 'responded' || contact.contactStatus === 'meeting_scheduled') {
          contactsResponded++;
        }
        if (contact.contactStatus === 'meeting_scheduled') {
          meetingsScheduled++;
        }
      });

      // Count portals
      if (client.portalEnabled) {
        portalsEnabled++;
      }

      // Count skills and workflows
      totalSkills += client.selectedSkillIds.length;
      totalWorkflows += client.selectedWorkflowIds.length;

      // Recent contact activity
      if (client.lastContactedAt && new Date(client.lastContactedAt) > thirtyDaysAgo) {
        recentlyContacted++;
      }
    });

    // Sort industries by count for top industries
    const topIndustries = Object.entries(byIndustry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total: clients.length,
      byStatus,
      byPriority,
      byIndustry,
      topIndustries,
      totalContacts,
      contactsReached,
      contactsResponded,
      meetingsScheduled,
      portalsEnabled,
      avgSkillsPerClient: clients.length > 0 ? Math.round(totalSkills / clients.length * 10) / 10 : 0,
      avgWorkflowsPerClient: clients.length > 0 ? Math.round(totalWorkflows / clients.length * 10) / 10 : 0,
      recentlyContacted,
      conversionRate: clients.length > 0
        ? Math.round((byStatus.active / clients.length) * 100)
        : 0,
      responseRate: totalContacts > 0
        ? Math.round((contactsResponded / totalContacts) * 100)
        : 0,
    };
  }, [clients]);

  // Get recent clients (last 5 added)
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [clients]);

  // Get clients needing attention (high priority prospects not contacted)
  const needsAttention = useMemo(() => {
    return clients.filter(c =>
      c.priority === 'HIGH' &&
      c.status === 'prospect' &&
      c.contacts.every(contact => contact.contactStatus === 'not_contacted')
    ).slice(0, 5);
  }, [clients]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Client Overview</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Clients */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total Clients</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.portalsEnabled} with portals
          </p>
        </div>

        {/* Total Contacts */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Total Contacts</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalContacts}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.contactsReached} reached
          </p>
        </div>

        {/* Response Rate */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Response Rate</span>
          </div>
          <p className="text-2xl font-bold">{stats.responseRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.contactsResponded} responded
          </p>
        </div>

        {/* Meetings Scheduled */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Meetings</span>
          </div>
          <p className="text-2xl font-bold">{stats.meetingsScheduled}</p>
          <p className="text-xs text-muted-foreground mt-1">
            scheduled
          </p>
        </div>
      </div>

      {/* Status and Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Pipeline Status
          </h4>
          <div className="space-y-3">
            {(Object.entries(stats.byStatus) as [ClientStatus, number][]).map(([status, count]) => {
              const config = STATUS_CONFIG[status];
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-24 text-sm">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs', config.bgColor, config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', config.bgColor.replace('/10', ''))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Priority */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Priority Distribution
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.byPriority)
              .filter(([_, count]) => count > 0)
              .map(([priority, count]) => {
                const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || {
                  label: 'Unset',
                  color: 'text-gray-500',
                  bgColor: 'bg-gray-500/10',
                };
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={priority} className="flex items-center gap-3">
                    <div className="w-20 text-sm">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', config.bgColor, config.color)}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', config.bgColor.replace('/10', ''))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="font-medium">{count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Top Industries and Needs Attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Industries */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Top Industries
          </h4>
          {stats.topIndustries.length > 0 ? (
            <div className="space-y-2">
              {stats.topIndustries.map(([industry, count], index) => (
                <div key={industry} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-sm capitalize">{industry}</span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No clients yet</p>
          )}
        </div>

        {/* Needs Attention */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Needs Attention
          </h4>
          {needsAttention.length > 0 ? (
            <div className="space-y-2">
              {needsAttention.map(client => (
                <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5">
                  <div>
                    <p className="text-sm font-medium">{client.companyName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {client.industry.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-600">
                    High Priority
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>All high-priority clients contacted!</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Clients */}
      <div className="rounded-xl border bg-card p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recently Added Clients
        </h4>
        {recentClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground">Industry</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground">Added</th>
                </tr>
              </thead>
              <tbody>
                {recentClients.map(client => {
                  const statusConfig = STATUS_CONFIG[client.status];
                  return (
                    <tr key={client.id} className="border-b last:border-0">
                      <td className="py-2 text-sm font-medium">{client.companyName}</td>
                      <td className="py-2 text-sm text-muted-foreground capitalize">
                        {client.industry.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs', statusConfig.bgColor, statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-2 text-sm text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No clients added yet</p>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/50">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.avgSkillsPerClient}</p>
          <p className="text-xs text-muted-foreground">Avg Skills/Client</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.avgWorkflowsPerClient}</p>
          <p className="text-xs text-muted-foreground">Avg Workflows/Client</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.portalsEnabled}</p>
          <p className="text-xs text-muted-foreground">Active Portals</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.recentlyContacted}</p>
          <p className="text-xs text-muted-foreground">Contacted (30d)</p>
        </div>
      </div>
    </div>
  );
};

export default ClientOverviewDashboard;
