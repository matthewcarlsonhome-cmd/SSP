/**
 * Portal Tester - Automated testing of portal skills and workflows
 *
 * Runs smoke tests against all client portals to verify:
 * 1. Portal proxy is working
 * 2. Skills execute and return non-empty output
 * 3. Workflows execute and return non-empty output
 */

import { supabase } from './supabase';
import { getClients } from './clients';
import { SKILLS } from './skills';
import { WORKFLOWS } from './workflows';
import { callPortalProxy } from './portalProxy';
import { getLibrarySkill, type LibrarySkill } from './skillLibrary';
import type { Client } from './storage/types';
import type { Skill } from '../types';
import type { Workflow } from './storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TestRun {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  clientsTested: number;
  skillsPerClient: number;
  workflowsPerClient: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostCents: number;
}

export interface TestResult {
  id: string;
  runId: string;
  clientId: string;
  clientName: string;
  portalSlug: string;
  testType: 'skill' | 'workflow';
  itemId: string;
  itemName: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  errorMessage?: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  outputPreview?: string;
  executedAt: Date;
}

export interface TestProgress {
  runId: string;
  currentClient: string;
  currentItem: string;
  currentItemType: 'skill' | 'workflow';
  completedTests: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  percentComplete: number;
}

export type ProgressCallback = (progress: TestProgress) => void;
export type ResultCallback = (result: TestResult) => void;

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAL SMOKE TEST DATA
// These are tiny payloads designed to get a valid response with minimal tokens
// ═══════════════════════════════════════════════════════════════════════════

const SMOKE_TEST_DATA: Record<string, Record<string, string>> = {
  // Job seeker skills
  'job-seeker-resume': {
    userBackground: 'Software engineer, 5 years experience, Python, JavaScript',
    jobDescription: 'Senior Developer role at tech company',
  },
  'job-seeker-cover-letter': {
    userBackground: 'Marketing manager, 3 years B2B SaaS',
    jobDescription: 'Marketing Director at startup',
  },
  'job-seeker-interview-prep': {
    userBackground: 'Data analyst with SQL and Python',
    jobDescription: 'Senior Data Analyst position',
  },
  'job-seeker-linkedin': {
    userBackground: 'Sales professional, 10 years enterprise software',
    targetRole: 'VP of Sales',
  },
  'job-seeker-thank-you': {
    interviewDetails: 'Interviewed for Product Manager role, discussed roadmap planning',
    interviewerName: 'Jane Smith',
  },
  'job-seeker-salary-negotiation': {
    currentOffer: '$120,000 base, standard benefits',
    marketData: 'Similar roles pay $130-150k in this market',
  },

  // Enterprise skills
  'enterprise-email': {
    context: 'Follow up on Q4 budget proposal',
    recipient: 'CFO',
    tone: 'Professional',
  },
  'enterprise-meeting-notes': {
    meetingNotes: 'Discussed Q1 roadmap. Action items: finalize specs by Friday.',
  },
  'enterprise-presentation': {
    topic: 'Q4 Results Summary',
    audience: 'Executive team',
  },
  'enterprise-proposal': {
    projectDescription: 'CRM implementation for sales team',
    clientContext: 'Mid-size manufacturing company',
  },
  'enterprise-report': {
    dataPoints: 'Revenue up 15%, customer satisfaction 4.2/5',
    reportType: 'Quarterly business review',
  },

  // Excel/data skills
  'excel-formula': {
    task: 'Calculate running total of sales by month',
    dataDescription: 'Column A has dates, Column B has sales amounts',
  },
  'excel-analysis': {
    dataDescription: 'Monthly sales data for 12 months across 5 regions',
    analysisGoal: 'Identify top performing region',
  },

  // Sales skills
  'sales-cold-email': {
    prospect: 'IT Director at healthcare company',
    product: 'Cloud security solution',
  },
  'sales-follow-up': {
    previousInteraction: 'Demo call last week, interested in pricing',
    nextStep: 'Schedule technical deep-dive',
  },
  'sales-objection': {
    objection: 'Your solution is too expensive',
    context: 'Enterprise software deal, $50k/year',
  },

  // Technical skills
  'technical-code-review': {
    code: 'function add(a, b) { return a + b; }',
    language: 'JavaScript',
  },
  'technical-documentation': {
    feature: 'User authentication API endpoint',
    audience: 'Backend developers',
  },

  // HR skills
  'hr-job-posting': {
    role: 'Software Engineer',
    requirements: '3+ years experience, Python, cloud platforms',
  },
  'hr-performance-review': {
    employeeContext: 'Mid-level developer, exceeded goals',
    reviewPeriod: 'Annual review',
  },

  // Governance skills
  'governance-policy': {
    policyArea: 'Data retention',
    context: 'Financial services company',
  },
  'governance-risk': {
    scenario: 'Cloud migration project',
    riskCategory: 'Security and compliance',
  },

  // Product skills
  'product-prd': {
    feature: 'User dashboard redesign',
    userNeed: 'Better visibility into key metrics',
  },
  'product-user-story': {
    feature: 'Password reset flow',
    userType: 'End user',
  },
};

