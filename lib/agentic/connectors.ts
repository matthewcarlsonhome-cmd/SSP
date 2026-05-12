/**
 * Side-effect connector framework.
 *
 * These are not live integrations yet. They define the stable envelope for
 * drafting, policy-checking, approval diffs, and eventual execution of
 * business actions outside the LLM runtime.
 */

import { evaluateAction, type PolicyContext, type PolicyEvaluation, type ProposedAction, type ProposedActionKind } from './policy';

export type ConnectorKind =
  | 'email'
  | 'calendar'
  | 'crm'
  | 'ads'
  | 'spreadsheet'
  | 'document'
  | 'task';

export type ConnectorActionKind =
  | 'email.draft'
  | 'email.send'
  | 'calendar.create_event'
  | 'crm.update_record'
  | 'ads.propose_change'
  | 'spreadsheet.create'
  | 'document.create'
  | 'task.create';

export interface ConnectorDescriptor {
  id: ConnectorKind;
  name: string;
  description: string;
  actionKinds: ConnectorActionKind[];
  sideEffects: boolean;
  approvalRequiredByDefault: boolean;
  credentialKey?: string;
}

export interface ConnectorActionDraft {
  id: string;
  connectorId: ConnectorKind;
  actionKind: ConnectorActionKind;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  affects?: Array<{ type: string; id: string }>;
  estimatedCostCents?: number;
}

export interface ApprovalDiff {
  changedKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  summary: string;
}

export interface ConnectorPlan {
  draft: ConnectorActionDraft;
  proposedAction: ProposedAction;
  policy: PolicyEvaluation;
  approvalDiff?: ApprovalDiff;
}

export type ConnectorExecutionStatus =
  | 'drafted'
  | 'approval-required'
  | 'integration-required'
  | 'denied'
  | 'dry-run';

export interface ConnectorAuditEvent {
  id: string;
  at: string;
  actionKind: ConnectorActionKind;
  connectorId: ConnectorKind;
  status: ConnectorExecutionStatus;
  summary: string;
}

export interface ConnectorExecutionResult {
  status: ConnectorExecutionStatus;
  plan: ConnectorPlan;
  artifact?: Record<string, unknown>;
  approvalRequired: boolean;
  externalIntegrationRequired: boolean;
  auditEvent: ConnectorAuditEvent;
}

export interface ConnectorImplementationStatus {
  actionKind: ConnectorActionKind;
  order: number;
  connectorId: ConnectorKind;
  allowedWithoutExternalIntegration: boolean;
  requiresExternalIntegration: boolean;
  requiresPolicyApproval: boolean;
  status: 'planned' | 'draft-ready' | 'integration-required';
}

export const CONNECTOR_IMPLEMENTATION_ORDER: ConnectorActionKind[] = [
  'document.create',
  'task.create',
  'email.draft',
  'calendar.create_event',
  'crm.update_record',
  'spreadsheet.create',
  'ads.propose_change',
  'email.send',
];

export const CONNECTOR_REGISTRY: Record<ConnectorKind, ConnectorDescriptor> = {
  email: {
    id: 'email',
    name: 'Email',
    description: 'Draft and send business emails.',
    actionKinds: ['email.draft', 'email.send'],
    sideEffects: true,
    approvalRequiredByDefault: true,
    credentialKey: 'email',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    description: 'Create calendar events and meeting briefs.',
    actionKinds: ['calendar.create_event'],
    sideEffects: true,
    approvalRequiredByDefault: true,
    credentialKey: 'calendar',
  },
  crm: {
    id: 'crm',
    name: 'CRM',
    description: 'Update accounts, contacts, deals, and activities.',
    actionKinds: ['crm.update_record'],
    sideEffects: true,
    approvalRequiredByDefault: true,
    credentialKey: 'crm',
  },
  ads: {
    id: 'ads',
    name: 'Ad Accounts',
    description: 'Propose or apply Google Ads and paid media changes.',
    actionKinds: ['ads.propose_change'],
    sideEffects: true,
    approvalRequiredByDefault: true,
    credentialKey: 'google_ads',
  },
  spreadsheet: {
    id: 'spreadsheet',
    name: 'Spreadsheet',
    description: 'Create spreadsheet models and tabular artifacts.',
    actionKinds: ['spreadsheet.create'],
    sideEffects: false,
    approvalRequiredByDefault: false,
  },
  document: {
    id: 'document',
    name: 'Document',
    description: 'Create memo, brief, proposal, and report artifacts.',
    actionKinds: ['document.create'],
    sideEffects: false,
    approvalRequiredByDefault: false,
  },
  task: {
    id: 'task',
    name: 'Task Management',
    description: 'Create project tasks, owners, and due dates.',
    actionKinds: ['task.create'],
    sideEffects: true,
    approvalRequiredByDefault: true,
    credentialKey: 'tasks',
  },
};

