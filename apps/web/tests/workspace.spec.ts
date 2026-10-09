import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { safeRedirectPath } from '../src/lib/redirect';
import { parseChatPayload, validateDashboardDates } from '../src/lib/request-validation';

test('callback rejects external and URL-normalized destinations', () => {
  for (const path of [
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'https://evil.example',
    null,
  ]) {
    expect(safeRedirectPath(path)).toBe('/workspace');
  }
  expect(safeRedirectPath('/workspace?view=chat')).toBe('/workspace?view=chat');
});

test('request validation rejects malformed input', () => {
  for (const data of [
    '{',
    '{}',
    '{"question":42}',
    '{"question":"   "}',
    JSON.stringify({ question: 'x'.repeat(4001) }),
  ]) {
    expect(() => parseChatPayload(data)).toThrow();
  }
  expect(parseChatPayload(JSON.stringify({ question: 'Line C downtime' })).question).toBe(
    'Line C downtime',
  );

  for (const query of [
    'from=garbage',
    'from=2026-02-30',
    'from=2026-09-12&to=2026-09-01',
    'granularity=bad',
  ]) {
    expect(() => validateDashboardDates(new URLSearchParams(query))).toThrow();
  }
});

test('sign-in is accessible, responsive and bilingual', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByLabel('Work email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await page.getByRole('tab', { name: 'Email link' }).click();
  await expect(page.getByLabel('Password')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Email secure sign-in link' })).toBeVisible();
  await page.getByRole('tab', { name: 'Password' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('sign-in.png'), fullPage: true });
  await page.getByRole('button', { name: 'বাং' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  expect(errors).toEqual([]);
});

test('dashboard filters, navigation and streamed answers work', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/workspace');
  await expect(page.getByRole('heading', { name: 'Your factory. In focus.' })).toBeVisible();
  await expect(page.locator('.kpi-card').first()).toBeVisible();
  await page.getByRole('button', { name: '30 days', exact: true }).click();
  await expect(page.getByRole('button', { name: '30 days', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.dashboard-refresh')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: true });

  const nav = page.getByRole('navigation', { name: 'Workspace navigation' });
  await nav.getByRole('button', { name: 'Ask MIOS' }).click();
  await page.locator('.composer textarea').fill('What caused Line C downtime?');
  await page.locator('.composer button').click();
  await expect(page.locator('.message-assistant .message-bubble')).toBeVisible();
  await expect(page.locator('.citation-card').first()).toBeVisible();

  for (const name of ['Analytics', 'Knowledge base', 'Compliance']) {
    await nav.getByRole('button', { name, exact: false }).click();
    await expect(page.locator('h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
