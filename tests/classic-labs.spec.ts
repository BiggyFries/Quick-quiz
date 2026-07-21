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

async function walkRoute(page: Page, route: string) {
  const keys = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' } as const;
  for (const step of route) await page.keyboard.press(keys[step as keyof typeof keys]);
}

async function crossLabPortal(page: Page) {
  await advance(page, 1000);
  await walkRoute(page, 'RRRR');
}

test('Adventure combines chips, equipment, locks, a pressure crate, celebration, and manual portal exit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lab=adventure');
  await expect(page.getByLabel('Adventure game world')).toBeVisible();
  await advance(page, 0);
  const canvas = await page.getByLabel('Adventure game world').boundingBox();
  expect(canvas).not.toBeNull();
  await page.mouse.move(canvas!.x + 115, canvas!.y + 350); await page.mouse.down(); await page.mouse.move(canvas!.x + 235, canvas!.y + 350, { steps: 4 }); await page.mouse.up();
  let state = await snapshot(page); expect(state.player).toEqual({ x: 2, y: 1 });
  await page.getByRole('button', { name: 'RESET', exact: true }).click();
  await walkRoute(page, 'RRLLDDDRRRUUURLDDDLLLLLDDRRLLD');
  state = await snapshot(page); expect(state.phase).toBe('celebrating'); expect(state.inventory.chips).toBe(3); expect(state.plateActive).toBe(true);
  await advance(page, 999); expect((await snapshot(page)).phase).toBe('celebrating');
  await advance(page, 1); expect((await snapshot(page)).phase).toBe('portal-open');
  await walkRoute(page, 'UUURRRRRRDD D'.replaceAll(' ', ''));
  state = await snapshot(page); expect(state.phase).toBe('complete'); expect(state.portalOpen).toBe(true);
  await page.screenshot({ path: path.join(captures, 'adventure-primary-complete.png') });
});

test('daily formula preview runs Adventure, two themed prototypes, and the named Watcher finale', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lab=formula');
  await expect(page.getByRole('heading', { name: 'The Verdant Orrery' })).toBeVisible();
  await page.getByRole('button', { name: 'ENTER THE ADVENTURE' }).click();
  await advance(page, 0);
  await walkRoute(page, 'RRLLDDDRRRUUURLDDDLLLLLDDRRLLD'); await advance(page, 1000); await walkRoute(page, 'UUURRRRRRDD D'.replaceAll(' ', ''));
  await expect(page.getByRole('heading', { name: /Gear Links/i })).toBeVisible();
  let state = await snapshot(page);
  for (let index = 0; index < 16; index += 1) {
    const turns = (state.target[index] - state.rotations[index] + 4) % 4;
    for (let turn = 0; turn < turns; turn += 1) await page.locator('.gear-hit-grid button').nth(index).click();
  }
  await crossLabPortal(page);
  await expect(page.getByRole('heading', { name: /Echo Sequence/i })).toBeVisible();
  const sequence = [0, 2, 1, 3, 2, 0, 3, 1];
  for (const length of [4, 6, 8]) { await advance(page, length * 520); for (const pad of sequence.slice(0, length)) await page.locator('.echo-hit-grid button').nth(pad).click(); }
  await crossLabPortal(page);
  await expect(page.getByRole('heading', { name: 'The Watcher' })).toBeVisible();
  await expect(page.getByText(/Welcome, Ari/i)).toBeVisible();
  await page.getByRole('button', { name: 'FACE THE WATCHER' }).click();
  for (const answer of [1, 1, 3, 1]) await page.locator('.watcher-card.quiz .choice-grid button').nth(answer).click();
  await advance(page, 1000); await walkRoute(page, 'RRRR');
  await expect(page.getByRole('heading', { name: /Watcher’s compass turns again/i })).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'daily-formula-complete.png') });
});

