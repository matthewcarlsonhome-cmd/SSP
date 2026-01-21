/**
 * Email Sequence Builder
 *
 * Multi-step email campaign templates with:
 * - Template variables ({{companyName}}, {{contactName}}, etc.)
 * - Conditional steps based on responses
 * - Delay configuration between steps
 * - Enrollment and progress tracking
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';
import type { Client, ClientContact } from './storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  isActive: boolean;
  steps: EmailSequenceStep[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailSequenceStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  delayDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
  conditionType?: 'no_response' | 'opened' | 'clicked';
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEnrollment {
  id: string;
  clientId: string;
  contactId: string;
  sequenceId: string;
  currentStep: number;
  status: 'active' | 'paused' | 'completed' | 'unsubscribed' | 'bounced';
  enrolledAt: string;
  lastStepAt?: string;
  nextStepAt?: string;
  completedAt?: string;
}

export interface CreateSequenceInput {
  name: string;
  description?: string;
  industry?: string;
  steps: Array<{
    delayDays: number;
    subjectTemplate: string;
    bodyTemplate: string;
    conditionType?: 'no_response' | 'opened' | 'clicked';
  }>;
}

// Template variable names available in email templates
export const TEMPLATE_VARIABLES = [
  { key: 'contactName', description: 'Contact\'s full name' },
  { key: 'contactFirstName', description: 'Contact\'s first name' },
  { key: 'contactTitle', description: 'Contact\'s job title' },
  { key: 'companyName', description: 'Company name' },
  { key: 'industry', description: 'Company industry' },
  { key: 'portalUrl', description: 'Client\'s portal URL' },
  { key: 'skillCount', description: 'Number of selected skills' },
  { key: 'workflowCount', description: 'Number of selected workflows' },
  { key: 'painPoints', description: 'Identified pain points' },
  { key: 'estimatedTimeSavings', description: 'Estimated time savings' },
  { key: 'estimatedCostSavings', description: 'Estimated cost savings' },
  { key: 'topSkill1', description: 'First recommended skill name' },
  { key: 'topSkill2', description: 'Second recommended skill name' },
  { key: 'topSkill3', description: 'Third recommended skill name' },
  { key: 'senderName', description: 'Your name (Matthew Carlson)' },
  { key: 'senderTitle', description: 'Your title' },
  { key: 'senderPhone', description: 'Your phone number' },
  { key: 'senderLinkedIn', description: 'Your LinkedIn URL' },
];

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE INTERPOLATION
// ═══════════════════════════════════════════════════════════════════════════

interface TemplateContext {
  contact: ClientContact;
  client: Client;
  skillNames?: string[];
  senderName?: string;
  senderTitle?: string;
  senderPhone?: string;
  senderLinkedIn?: string;
}

/**
 * Replace template variables with actual values
 */
export function interpolateTemplate(template: string, context: TemplateContext): string {
  const { contact, client, skillNames = [], senderName, senderTitle, senderPhone, senderLinkedIn } = context;

  const variables: Record<string, string> = {
    contactName: contact.name || '',
    contactFirstName: contact.name?.split(' ')[0] || '',
    contactTitle: contact.title || '',
    companyName: client.companyName,
    industry: client.industry.replace(/_/g, ' '),
    portalUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/#/portal/${client.portalSlug}`,
    skillCount: String(client.selectedSkillIds.length),
    workflowCount: String(client.selectedWorkflowIds.length),
    painPoints: client.painPoints || '',
    estimatedTimeSavings: client.estimatedTimeSavings || '',
    estimatedCostSavings: client.estimatedCostSavings || '',
    topSkill1: skillNames[0] || '',
    topSkill2: skillNames[1] || '',
    topSkill3: skillNames[2] || '',
    senderName: senderName || 'Matthew Carlson',
    senderTitle: senderTitle || 'AI Solutions Consultant',
    senderPhone: senderPhone || '608-284-7333',
    senderLinkedIn: senderLinkedIn || 'https://www.linkedin.com/in/matthewcarlsonconsulting/',
  };

  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, value);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all email sequences
 */
