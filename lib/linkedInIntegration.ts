/**
 * LinkedIn Integration
 *
 * Features:
 * - Profile URL validation and parsing
 * - Connection status tracking
 * - Message generation and copying
 * - One-click message copy workflow
 */

import { logger } from './logger';
import type { Client, ClientContact, ContactStatus } from './storage/types';
import { createActivity, logLinkedInConnectSent, logLinkedInConnectAccepted } from './contactActivity';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type LinkedInConnectionStatus =
  | 'not_connected'
  | 'pending'
  | 'connected'
  | 'inmailed';

export interface LinkedInProfile {
  url: string;
  vanityName?: string;  // e.g., "johndoe" from linkedin.com/in/johndoe
  type: 'personal' | 'company';
}

export interface GeneratedMessage {
  connectMessage: string;       // 300 char limit
  followUpMessage: string;      // Longer message for after connection
  inMailMessage?: string;       // Premium InMail message
  characterCount: {
    connect: number;
    followUp: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// URL PARSING AND VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse and validate a LinkedIn URL
 */
export function parseLinkedInUrl(url: string): LinkedInProfile | null {
  if (!url) return null;

  try {
    // Clean up the URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const parsed = new URL(cleanUrl);

    // Validate it's a LinkedIn URL
    if (!parsed.hostname.includes('linkedin.com')) {
      return null;
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Personal profile: linkedin.com/in/username
    if (pathParts[0] === 'in' && pathParts[1]) {
      return {
        url: `https://www.linkedin.com/in/${pathParts[1]}`,
        vanityName: pathParts[1],
        type: 'personal',
      };
    }

    // Company profile: linkedin.com/company/companyname
    if (pathParts[0] === 'company' && pathParts[1]) {
      return {
        url: `https://www.linkedin.com/company/${pathParts[1]}`,
        vanityName: pathParts[1],
        type: 'company',
      };
    }

    // Just return the cleaned URL if we can't parse it further
    return {
      url: cleanUrl,
      type: 'personal',
    };
  } catch {
    return null;
  }
}

/**
 * Validate a LinkedIn URL
 */
export function isValidLinkedInUrl(url: string): boolean {
  return parseLinkedInUrl(url) !== null;
}

/**
 * Get the profile link text from a URL
 */
export function getProfileLinkText(url: string): string {
  const parsed = parseLinkedInUrl(url);
  if (!parsed) return url;
  return parsed.vanityName ? `@${parsed.vanityName}` : url;
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

const CONNECT_MESSAGE_MAX_LENGTH = 300;

/**
 * Generate LinkedIn messages for a contact
 */
export function generateLinkedInMessages(
  contact: ClientContact,
  client: Client,
  skillNames: string[] = []
): GeneratedMessage {
  const firstName = contact.name?.split(' ')[0] || 'there';
  const companyName = client.companyName;
  const industry = client.industry.replace(/_/g, ' ');

  // Connect message (300 char limit) - Science-backed persuasion
  // Use curiosity gap + specific value proposition
  let connectMessage = `Hi ${firstName}, I came across ${companyName} and put together something I think you'll find valuable – a custom collection of AI tools designed specifically for ${industry} companies. Would love to share it with you.`;

  // Trim if too long
  if (connectMessage.length > CONNECT_MESSAGE_MAX_LENGTH) {
    connectMessage = `Hi ${firstName}, I built a custom AI toolkit for ${companyName} based on ${industry} best practices. Would love to share it with you.`;
  }

  if (connectMessage.length > CONNECT_MESSAGE_MAX_LENGTH) {
    connectMessage = `Hi ${firstName}, I created an AI toolkit specifically for ${companyName}. Would love to share it if you're interested!`;
  }

  // Follow-up message (after connection) - More detailed
  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://skillengine.app'}/#/portal/${client.portalSlug}`;

  let followUpMessage = `Thanks for connecting, ${firstName}!

As promised, I wanted to share the custom AI toolkit I put together for ${companyName}:
${portalUrl}

I selected ${client.selectedSkillIds.length} AI skills and ${client.selectedWorkflowIds.length} automated workflows specifically for your team`;

  if (skillNames.length > 0) {
    followUpMessage += `, including:\n• ${skillNames.slice(0, 3).join('\n• ')}`;
  }

  if (client.estimatedTimeSavings) {
    followUpMessage += `\n\nBased on these selections, your team could save ${client.estimatedTimeSavings} monthly.`;
  }

  followUpMessage += `\n\nWould you have 15 minutes this week for a quick walkthrough?

Best,
Matthew Carlson
608-284-7333`;

  // InMail message (for premium users)
  const inMailMessage = `${firstName},

I help ${industry} companies automate time-consuming tasks with AI. After researching ${companyName}, I've curated a collection of ${client.selectedSkillIds.length} AI skills that could save your team significant time.

${client.painPoints ? `Based on common challenges in ${industry} – ${client.painPoints.split('.')[0]} – I've selected tools that directly address these areas.` : ''}

I've created a custom portal where you can explore and try these tools:
${portalUrl}

Would you be open to a 15-minute call to discuss how these could help your team?

Best regards,
Matthew Carlson
AI Solutions Consultant
608-284-7333`;

  return {
    connectMessage,
    followUpMessage,
    inMailMessage,
    characterCount: {
      connect: connectMessage.length,
      followUp: followUpMessage.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIPBOARD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    logger.error('Failed to copy to clipboard', { error });
    return false;
  }
}

/**
 * Copy connect message and log activity
 */
export async function copyConnectMessage(
  message: string,
  clientId: string,
  contactId: string
): Promise<boolean> {
  const success = await copyToClipboard(message);

  if (success) {
    // Log the activity
    await logLinkedInConnectSent(clientId, contactId, message);
  }

  return success;
}

/**
 * Copy follow-up message
 */
export async function copyFollowUpMessage(
  message: string,
  clientId: string,
  contactId: string
): Promise<boolean> {
  const success = await copyToClipboard(message);

  if (success) {
    await createActivity({
      clientId,
      contactId,
      activityType: 'linkedin_message_sent',
      body: message.substring(0, 500),
      channel: 'linkedin',
      direction: 'outbound',
    });
  }

  return success;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map our contact status to LinkedIn connection status
 */
export function getLinkedInStatus(contactStatus: ContactStatus): LinkedInConnectionStatus {
  switch (contactStatus) {
    case 'connected':
    case 'responded':
    case 'meeting_scheduled':
      return 'connected';
    case 'not_contacted':
    default:
      return 'not_connected';
  }
}

/**
 * Get the next action for a LinkedIn contact
 */
export function getNextLinkedInAction(
  contactStatus: ContactStatus,
  hasLinkedInUrl: boolean
): {
  action: 'add_linkedin' | 'send_connect' | 'send_followup' | 'schedule_meeting' | 'none';
  label: string;
  description: string;
} {
  if (!hasLinkedInUrl) {
    return {
      action: 'add_linkedin',
      label: 'Add LinkedIn',
      description: 'Find and add their LinkedIn profile URL',
    };
  }

  switch (contactStatus) {
    case 'not_contacted':
      return {
        action: 'send_connect',
        label: 'Send Connect Request',
        description: 'Copy connect message and send on LinkedIn',
      };
    case 'connected':
      return {
        action: 'send_followup',
        label: 'Send Follow-up',
        description: 'Copy follow-up message with portal link',
      };
    case 'responded':
      return {
        action: 'schedule_meeting',
        label: 'Schedule Meeting',
        description: 'They\'ve responded - schedule a demo call',
      };
    case 'meeting_scheduled':
      return {
        action: 'none',
        label: 'Meeting Scheduled',
        description: 'Prepare for your upcoming demo',
      };
    default:
      return {
        action: 'send_connect',
        label: 'Send Connect Request',
        description: 'Copy connect message and send on LinkedIn',
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW: OPEN PROFILE + COPY MESSAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Open LinkedIn profile in new tab and copy connect message
 */
export async function openProfileAndCopyConnect(
  contact: ClientContact,
  client: Client,
  skillNames: string[] = []
): Promise<{ success: boolean; message?: string }> {
  if (!contact.linkedinUrl) {
    return { success: false, message: 'No LinkedIn URL for this contact' };
  }

  const parsed = parseLinkedInUrl(contact.linkedinUrl);
  if (!parsed) {
    return { success: false, message: 'Invalid LinkedIn URL' };
  }

  // Generate message
  const messages = generateLinkedInMessages(contact, client, skillNames);

  // Copy to clipboard first
  const copied = await copyConnectMessage(messages.connectMessage, client.id, contact.id);
  if (!copied) {
    return { success: false, message: 'Failed to copy message to clipboard' };
  }

  // Open profile in new tab
  window.open(parsed.url, '_blank');

  return {
    success: true,
    message: `Connect message copied! Opening ${contact.name}'s profile...`,
  };
}

/**
 * Open LinkedIn profile in new tab and copy follow-up message
 */
export async function openProfileAndCopyFollowUp(
  contact: ClientContact,
  client: Client,
  skillNames: string[] = []
): Promise<{ success: boolean; message?: string }> {
  if (!contact.linkedinUrl) {
    return { success: false, message: 'No LinkedIn URL for this contact' };
  }

  const parsed = parseLinkedInUrl(contact.linkedinUrl);
  if (!parsed) {
    return { success: false, message: 'Invalid LinkedIn URL' };
  }

  // Generate message
  const messages = generateLinkedInMessages(contact, client, skillNames);

  // Copy to clipboard first
  const copied = await copyFollowUpMessage(messages.followUpMessage, client.id, contact.id);
  if (!copied) {
    return { success: false, message: 'Failed to copy message to clipboard' };
  }

  // Open profile in new tab
  window.open(parsed.url, '_blank');

  return {
    success: true,
    message: `Follow-up message copied! Opening ${contact.name}'s profile...`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get contacts ready for LinkedIn outreach
 */
export function getContactsForOutreach(
  clients: Client[]
): Array<{
  client: Client;
  contact: ClientContact;
  nextAction: ReturnType<typeof getNextLinkedInAction>;
}> {
  const results: Array<{
    client: Client;
    contact: ClientContact;
    nextAction: ReturnType<typeof getNextLinkedInAction>;
  }> = [];

  for (const client of clients) {
    if (!client.portalEnabled) continue;

    for (const contact of client.contacts || []) {
      const nextAction = getNextLinkedInAction(
        contact.contactStatus,
        Boolean(contact.linkedinUrl)
      );

      if (nextAction.action !== 'none') {
        results.push({ client, contact, nextAction });
      }
    }
  }

  // Sort by action priority: send_connect first, then send_followup
  const actionPriority: Record<string, number> = {
    send_connect: 1,
    send_followup: 2,
    add_linkedin: 3,
    schedule_meeting: 4,
    none: 5,
  };

  results.sort((a, b) =>
    (actionPriority[a.nextAction.action] || 5) - (actionPriority[b.nextAction.action] || 5)
  );

  return results;
}

/**
 * Generate a summary of LinkedIn outreach status
 */
export function getOutreachSummary(clients: Client[]): {
  totalContacts: number;
  needsLinkedIn: number;
  readyToConnect: number;
  pendingAcceptance: number;
  readyForFollowUp: number;
  meetingsScheduled: number;
} {
  let totalContacts = 0;
  let needsLinkedIn = 0;
  let readyToConnect = 0;
  let pendingAcceptance = 0;
  let readyForFollowUp = 0;
  let meetingsScheduled = 0;

  for (const client of clients) {
    if (!client.portalEnabled) continue;

    for (const contact of client.contacts || []) {
      totalContacts++;

      if (!contact.linkedinUrl) {
        needsLinkedIn++;
      } else {
        switch (contact.contactStatus) {
          case 'not_contacted':
            readyToConnect++;
            break;
          case 'connected':
            readyForFollowUp++;
            break;
          case 'responded':
            pendingAcceptance++;
            break;
          case 'meeting_scheduled':
            meetingsScheduled++;
            break;
        }
      }
    }
  }

  return {
    totalContacts,
    needsLinkedIn,
    readyToConnect,
    pendingAcceptance,
    readyForFollowUp,
    meetingsScheduled,
  };
}
