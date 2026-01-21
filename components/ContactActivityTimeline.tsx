/**
 * ContactActivityTimeline - Timeline view of contact interactions
 *
 * Features:
 * - Chronological activity display
 * - Activity type filtering
 * - Quick add activity buttons
 * - Activity grouping by date
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  UserCheck,
  Send,
  MessageSquare,
  Mail,
  Inbox,
  Eye,
  MousePointer,
  PhoneOutgoing,
  PhoneIncoming,
  Calendar,
  CalendarCheck,
  Share,
  FileText,
  RefreshCw,
  Plus,
  Loader2,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/theme';
import {
  getContactActivities,
  getClientActivities,
  createActivity,
  deleteActivity,
  ACTIVITY_TYPE_META,
  type ContactActivity,
  type ActivityType,
} from '../lib/contactActivity';

// Icon mapping for activity types
const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  linkedin_connect_sent: UserPlus,
  linkedin_connect_accepted: UserCheck,
  linkedin_message_sent: Send,
  linkedin_message_received: MessageSquare,
  email_sent: Mail,
  email_received: Inbox,
  email_opened: Eye,
  email_clicked: MousePointer,
  call_made: PhoneOutgoing,
  call_received: PhoneIncoming,
  meeting_scheduled: Calendar,
  meeting_completed: CalendarCheck,
  portal_shared: Share,
  note_added: FileText,
  status_changed: RefreshCw,
};

// Color mapping
const ACTIVITY_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
  green: 'bg-green-500/10 text-green-600 border-green-200',
  indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-200',
  orange: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cyan: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  gray: 'bg-gray-500/10 text-gray-600 border-gray-200',
};

interface ContactActivityTimelineProps {
  clientId: string;
  contactId?: string;  // If provided, filter to specific contact
  contactName?: string;
  className?: string;
  maxItems?: number;
  showQuickAdd?: boolean;
}

export const ContactActivityTimeline: React.FC<ContactActivityTimelineProps> = ({
  clientId,
  contactId,
  contactName,
  className,
  maxItems = 20,
  showQuickAdd = true,
}) => {
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // New activity form state
  const [newActivityType, setNewActivityType] = useState<ActivityType>('note_added');
  const [newActivityBody, setNewActivityBody] = useState('');
  const [newActivityOutcome, setNewActivityOutcome] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load activities
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = contactId
        ? await getContactActivities(clientId, contactId, maxItems)
        : await getClientActivities(clientId, maxItems);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, contactId, maxItems]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Create new activity
  const handleCreateActivity = async () => {
    if (!contactId || !newActivityBody.trim()) return;

    setIsCreating(true);
    try {
      const activity = await createActivity({
        clientId,
        contactId,
        activityType: newActivityType,
        body: newActivityBody,
        outcome: newActivityOutcome || undefined,
      });

      if (activity) {
        setActivities(prev => [activity, ...prev]);
        setNewActivityBody('');
        setNewActivityOutcome('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to create activity:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Delete this activity?')) return;

    const success = await deleteActivity(activityId);
    if (success) {
      setActivities(prev => prev.filter(a => a.id !== activityId));
    }
  };

  // Filter activities
  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.activityType === filterType);

  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    const groups: Record<string, ContactActivity[]> = {};
    for (const activity of filteredActivities) {
      const date = new Date(activity.activityAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    }
    return groups;
  }, [filteredActivities]);

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
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">
            Activity Timeline
            {contactName && <span className="font-normal text-muted-foreground"> for {contactName}</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
            {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          {showQuickAdd && contactId && (
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Activity
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          {(['linkedin_connect_sent', 'linkedin_message_sent', 'email_sent', 'call_made', 'meeting_scheduled', 'note_added'] as ActivityType[]).map(type => {
            const meta = ACTIVITY_TYPE_META[type];
            const Icon = ACTIVITY_ICONS[type];
            return (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {meta.label.replace('LinkedIn ', '').replace(' Sent', '')}
              </Button>
            );
          })}
        </div>
      )}

      {/* Add Activity Form */}
      {showAddForm && contactId && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Log Activity</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Activity Type</label>
              <select
                value={newActivityType}
                onChange={e => setNewActivityType(e.target.value as ActivityType)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(ACTIVITY_TYPE_META).map(([type, meta]) => (
                  <option key={type} value={type}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Outcome (optional)</label>
              <input
                type="text"
                value={newActivityOutcome}
                onChange={e => setNewActivityOutcome(e.target.value)}
                placeholder="e.g., Left voicemail"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={newActivityBody}
              onChange={e => setNewActivityBody(e.target.value)}
              placeholder="What happened?"
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateActivity}
              disabled={isCreating || !newActivityBody.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Activity'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredActivities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No activities recorded yet</p>
          {showQuickAdd && contactId && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Activity
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      {!loading && filteredActivities.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                <span className="text-xs font-medium text-muted-foreground">
                  {date}
                </span>
              </div>

              {/* Activities for this date */}
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                {dayActivities.map(activity => {
                  const meta = ACTIVITY_TYPE_META[activity.activityType];
                  const Icon = ACTIVITY_ICONS[activity.activityType];
                  const colorClass = ACTIVITY_COLORS[meta.color] || ACTIVITY_COLORS.gray;

                  return (
                    <div
                      key={activity.id}
                      className="relative pl-6 group"
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center',
                          colorClass
                        )}
                      >
                        <Icon className="h-2 w-2" />
                      </div>

                      {/* Activity card */}
                      <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', colorClass)}>
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </span>
                              {activity.outcome && (
                                <span className="text-xs text-muted-foreground">
                                  → {activity.outcome}
                                </span>
                              )}
                            </div>

                            {activity.subject && (
                              <div className="font-medium text-sm mb-1">{activity.subject}</div>
                            )}

                            {activity.body && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {activity.body}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(activity.activityAt)}
                            </span>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                              title="Delete activity"
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && filteredActivities.length >= maxItems && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadActivities}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContactActivityTimeline;
