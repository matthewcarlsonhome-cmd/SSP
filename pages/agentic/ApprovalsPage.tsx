/**
 * ApprovalsPage — review queue for actions agents want to take that are
 * gated by policy.
 *
 * Reads from agentic.approvals where resolved_at is null. Displays a card
 * per pending action with the proposed payload, the agent's reasoning, and
 * approve/reject controls. Editing a proposed action before approval is a
 * Phase 5 follow-on; the structure is in place via the `edited_action`
 * column but not exposed in the UI yet.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import {
  listPendingApprovals,
  type PersistedApproval,
} from '../../lib/agentic/supabaseClient';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = React.useState<PersistedApproval[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const data = await listPendingApprovals(50);
    setApprovals(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Approvals queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Actions agents proposed that policy requires a human to approve before execution.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : approvals.length === 0 ? (
        <Card className="border-dashed text-center py-10">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <CardTitle className="text-base">Inbox zero</CardTitle>
          <CardDescription className="mt-1 max-w-sm mx-auto">
            No actions awaiting review. As agents propose side-effecting actions (sending email,
            modifying ad accounts), they will appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-base">
                    Run {a.agent_run_id.slice(0, 8)}…
                  </CardTitle>
                </div>
                <CardDescription>
                  Requested {new Date(a.requested_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              {a.reasoning && (
                <p className="text-sm mt-3">
                  <span className="font-medium">Reasoning: </span>
                  {a.reasoning}
                </p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Proposed action payload
                </summary>
                <pre className="text-xs bg-muted/40 p-2 rounded mt-2 overflow-x-auto">
                  {JSON.stringify(a.requested_action, null, 2)}
                </pre>
              </details>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="success" disabled>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" disabled>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <p className="text-xs text-muted-foreground self-center ml-2">
                  Approval execution wires up in Phase 5.
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