function proposedActionKind(actionKind: ConnectorActionKind): ProposedActionKind {
  if (actionKind === 'email.send') return 'send_email';
  if (actionKind === 'ads.propose_change') return 'modify_ad_account';
  if (actionKind === 'document.create' || actionKind === 'spreadsheet.create') return 'create_doc';
  return 'tool_call';
}

function connectorForAction(actionKind: ConnectorActionKind): ConnectorDescriptor {
  const connector = Object.values(CONNECTOR_REGISTRY).find((candidate) => candidate.actionKinds.includes(actionKind));
  if (!connector) throw new Error(`No connector registered for action kind ${actionKind}.`);
  return connector;
}

export function connectorActionAllowedWithoutExternalIntegration(actionKind: ConnectorActionKind): boolean {
  return (
    actionKind === 'document.create' ||
    actionKind === 'task.create' ||
    actionKind === 'email.draft' ||
    actionKind === 'spreadsheet.create' ||
    actionKind === 'ads.propose_change'
  );
}

export function connectorActionRequiresExternalIntegration(actionKind: ConnectorActionKind): boolean {
  return !connectorActionAllowedWithoutExternalIntegration(actionKind);
}

export function connectorActionRequiresApproval(actionKind: ConnectorActionKind): boolean {
  const connector = connectorForAction(actionKind);
  return connector.approvalRequiredByDefault || connector.sideEffects || connectorActionRequiresExternalIntegration(actionKind);
}

export function listConnectorImplementationOrder(): ConnectorImplementationStatus[] {
  return CONNECTOR_IMPLEMENTATION_ORDER.map((actionKind, index) => {
    const connector = connectorForAction(actionKind);
    const allowedWithoutExternalIntegration = connectorActionAllowedWithoutExternalIntegration(actionKind);
    return {
      actionKind,
      order: index + 1,
      connectorId: connector.id,
      allowedWithoutExternalIntegration,
      requiresExternalIntegration: !allowedWithoutExternalIntegration,
      requiresPolicyApproval: connectorActionRequiresApproval(actionKind),
      status: allowedWithoutExternalIntegration ? 'draft-ready' : 'integration-required',
    };
  });
}

export function createApprovalDiff(
  before: Record<string, unknown> = {},
  after: Record<string, unknown> = {},
): ApprovalDiff {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changedKeys = keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return {
    changedKeys,
    before,
    after,
    summary:
      changedKeys.length === 0
        ? 'No material changes.'
        : `${changedKeys.length} field(s) will change: ${changedKeys.join(', ')}.`,
  };
}

export function connectorActionToProposedAction(draft: ConnectorActionDraft, agentId: string): ProposedAction {
  return {
    kind: proposedActionKind(draft.actionKind),
    agentId,
    description: draft.description,
    payload: {
      connectorId: draft.connectorId,
      actionKind: draft.actionKind,
      ...draft.payload,
    },
    estimatedCostCents: draft.estimatedCostCents,
    affects: draft.affects,
  };
}

export function planConnectorAction(args: {
  agentId: string;
  actionKind: ConnectorActionKind;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  policyContext: PolicyContext;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  affects?: Array<{ type: string; id: string }>;
  estimatedCostCents?: number;
}): ConnectorPlan {
  const connector = connectorForAction(args.actionKind);
  const draft: ConnectorActionDraft = {
    id: `${args.actionKind}:${Date.now()}`,
    connectorId: connector.id,
    actionKind: args.actionKind,
    title: args.title,
    description: args.description,
    payload: args.payload,
    before: args.before,
    after: args.after,
    affects: args.affects,
    estimatedCostCents: args.estimatedCostCents,
  };
  const proposedAction = connectorActionToProposedAction(draft, args.agentId);
  const policy = evaluateAction(proposedAction, args.policyContext);
  const approvalDiff =
    connector.sideEffects || args.before || args.after
      ? createApprovalDiff(args.before, args.after ?? args.payload)
      : undefined;
  return { draft, proposedAction, policy, approvalDiff };
}

