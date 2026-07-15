import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { WEEK_ONE } from '../src/content/week1';
import type { DailyAdventure, PuzzleConfig } from '../src/game/types';

declare global {
  interface Window {
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
  }
}

const captures = path.resolve('output/visual-week1');
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test.beforeAll(async () => { await mkdir(captures, { recursive: true }); });

async function advance(page: Page, ms: number) {
  await page.evaluate((delta) => window.advanceTime?.(delta), ms);
  await page.waitForTimeout(35);
}

async function canvasTap(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + x / 390 * box!.width, box!.y + y / 844 * box!.height);
  await page.waitForTimeout(35);
}

async function openPreview(page: Page, adventure: DailyAdventure) {
  await page.getByRole('button', { name: /PREVIEW WEEK 1/i }).click();
  const row = page.locator('.review-list button').filter({ hasText: adventure.title });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole('button', { name: 'ENTER THE TRAIL' })).toBeVisible();
  await page.getByRole('button', { name: 'ENTER THE TRAIL' }).click();
}

async function completePuzzle(page: Page, config: PuzzleConfig, physicsCapture?: string) {
  if (config.type === 'trivia') {
    for (const question of config.questions) {
      await page.locator('.question-panel .choice-grid button').nth(question.correct).click();
      await page.waitForTimeout(25);
    }
  } else if (config.type === 'logic') {
    for (const token of config.solution) await page.getByRole('button', { name: token, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm order' }).click();
  } else if (config.type === 'rhythm') {
    let elapsed = 0;
    for (const beat of config.beatMap) {
      await advance(page, beat - elapsed);
      elapsed = beat;
      await page.locator('.rhythm-button').click();
    }
    await advance(page, config.durationMs - elapsed);
  } else if (config.type === 'spatial') {
    await canvasTap(page, config.target.x, config.target.y);
  } else {
    await page.locator('.question-panel .choice-grid button').nth(config.question.correct).click();
    for (const token of config.orderSolution) await page.getByRole('button', { name: token, exact: true }).click();
    await page.getByRole('button', { name: 'Lock sequence' }).click();
    await canvasTap(page, config.scanTarget.x, config.scanTarget.y);
    let elapsed = 0;
    for (const beat of config.rhythmBeats) {
      await advance(page, beat - elapsed);
      elapsed = beat;
      await page.locator('.rhythm-button').click();
    }
    await page.waitForTimeout(100);
    if (physicsCapture) await page.screenshot({ path: physicsCapture });
    await page.locator('.physics-panel .choice-grid button').nth(config.physics.correct).click();
    await page.getByRole('button', { name: 'Release mechanism' }).click();
  }
  await expect(page.locator('.resolution-card')).toBeVisible();
}

async function failPuzzle(page: Page, config: PuzzleConfig) {
  if (config.type === 'trivia') {
    await page.locator('.question-panel .choice-grid button').nth((config.questions[0].correct + 1) % 4).click();
  } else if (config.type === 'logic') {
    for (const token of [...config.solution].reverse()) await page.getByRole('button', { name: token, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm order' }).click();
  } else if (config.type === 'rhythm') {
    await page.locator('.rhythm-button').click();
    await page.locator('.rhythm-button').click();
    await page.locator('.rhythm-button').click();
  } else if (config.type === 'spatial') {
    await canvasTap(page, 4, 4); await canvasTap(page, 4, 4); await canvasTap(page, 4, 4);
  } else {
    await page.locator('.question-panel .choice-grid button').nth((config.question.correct + 1) % 4).click();
  }
  await expect(page.locator('.resolution-card')).toBeVisible();
}

test('mobile home remains usable across the supported phone range', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /THE DAILY VENTURE/i })).toBeVisible();
    for (const label of ['PAST VENTURES', 'PREVIEW WEEK 1']) {
      const box = await page.getByRole('button', { name: new RegExp(label, 'i') }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: path.join(captures, `home-${viewport.width}x${viewport.height}.png`) });
  }
});

