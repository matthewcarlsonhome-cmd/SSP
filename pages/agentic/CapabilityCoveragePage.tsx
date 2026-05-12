import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ListChecks, XCircle } from 'lucide-react';
import {
  buildCapabilityCoverageRows,
  capabilityCoverageRowsToCsv,
  filterCapabilityCoverageRows,
  listToolCapabilities,
  type CapabilityCoverageRow,
  type CapabilityCoverageFilter,
} from '../../lib/agentic';
import { getAllLibrarySkills } from '../../lib/skillLibrary';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

const CapabilityCoveragePage: React.FC = () => {
  const capabilities = React.useMemo(() => listToolCapabilities({ includePlanned: true }), []);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<NonNullable<CapabilityCoverageFilter['status']>>('all');
  const [missingFilter, setMissingFilter] = React.useState<NonNullable<CapabilityCoverageFilter['missing']>>('all');
  const librarySkillIds = React.useMemo(
    () => getAllLibrarySkills().map((skill) => skill.id),
    [],
  );
  const rows = React.useMemo(
    () => buildCapabilityCoverageRows(capabilities, librarySkillIds),
    [capabilities, librarySkillIds],
  );
  const completeRows = rows.filter(isAgentReady).length;
  const registeredCapabilities = rows.filter((row) => row.capabilityExists).length;
  const missingCapabilities = rows.filter((row) => !row.capabilityExists).length;
  const filteredRows = React.useMemo(
    () => filterCapabilityCoverageRows(rows, {
      search,
      status: statusFilter,
      missing: missingFilter,
    }),
    [missingFilter, rows, search, statusFilter],
  );
  const handleExportCsv = () => {
    const blob = new Blob([capabilityCoverageRowsToCsv(filteredRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentic-capability-coverage.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Capability Coverage
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Registry coverage for the agent-facing contracts that make skills composable by a goal planner.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        <Metric label="Skill surface" value={rows.length} />
        <Metric label="Registered caps" value={registeredCapabilities} />
        <Metric label="Agent-ready" value={completeRows} />
        <Metric label="Missing caps" value={missingCapabilities} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Migration checklist</CardTitle>
              <CardDescription>
                One row per registered capability or library skill. Missing rows identify the skill surface still waiting for agent-ready contracts.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Export CSV
            </button>
          </div>
        </CardHeader>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search skills or recommendations"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as NonNullable<CapabilityCoverageFilter['status']>)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="planned">Planned</option>
            <option value="connector-required">Connector required</option>
            <option value="missing">Missing</option>
          </select>
          <select
            value={missingFilter}
            onChange={(event) => setMissingFilter(event.target.value as NonNullable<CapabilityCoverageFilter['missing']>)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All gaps</option>
            <option value="capability">Missing capability</option>
            <option value="output-contract">Missing output contract</option>
            <option value="axioms">Missing axioms</option>
            <option value="language-games">Missing language games</option>
            <option value="side-effects">Missing side effects</option>
            <option value="examples">Missing examples</option>
          </select>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-2 pr-3">Skill id</th>
                <th className="py-2 pr-3">Capability</th>
                <th className="py-2 pr-3 text-center">Output contract</th>
                <th className="py-2 pr-3 text-center">Russellian axioms</th>
                <th className="py-2 pr-3 text-center">Language games</th>
                <th className="py-2 pr-3">Default tier</th>
                <th className="py-2 pr-3 text-center">Side effects</th>
                <th className="py-2 pr-3 text-center">Examples</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`${row.skillId}-${row.capabilityId ?? 'missing'}`} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3 font-medium">
                    <code className="text-xs">{row.skillId}</code>
                  </td>
                  <td className="py-2 pr-3">
                    {row.capabilityExists ? (
                      <div>
                        <div className="font-medium">{row.capabilityId}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">missing</span>
                    )}
                  </td>
                  <BooleanCell value={row.outputContractExists} />
                  <BooleanCell value={row.russellianAxiomsPresent} />
                  <BooleanCell value={row.wittgensteinianLanguageGamesPresent} />
                  <td className="py-2 pr-3">
                    {row.defaultModelTier ? <code className="text-xs">{row.defaultModelTier}</code> : <span className="text-muted-foreground">n/a</span>}
                  </td>
                  <BooleanCell value={row.sideEffectsDeclared} />
                  <BooleanCell value={row.examplesPresent} />
                  <td className="py-2 pr-3">
                    <code className="text-xs">{Math.round(row.readinessScore * 100)}%</code>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold bg-muted text-muted-foreground">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground max-w-xs">
                    {row.recommendedAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

function isAgentReady(row: CapabilityCoverageRow): boolean {
  return (
    row.capabilityExists &&
    row.outputContractExists &&
    row.russellianAxiomsPresent &&
    row.wittgensteinianLanguageGamesPresent &&
    row.sideEffectsDeclared &&
    row.examplesPresent
  );
}

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Card size="sm">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </Card>
);

const BooleanCell: React.FC<{ value: boolean }> = ({ value }) => (
  <td className="py-2 pr-3 text-center">
    {value ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600 inline-block" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600 inline-block" />
    )}
  </td>
);

export default CapabilityCoveragePage;