// Default smoke test for skills without specific test data
const DEFAULT_SMOKE_TEST: Record<string, string> = {
  context: 'Test input for smoke testing',
  input: 'Please provide a brief response to verify the system is working.',
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get minimal test data for a skill
 */
function getTestDataForSkill(skillId: string, skill: Skill): Record<string, string> {
  // Check if we have specific test data
  if (SMOKE_TEST_DATA[skillId]) {
    return SMOKE_TEST_DATA[skillId];
  }

  // Build minimal test data from skill inputs
  const testData: Record<string, string> = {};
  for (const input of skill.inputs) {
    if (input.required) {
      // Use a minimal placeholder
      testData[input.id] = `Test ${input.label.toLowerCase()} for smoke testing`;
    }
  }

  return Object.keys(testData).length > 0 ? testData : DEFAULT_SMOKE_TEST;
}

/**
 * Execute a single skill test
 */
async function testSkill(
  client: Client,
  skillId: string,
  skill: Skill
): Promise<{ success: boolean; output?: string; error?: string; durationMs: number; inputTokens: number; outputTokens: number }> {
  const startTime = Date.now();

  try {
    // Get test data and generate prompt
    const testData = getTestDataForSkill(skillId, skill);
    const promptData = skill.generatePrompt(testData);

    // Call portal proxy (non-streaming for simpler result handling)
    const response = await callPortalProxy({
      prompt: promptData.userPrompt,
      systemPrompt: promptData.systemInstruction,
      maxTokens: 512, // Minimal tokens for smoke test
      portalSlug: client.portalSlug,
    });

    const durationMs = Date.now() - startTime;
    const output = response.output || '';

    // Validate non-empty output
    if (!output || output.trim().length < 10) {
      return {
        success: false,
        error: 'Output is empty or too short',
        output,
        durationMs,
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
      };
    }

    return {
      success: true,
      output,
      durationMs,
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

/**
 * Get minimal test data for a library skill
 */
function getTestDataForLibrarySkill(skillId: string, skill: LibrarySkill): Record<string, string> {
  // Check if we have specific test data
  if (SMOKE_TEST_DATA[skillId]) {
    return SMOKE_TEST_DATA[skillId];
  }

  // Build minimal test data from skill inputs
  const testData: Record<string, string> = {};
  for (const input of skill.inputs) {
    if (input.required) {
      testData[input.id] = `Test ${input.label.toLowerCase()} for smoke testing`;
    }
  }

  return Object.keys(testData).length > 0 ? testData : DEFAULT_SMOKE_TEST;
}

/**
 * Interpolate placeholders in a template with values
 */
function interpolateTemplate(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  return result;
}

/**
 * Execute a single library skill test
 */
async function testLibrarySkill(
  client: Client,
  skillId: string,
  skill: LibrarySkill
): Promise<{ success: boolean; output?: string; error?: string; durationMs: number; inputTokens: number; outputTokens: number }> {
  const startTime = Date.now();

  try {
    // Get test data and generate prompt
    const testData = getTestDataForLibrarySkill(skillId, skill);
    const userPrompt = interpolateTemplate(skill.prompts.userPromptTemplate, testData);
    const systemPrompt = skill.prompts.systemInstruction;

    // Call portal proxy
    const response = await callPortalProxy({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 512,
      portalSlug: client.portalSlug,
    });

    const durationMs = Date.now() - startTime;
    const output = response.output || '';

    // Validate non-empty output
    if (!output || output.trim().length < 10) {
      return {
        success: false,
        error: 'Output is empty or too short',
        output,
        durationMs,
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
      };
    }

    return {
      success: true,
      output,
      durationMs,
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

/**
 * Execute a single workflow test (tests first step only for efficiency)
 */
async function testWorkflow(
  client: Client,
  workflowId: string,
  workflow: Workflow
): Promise<{ success: boolean; output?: string; error?: string; durationMs: number; inputTokens: number; outputTokens: number }> {
  const startTime = Date.now();

  try {
    // For workflow smoke test, we test the first step's skill
    const firstStep = workflow.steps[0];
    if (!firstStep) {
      return {
        success: false,
        error: 'Workflow has no steps',
        durationMs: Date.now() - startTime,
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    // First try static skills
    const staticSkill = SKILLS[firstStep.skillId];
    if (staticSkill) {
      const result = await testSkill(client, firstStep.skillId, staticSkill);
      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    }

    // Then try library skills (role templates, professional skills, etc.)
    const librarySkill = getLibrarySkill(firstStep.skillId);
    if (librarySkill) {
      const result = await testLibrarySkill(client, firstStep.skillId, librarySkill);
      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    }

    // Skill not found in any source
    return {
      success: false,
      error: `Skill ${firstStep.skillId} not found in static or library skills`,
      durationMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

/**
 * Create a new test run in the database
 */
async function createTestRun(totalTests: number, clientCount: number, skillCount: number, workflowCount: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('portal_test_runs')
    .insert({
      status: 'running',
      total_tests: totalTests,
      clients_tested: clientCount,
      skills_per_client: skillCount,
      workflows_per_client: workflowCount,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create test run:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Update test run status and stats
 */
async function updateTestRun(
  runId: string,
  updates: Partial<{
    status: string;
    completedAt: string;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedCostCents: number;
  }>
): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;
  if (updates.passedTests !== undefined) dbUpdates.passed_tests = updates.passedTests;
  if (updates.failedTests !== undefined) dbUpdates.failed_tests = updates.failedTests;
  if (updates.skippedTests !== undefined) dbUpdates.skipped_tests = updates.skippedTests;
  if (updates.totalInputTokens !== undefined) dbUpdates.total_input_tokens = updates.totalInputTokens;
  if (updates.totalOutputTokens !== undefined) dbUpdates.total_output_tokens = updates.totalOutputTokens;
  if (updates.estimatedCostCents !== undefined) dbUpdates.estimated_cost_cents = updates.estimatedCostCents;

  await supabase.from('portal_test_runs').update(dbUpdates).eq('id', runId);
}

/**
 * Save a test result to the database
 */
async function saveTestResult(result: {
  runId: string;
  clientId: string;
  clientName: string;
  portalSlug: string;
  testType: 'skill' | 'workflow';
  itemId: string;
  itemName: string;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  outputPreview?: string;
}): Promise<void> {
  await supabase.from('portal_test_results').insert({
    run_id: result.runId,
    client_id: result.clientId,
    client_name: result.clientName,
    portal_slug: result.portalSlug,
    test_type: result.testType,
    item_id: result.itemId,
    item_name: result.itemName,
    status: result.status,
    error_message: result.errorMessage,
    duration_ms: result.durationMs,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    output_preview: result.outputPreview?.substring(0, 500),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all portal tests
 */
export async function runAllPortalTests(
  onProgress?: ProgressCallback,
  onResult?: ResultCallback,
  abortSignal?: AbortSignal
): Promise<TestRun | null> {
  // Get all clients with portals enabled
  const clients = getClients().filter(c => c.portalEnabled);
  if (clients.length === 0) {
    console.warn('No clients with portals enabled to test');
    return null;
  }

  // Calculate total tests
  let totalSkillTests = 0;
  let totalWorkflowTests = 0;

  for (const client of clients) {
    totalSkillTests += client.selectedSkillIds.length;
    totalWorkflowTests += client.selectedWorkflowIds.length;
  }

  const totalTests = totalSkillTests + totalWorkflowTests;

  // Create test run in database
  const runId = await createTestRun(totalTests, clients.length, 9, 3);
  if (!runId) {
    console.error('Failed to create test run');
    return null;
  }

  // Initialize stats
  let completedTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
  const INPUT_COST_PER_TOKEN = 0.15 / 1_000_000;
  const OUTPUT_COST_PER_TOKEN = 0.60 / 1_000_000;

  try {
    // Test each client
    for (const client of clients) {
      // Check for abort
      if (abortSignal?.aborted) {
        await updateTestRun(runId, { status: 'cancelled' });
        break;
      }

      // Test skills
      for (const skillId of client.selectedSkillIds) {
        if (abortSignal?.aborted) break;

        const skill = SKILLS[skillId];
        if (!skill) {
          // Skip if skill not found
          await saveTestResult({
            runId,
            clientId: client.id,
            clientName: client.companyName,
            portalSlug: client.portalSlug,
            testType: 'skill',
            itemId: skillId,
            itemName: skillId,
            status: 'skipped',
            errorMessage: 'Skill not found',
          });
          completedTests++;
          continue;
        }

        // Report progress
        onProgress?.({
          runId,
          currentClient: client.companyName,
          currentItem: skill.name,
          currentItemType: 'skill',
          completedTests,
          totalTests,
          passedTests,
          failedTests,
          percentComplete: Math.round((completedTests / totalTests) * 100),
        });

        // Run test
        const result = await testSkill(client, skillId, skill);

        // Track tokens
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;

        // Save result
        const testResult: TestResult = {
          id: crypto.randomUUID(),
          runId,
          clientId: client.id,
          clientName: client.companyName,
          portalSlug: client.portalSlug,
          testType: 'skill',
          itemId: skillId,
          itemName: skill.name,
          status: result.success ? 'passed' : 'failed',
          errorMessage: result.error,
          durationMs: result.durationMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          outputPreview: result.output?.substring(0, 200),
          executedAt: new Date(),
        };

        await saveTestResult(testResult);
        onResult?.(testResult);

        if (result.success) {
          passedTests++;
        } else {
          failedTests++;
        }
        completedTests++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Test workflows
      for (const workflowId of client.selectedWorkflowIds) {
        if (abortSignal?.aborted) break;

        const workflow = WORKFLOWS[workflowId];
        if (!workflow) {
          await saveTestResult({
            runId,
            clientId: client.id,
            clientName: client.companyName,
            portalSlug: client.portalSlug,
            testType: 'workflow',
            itemId: workflowId,
            itemName: workflowId,
            status: 'skipped',
            errorMessage: 'Workflow not found',
          });
          completedTests++;
          continue;
        }

        // Report progress
        onProgress?.({
          runId,
          currentClient: client.companyName,
          currentItem: workflow.name,
          currentItemType: 'workflow',
          completedTests,
          totalTests,
          passedTests,
          failedTests,
          percentComplete: Math.round((completedTests / totalTests) * 100),
        });

        // Run test
        const result = await testWorkflow(client, workflowId, workflow);

        // Track tokens
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;

        // Save result
        const testResult: TestResult = {
          id: crypto.randomUUID(),
          runId,
          clientId: client.id,
          clientName: client.companyName,
          portalSlug: client.portalSlug,
          testType: 'workflow',
          itemId: workflowId,
          itemName: workflow.name,
          status: result.success ? 'passed' : 'failed',
          errorMessage: result.error,
          durationMs: result.durationMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          outputPreview: result.output?.substring(0, 200),
          executedAt: new Date(),
        };

        await saveTestResult(testResult);
        onResult?.(testResult);

        if (result.success) {
          passedTests++;
        } else {
          failedTests++;
        }
        completedTests++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate cost
    const estimatedCostCents = Math.ceil(
      (totalInputTokens * INPUT_COST_PER_TOKEN + totalOutputTokens * OUTPUT_COST_PER_TOKEN) * 100
    );

    // Update final stats
    await updateTestRun(runId, {
      status: abortSignal?.aborted ? 'cancelled' : 'completed',
      completedAt: new Date().toISOString(),
      passedTests,
      failedTests,
      skippedTests: totalTests - passedTests - failedTests,
      totalInputTokens,
      totalOutputTokens,
      estimatedCostCents,
    });

    return {
      id: runId,
      startedAt: new Date(),
      completedAt: new Date(),
      status: abortSignal?.aborted ? 'cancelled' : 'completed',
      totalTests,
      passedTests,
      failedTests,
      skippedTests: totalTests - passedTests - failedTests,
      clientsTested: clients.length,
      skillsPerClient: 9,
      workflowsPerClient: 3,
      totalInputTokens,
      totalOutputTokens,
      estimatedCostCents,
    };
  } catch (error) {
    console.error('Test run failed:', error);
    await updateTestRun(runId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      passedTests,
      failedTests,
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get recent test runs
 */
export async function getRecentTestRuns(limit: number = 10): Promise<TestRun[]> {
  const { data, error } = await supabase
    .from('portal_test_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch test runs:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    status: row.status,
    totalTests: row.total_tests,
    passedTests: row.passed_tests,
    failedTests: row.failed_tests,
    skippedTests: row.skipped_tests,
    clientsTested: row.clients_tested,
    skillsPerClient: row.skills_per_client,
    workflowsPerClient: row.workflows_per_client,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    estimatedCostCents: row.estimated_cost_cents,
  }));
}

/**
 * Get test results for a specific run
 */
export async function getTestResults(runId: string, statusFilter?: 'passed' | 'failed'): Promise<TestResult[]> {
  let query = supabase
    .from('portal_test_results')
    .select('*')
    .eq('run_id', runId)
    .order('executed_at', { ascending: true });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch test results:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    runId: row.run_id,
    clientId: row.client_id,
    clientName: row.client_name,
    portalSlug: row.portal_slug,
    testType: row.test_type,
    itemId: row.item_id,
    itemName: row.item_name,
    status: row.status,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    outputPreview: row.output_preview,
    executedAt: new Date(row.executed_at),
  }));
}

/**
 * Get failed tests for a run grouped by client
 */
export async function getFailedTestsByClient(runId: string): Promise<Map<string, TestResult[]>> {
  const results = await getTestResults(runId, 'failed');
  const byClient = new Map<string, TestResult[]>();

  for (const result of results) {
    const existing = byClient.get(result.clientName) || [];
    existing.push(result);
    byClient.set(result.clientName, existing);
  }

  return byClient;
}
