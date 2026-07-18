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
    if (config.mechanic === 'order') {
      for (const token of config.solution) await page.getByRole('button', { name: token, exact: true }).click();
      await page.getByRole('button', { name: 'Confirm order' }).click();
    } else {
      await page.locator('.deduction-panel .choice-grid button').nth(config.correct).click();
      await page.getByRole('button', { name: 'Commit answer' }).click();
    }
  } else if (config.type === 'rhythm') {
    let elapsed = 0;
    for (const beat of config.beatMap) {
      await advance(page, beat - elapsed);
      elapsed = beat;
      await page.locator('.rhythm-button').click();
    }
    await advance(page, config.durationMs - elapsed);
  } else if (config.type === 'memory') {
    for (const sequence of config.rounds) {
      await advance(page, sequence.length * config.revealMs);
      for (const symbol of sequence) await page.locator('.memory-choices button').filter({ hasText: symbol }).click();
    }
  } else {
    await page.locator('.question-panel .choice-grid button').nth(config.question.correct).click();
    for (const token of config.orderSolution) await page.getByRole('button', { name: token, exact: true }).click();
    await page.getByRole('button', { name: 'Lock sequence' }).click();
    await advance(page, config.memorySequence.length * config.memoryRevealMs);
    for (const symbol of config.memorySequence) await page.locator('.memory-choices button').filter({ hasText: symbol }).click();
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
    if (config.mechanic === 'order') {
      for (const token of [...config.solution].reverse()) await page.getByRole('button', { name: token, exact: true }).click();
      await page.getByRole('button', { name: 'Confirm order' }).click();
    } else {
      await page.locator('.deduction-panel .choice-grid button').nth((config.correct + 1) % 4).click();
      await page.getByRole('button', { name: 'Commit answer' }).click();
    }
  } else if (config.type === 'rhythm') {
    await page.locator('.rhythm-button').click();
    await page.locator('.rhythm-button').click();
    await page.locator('.rhythm-button').click();
  } else if (config.type === 'memory') {
    const sequence = config.rounds[0];
    await advance(page, sequence.length * config.revealMs);
    const wrong = config.symbols.find((symbol) => symbol !== sequence[0])!;
    await page.locator('.memory-choices button').filter({ hasText: wrong }).click();
  } else {
    await page.locator('.question-panel .choice-grid button').nth((config.question.correct + 1) % 4).click();
  }
  await expect(page.locator('.resolution-card')).toBeVisible();
}

test('mobile home remains usable across the supported phone range', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('main.high-contrast')).toBeVisible();
    await expect(page.getByRole('heading', { name: /DAILY VENTURE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About Daily Venture' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Achievements' })).toBeEnabled();
    const characterButton = await page.getByRole('button', { name: /^Customize character,/ }).boundingBox();
    expect(characterButton).not.toBeNull();
    expect(characterButton!.width).toBeGreaterThanOrEqual(44);
    expect(characterButton!.height).toBeGreaterThanOrEqual(44);
    expect(characterButton!.x + characterButton!.width).toBeLessThanOrEqual(viewport.width);
    for (const label of ['VENTURE', 'PAST VENTURES', 'PREVIEW TESTER GAMES?', 'PREVIEW WEEK 1']) {
      const box = await page.getByRole('button', { name: new RegExp(`^${label}(?:\\s|$)`, 'i') }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: path.join(captures, `home-${viewport.width}x${viewport.height}.png`) });
  }
});

