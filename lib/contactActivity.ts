/**
 * Contact Activity Timeline
 *
 * Track all interactions with contacts:
 * - LinkedIn messages (connect, follow-up)
 * - Emails (sent, received, opened, clicked)
 * - Calls (made, received)
 * - Meetings (scheduled, completed)
 * - Notes and status changes
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActivityType =
  | 'linkedin_connect_sent'
  | 'linkedin_connect_accepted'
  | 'linkedin_message_sent'
  | 'linkedin_message_received'
  | 'email_sent'
  | 'email_received'
  | 'email_opened'
  | 'email_clicked'
  | 'call_made'
  | 'call_received'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'portal_shared'
  | 'note_added'
  | 'status_changed';

export type ActivityChannel = 'linkedin' | 'email' | 'phone' | 'in_person' | 'portal';
export type ActivityDirection = 'outbound' | 'inbound' | 'internal';

export interface ContactActivity {
  id: string;
  clientId: string;
  contactId: string;
  activityType: ActivityType;
  subject?: string;
  body?: string;
  outcome?: string;
  channel?: ActivityChannel;
  direction?: ActivityDirection;
  emailSequenceId?: string;
  emailSequenceStep?: number;
  activityAt: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateActivityInput {
  clientId: string;
  contactId: string;
  activityType: ActivityType;
  subject?: string;
  body?: string;
  outcome?: string;
  channel?: ActivityChannel;
  direction?: ActivityDirection;
  emailSequenceId?: string;
  emailSequenceStep?: number;
  activityAt?: string;
}

// Activity type metadata for UI
export const ACTIVITY_TYPE_META: Record<ActivityType, {
  label: string;
  icon: string;
  color: string;
  defaultChannel: ActivityChannel;
  defaultDirection: ActivityDirection;
}> = {
  linkedin_connect_sent: {
    label: 'LinkedIn Connect Sent',
    icon: 'UserPlus',
    color: 'blue',
    defaultChannel: 'linkedin',
    defaultDirection: 'outbound',
  },
  linkedin_connect_accepted: {
    label: 'LinkedIn Connect Accepted',
    icon: 'UserCheck',
    color: 'green',
    defaultChannel: 'linkedin',
    defaultDirection: 'inbound',
  },
  linkedin_message_sent: {
    label: 'LinkedIn Message Sent',
    icon: 'Send',
    color: 'blue',
    defaultChannel: 'linkedin',
    defaultDirection: 'outbound',
  },
  linkedin_message_received: {
    label: 'LinkedIn Message Received',
    icon: 'MessageSquare',
    color: 'blue',
    defaultChannel: 'linkedin',
    defaultDirection: 'inbound',
  },
  email_sent: {
    label: 'Email Sent',
    icon: 'Mail',
    color: 'indigo',
    defaultChannel: 'email',
    defaultDirection: 'outbound',
  },
  email_received: {
    label: 'Email Received',
    icon: 'Inbox',
    color: 'indigo',
    defaultChannel: 'email',
    defaultDirection: 'inbound',
  },
  email_opened: {
    label: 'Email Opened',
    icon: 'Eye',
    color: 'green',
    defaultChannel: 'email',
    defaultDirection: 'inbound',
  },
  email_clicked: {
    label: 'Email Link Clicked',
    icon: 'MousePointer',
    color: 'green',
    defaultChannel: 'email',
    defaultDirection: 'inbound',
  },
  call_made: {
    label: 'Call Made',
    icon: 'PhoneOutgoing',
    color: 'purple',
    defaultChannel: 'phone',
    defaultDirection: 'outbound',
  },
  call_received: {
    label: 'Call Received',
    icon: 'PhoneIncoming',
    color: 'purple',
    defaultChannel: 'phone',
    defaultDirection: 'inbound',
  },
  meeting_scheduled: {
    label: 'Meeting Scheduled',
    icon: 'Calendar',
    color: 'orange',
    defaultChannel: 'in_person',
    defaultDirection: 'outbound',
  },
  meeting_completed: {
    label: 'Meeting Completed',
    icon: 'CalendarCheck',
    color: 'green',
    defaultChannel: 'in_person',
    defaultDirection: 'internal',
  },
  portal_shared: {
    label: 'Portal Shared',
    icon: 'Share',
    color: 'cyan',
    defaultChannel: 'portal',
    defaultDirection: 'outbound',
  },
  note_added: {
    label: 'Note Added',
    icon: 'FileText',
    color: 'gray',
    defaultChannel: 'portal',
    defaultDirection: 'internal',
  },
  status_changed: {
    label: 'Status Changed',
    icon: 'RefreshCw',
    color: 'gray',
    defaultChannel: 'portal',
    defaultDirection: 'internal',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert database row to ContactActivity
 */
