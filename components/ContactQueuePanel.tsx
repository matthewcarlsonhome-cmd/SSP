/**
 * ContactQueuePanel - Contact To-Do List
 *
 * A streamlined interface for contacting prospects:
 * - Clean queue of prospects ready for outreach
 * - One-click LinkedIn/email access
 * - Quick status updates
 * - Pre-written messages ready to copy
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Linkedin,
  Mail,
  Phone,
  ExternalLink,
  Check,
  Clock,
  ArrowRight,
  Building2,
  Copy,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Target,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Sparkles,
  Send,
  User,
  Globe,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { cn } from '../lib/theme';
import { getClientsAsync, updateClientAsync } from '../lib/clients';
import type { Client, ClientContact, ClientStatus, ClientPriority, ContactStatus } from '../lib/storage/types';
import { useToast } from '../hooks/useToast';

interface ContactQueuePanelProps {
  onRefreshClients?: () => void;
  className?: string;
}

type QueueFilter = 'all' | 'not_contacted' | 'connected' | 'responded';
type PriorityFilter = 'all' | 'HIGH' | 'MEDIUM' | 'LOW' | 'RESEARCH';

interface QueuedContact {
  client: Client;
  contact: ClientContact;
  contactIndex: number;
}

const CONTACT_STATUS_CONFIG: Record<ContactStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  not_contacted: { label: 'Not Contacted', color: 'text-gray-500 bg-gray-500/10', icon: Circle },
  connected: { label: 'Connected', color: 'text-blue-500 bg-blue-500/10', icon: Linkedin },
  responded: { label: 'Responded', color: 'text-green-500 bg-green-500/10', icon: MessageSquare },
  meeting_scheduled: { label: 'Meeting Scheduled', color: 'text-purple-500 bg-purple-500/10', icon: Calendar },
};

const PRIORITY_COLORS: Record<ClientPriority, string> = {
  HIGH: 'text-red-500 bg-red-500/10 border-red-500/20',
  MEDIUM: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-green-500 bg-green-500/10 border-green-500/20',
  RESEARCH: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
};

export const ContactQueuePanel: React.FC<ContactQueuePanelProps> = ({
  onRefreshClients,
  className,
}) => {
  const { addToast } = useToast();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QueueFilter>('not_contacted');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  // Load clients
  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await getClientsAsync();
      setClients(loaded);
    } catch (error) {
      addToast('Failed to load clients', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Build contact queue
  const contactQueue: QueuedContact[] = useMemo(() => {
    const queue: QueuedContact[] = [];

    for (const client of clients) {
      // Only include prospect clients
      if (client.status !== 'prospect' && client.status !== 'contacted') continue;

      // Check priority filter
      if (priorityFilter !== 'all' && client.priority !== priorityFilter) continue;

      // Add each contact
      for (let i = 0; i < client.contacts.length; i++) {
        const contact = client.contacts[i];

        // Apply status filter
        if (statusFilter !== 'all' && contact.contactStatus !== statusFilter) continue;

        queue.push({ client, contact, contactIndex: i });
      }
    }

    // Sort by priority (HIGH first), then by created date
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, RESEARCH: 3 };
    queue.sort((a, b) => {
      const aPriority = priorityOrder[a.client.priority || 'RESEARCH'] || 3;
      const bPriority = priorityOrder[b.client.priority || 'RESEARCH'] || 3;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.client.createdAt).getTime() - new Date(b.client.createdAt).getTime();
    });

    return queue;
  }, [clients, statusFilter, priorityFilter]);

  // Statistics
  const stats = useMemo(() => {
    let notContacted = 0;
    let connected = 0;
    let responded = 0;
    let meetingScheduled = 0;

    for (const client of clients) {
      for (const contact of client.contacts) {
        switch (contact.contactStatus) {
          case 'not_contacted': notContacted++; break;
          case 'connected': connected++; break;
          case 'responded': responded++; break;
          case 'meeting_scheduled': meetingScheduled++; break;
        }
      }
    }

    return { notContacted, connected, responded, meetingScheduled, total: notContacted + connected + responded + meetingScheduled };
  }, [clients]);

  // Update contact status
  const updateContactStatus = async (
    clientId: string,
    contactIndex: number,
    newStatus: ContactStatus
  ) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const updatedContacts = [...client.contacts];
    updatedContacts[contactIndex] = {
      ...updatedContacts[contactIndex],
      contactStatus: newStatus,
      lastContactedAt: new Date().toISOString(),
      firstContactedAt: updatedContacts[contactIndex].firstContactedAt || new Date().toISOString(),
    };

    // Update client status if this is the first contact
    const newClientStatus: ClientStatus = newStatus === 'meeting_scheduled' ? 'demo_scheduled' :
      newStatus !== 'not_contacted' ? 'contacted' : client.status;

    const result = await updateClientAsync(clientId, {
      contacts: updatedContacts,
      status: newClientStatus,
      lastContactedAt: new Date().toISOString(),
    });

    if (result.success) {
      setClients(prev => prev.map(c => c.id === clientId ? result.client! : c));
      addToast('Contact status updated', 'success');
      onRefreshClients?.();
    } else {
      addToast('Failed to update status', 'error');
    }
  };

  // Copy message to clipboard
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(key);
      addToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  // Generate unique key for contact
  const getContactKey = (clientId: string, contactIndex: number) => `${clientId}-${contactIndex}`;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Contact Queue</h3>
            <p className="text-sm text-muted-foreground">
              Your outreach to-do list with one-click contact
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadClients} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('not_contacted')}
          className={cn(
            'rounded-lg border p-4 text-left transition-all',
            statusFilter === 'not_contacted' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-2 text-gray-500">
            <Circle className="h-4 w-4" />
            <span className="text-sm font-medium">To Contact</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.notContacted}</p>
        </button>

        <button
          onClick={() => setStatusFilter('connected')}
          className={cn(
            'rounded-lg border p-4 text-left transition-all',
            statusFilter === 'connected' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-2 text-blue-500">
            <Linkedin className="h-4 w-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.connected}</p>
        </button>

        <button
          onClick={() => setStatusFilter('responded')}
          className={cn(
            'rounded-lg border p-4 text-left transition-all',
            statusFilter === 'responded' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-2 text-green-500">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Responded</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.responded}</p>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'rounded-lg border p-4 text-left transition-all',
            statusFilter === 'all' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-2 text-purple-500">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Meetings</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.meetingScheduled}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Priority:</span>
        </div>
        <div className="flex gap-1">
          {(['all', 'HIGH', 'MEDIUM', 'LOW', 'RESEARCH'] as PriorityFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                priorityFilter === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {contactQueue.length} contact{contactQueue.length !== 1 ? 's' : ''} in queue
        </span>
      </div>

      {/* Contact Queue */}
      <div className="space-y-2">
        {contactQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
            <h4 className="font-medium mb-2">
              {statusFilter === 'not_contacted' ? 'All caught up!' : 'No contacts in this filter'}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {statusFilter === 'not_contacted'
                ? 'No pending contacts to reach out to. Add more prospects to continue outreach.'
                : 'Try a different filter or add more prospects.'}
            </p>
            {statusFilter !== 'all' && (
              <Button variant="outline" onClick={() => setStatusFilter('all')}>
                View All Contacts
              </Button>
            )}
          </div>
        ) : (
          contactQueue.map(({ client, contact, contactIndex }) => {
            const key = getContactKey(client.id, contactIndex);
            const isExpanded = expandedContact === key;
            const StatusIcon = CONTACT_STATUS_CONFIG[contact.contactStatus].icon;

            return (
              <div
                key={key}
                className={cn(
                  'rounded-lg border bg-card transition-all',
                  isExpanded && 'ring-1 ring-primary'
                )}
              >
                {/* Contact Row */}
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status Indicator */}
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                      CONTACT_STATUS_CONFIG[contact.contactStatus].color
                    )}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.name || 'Unknown Contact'}</span>
                        {contact.title && (
                          <span className="text-sm text-muted-foreground">• {contact.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{client.companyName}</span>
                        {client.priority && (
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-xs font-medium border',
                            PRIORITY_COLORS[client.priority]
                          )}>
                            {client.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {/* LinkedIn */}
                      {contact.linkedinUrl ? (
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-lg bg-[#0A66C2] text-white flex items-center justify-center hover:bg-[#004182] transition-colors"
                          title="Open LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      ) : client.linkedInUrl ? (
                        <a
                          href={client.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-lg bg-[#0A66C2]/20 text-[#0A66C2] flex items-center justify-center hover:bg-[#0A66C2]/30 transition-colors"
                          title="Company LinkedIn"
                        >
                          <Building2 className="h-4 w-4" />
                        </a>
                      ) : null}

                      {/* Email */}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="h-9 w-9 rounded-lg bg-green-500/20 text-green-600 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                          title={`Email ${contact.email}`}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}

                      {/* Phone */}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="h-9 w-9 rounded-lg bg-purple-500/20 text-purple-600 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
                          title={`Call ${contact.phone}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}

                      {/* Website */}
                      {client.website && (
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-colors"
                          title="Company Website"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}

                      {/* Status Update */}
                      <Select
                        value={contact.contactStatus}
                        onChange={(e) => updateContactStatus(client.id, contactIndex, e.target.value as ContactStatus)}
                        className="h-9 text-xs w-32"
                      >
                        <option value="not_contacted">Not Contacted</option>
                        <option value="connected">Connected</option>
                        <option value="responded">Responded</option>
                        <option value="meeting_scheduled">Meeting Set</option>
                      </Select>

                      {/* Expand */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedContact(isExpanded ? null : key)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-4">
                    {/* Company Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pain Points */}
                      {client.painPoints && (
                        <div>
                          <h6 className="text-xs font-medium text-muted-foreground mb-1">Pain Points</h6>
                          <p className="text-sm">{client.painPoints}</p>
                        </div>
                      )}

                      {/* Estimated Value */}
                      {(client.estimatedTimeSavings || client.estimatedCostSavings) && (
                        <div>
                          <h6 className="text-xs font-medium text-muted-foreground mb-1">Estimated Value</h6>
                          <p className="text-sm">
                            {client.estimatedTimeSavings && <span>Time: {client.estimatedTimeSavings}</span>}
                            {client.estimatedTimeSavings && client.estimatedCostSavings && ' • '}
                            {client.estimatedCostSavings && <span>Cost: {client.estimatedCostSavings}</span>}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* LinkedIn Connect Message */}
                    {contact.linkedInConnectMessage && (
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Linkedin className="h-3 w-3" />
                            LinkedIn Connect Message (300 chars)
                          </h6>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contact.linkedInConnectMessage!, `connect-${key}`)}
                          >
                            {copiedMessage === `connect-${key}` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {contact.linkedInConnectMessage}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {contact.linkedInConnectMessage.length}/300 characters
                        </p>
                      </div>
                    )}

                    {/* LinkedIn Follow-up Message */}
                    {contact.linkedInFollowupMessage && (
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Follow-up Message
                          </h6>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contact.linkedInFollowupMessage!, `followup-${key}`)}
                          >
                            {copiedMessage === `followup-${key}` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">
                          {contact.linkedInFollowupMessage}
                        </p>
                      </div>
                    )}

                    {/* Background Notes */}
                    {contact.backgroundNotes && (
                      <div>
                        <h6 className="text-xs font-medium text-muted-foreground mb-1">Research Notes</h6>
                        <p className="text-sm bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                          {contact.backgroundNotes}
                        </p>
                      </div>
                    )}

                    {/* Contact Details */}
                    <div className="flex items-center gap-4 pt-2 border-t text-sm">
                      {contact.email && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.lastContactedAt && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Last: {new Date(contact.lastContactedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {contact.linkedinUrl && (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (contact.linkedInConnectMessage) {
                              copyToClipboard(contact.linkedInConnectMessage, `connect-${key}`);
                            }
                            window.open(contact.linkedinUrl, '_blank');
                          }}
                          className="bg-[#0A66C2] hover:bg-[#004182]"
                        >
                          <Linkedin className="h-4 w-4 mr-2" />
                          Open LinkedIn & Copy Message
                        </Button>
                      )}
                      {contact.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContactQueuePanel;