export async function getEmailSequences(): Promise<EmailSequence[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data: sequences, error: seqError } = await supabase
    .from('email_sequences')
    .select('*')
    .order('created_at', { ascending: false });

  if (seqError) {
    logger.error('Failed to fetch email sequences', { error: seqError.message });
    return [];
  }

  // Fetch all steps
  const { data: steps, error: stepsError } = await supabase
    .from('email_sequence_steps')
    .select('*')
    .order('step_number', { ascending: true });

  if (stepsError) {
    logger.error('Failed to fetch sequence steps', { error: stepsError.message });
  }

  const stepsBySequence = new Map<string, EmailSequenceStep[]>();
  for (const step of steps || []) {
    const seqId = step.sequence_id;
    if (!stepsBySequence.has(seqId)) {
      stepsBySequence.set(seqId, []);
    }
    stepsBySequence.get(seqId)!.push({
      id: step.id,
      sequenceId: step.sequence_id,
      stepNumber: step.step_number,
      delayDays: step.delay_days,
      subjectTemplate: step.subject_template,
      bodyTemplate: step.body_template,
      conditionType: step.condition_type,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    });
  }

  return (sequences || []).map(seq => ({
    id: seq.id,
    name: seq.name,
    description: seq.description,
    industry: seq.industry,
    isActive: seq.is_active,
    steps: stepsBySequence.get(seq.id) || [],
    createdAt: seq.created_at,
    updatedAt: seq.updated_at,
  }));
}

/**
 * Get a single email sequence by ID
 */
export async function getEmailSequence(sequenceId: string): Promise<EmailSequence | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data: sequence, error: seqError } = await supabase
    .from('email_sequences')
    .select('*')
    .eq('id', sequenceId)
    .single();

  if (seqError) {
    logger.error('Failed to fetch email sequence', { error: seqError.message });
    return null;
  }

  const { data: steps, error: stepsError } = await supabase
    .from('email_sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('step_number', { ascending: true });

  if (stepsError) {
    logger.error('Failed to fetch sequence steps', { error: stepsError.message });
  }

  return {
    id: sequence.id,
    name: sequence.name,
    description: sequence.description,
    industry: sequence.industry,
    isActive: sequence.is_active,
    steps: (steps || []).map(step => ({
      id: step.id,
      sequenceId: step.sequence_id,
      stepNumber: step.step_number,
      delayDays: step.delay_days,
      subjectTemplate: step.subject_template,
      bodyTemplate: step.body_template,
      conditionType: step.condition_type,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    })),
    createdAt: sequence.created_at,
    updatedAt: sequence.updated_at,
  };
}

/**
 * Create a new email sequence
 */
export async function createEmailSequence(input: CreateSequenceInput): Promise<EmailSequence | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  // Create sequence
  const { data: sequence, error: seqError } = await supabase
    .from('email_sequences')
    .insert({
      name: input.name,
      description: input.description,
      industry: input.industry,
    })
    .select()
    .single();

  if (seqError) {
    logger.error('Failed to create email sequence', { error: seqError.message });
    return null;
  }

  // Create steps
  const stepsToInsert = input.steps.map((step, index) => ({
    sequence_id: sequence.id,
    step_number: index + 1,
    delay_days: step.delayDays,
    subject_template: step.subjectTemplate,
    body_template: step.bodyTemplate,
    condition_type: step.conditionType,
  }));

  const { error: stepsError } = await supabase
    .from('email_sequence_steps')
    .insert(stepsToInsert);

  if (stepsError) {
    logger.error('Failed to create sequence steps', { error: stepsError.message });
    // Clean up the sequence
    await supabase.from('email_sequences').delete().eq('id', sequence.id);
    return null;
  }

  return getEmailSequence(sequence.id);
}

/**
 * Update an email sequence
 */