function localArtifactForDraft(draft: ConnectorActionDraft): Record<string, unknown> {
  if (draft.actionKind === 'email.draft') {
    return {
      type: 'email-draft',
      to: draft.payload.to ?? [],
      subject: draft.payload.subject ?? draft.title,
      body: draft.payload.body ?? draft.payload.emailDraft ?? '',
    };
  }
  if (draft.actionKind === 'document.create') {
    return {
      type: 'document-draft',
      title: draft.payload.title ?? draft.title,
      markdown: draft.payload.markdown ?? draft.payload.body ?? draft.description,
    };
  }
  if (draft.actionKind === 'task.create') {
    return {
      type: 'task-draft',
      tasks: draft.payload.tasks ?? [
        {
          title: draft.payload.title ?? draft.title,
          description: draft.payload.description ?? draft.description,
          dueDate: draft.payload.dueDate,
          owner: draft.payload.owner,
        },
      ],
    };
  }
  if (draft.actionKind === 'spreadsheet.create') {
    return {
      type: 'spreadsheet-draft',
      title: draft.payload.title ?? draft.title,
      sheets: draft.payload.sheets ?? [],
    };
  }
  if (draft.actionKind === 'ads.propose_change') {
    return {
      type: 'ads-change-proposal',
      proposal: draft.payload,
    };
  }
  return { type: 'connector-action', payload: draft.payload };
}

function auditEventForExecution(
  plan: ConnectorPlan,
  status: ConnectorExecutionStatus,
): ConnectorAuditEvent {
  return {
    id: `connector-audit:${plan.draft.id}:${status}`,
    at: new Date().toISOString(),
    actionKind: plan.draft.actionKind,
    connectorId: plan.draft.connectorId,
    status,
    summary: `${plan.draft.actionKind} ${status}: ${plan.draft.title}`,
  };
}

export function executeConnectorAction(args: {
  agentId: string;
  actionKind: ConnectorActionKind;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  policyContext: PolicyContext;
  credentials?: Partial<Record<string, boolean>>;
  dryRun?: boolean;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  affects?: Array<{ type: string; id: string }>;
  estimatedCostCents?: number;
}): ConnectorExecutionResult {
  const plan = planConnectorAction(args);
  const hasIntegration = connectorAvailable(plan.draft.connectorId, args.credentials ?? {});
  const allowedLocal = connectorActionAllowedWithoutExternalIntegration(args.actionKind);
  const externalIntegrationRequired = !allowedLocal && !hasIntegration;
  const policyDenied = plan.policy.decision === 'deny';
  const approvalRequired =
    !policyDenied &&
    !allowedLocal &&
    (plan.policy.decision === 'require-approval' || connectorActionRequiresApproval(args.actionKind));

  const status: ConnectorExecutionStatus = args.dryRun
    ? 'dry-run'
    : policyDenied
      ? 'denied'
      : externalIntegrationRequired
        ? 'integration-required'
        : approvalRequired
          ? 'approval-required'
          : 'drafted';

  return {
    status,
    plan,
    artifact: status === 'drafted' || status === 'dry-run' ? localArtifactForDraft(plan.draft) : undefined,
    approvalRequired,
    externalIntegrationRequired,
    auditEvent: auditEventForExecution(plan, status),
  };
}

export function connectorAvailable(
  connectorId: ConnectorKind,
  credentials: Partial<Record<string, boolean>>,
): boolean {
  const connector = CONNECTOR_REGISTRY[connectorId];
  if (!connector.credentialKey) return true;
  return Boolean(credentials[connector.credentialKey]);
}

export function listConnectors(): ConnectorDescriptor[] {
  return Object.values(CONNECTOR_REGISTRY);
}
