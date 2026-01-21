/**
 * ClientResearchPanel - AI-Powered Research Assistant UI
 *
 * One-click research for clients with:
 * - Pain point analysis
 * - Skill/workflow recommendations
 * - Industry insights
 * - Apply suggestions to client
 */

import React, { useState, useCallback } from 'react';
import {
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
  GitBranch,
  RefreshCw,
  ArrowRight,
  Brain,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/theme';
import {
  runFullClientResearch,
  getQuickRecommendations,
  type FullResearchResult,
} from '../lib/clientResearch';
import type { Client } from '../lib/storage/types';

interface ClientResearchPanelProps {
  client: Client;
  onApplySuggestions: (updates: Partial<Client>) => void;
  className?: string;
}

export const ClientResearchPanel: React.FC<ClientResearchPanelProps> = ({
  client,
  onApplySuggestions,
  className,
}) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<FullResearchResult | null>(null);
  const [quickRecs, setQuickRecs] = useState<ReturnType<typeof getQuickRecommendations> | null>(null);
  const [appliedUpdates, setAppliedUpdates] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  // Run full AI research
  const handleRunResearch = useCallback(async () => {
    setIsResearching(true);
    setResearchResult(null);

    try {
      const result = await runFullClientResearch(client);
      setResearchResult(result);
    } catch (error) {
      console.error('Research failed:', error);
    } finally {
      setIsResearching(false);
    }
  }, [client]);

  // Get quick recommendations (no AI needed)
  const handleQuickRecs = useCallback(() => {
    const recs = getQuickRecommendations(client);
    setQuickRecs(recs);
  }, [client]);

  // Apply a specific suggestion
  const handleApply = (key: string, value: unknown) => {
    onApplySuggestions({ [key]: value } as Partial<Client>);
    setAppliedUpdates(prev => new Set(prev).add(key));
  };

  // Apply all suggestions
  const handleApplyAll = () => {
    if (researchResult?.suggestedUpdates) {
      onApplySuggestions(researchResult.suggestedUpdates as Partial<Client>);
      setAppliedUpdates(new Set(Object.keys(researchResult.suggestedUpdates)));
    }
  };

  // Copy text to clipboard
  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const hasUpdates = researchResult?.suggestedUpdates &&
    Object.keys(researchResult.suggestedUpdates).length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Research Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickRecs}
            disabled={isResearching}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            Quick Recs
          </Button>
          <Button
            size="sm"
            onClick={handleRunResearch}
            disabled={isResearching}
          >
            {isResearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Run AI Research
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Recommendations */}
      {quickRecs && !researchResult && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Quick Recommendations
            </h4>
            <span className="text-xs text-muted-foreground">
              Based on industry: {client.industry.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Industry Pain Points */}
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-2">
              Common Pain Points
            </h5>
            <ul className="space-y-1">
              {quickRecs.industryPainPoints.map((point, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Target className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested Skills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Suggested Skills ({quickRecs.suggestedSkills.length})
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApply('selectedSkillIds', quickRecs.suggestedSkills)}
                disabled={appliedUpdates.has('selectedSkillIds')}
              >
                {appliedUpdates.has('selectedSkillIds') ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <>Apply</>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {quickRecs.suggestedSkills.slice(0, 6).map(skillId => (
                <span
                  key={skillId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs"
                >
                  <Zap className="h-3 w-3" />
                  {skillId.replace(/-/g, ' ')}
                </span>
              ))}
              {quickRecs.suggestedSkills.length > 6 && (
                <span className="text-xs text-muted-foreground px-2 py-1">
                  +{quickRecs.suggestedSkills.length - 6} more
                </span>
              )}
            </div>
          </div>

          {/* Suggested Workflows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Suggested Workflows ({quickRecs.suggestedWorkflows.length})
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApply('selectedWorkflowIds', quickRecs.suggestedWorkflows)}
                disabled={appliedUpdates.has('selectedWorkflowIds')}
              >
                {appliedUpdates.has('selectedWorkflowIds') ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <>Apply</>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {quickRecs.suggestedWorkflows.map(workflowId => (
                <span
                  key={workflowId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs"
                >
                  <GitBranch className="h-3 w-3" />
                  {workflowId.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Research Results */}
      {researchResult && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {researchResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">
                {researchResult.success ? 'Research Complete' : 'Partial Results'}
              </span>
            </div>
            {hasUpdates && (
              <Button
                size="sm"
                onClick={handleApplyAll}
                disabled={appliedUpdates.size >= Object.keys(researchResult.suggestedUpdates).length}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Apply All Suggestions
              </Button>
            )}
          </div>

          {/* Errors */}
          {researchResult.errors.length > 0 && (
            <div className="text-sm text-yellow-600 bg-yellow-500/10 rounded p-2">
              {researchResult.errors.join(', ')}
            </div>
          )}

          {/* Pain Points Summary */}
          {researchResult.painPoints?.summary && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-muted-foreground">
                  Company Analysis
                </h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(researchResult.painPoints!.summary!, 'summary')}
                >
                  {copied === 'summary' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {researchResult.painPoints.summary}
              </p>
            </div>
          )}

          {/* Key Insights */}
          {researchResult.painPoints?.keyInsights && researchResult.painPoints.keyInsights.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-2">
                Key Insights
              </h5>
              <ul className="space-y-1">
                {researchResult.painPoints.keyInsights.map((insight, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    {insight.startsWith('Pain:') ? (
                      <Target className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{insight.replace(/^(Pain:|Opportunity:)\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Updates */}
          {hasUpdates && (
            <div className="space-y-3 pt-3 border-t">
              <h5 className="text-sm font-medium">Suggested Updates</h5>

              {researchResult.suggestedUpdates.description && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <p className="text-sm">{researchResult.suggestedUpdates.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApply('description', researchResult.suggestedUpdates.description)}
                    disabled={appliedUpdates.has('description')}
                  >
                    {appliedUpdates.has('description') ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              )}

              {researchResult.suggestedUpdates.painPoints && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Pain Points</span>
                    <p className="text-sm">{researchResult.suggestedUpdates.painPoints}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApply('painPoints', researchResult.suggestedUpdates.painPoints)}
                    disabled={appliedUpdates.has('painPoints')}
                  >
                    {appliedUpdates.has('painPoints') ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              )}

              {researchResult.suggestedUpdates.keyUseCases && researchResult.suggestedUpdates.keyUseCases.length > 0 && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Key Use Cases</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {researchResult.suggestedUpdates.keyUseCases.map((useCase, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded bg-muted text-xs"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApply('keyUseCases', researchResult.suggestedUpdates.keyUseCases)}
                    disabled={appliedUpdates.has('keyUseCases')}
                  >
                    {appliedUpdates.has('keyUseCases') ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              )}

              {researchResult.suggestedUpdates.selectedSkillIds && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">
                      Recommended Skills ({researchResult.suggestedUpdates.selectedSkillIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {researchResult.suggestedUpdates.selectedSkillIds.slice(0, 5).map(skillId => (
                        <span
                          key={skillId}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs"
                        >
                          <Zap className="h-3 w-3" />
                          {skillId.replace(/-/g, ' ').substring(0, 20)}
                        </span>
                      ))}
                      {researchResult.suggestedUpdates.selectedSkillIds.length > 5 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{researchResult.suggestedUpdates.selectedSkillIds.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApply('selectedSkillIds', researchResult.suggestedUpdates.selectedSkillIds)}
                    disabled={appliedUpdates.has('selectedSkillIds')}
                  >
                    {appliedUpdates.has('selectedSkillIds') ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Re-run button */}
          <div className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunResearch}
              disabled={isResearching}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Run Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!quickRecs && !researchResult && !isResearching && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Use AI to analyze {client.companyName} and get personalized recommendations
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handleQuickRecs}>
              Quick Recommendations
            </Button>
            <Button size="sm" onClick={handleRunResearch}>
              <Sparkles className="h-4 w-4 mr-1" />
              Full AI Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientResearchPanel;