test('reviewer can survive all seven adventures through all 35 real room UIs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  for (const adventure of WEEK_ONE) {
    await openPreview(page, adventure);
    const daySlug = slug(adventure.title);
    await page.screenshot({ path: path.join(captures, `${daySlug}-intro.png`) });
    for (let levelIndex = 0; levelIndex < 5; levelIndex += 1) {
      const type = adventure.levelOrder[levelIndex];
      const config = adventure.puzzles[type];
      await expect(page.getByRole('button', { name: 'READY' })).toBeVisible();
      await page.getByRole('button', { name: 'READY' }).click();
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(captures, `${daySlug}-room-${levelIndex + 1}-${type}.png`) });
      await completePuzzle(page, config, type === 'finale' ? path.join(captures, `${daySlug}-finale-physics.png`) : undefined);
      await page.screenshot({ path: path.join(captures, `${daySlug}-room-${levelIndex + 1}-success.png`) });
      await advance(page, 4800);
    }
    await expect(page.locator('.results-card')).toBeVisible();
    await expect(page.locator('.result-tiles .success')).toHaveCount(5);
    await page.screenshot({ path: path.join(captures, `${daySlug}-victory.png`) });
    const state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
    expect(state.mode).toBe('results');
    expect(state.results).toHaveLength(5);
    expect(state.results.every((result: { success: boolean }) => result.success)).toBe(true);
    await page.getByRole('button', { name: 'Return home' }).click();
  }
  expect(errors).toEqual([]);
});

test('every theme and all five traversal variants render a defeat and guest-safe result', async ({ page }) => {
  await page.goto('/');
  for (const adventure of WEEK_ONE) {
    const target = adventure.weekIndex % 5;
    await openPreview(page, adventure);
    for (let levelIndex = 0; levelIndex <= target; levelIndex += 1) {
      const type = adventure.levelOrder[levelIndex];
      const config = adventure.puzzles[type];
      await page.getByRole('button', { name: 'READY' }).click();
      if (levelIndex < target) {
        await completePuzzle(page, config);
        await advance(page, 4800);
      } else {
        await failPuzzle(page, config);
      }
    }
    const daySlug = slug(adventure.title);
    await page.screenshot({ path: path.join(captures, `${daySlug}-defeat-room-${target + 1}.png`) });
    await advance(page, 4800);
    await expect(page.locator('.results-card')).toBeVisible();
    await expect(page.locator('.result-tiles .failed')).toHaveCount(1);
    await page.screenshot({ path: path.join(captures, `${daySlug}-defeat-result.png`) });
    await page.getByRole('button', { name: 'Return home' }).click();
  }
});

test('guest results stay memory-only and locked even after a later login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /PREVIEW WEEK 1/i }).click();
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#launch-date').fill(today);
  await page.getByRole('button', { name: 'SET DATE' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'PROFILE' }).click();
  await page.getByRole('button', { name: 'SIGN OUT' }).click();
  await expect(page.getByRole('button', { name: /PLAY TODAY/i })).toBeEnabled();
  await page.getByRole('button', { name: /PLAY TODAY/i }).click();
  await page.getByRole('button', { name: 'ENTER THE TRAIL' }).click();
  await page.getByRole('button', { name: 'READY' }).click();
  await failPuzzle(page, WEEK_ONE[0].puzzles.logic);
  await advance(page, 4800);
  const share = page.getByRole('button', { name: 'LOG IN BEFORE PLAYING TO SHARE' });
  await expect(share).toBeDisabled();
  await expect(page.getByText(/Logging in now only applies to your next run/i)).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'LOG IN', exact: true }).click();
  await page.locator('#email').fill('guest-after-run@example.com');
  await page.getByRole('button', { name: 'CREATE LOCAL REVIEWER' }).click();
  await expect(share).toBeDisabled();
  const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem('dailyVentureLocalReviewerProfile') ?? '{}').attempts ?? []);
  expect(attempts).toHaveLength(0);
});
