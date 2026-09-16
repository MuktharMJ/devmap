import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';

test('overview renders real demo analysis and the map is interactive', async ({ page }) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname))
      externalRequests.push(request.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Project overview', exact: true })).toBeVisible();
  await expect(page.getByText('DEMO DATA', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '12 API handlers', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.getByText('115%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset map view' }).click();
  await page.getByRole('button', { name: /Backend, \d+ files/ }).click();
  await expect(page.locator('.node-inspector')).toContainText('Services & business logic');
  await page.getByRole('button', { name: 'Focus selected node' }).click();
  await expect(page.getByText('145%', { exact: true })).toBeVisible();
  await page.locator('.node-inspector .file-link').first().click();
  await expect(page.getByRole('heading', { name: 'File explorer', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('file explorer supports search, extension filters, details, and keyboard navigation', async ({
  page,
}) => {
  await page.goto('/#files');
  await page.getByRole('textbox', { name: 'Search files', exact: true }).fill('route.ts');
  await expect(page.getByRole('treeitem', { name: 'route.ts', exact: true })).toHaveCount(6);
  await page.getByRole('combobox', { name: 'Filter by extension' }).selectOption('json');
  await expect(page.getByText('No matching files', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('textbox', { name: 'Search files', exact: true }).fill('schema.prisma');
  await page.getByRole('treeitem', { name: 'schema.prisma' }).click();
  await expect(page.locator('.source-code')).toContainText('postgresql');
  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Classification' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search files', exact: true }).fill('');
  const first = page.getByRole('treeitem').first();
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('treeitem').nth(1)).toBeFocused();
});

test('global search and dialogs restore focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jump to a file/ }).focus();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search all project files' }).fill('schema.prisma');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Jump to a file/ })).toBeFocused();
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search all project files' }).fill('schema.prisma');
  await page.getByRole('button', { name: /schema.prisma prisma\/schema.prisma/ }).click();
  await expect(page.getByRole('heading', { name: 'schema.prisma', exact: true })).toBeVisible();
});

test('insights filter by confidence and onboarding exports a complete guide', async ({ page }) => {
  await page.goto('/#insights');
  await page.getByRole('button', { name: /^inferred/i }).click();
  await expect(page.locator('.insight-list .confidence.detected')).toHaveCount(0);
  await expect(page.locator('.insight-list .confidence.inferred').first()).toBeVisible();
  await page.getByRole('button', { name: 'Onboarding guide' }).click();
  await expect(page.locator('.guide-section')).toHaveCount(8);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('orbit-field-guide.md');
  await page.locator('.guide-files .file-link').first().click();
  await expect(page.getByRole('dialog', { name: 'Source reference' })).toBeVisible();
});

test('local explainer cites evidence and survives an unavailable Ollama server', async ({
  page,
}) => {
  await page.goto('/#explainer');
  await page.getByRole('button', { name: 'How does authentication work?' }).click();
  await expect(page.locator('.message.assistant')).toContainText('Authentication-related');
  await expect(page.locator('.message-sources .file-link').first()).toBeVisible();
  await page.getByRole('button', { name: 'Provider', exact: true }).click();
  await page.getByRole('button', { name: /Ollama Ask a local language model/ }).click();
  await page.route('http://localhost:11434/**', (route) => route.abort('connectionrefused'));
  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not connect');
  await page.getByRole('button', { name: 'Save provider' }).click();
  await page
    .getByRole('textbox', { name: 'Ask about this project' })
    .fill('What does this project do?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.locator('.chat-notice')).toContainText('Answered with local analysis instead');
  await expect(page.locator('.message.assistant').last()).toContainText('workspace for teams');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: /Project explainer AI/ }).click();
  await expect(page.locator('.message.assistant')).toHaveCount(2);
});

test('real directory import analyzes files, excludes dependencies, and protects secrets', async ({
  page,
}) => {
  const root = path.resolve('test-results', 'fixture-project');
  await mkdir(path.join(root, 'src'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', 'ignored'), { recursive: true });
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'test',
      description: 'A real import test.',
      dependencies: { express: '5.0.0' },
      scripts: { dev: 'node src/main.js' },
    }),
  );
  await writeFile(
    path.join(root, 'src', 'main.js'),
    'app.get("/health", (req, res) => res.json({ ok: true }));',
  );
  await writeFile(path.join(root, '.env'), 'SECRET=do-not-display-this');
  await writeFile(path.join(root, 'node_modules', 'ignored', 'index.js'), 'ignored');
  await page.goto('/');
  await page.getByRole('button', { name: 'Import project' }).click();
  await page.getByLabel('Select project directory').setInputFiles(root);
  await expect(page.getByRole('heading', { name: 'fixture-project', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '3 Files', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '1 API handlers' })).toBeVisible();
  await expect(page.getByText('LOCAL PROJECT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'File explorer', exact: true }).click();
  await page.getByRole('treeitem', { name: '.env', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Secret contents stay out' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('do-not-display-this');
  await expect(page.getByRole('treeitem', { name: 'node_modules' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Import project' }).click();
  await page.getByRole('button', { name: 'Load demo' }).click();
  await expect(page.getByText('DEMO DATA', { exact: true })).toBeVisible();
});

test('mobile navigation, simplified map, and file selection work without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.mobile-map')).toBeVisible();
  await expect(page.locator('.architecture-svg')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Codebase map', exact: true }).click();
  await page.locator('.mobile-map-node').filter({ hasText: 'Backend' }).click();
  await expect(page.locator('.node-inspector')).toBeVisible();
  await page.locator('.node-inspector .file-link').first().click();
  await expect(page.getByRole('heading', { name: 'File explorer', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('primary views meet automated accessibility checks', async ({ page }) => {
  test.setTimeout(60_000);
  for (const view of ['overview', 'map', 'files', 'insights', 'explainer', 'onboarding']) {
    await page.goto(`/#${view}`);
    await page.locator('h1').waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    await page.screenshot({ path: `test-results/view-${view}.png`, fullPage: true });
    await writeFile(
      path.resolve('test-results', `accessibility-${view}.json`),
      JSON.stringify(results.violations, null, 2),
    );
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })).slice(0, 15),
      })),
      `${view} accessibility`,
    ).toEqual([]);
  }
});

test('dialogs and mobile overview pass accessibility checks', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  for (const button of ['Import project', 'Workspace settings']) {
    await page.getByRole('button', { name: button, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).toHaveAttribute('inert', '');
  const mobile = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    mobile.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/overview-tablet.png', fullPage: true });
});