test('character creator saves appearance and name for the toolbar, profile, and playable labs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Customize character, Ari' }).click();
  await expect(page.getByRole('dialog', { name: 'Customize character' })).toBeVisible();
  await page.getByLabel('Character name').fill('Nova Vale');
  await page.getByRole('button', { name: 'Angular', exact: true }).click();
  await page.getByRole('button', { name: 'Storm coat', exact: true }).click();
  await page.getByRole('button', { name: 'Climbing gear', exact: true }).click();
  await page.getByRole('button', { name: 'Mohawk', exact: true }).click();
  await page.getByRole('button', { name: 'Goggles', exact: true }).click();
  await page.getByRole('button', { name: 'Skin tone: Deep brown' }).click();
  await page.getByRole('button', { name: 'Hair color: Violet' }).click();
  await page.getByRole('button', { name: 'Eye color: Green' }).click();
  await page.screenshot({ path: path.join(captures, 'character-customizer-nova.png') });
  await page.getByRole('button', { name: 'SAVE CHARACTER' }).click();
  await expect(page.getByText(/Nova Vale is ready/i)).toBeVisible();
  const storedGuest = await page.evaluate(() => JSON.parse(localStorage.getItem('dailyVentureCharacter') ?? '{}'));
  expect(storedGuest).toMatchObject({ name: 'Nova Vale', head: 'angular', body: 'storm-coat', legs: 'climbing-gear', hairStyle: 'mohawk', accessory: 'goggles' });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Customize character, Nova Vale' })).toBeVisible();

  await page.getByRole('button', { name: 'LOG IN' }).click();
  await page.getByLabel('Email address').fill('nova@example.com');
  await page.getByRole('button', { name: 'CREATE LOCAL REVIEWER' }).click();
  const storedProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('dailyVentureLocalReviewerProfile') ?? '{}'));
  expect(storedProfile.character).toMatchObject({ name: 'Nova Vale', eyeColor: '#4f7a4f', hairColor: '#6d4b88' });

  await page.getByRole('button', { name: /PREVIEW WEEK 1/i }).click();
  await page.locator('.review-list button').filter({ hasText: WEEK_ONE[0].title }).click();
  await expect(page.getByRole('button', { name: 'ENTER THE TRAIL' })).toBeVisible();
  const ventureState = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(ventureState.character).toMatchObject({ name: 'Nova Vale', body: 'storm-coat', legs: 'climbing-gear' });
  await page.screenshot({ path: path.join(captures, 'venture-intro-custom-character.png') });
  await page.getByRole('button', { name: 'ENTER THE TRAIL' }).click();
  await page.getByRole('button', { name: 'READY', exact: true }).click();
  await expect(page.locator('.puzzle-panel')).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'venture-puzzle-custom-character.png') });

  await page.goto('/?lab=block-shift');
  await expect(page.getByLabel('Block Shift puzzle room')).toBeVisible();
  const state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.character).toMatchObject({ name: 'Nova Vale', head: 'angular', body: 'storm-coat', accessory: 'goggles' });
  await page.screenshot({ path: path.join(captures, 'block-shift-custom-character.png') });

  await page.goto('/?lab=03');
  await expect(page.getByLabel('Relic Run game world')).toBeVisible();
  const classicState = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(classicState.character).toMatchObject({ name: 'Nova Vale', hairStyle: 'mohawk', eyeColor: '#4f7a4f' });
  await page.screenshot({ path: path.join(captures, 'relic-run-custom-character.png') });
});

test('Block Shift lab supports touch controls, undo, keyboard play, and a complete door unlock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /PREVIEW TESTER GAME/i }).click();
  await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Block Shift/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mine Trail/i })).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'puzzle-lab-hub.png') });
  await page.getByRole('button', { name: /Block Shift/i }).click();
  await expect(page.getByRole('heading', { name: /Block Shift/i })).toBeVisible();
  await expect(page.getByLabel('Block Shift puzzle room')).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'block-shift-start.png') });

  await page.getByRole('button', { name: 'Move right' }).click();
  let state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.player).toEqual({ x: 1, y: 5 });
  expect(state.moves).toBe(1);
  await page.getByRole('button', { name: /UNDO/i }).click();
  state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.player).toEqual({ x: 0, y: 5 });
  expect(state.moves).toBe(0);
  expect(state.blocks.map((block: { width: number; height: number }) => `${block.width}x${block.height}`)).toEqual(expect.arrayContaining(['2x1', '1x2', '2x2', '1x3', '3x1']));

  const undoBox = await page.getByRole('button', { name: /UNDO/i }).boundingBox();
  const upBox = await page.getByRole('button', { name: 'Move up' }).boundingBox();
  expect(undoBox).not.toBeNull(); expect(upBox).not.toBeNull();
  expect(undoBox!.y + undoBox!.height).toBeLessThan(upBox!.y - 200);

  const solution = [
    'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight',
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowLeft',
    'ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowDown',
    'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight',
  ];
  for (const key of solution) {
    await page.keyboard.press(key);
    await page.waitForTimeout(18);
  }
  state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.status).toBe('complete');
  expect(state.keystone).toMatchObject({ x: 7, y: 3, width: 2, height: 1 });
  await expect(page.getByText(/Door unlocked/i)).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'block-shift-complete.png') });
  await page.getByRole('button', { name: 'Back to puzzle labs' }).click();
  await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
});

