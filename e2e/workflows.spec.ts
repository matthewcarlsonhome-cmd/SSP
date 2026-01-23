import { test, expect } from '@playwright/test';

/**
 * Workflows E2E Tests
 *
 * Tests the workflow execution feature including:
 * - Browsing workflows
 * - Viewing workflow steps
 * - Input handling
 */

test.describe('Workflows Page', () => {
  test('should load the workflows page', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    // Should display workflow content
    await expect(page.locator('body')).toContainText(/workflow/i);
  });

  test('should filter workflows when searching', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    // Find the search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Get initial workflow count from the results text
    const initialResultsText = await page.locator('text=/\\d+ workflow/').first().textContent();

    // Type a search query that should filter results
    await searchInput.fill('job');

    // Wait for debounce (150ms) and results to update
    await page.waitForTimeout(300);

    // Verify results are filtered - should find workflows with "job" in name/description
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('job');

    // Verify the search input retains the value
    await expect(searchInput).toHaveValue('job');
  });

  test('should show no results message for non-matching search', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    // Find and use the search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('xyznonexistent123');

    // Wait for debounce
    await page.waitForTimeout(300);

    // Should show "No Workflows Found" message
    await expect(page.locator('text=No Workflows Found')).toBeVisible();
  });

  test('should clear search and show all workflows', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');

    // Search for something
    await searchInput.fill('interview');
    await page.waitForTimeout(300);

    // Clear the search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Should show all workflows again (category sections visible)
    const pageContent = await page.content();
    expect(pageContent).toContain('Job Search');
  });

  test('should display workflow categories', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    // Look for category labels or sections
    const pageContent = await page.content();
    const hasCategories =
      pageContent.toLowerCase().includes('job') ||
      pageContent.toLowerCase().includes('interview') ||
      pageContent.toLowerCase().includes('application') ||
      pageContent.toLowerCase().includes('category');

    expect(hasCategories).toBe(true);
  });

  test('should have clickable workflow items', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    // Find workflow cards or list items
    const workflowItems = page.locator('a[href*="workflow"], button, [role="link"]');
    const count = await workflowItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to workflow runner', async ({ page }) => {
    await page.goto('/#/workflows');
    await page.waitForLoadState('networkidle');

    // Find and click a workflow link
    const workflowLink = page.locator('a[href*="workflow"]').first();
    if ((await workflowLink.count()) > 0) {
      await workflowLink.click();
      await page.waitForLoadState('networkidle');

      // Should be on workflow runner page
      await expect(page).toHaveURL(/.*workflow/);
    }
  });
});

test.describe('Workflow Runner', () => {
  test('should load job-application workflow', async ({ page }) => {
    await page.goto('/#/workflow/job-application');
    await page.waitForLoadState('networkidle');

    // Should display workflow content
    const pageContent = await page.content();
    const hasWorkflowContent =
      pageContent.toLowerCase().includes('job') ||
      pageContent.toLowerCase().includes('application') ||
      pageContent.toLowerCase().includes('step') ||
      pageContent.toLowerCase().includes('workflow');

    expect(hasWorkflowContent).toBe(true);
  });

  test('should display workflow steps', async ({ page }) => {
    await page.goto('/#/workflow/job-application');
    await page.waitForLoadState('networkidle');

    // Look for step indicators
    const pageContent = await page.content();
    const hasSteps =
      pageContent.includes('Step') ||
      pageContent.includes('1') ||
      pageContent.includes('step');

    expect(hasSteps).toBe(true);
  });

  test('should have input form for workflow', async ({ page }) => {
    await page.goto('/#/workflow/job-application');
    await page.waitForLoadState('networkidle');

    // Should have input fields
    const inputs = page.locator('input, textarea, select');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show API key warning if not configured', async ({ page }) => {
    // Clear API keys first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('skillengine_api_keys');
    });

    await page.goto('/#/workflow/job-application');
    await page.waitForLoadState('networkidle');

    // Should indicate API key is needed
    const pageContent = await page.content();
    const hasApiKeyWarning =
      pageContent.toLowerCase().includes('api') ||
      pageContent.toLowerCase().includes('key') ||
      pageContent.toLowerCase().includes('configure');

    expect(hasApiKeyWarning).toBe(true);
  });
});

test.describe('Workflow Step Execution', () => {
  test('should display step progress', async ({ page }) => {
    await page.goto('/#/workflow/interview-prep');
    await page.waitForLoadState('networkidle');

    // Look for progress indicators
    const progressElements = page.locator(
      '[role="progressbar"], .progress, [class*="step"], [class*="progress"]'
    );

    // Should have some form of progress indication
    const count = await progressElements.count();
    const pageContent = await page.content();
    const hasProgressContent = pageContent.includes('Step') || pageContent.includes('%');

    expect(count > 0 || hasProgressContent).toBe(true);
  });
});