export async function updateEmailSequence(
  sequenceId: string,
  updates: Partial<Omit<CreateSequenceInput, 'steps'>>
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('email_sequences')
    .update({
      name: updates.name,
      description: updates.description,
      industry: updates.industry,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sequenceId);

  if (error) {
    logger.error('Failed to update email sequence', { error: error.message });
    return false;
  }

  return true;
}

/**
 * Delete an email sequence
 */
export async function deleteEmailSequence(sequenceId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('email_sequences')
    .delete()
    .eq('id', sequenceId);

  if (error) {
    logger.error('Failed to delete email sequence', { error: error.message });
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enroll a contact in an email sequence
 */
export async function enrollContactInSequence(
  clientId: string,
  contactId: string,
  sequenceId: string
): Promise<SequenceEnrollment | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  // Get sequence to calculate first step timing
  const sequence = await getEmailSequence(sequenceId);
  if (!sequence || sequence.steps.length === 0) {
    logger.error('Cannot enroll: sequence not found or has no steps');
    return null;
  }

  const firstStep = sequence.steps[0];
  const nextStepAt = new Date();
  nextStepAt.setDate(nextStepAt.getDate() + firstStep.delayDays);

  const { data, error } = await supabase
    .from('contact_sequence_enrollments')
    .upsert({
      client_id: clientId,
      contact_id: contactId,
      sequence_id: sequenceId,
      current_step: 1,
      status: 'active',
      next_step_at: nextStepAt.toISOString(),
    }, {
      onConflict: 'client_id,contact_id,sequence_id',
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to enroll contact in sequence', { error: error.message });
    return null;
  }

  return {
    id: data.id,
    clientId: data.client_id,
    contactId: data.contact_id,
    sequenceId: data.sequence_id,
    currentStep: data.current_step,
    status: data.status,
    enrolledAt: data.enrolled_at,
    lastStepAt: data.last_step_at,
    nextStepAt: data.next_step_at,
    completedAt: data.completed_at,
  };
}

/**
 * Get enrollments for a contact
 */
export async function getContactEnrollments(
  clientId: string,
  contactId: string
): Promise<SequenceEnrollment[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('contact_sequence_enrollments')
    .select('*')
    .eq('client_id', clientId)
    .eq('contact_id', contactId);

  if (error) {
    logger.error('Failed to fetch contact enrollments', { error: error.message });
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    clientId: row.client_id,
    contactId: row.contact_id,
    sequenceId: row.sequence_id,
    currentStep: row.current_step,
    status: row.status,
    enrolledAt: row.enrolled_at,
    lastStepAt: row.last_step_at,
    nextStepAt: row.next_step_at,
    completedAt: row.completed_at,
  }));
}

/**
 * Get all active enrollments due for next step
 */
export async function getDueEnrollments(): Promise<SequenceEnrollment[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('contact_sequence_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_step_at', new Date().toISOString());

  if (error) {
    logger.error('Failed to fetch due enrollments', { error: error.message });
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    clientId: row.client_id,
    contactId: row.contact_id,
    sequenceId: row.sequence_id,
    currentStep: row.current_step,
    status: row.status,
    enrolledAt: row.enrolled_at,
    lastStepAt: row.last_step_at,
    nextStepAt: row.next_step_at,
    completedAt: row.completed_at,
  }));
}

/**
 * Advance enrollment to next step
 */
