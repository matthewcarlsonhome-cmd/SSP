/**
 * Portal Analytics
 *
 * Track visitor behavior on client portal pages:
 * - Page views and time on page
 * - Skill/workflow clicks and demo completions
 * - CTA interactions
 * - Scroll depth
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type AnalyticsEventType =
  | 'page_view'
  | 'skill_click'
  | 'workflow_click'
  | 'skill_demo_start'
  | 'skill_demo_complete'
  | 'workflow_demo_start'
  | 'workflow_demo_complete'
  | 'cta_click'
  | 'contact_click'
  | 'scroll_depth';

export interface AnalyticsEvent {
  id: string;
  clientId: string;
  portalSlug: string;
  eventType: AnalyticsEventType;
  itemId?: string;
  itemName?: string;
  scrollPercent?: number;
  timeOnPageSeconds?: number;
  visitorId?: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
  eventAt: string;
}

export interface TrackEventInput {
  clientId: string;
  portalSlug: string;
  eventType: AnalyticsEventType;
  itemId?: string;
  itemName?: string;
  scrollPercent?: number;
  timeOnPageSeconds?: number;
}

export interface PortalAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  skillClicks: number;
  workflowClicks: number;
  demoStarts: number;
  demoCompletions: number;
  ctaClicks: number;
  topSkills: Array<{ id: string; name: string; clicks: number }>;
  topWorkflows: Array<{ id: string; name: string; clicks: number }>;
  viewsByDay: Array<{ date: string; views: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// VISITOR ID MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const VISITOR_ID_KEY = 'skillengine_visitor_id';

/**
 * Get or create a visitor ID for tracking (stored in localStorage)
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server';

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Track an analytics event
 */
export async function trackEvent(input: TrackEventInput): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    logger.debug('Analytics: Supabase not configured');
    return false;
  }

  try {
    const { error } = await supabase.from('portal_analytics').insert({
      client_id: input.clientId,
      portal_slug: input.portalSlug,
      event_type: input.eventType,
      item_id: input.itemId,
      item_name: input.itemName,
      scroll_percent: input.scrollPercent,
      time_on_page_seconds: input.timeOnPageSeconds,
      visitor_id: getVisitorId(),
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });

    if (error) {
      logger.error('Failed to track analytics event', { error: error.message });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Analytics tracking error', { error: err });
    return false;
  }
}

/**
 * Track a page view
 */
export function trackPageView(clientId: string, portalSlug: string): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'page_view',
  });
}

/**
 * Track a skill click
 */
export function trackSkillClick(
  clientId: string,
  portalSlug: string,
  skillId: string,
  skillName: string
): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'skill_click',
    itemId: skillId,
    itemName: skillName,
  });
}

/**
 * Track a workflow click
 */
export function trackWorkflowClick(
  clientId: string,
  portalSlug: string,
  workflowId: string,
  workflowName: string
): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'workflow_click',
    itemId: workflowId,
    itemName: workflowName,
  });
}

/**
 * Track skill demo start
 */
export function trackSkillDemoStart(
  clientId: string,
  portalSlug: string,
  skillId: string,
  skillName: string
): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'skill_demo_start',
    itemId: skillId,
    itemName: skillName,
  });
}

/**
 * Track skill demo completion
 */
export function trackSkillDemoComplete(
  clientId: string,
  portalSlug: string,
  skillId: string,
  skillName: string
): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'skill_demo_complete',
    itemId: skillId,
    itemName: skillName,
  });
}

/**
 * Track CTA click
 */
export function trackCtaClick(clientId: string, portalSlug: string, ctaName: string): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'cta_click',
    itemName: ctaName,
  });
}

/**
 * Track scroll depth (call when user scrolls to 25%, 50%, 75%, 100%)
 */
export function trackScrollDepth(
  clientId: string,
  portalSlug: string,
  scrollPercent: number
): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'scroll_depth',
    scrollPercent,
  });
}

/**
 * Track time on page (call when user leaves)
 */