test('Prototype Corridor exposes Adventure and Labs 03 through 14 with matching deterministic state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /PREVIEW TESTER GAME/i }).click();
  await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Adventure.*Primary room/i })).toBeVisible();
  for (const title of ['Relic Run', 'Sky Stack', 'River Relay', 'Trail Coil', 'Prism Break', 'Rune Merge', 'Lantern Grid', 'Icebound Route', 'Crate Circuit', 'Echo Sequence', 'Gear Links', 'Orbit Pulse']) {
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  }
  await page.screenshot({ path: path.join(captures, 'prototype-corridor-fifteen-games.png') });

  const labs = [
    { id: 3, title: 'Relic Run', act: async () => page.keyboard.press('ArrowRight') },
    { id: 4, title: 'Sky Stack', act: async () => { await page.keyboard.press('ArrowLeft'); await page.keyboard.press('q'); await page.keyboard.press('Space'); } },
    { id: 5, title: 'River Relay', act: async () => page.keyboard.press('ArrowUp') },
    { id: 6, title: 'Trail Coil', act: async () => advance(page, 260) },
    { id: 7, title: 'Prism Break', act: async () => page.getByRole('button', { name: 'Move light bar right' }).click() },
    { id: 8, title: 'Rune Merge', act: async () => page.keyboard.press('ArrowLeft') },
    { id: 9, title: 'Lantern Grid', act: async () => page.getByRole('button', { name: /Lantern rune 1, 1/ }).click() },
    { id: 10, title: 'Icebound Route', act: async () => page.keyboard.press('ArrowUp') },
    { id: 11, title: 'Crate Circuit', act: async () => page.keyboard.press('ArrowUp') },
    { id: 12, title: 'Echo Sequence', act: async () => { await advance(page, 2080); await page.getByRole('button', { name: /Echo pad 1/ }).click(); } },
    { id: 13, title: 'Gear Links', act: async () => page.getByRole('button', { name: /Gear link 1, 1/ }).click() },
    { id: 14, title: 'Orbit Pulse', act: async () => { await advance(page, 290); await page.getByRole('button', { name: 'PULSE' }).click(); } },
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
    if (lab.id === 3) { expect(state.player).toEqual({ x: 2, y: 13 }); expect(state.collected).toBe(1); expect(state.target).toBeGreaterThan(18); expect(state.portalOpen).toBe(false); }
    if (lab.id === 4) expect(state.pieces).toBe(1);
    if (lab.id === 5) expect(state.player.y).toBe(9);
    if (lab.id === 6) { expect(state.explorer.y).toBe(12); expect(state.obstacles.length).toBeGreaterThan(10); }
    if (lab.id === 7) expect(state.paddleX).toBeGreaterThan(195);
    if (lab.id === 8) { expect(state.moves).toBe(1); expect(state.stackBoard).toBeDefined(); expect(state.board).toBeUndefined(); }
    if (lab.id === 9) expect(state.moves).toBe(1);
    if (lab.id === 10) expect(state.moves).toBe(1);
    if (lab.id === 11) expect(state.player.y).toBe(5);
    if (lab.id === 12) expect(state.inputIndex).toBe(1);
    if (lab.id === 13) expect(state.moves).toBe(1);
    if (lab.id === 14) expect(state.gate).toBe(1);
    await page.screenshot({ path: path.join(captures, `lab-${String(lab.id).padStart(2, '0')}-${slug(lab.title)}.png`) });

    if (lab.id === 4) {
      await advance(page, 75000);
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
      for (const index of [0, 2, 6, 10, 12, 14, 18, 22, 24]) await page.locator('.lantern-hit-grid button').nth(index).click();
      state = await snapshot(page);
      expect(state.status).toBe('complete'); expect(state.lit).toBe(25);
      await page.screenshot({ path: path.join(captures, 'lab-09-lantern-grid-clear.png') });
    }
    if (lab.id === 10) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      for (const key of ['ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(key);
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.collected).toHaveLength(4);
      await page.screenshot({ path: path.join(captures, 'lab-10-icebound-route-clear.png') });
    }
    if (lab.id === 11) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      for (const key of ['ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowUp']) await page.keyboard.press(key);
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.score).toBe(3);
      await page.screenshot({ path: path.join(captures, 'lab-11-crate-circuit-clear.png') });
    }
    if (lab.id === 12) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      const sequence = [0, 2, 1, 3, 2, 0, 3, 1];
      for (const length of [4, 6, 8]) {
        await advance(page, length * 520);
        for (const pad of sequence.slice(0, length)) await page.locator('.echo-hit-grid button').nth(pad).click();
      }
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.score).toBe(18);
      await page.screenshot({ path: path.join(captures, 'lab-12-echo-sequence-clear.png') });
    }
    if (lab.id === 13) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      state = await snapshot(page);
      for (let index = 0; index < 16; index += 1) {
        const turns = (state.target[index] - state.rotations[index] + 4) % 4;
        for (let turn = 0; turn < turns; turn += 1) await page.locator('.gear-hit-grid button').nth(index).click();
      }
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.aligned).toBe(16);
      await page.screenshot({ path: path.join(captures, 'lab-13-gear-links-clear.png') });
    }
    if (lab.id === 14) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      for (let gate = 0; gate < 6; gate += 1) {
        state = await snapshot(page);
        const delta = ((state.targetAngle - state.angle + Math.PI * 2) % (Math.PI * 2)) / state.speed * 1000;
        await advance(page, delta); await page.getByRole('button', { name: 'PULSE' }).click();
      }
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.gate).toBe(6);
      await page.screenshot({ path: path.join(captures, 'lab-14-orbit-pulse-clear.png') });
    }
    await page.getByRole('button', { name: 'Back to Lab corridor' }).click();
    await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('classic Lab controls remain reachable on the compact phone layout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  for (const id of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
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
