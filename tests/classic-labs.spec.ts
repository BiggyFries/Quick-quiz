import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
  }
}

const captures = path.resolve('output/visual-classic-labs');
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test.beforeAll(async () => { await mkdir(captures, { recursive: true }); });

async function advance(page: Page, ms: number) {
  await page.evaluate((delta) => window.advanceTime?.(delta), ms);
  await page.waitForTimeout(35);
}

async function snapshot(page: Page) {
  return JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
}

test('Prototype Corridor exposes and plays Labs 03 through 09 with matching deterministic state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /PREVIEW TESTER GAME/i }).click();
  await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  for (const title of ['Relic Run', 'Sky Stack', 'River Relay', 'Trail Coil', 'Prism Break', 'Rune Merge', 'Lantern Grid']) {
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  }
  await page.screenshot({ path: path.join(captures, 'prototype-corridor-nine-labs.png') });

  const labs = [
    { id: 3, title: 'Relic Run', act: async () => page.keyboard.press('ArrowRight') },
    { id: 4, title: 'Sky Stack', act: async () => { await page.keyboard.press('ArrowLeft'); await page.keyboard.press('q'); await page.keyboard.press('Space'); } },
    { id: 5, title: 'River Relay', act: async () => page.keyboard.press('ArrowUp') },
    { id: 6, title: 'Trail Coil', act: async () => advance(page, 260) },
    { id: 7, title: 'Prism Break', act: async () => page.getByRole('button', { name: 'Move light bar right' }).click() },
    { id: 8, title: 'Rune Merge', act: async () => page.keyboard.press('ArrowLeft') },
    { id: 9, title: 'Lantern Grid', act: async () => page.getByRole('button', { name: /Lantern rune 1, 1/ }).click() },
  ];

  for (const lab of labs) {
    await page.getByRole('button', { name: new RegExp(lab.title) }).click();
    await expect(page.getByRole('heading', { name: new RegExp(lab.title) })).toBeVisible();
    await expect(page.getByLabel(`${lab.title} game world`)).toBeVisible();
    await advance(page, 0);
    let state = await snapshot(page);
    expect(state.puzzle).toBe(`classic-lab-${String(lab.id).padStart(2, '0')}`);
    expect(state.status).toBe('playing');
    await lab.act();
    state = await snapshot(page);
    if (lab.id === 3) { expect(state.player).toEqual({ x: 2, y: 13 }); expect(state.collected).toBe(1); }
    if (lab.id === 4) expect(state.pieces).toBe(1);
    if (lab.id === 5) expect(state.player.y).toBe(9);
    if (lab.id === 6) expect(state.explorer.y).toBe(12);
    if (lab.id === 7) expect(state.paddleX).toBeGreaterThan(195);
    if (lab.id === 8) expect(state.moves).toBe(1);
    if (lab.id === 9) expect(state.moves).toBe(1);
    await page.screenshot({ path: path.join(captures, `lab-${String(lab.id).padStart(2, '0')}-${slug(lab.title)}.png`) });

    if (lab.id === 3) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      const route = [
        ...Array(10).fill('ArrowRight'), ...Array(6).fill('ArrowUp'), ...Array(2).fill('ArrowLeft'),
        ...Array(2).fill('ArrowUp'), ...Array(2).fill('ArrowLeft'), ...Array(2).fill('ArrowUp'),
        ...Array(4).fill('ArrowRight'), ...Array(2).fill('ArrowUp'),
      ];
      for (const key of route) await page.keyboard.press(key);
      state = await snapshot(page);
      expect(state.status).toBe('complete'); expect(state.portalOpen).toBe(true);
      await page.screenshot({ path: path.join(captures, 'lab-03-relic-run-clear.png') });
    }
    if (lab.id === 4) {
      await advance(page, 60000);
      state = await snapshot(page);
      expect(state.status).toBe('complete'); expect(state.remainingMs).toBe(0);
      await page.screenshot({ path: path.join(captures, 'lab-04-sky-stack-clear.png') });
    }
    if (lab.id === 6) {
      await advance(page, 5000);
      state = await snapshot(page);
      expect(state.status).toBe('failed');
      await page.screenshot({ path: path.join(captures, 'lab-06-trail-coil-failed.png') });
    }
    if (lab.id === 9) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      for (const index of [0, 6, 18, 24]) await page.locator('.lantern-hit-grid button').nth(index).click();
      state = await snapshot(page);
      expect(state.status).toBe('complete'); expect(state.lit).toBe(25);
      await page.screenshot({ path: path.join(captures, 'lab-09-lantern-grid-clear.png') });
    }
    await page.getByRole('button', { name: 'Back to Lab corridor' }).click();
    await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('classic Lab controls remain reachable on the compact phone layout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  for (const id of [3, 4, 5, 6, 7, 8, 9]) {
    await page.goto(`/?lab=${String(id).padStart(2, '0')}`);
    await expect(page.locator('.classic-lab-screen')).toBeVisible();
    const controls = await page.locator('.classic-controls').boundingBox();
    const reset = await page.getByRole('button', { name: 'RESET', exact: true }).boundingBox();
    expect(controls).not.toBeNull(); expect(reset).not.toBeNull();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(640);
    expect(reset!.height).toBeGreaterThanOrEqual(44);
    expect(reset!.y + reset!.height).toBeLessThan(controls!.y);
  }
});
