/**
 * EntityInspectorPage — read-only view of an entity's living memory.
 *
 * Pick an entity (account name for now during the beta) and see every fact
 * the system has accumulated about it from prior agent runs. This is what
 * makes structured outputs valuable: they become queryable state rather
 * than ephemeral prose.
 */

import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Database } from 'lucide-react';
import {
  listEntityFacts,
  type PersistedEntityFact,
} from '../../lib/agentic/supabaseClient';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const ENTITY_TYPES = ['account', 'client', 'deal', 'prospect', 'portfolio'];

const EntityInspectorPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [entityType, setEntityType] = React.useState<string>(params.get('type') || 'account');
  const [entityId, setEntityId] = React.useState<string>(params.get('id') || '');
  const [facts, setFacts] = React.useState<PersistedEntityFact[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadFacts = React.useCallback(async () => {
    if (!entityId.trim()) {
      setFacts([]);
      return;
    }
    setLoading(true);
    const data = await listEntityFacts(entityType, entityId.trim());
    setFacts(data);
    setLoading(false);
  }, [entityType, entityId]);

  React.useEffect(() => {
    loadFacts();
  }, [loadFacts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ type: entityType, id: entityId.trim() });
    loadFacts();
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Entity Inspector
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Every fact the system has learned about a given entity, sourced from agent runs and
          persisted in <code>agentic.entity_context</code>.
        </p>
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <select
            className="text-sm p-2 rounded border bg-background"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Entity id (e.g., account name)"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="flex-1 text-sm p-2 rounded border bg-background"
          />
          <Button type="submit" size="sm" disabled={loading}>
            <Search className="h-4 w-4 mr-1" />
            {loading ? 'Loading…' : 'Search'}
          </Button>
        </form>
      </Card>

      {!entityId.trim() ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Pick an entity</CardTitle>
            <CardDescription>
              Enter an account name (or client / deal id) above. After a successful PPC Master
              Weekly run, account names from the Triage step's <code>p1_accounts</code> will
              appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : facts.length === 0 ? (
        <Card status="info">
          <CardHeader>
            <CardTitle className="text-sm">No facts found</CardTitle>
            <CardDescription>
              Either no run has produced facts about this entity yet, or Supabase isn't returning
              data (RLS / config). Try running the Agentic Runner first.
            </CardDescription>
          </CardHeader>
          <Link
            to="/agentic/run/ppc-master-weekly-workflow"
            className="text-sm text-primary underline underline-offset-4 mt-3 inline-block"
          >
            Run PPC Master Weekly →
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {facts.length} fact{facts.length === 1 ? '' : 's'} about{' '}
            <code className="text-foreground">
              {entityType}/{entityId}
            </code>
          </p>
          {facts.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-semibold">{f.key}</code>
                    {f.confidence !== null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        confidence {(f.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <pre className="text-sm bg-muted/40 p-2 rounded mt-1 overflow-x-auto max-h-32">
                    {typeof f.value === 'string' ? f.value : JSON.stringify(f.value, null, 2)}
                  </pre>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    valid from {new Date(f.valid_from).toLocaleString()}
                    {f.valid_until && ` · until ${new Date(f.valid_until).toLocaleString()}`}
                    {f.source_run_id && ` · run ${f.source_run_id.slice(0, 8)}`}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntityInspectorPage;