function rowToActivity(row: Record<string, unknown>): ContactActivity {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    contactId: row.contact_id as string,
    activityType: row.activity_type as ActivityType,
    subject: row.subject as string | undefined,
    body: row.body as string | undefined,
    outcome: row.outcome as string | undefined,
    channel: row.channel as ActivityChannel | undefined,
    direction: row.direction as ActivityDirection | undefined,
    emailSequenceId: row.email_sequence_id as string | undefined,
    emailSequenceStep: row.email_sequence_step as number | undefined,
    activityAt: row.activity_at as string,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | undefined,
  };
}

/**
 * Create a new activity record
 */
export async function createActivity(input: CreateActivityInput): Promise<ContactActivity | null> {
  if (!isSupabaseConfigured() || !supabase) {
    logger.warn('Supabase not configured, cannot create activity');
    return null;
  }

  const meta = ACTIVITY_TYPE_META[input.activityType];

  const { data, error } = await supabase
    .from('contact_activities')
    .insert({
      client_id: input.clientId,
      contact_id: input.contactId,
      activity_type: input.activityType,
      subject: input.subject,
      body: input.body,
      outcome: input.outcome,
      channel: input.channel || meta.defaultChannel,
      direction: input.direction || meta.defaultDirection,
      email_sequence_id: input.emailSequenceId,
      email_sequence_step: input.emailSequenceStep,
      activity_at: input.activityAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create activity', { error: error.message });
    return null;
  }

  logger.info('Activity created', {
    activityType: input.activityType,
    clientId: input.clientId,
    contactId: input.contactId,
  });

  return rowToActivity(data);
}

/**
 * Get all activities for a client
 */
export async function getClientActivities(clientId: string, limit: number = 50): Promise<ContactActivity[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('contact_activities')
    .select('*')
    .eq('client_id', clientId)
    .order('activity_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch client activities', { error: error.message });
    return [];
  }

  return (data || []).map(rowToActivity);
}

/**
 * Get all activities for a specific contact
 */
export async function getContactActivities(
  clientId: string,
  contactId: string,
  limit: number = 50
): Promise<ContactActivity[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('contact_activities')
    .select('*')
    .eq('client_id', clientId)
    .eq('contact_id', contactId)
    .order('activity_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch contact activities', { error: error.message });
    return [];
  }

  return (data || []).map(rowToActivity);
}

/**
 * Get recent activities across all clients
 */
export async function getRecentActivities(limit: number = 100): Promise<ContactActivity[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('contact_activities')
    .select('*')
    .order('activity_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch recent activities', { error: error.message });
    return [];
  }

  return (data || []).map(rowToActivity);
}

/**
 * Get activity counts by type for a client
 */
export async function getClientActivityStats(clientId: string): Promise<Record<ActivityType, number>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {} as Record<ActivityType, number>;
  }

  const { data, error } = await supabase
    .from('contact_activities')
    .select('activity_type')
    .eq('client_id', clientId);

  if (error) {
    logger.error('Failed to fetch activity stats', { error: error.message });
    return {} as Record<ActivityType, number>;
  }

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const type = row.activity_type as string;
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts as Record<ActivityType, number>;
}

/**
 * Delete an activity
 */
export async function deleteActivity(activityId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('contact_activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    logger.error('Failed to delete activity', { error: error.message });
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK LOG HELPERS
// Convenience functions for common activity types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log a LinkedIn connect request sent
 */
export async function logLinkedInConnectSent(
  clientId: string,
  contactId: string,
  message?: string
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'linkedin_connect_sent',
    body: message,
    outcome: 'Connection request sent',
  });
}

/**
 * Log a LinkedIn connection accepted
 */
export async function logLinkedInConnectAccepted(
  clientId: string,
  contactId: string
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'linkedin_connect_accepted',
    outcome: 'Connection accepted',
  });
}

/**
 * Log an email sent
 */
export async function logEmailSent(
  clientId: string,
  contactId: string,
  subject: string,
  body?: string,
  sequenceId?: string,
  sequenceStep?: number
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'email_sent',
    subject,
    body,
    emailSequenceId: sequenceId,
    emailSequenceStep: sequenceStep,
  });
}

/**
 * Log a call made
 */
export async function logCallMade(
  clientId: string,
  contactId: string,
  outcome: string,
  notes?: string
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'call_made',
    outcome,
    body: notes,
  });
}

/**
 * Log a meeting scheduled
 */
export async function logMeetingScheduled(
  clientId: string,
  contactId: string,
  meetingTitle: string,
  notes?: string
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'meeting_scheduled',
    subject: meetingTitle,
    body: notes,
  });
}

/**
 * Log portal shared with contact
 */
export async function logPortalShared(
  clientId: string,
  contactId: string,
  portalUrl: string
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'portal_shared',
    subject: 'Portal URL shared',
    body: portalUrl,
  });
}

/**
 * Log a note
 */
export async function logNote(
  clientId: string,
  contactId: string,
  note: string
): Promise<ContactActivity | null> {
  return createActivity({
    clientId,
    contactId,
    activityType: 'note_added',
    body: note,
  });
}