export async function advanceEnrollment(enrollmentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  // Get current enrollment
  const { data: enrollment, error: fetchError } = await supabase
    .from('contact_sequence_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    logger.error('Failed to fetch enrollment', { error: fetchError?.message });
    return false;
  }

  // Get sequence to check if there are more steps
  const sequence = await getEmailSequence(enrollment.sequence_id);
  if (!sequence) return false;

  const nextStepNumber = enrollment.current_step + 1;
  const nextStep = sequence.steps.find(s => s.stepNumber === nextStepNumber);

  if (nextStep) {
    // Advance to next step
    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + nextStep.delayDays);

    const { error } = await supabase
      .from('contact_sequence_enrollments')
      .update({
        current_step: nextStepNumber,
        last_step_at: new Date().toISOString(),
        next_step_at: nextStepAt.toISOString(),
      })
      .eq('id', enrollmentId);

    if (error) {
      logger.error('Failed to advance enrollment', { error: error.message });
      return false;
    }
  } else {
    // No more steps - mark as completed
    const { error } = await supabase
      .from('contact_sequence_enrollments')
      .update({
        status: 'completed',
        last_step_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (error) {
      logger.error('Failed to complete enrollment', { error: error.message });
      return false;
    }
  }

  return true;
}

/**
 * Pause an enrollment
 */
export async function pauseEnrollment(enrollmentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('contact_sequence_enrollments')
    .update({ status: 'paused' })
    .eq('id', enrollmentId);

  if (error) {
    logger.error('Failed to pause enrollment', { error: error.message });
    return false;
  }

  return true;
}

/**
 * Resume a paused enrollment
 */
export async function resumeEnrollment(enrollmentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('contact_sequence_enrollments')
    .update({ status: 'active' })
    .eq('id', enrollmentId);

  if (error) {
    logger.error('Failed to resume enrollment', { error: error.message });
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default email sequences to seed the database
 */
export const DEFAULT_EMAIL_SEQUENCES: CreateSequenceInput[] = [
  {
    name: 'Initial Outreach - Marketing Agency',
    description: 'First contact sequence for marketing agencies',
    industry: 'marketing_advertising',
    steps: [
      {
        delayDays: 0,
        subjectTemplate: 'AI tools curated for {{companyName}}',
        bodyTemplate: `Hi {{contactFirstName}},

I came across {{companyName}} and was impressed by your work in the {{industry}} space.

I've put together a custom collection of AI skills specifically for your team - things like campaign analytics dashboards, A/B test analysis, and client reporting automation.

You can explore them here: {{portalUrl}}

Each skill is designed to save your team 2-4 hours per use. Based on the {{skillCount}} skills I've selected, you could reclaim {{estimatedTimeSavings}} monthly.

Worth a quick look?

Best,
{{senderName}}
{{senderTitle}}
{{senderPhone}}`,
      },
      {
        delayDays: 3,
        subjectTemplate: 'Quick follow-up on AI tools for {{companyName}}',
        bodyTemplate: `Hi {{contactFirstName}},

Just wanted to make sure my previous email didn't get lost in the shuffle.

I created a personalized portal with {{skillCount}} AI skills tailored for {{companyName}}: {{portalUrl}}

A few highlights:
- {{topSkill1}}
- {{topSkill2}}
- {{topSkill3}}

Would you have 15 minutes this week to walk through them?

{{senderName}}`,
      },
      {
        delayDays: 7,
        subjectTemplate: 'Last thought on AI for {{companyName}}',
        bodyTemplate: `Hi {{contactFirstName}},

I know you're busy, so I'll keep this brief.

If AI-powered productivity tools are on your radar for 2026, I'd love to show you what I've built for agencies like {{companyName}}.

The portal I created for you is live here: {{portalUrl}}

No pressure - just wanted to make sure you had it in case timing works out later.

Best,
{{senderName}}`,
      },
    ],
  },
  {
    name: 'Initial Outreach - Professional Services',
    description: 'First contact sequence for professional services firms',
    industry: 'professional_services',
    steps: [
      {
        delayDays: 0,
        subjectTemplate: 'Productivity tools for {{companyName}}',
        bodyTemplate: `{{contactFirstName}},

I help professional services firms like {{companyName}} automate time-consuming tasks with AI.

I've curated {{skillCount}} AI skills specifically for your team:
{{portalUrl}}

These include proposal generation, RFP responses, client meeting prep, and process documentation - each designed to save consultants 2-4 hours.

Interested in a quick walkthrough?

{{senderName}}
{{senderTitle}}`,
      },
      {
        delayDays: 4,
        subjectTemplate: 'Re: Productivity tools for {{companyName}}',
        bodyTemplate: `{{contactFirstName}},

Following up on my note about AI productivity tools.

The skills I've selected for {{companyName}} focus on:
- {{topSkill1}}
- {{topSkill2}}
- {{topSkill3}}

You can try them live here: {{portalUrl}}

15 minutes to demo?

{{senderName}}`,
      },
    ],
  },
  {
    name: 'Initial Outreach - General',
    description: 'Universal first contact sequence',
    steps: [
      {
        delayDays: 0,
        subjectTemplate: 'AI skills curated for {{companyName}}',
        bodyTemplate: `Hi {{contactFirstName}},

I've created a custom collection of AI productivity skills for {{companyName}}.

Based on your industry and common challenges, I've selected {{skillCount}} skills and {{workflowCount}} automated workflows that could save your team {{estimatedTimeSavings}} monthly.

Explore them here: {{portalUrl}}

Would you have 15 minutes to discuss how these could help your team?

Best,
{{senderName}}
{{senderTitle}}
{{senderPhone}}`,
      },
      {
        delayDays: 3,
        subjectTemplate: 'Quick follow-up: AI tools for {{companyName}}',
        bodyTemplate: `{{contactFirstName}},

Just following up on my email about AI productivity tools.

The portal I built for {{companyName}} includes skills like:
- {{topSkill1}}
- {{topSkill2}}
- {{topSkill3}}

Take a look when you have a moment: {{portalUrl}}

{{senderName}}`,
      },
      {
        delayDays: 7,
        subjectTemplate: 'Checking in: {{companyName}} AI tools',
        bodyTemplate: `{{contactFirstName}},

Last follow-up - I know you're busy.

If AI productivity is something {{companyName}} is exploring, your custom portal is ready: {{portalUrl}}

Happy to connect whenever timing works.

{{senderName}}`,
      },
    ],
  },
];

/**
 * Seed default email sequences
 */
export async function seedDefaultSequences(): Promise<number> {
  let created = 0;
  for (const sequence of DEFAULT_EMAIL_SEQUENCES) {
    const result = await createEmailSequence(sequence);
    if (result) created++;
  }
  logger.info('Seeded default email sequences', { created });
  return created;
}