export function trackTimeOnPage(
  clientId: string,
  portalSlug: string,
  timeSeconds: number
): void {
  trackEvent({
    clientId,
    portalSlug,
    eventType: 'page_view',
    timeOnPageSeconds: timeSeconds,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get analytics summary for a client's portal
 */
export async function getPortalAnalyticsSummary(
  clientId: string,
  daysBack: number = 30
): Promise<PortalAnalyticsSummary | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('portal_analytics')
    .select('*')
    .eq('client_id', clientId)
    .gte('event_at', startDate.toISOString())
    .order('event_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch portal analytics', { error: error.message });
    return null;
  }

  const events = data || [];

  // Calculate summary metrics
  const pageViews = events.filter(e => e.event_type === 'page_view');
  const uniqueVisitors = new Set(events.map(e => e.visitor_id).filter(Boolean)).size;

  const timesOnPage = pageViews
    .map(e => e.time_on_page_seconds)
    .filter((t): t is number => typeof t === 'number' && t > 0);
  const avgTimeOnPage = timesOnPage.length > 0
    ? timesOnPage.reduce((a, b) => a + b, 0) / timesOnPage.length
    : 0;

  // Count by event type
  const skillClicks = events.filter(e => e.event_type === 'skill_click').length;
  const workflowClicks = events.filter(e => e.event_type === 'workflow_click').length;
  const demoStarts = events.filter(e =>
    e.event_type === 'skill_demo_start' || e.event_type === 'workflow_demo_start'
  ).length;
  const demoCompletions = events.filter(e =>
    e.event_type === 'skill_demo_complete' || e.event_type === 'workflow_demo_complete'
  ).length;
  const ctaClicks = events.filter(e => e.event_type === 'cta_click').length;

  // Top skills
  const skillClickCounts = new Map<string, { id: string; name: string; clicks: number }>();
  for (const e of events.filter(e => e.event_type === 'skill_click')) {
    const key = e.item_id || 'unknown';
    const existing = skillClickCounts.get(key) || { id: key, name: e.item_name || key, clicks: 0 };
    existing.clicks++;
    skillClickCounts.set(key, existing);
  }
  const topSkills = Array.from(skillClickCounts.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  // Top workflows
  const workflowClickCounts = new Map<string, { id: string; name: string; clicks: number }>();
  for (const e of events.filter(e => e.event_type === 'workflow_click')) {
    const key = e.item_id || 'unknown';
    const existing = workflowClickCounts.get(key) || { id: key, name: e.item_name || key, clicks: 0 };
    existing.clicks++;
    workflowClickCounts.set(key, existing);
  }
  const topWorkflows = Array.from(workflowClickCounts.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  // Views by day
  const viewsByDayMap = new Map<string, number>();
  for (const e of pageViews) {
    const date = new Date(e.event_at).toISOString().split('T')[0];
    viewsByDayMap.set(date, (viewsByDayMap.get(date) || 0) + 1);
  }
  const viewsByDay = Array.from(viewsByDayMap.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalViews: pageViews.length,
    uniqueVisitors,
    avgTimeOnPage: Math.round(avgTimeOnPage),
    skillClicks,
    workflowClicks,
    demoStarts,
    demoCompletions,
    ctaClicks,
    topSkills,
    topWorkflows,
    viewsByDay,
  };
}

/**
 * Get analytics for all portals (admin view)
 */
export async function getAllPortalAnalytics(daysBack: number = 7): Promise<Array<{
  clientId: string;
  portalSlug: string;
  totalViews: number;
  uniqueVisitors: number;
  skillClicks: number;
  workflowClicks: number;
  lastVisit: string | null;
}>> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('portal_analytics')
    .select('client_id, portal_slug, event_type, visitor_id, event_at')
    .gte('event_at', startDate.toISOString());

  if (error) {
    logger.error('Failed to fetch all portal analytics', { error: error.message });
    return [];
  }

  // Group by client
  const byClient = new Map<string, {
    clientId: string;
    portalSlug: string;
    events: typeof data;
  }>();

  for (const event of data || []) {
    const key = event.client_id;
    if (!byClient.has(key)) {
      byClient.set(key, {
        clientId: event.client_id,
        portalSlug: event.portal_slug,
        events: [],
      });
    }
    byClient.get(key)!.events.push(event);
  }

  return Array.from(byClient.values()).map(({ clientId, portalSlug, events }) => ({
    clientId,
    portalSlug,
    totalViews: events.filter(e => e.event_type === 'page_view').length,
    uniqueVisitors: new Set(events.map(e => e.visitor_id).filter(Boolean)).size,
    skillClicks: events.filter(e => e.event_type === 'skill_click').length,
    workflowClicks: events.filter(e => e.event_type === 'workflow_click').length,
    lastVisit: events.length > 0
      ? events.sort((a, b) => b.event_at.localeCompare(a.event_at))[0].event_at
      : null,
  })).sort((a, b) => b.totalViews - a.totalViews);
}

/**
 * Get recent portal visits (for admin dashboard)
 */
export async function getRecentPortalVisits(limit: number = 20): Promise<Array<{
  clientId: string;
  portalSlug: string;
  visitorId: string;
  eventType: string;
  itemName?: string;
  eventAt: string;
}>> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('portal_analytics')
    .select('client_id, portal_slug, visitor_id, event_type, item_name, event_at')
    .order('event_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch recent portal visits', { error: error.message });
    return [];
  }

  return (data || []).map(row => ({
    clientId: row.client_id,
    portalSlug: row.portal_slug,
    visitorId: row.visitor_id || 'anonymous',
    eventType: row.event_type,
    itemName: row.item_name,
    eventAt: row.event_at,
  }));
}
