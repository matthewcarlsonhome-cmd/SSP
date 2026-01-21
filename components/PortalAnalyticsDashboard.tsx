/**
 * PortalAnalyticsDashboard - Analytics view for client portal visits
 *
 * Features:
 * - Overall stats (views, visitors, engagement)
 * - Top skills/workflows clicked
 * - Recent visits feed
 * - Views over time chart
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Eye,
  Users,
  MousePointer,
  Zap,
  GitBranch,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/theme';
import {
  getPortalAnalyticsSummary,
  getAllPortalAnalytics,
  getRecentPortalVisits,
  type PortalAnalyticsSummary,
} from '../lib/portalAnalytics';

interface PortalAnalyticsDashboardProps {
  clientId?: string;  // If provided, show single client analytics
  portalSlug?: string;
  className?: string;
}

export const PortalAnalyticsDashboard: React.FC<PortalAnalyticsDashboardProps> = ({
  clientId,
  portalSlug,
  className,
}) => {
  const [summary, setSummary] = useState<PortalAnalyticsSummary | null>(null);
  const [allPortals, setAllPortals] = useState<Awaited<ReturnType<typeof getAllPortalAnalytics>>>([]);
  const [recentVisits, setRecentVisits] = useState<Awaited<ReturnType<typeof getRecentPortalVisits>>>([]);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState(30);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      if (clientId) {
        // Single client view
        const data = await getPortalAnalyticsSummary(clientId, daysBack);
        setSummary(data);
      } else {
        // All portals view
        const [portals, visits] = await Promise.all([
          getAllPortalAnalytics(daysBack),
          getRecentPortalVisits(20),
        ]);
        setAllPortals(portals);
        setRecentVisits(visits);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, daysBack]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Format event type for display
  const formatEventType = (eventType: string): string => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Portal Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={daysBack}
            onChange={e => setDaysBack(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Single Client View */}
      {!loading && clientId && summary && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm">Page Views</span>
              </div>
              <div className="text-2xl font-bold">{summary.totalViews}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Unique Visitors</span>
              </div>
              <div className="text-2xl font-bold">{summary.uniqueVisitors}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Avg. Time on Page</span>
              </div>
              <div className="text-2xl font-bold">
                {summary.avgTimeOnPage > 0 ? `${Math.round(summary.avgTimeOnPage / 60)}m` : '-'}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MousePointer className="h-4 w-4" />
                <span className="text-sm">Total Clicks</span>
              </div>
              <div className="text-2xl font-bold">
                {summary.skillClicks + summary.workflowClicks}
              </div>
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-blue-500/10 p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Skill Clicks</span>
              </div>
              <div className="text-xl font-bold text-blue-600">{summary.skillClicks}</div>
            </div>
            <div className="rounded-lg bg-purple-500/10 p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <GitBranch className="h-4 w-4" />
                <span className="text-sm font-medium">Workflow Clicks</span>
              </div>
              <div className="text-xl font-bold text-purple-600">{summary.workflowClicks}</div>
            </div>
            <div className="rounded-lg bg-green-500/10 p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Demo Starts</span>
              </div>
              <div className="text-xl font-bold text-green-600">{summary.demoStarts}</div>
            </div>
            <div className="rounded-lg bg-orange-500/10 p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">CTA Clicks</span>
              </div>
              <div className="text-xl font-bold text-orange-600">{summary.ctaClicks}</div>
            </div>
          </div>

          {/* Top Skills */}
          {summary.topSkills.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Top Skills Clicked
              </h4>
              <div className="space-y-2">
                {summary.topSkills.map((skill, i) => (
                  <div key={skill.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{i + 1}.</span>
                      <span className="text-sm">{skill.name}</span>
                    </div>
                    <span className="text-sm font-medium">{skill.clicks} clicks</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Views by Day */}
          {summary.viewsByDay.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Views Over Time
              </h4>
              <div className="h-32 flex items-end gap-1">
                {summary.viewsByDay.map((day, i) => {
                  const maxViews = Math.max(...summary.viewsByDay.map(d => d.views));
                  const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.views} views
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Portals View */}
      {!loading && !clientId && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {allPortals.reduce((sum, p) => sum + p.totalViews, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Views</div>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {allPortals.filter(p => p.totalViews > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Portals</div>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {allPortals.reduce((sum, p) => sum + p.skillClicks + p.workflowClicks, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Clicks</div>
            </div>
          </div>

          {/* Portal Rankings */}
          {allPortals.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-3">Top Performing Portals</h4>
              <div className="space-y-2">
                {allPortals.slice(0, 10).map((portal, i) => (
                  <div key={portal.clientId} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                      <a
                        href={`/#/portal/${portal.portalSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-primary flex items-center gap-1"
                      >
                        {portal.portalSlug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{portal.totalViews} views</span>
                      <span className="text-muted-foreground">{portal.uniqueVisitors} visitors</span>
                      <span className="text-blue-600">{portal.skillClicks} clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Feed */}
          {recentVisits.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentVisits.map((visit, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {visit.eventType === 'page_view' && <Eye className="h-4 w-4 text-muted-foreground" />}
                      {visit.eventType === 'skill_click' && <Zap className="h-4 w-4 text-blue-500" />}
                      {visit.eventType === 'workflow_click' && <GitBranch className="h-4 w-4 text-purple-500" />}
                      {visit.eventType === 'cta_click' && <MousePointer className="h-4 w-4 text-orange-500" />}
                      <span className="text-muted-foreground">{visit.portalSlug}</span>
                      <span>•</span>
                      <span>{formatEventType(visit.eventType)}</span>
                      {visit.itemName && (
                        <>
                          <span>•</span>
                          <span className="font-medium">{visit.itemName}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(visit.eventAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {allPortals.length === 0 && recentVisits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No portal activity recorded yet</p>
              <p className="text-sm mt-1">Analytics will appear here when visitors view your portals</p>
            </div>
          )}
        </div>
      )}

      {/* Single Client Empty State */}
      {!loading && clientId && !summary && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analytics data for this portal</p>
          <p className="text-sm mt-1">Share the portal link to start collecting data</p>
        </div>
      )}
    </div>
  );
};

export default PortalAnalyticsDashboard;