test('Mine Trail uses character movement and an action reveal for safe, failed, and cleared routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /PREVIEW TESTER GAME/i }).click();
  await page.getByRole('button', { name: /Mine Trail/i }).click();
  await expect(page.getByRole('heading', { name: /Mine Trail/i })).toBeVisible();
  await expect(page.getByLabel('Mine Trail puzzle room')).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'mine-trail-start.png') });

  await page.getByRole('button', { name: 'Reveal current tile' }).click();
  let state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.player).toEqual({ x: 0, y: 4 });
  expect(state.actions).toBe(1);
  expect(state.safeTilesRemaining).toBe(14);
  expect(state.cells.filter((cell: { state: string }) => cell.state === 'safe')).toHaveLength(6);

  await page.getByRole('button', { name: /RESET/i }).click();
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowUp']) await page.keyboard.press(key);
  await page.keyboard.press('Space');
  state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.status).toBe('failed');
  expect(state.player).toEqual({ x: 1, y: 1 });
  await expect(page.getByText(/Mine triggered/i)).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'mine-trail-failed.png') });

  await page.getByRole('button', { name: /RESET/i }).click();
  const mines = new Set(['4,4', '2,3', '4,2', '1,1', '3,0']);
  let current = { x: 0, y: 4 };
  for (let y = 4; y >= 0; y -= 1) {
    const xs = (4 - y) % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const x of xs) {
      while (current.x < x) { await page.keyboard.press('ArrowRight'); current.x += 1; }
      while (current.x > x) { await page.keyboard.press('ArrowLeft'); current.x -= 1; }
      if (!mines.has(`${x},${y}`)) await page.keyboard.press('Space');
    }
    if (y > 0) { await page.keyboard.press('ArrowUp'); current.y -= 1; }
  }
  state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
  expect(state.status).toBe('complete');
  expect(state.safeTilesRemaining).toBe(0);
  await expect(page.getByText(/Minefield cleared/i)).toBeVisible();
  await page.screenshot({ path: path.join(captures, 'mine-trail-complete.png') });
});

test('both character puzzle labs keep controls inside the supported phone range', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const lab of [
      { query: 'block-shift', canvas: 'Block Shift puzzle room', action: 'Move down' },
      { query: 'mine-trail', canvas: 'Mine Trail puzzle room', action: 'Reveal current tile' },
    ]) {
      await page.goto(`/?lab=${lab.query}`);
      await expect(page.getByLabel(lab.canvas)).toBeVisible();
      const control = await page.getByRole('button', { name: lab.action }).boundingBox();
      const reset = await page.getByRole('button', { name: /RESET/i }).boundingBox();
      expect(control).not.toBeNull(); expect(reset).not.toBeNull();
      expect(control!.height).toBeGreaterThanOrEqual(44);
      expect(control!.y + control!.height).toBeLessThanOrEqual(viewport.height);
      expect(reset!.y + reset!.height).toBeLessThan(control!.y - 100);
      await page.screenshot({ path: path.join(captures, `${lab.query}-${viewport.width}x${viewport.height}.png`) });
    }
  }
});

test('reviewer room picker jumps directly to each puzzle without saving a result', async ({ page }) => {
  await page.goto('/');
  await openPreview(page, WEEK_ONE[0]);
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole('button', { name: 'ROOMS' }).click();
    await page.locator('.room-picker button').nth(index).click();
    await expect(page.getByText(`ROOM ${index + 1} OF 5`, { exact: false })).toBeVisible();
    const state = JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
    expect(state.levelIndex).toBe(index);
    expect(state.mode).toBe('ready');
    expect(state.testing).toBe(true);
  }
  await expect(page.getByText(/ROOM TEST · NOT SAVED/i)).toBeVisible();
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
  test.setTimeout(240_000);
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
  await expect(page.getByRole('button', { name: /^VENTURE/i })).toBeEnabled();
  await page.getByRole('button', { name: /^VENTURE/i }).click();
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
