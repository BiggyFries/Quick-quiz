import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ADVENTURE_SOLUTION } from './adventure-solution';
import { BEAM_TARGET, BRIDGE_EDGES, BRIDGE_ISLANDS, DOMINO_SOLUTION, FLOOD_SOLUTION, INEQUALITY_TARGET, MAGNET_TARGET, PEG_HOLES, PEG_SOLUTION, SIGNAL_PATH, STAR_TARGET, UNTANGLE_SOLUTION } from '../src/lab/motionLabs';

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
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  return JSON.parse((await page.evaluate(() => window.render_game_to_text?.())) ?? '{}');
}

async function clickCanvasLogical(page: Page, label: string, x: number, y: number) {
  const box = await page.getByLabel(label).boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + x / 390 * box!.width, box!.y + y / 844 * box!.height);
}

const motionGridPoint = (size: number, x: number, y: number) => ({ x: 195 + (x - y) * (size === 5 ? 29 : 35), y: 245 + (x + y) * 16 });
const motionPegPoint = (index: number) => ({ x: 195 + (PEG_HOLES[index].column - PEG_HOLES[index].row / 2) * 55, y: 245 + PEG_HOLES[index].row * 47 });

async function walkRoute(page: Page, route: string) {
  const keys = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' } as const;
  for (const step of route) await page.keyboard.press(keys[step as keyof typeof keys]);
}

async function crossLabPortal(page: Page) {
  await advance(page, 1000);
  await walkRoute(page, 'RRRR');
}

async function solveAdventureComputer(page: Page, answer: string) {
  await page.getByRole('button', { name: 'USE' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: path.join(captures, `adventure-computer-${answer.toLowerCase()}-open.png`) });
  if (answer === ADVENTURE_SOLUTION.signalAnswer) {
    await page.keyboard.type('STONE'); await page.keyboard.press('Enter');
    await expect(page.locator('.computer-word-grid [data-score="present"]')).toHaveCount(2);
    await page.screenshot({ path: path.join(captures, 'adventure-word-grid-feedback.png') });
  } else {
    await page.keyboard.type('A');
    await expect(page.getByLabel('1 of 6 misses')).toBeVisible();
    await page.screenshot({ path: path.join(captures, 'adventure-hangman-miss.png') });
  }
  await page.keyboard.type(answer);
  if (answer === ADVENTURE_SOLUTION.signalAnswer) await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'RETURN TO TRAIL' })).toBeVisible();
  await page.screenshot({ path: path.join(captures, `adventure-computer-${answer.toLowerCase()}-solved.png`) });
  await page.getByRole('button', { name: 'RETURN TO TRAIL' }).click();
}

async function completeAdventure(page: Page) {
  await walkRoute(page, ADVENTURE_SOLUTION.toSignalComputer);
  await page.keyboard.press('ArrowLeft');
  await solveAdventureComputer(page, ADVENTURE_SOLUTION.signalAnswer);
  await walkRoute(page, ADVENTURE_SOLUTION.signalToArchiveComputer);
  await page.keyboard.press('ArrowRight');
  await solveAdventureComputer(page, ADVENTURE_SOLUTION.archiveAnswer);
  await walkRoute(page, ADVENTURE_SOLUTION.archiveToFinalGate);
  await advance(page, 1000);
  await walkRoute(page, ADVENTURE_SOLUTION.finalPortalStep);
}

test('Adventure combines a five-minute maze, two computers, gear, locks, a pressure crate, and a manual portal exit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?legacy=1&lab=adventure');
  await expect(page.getByLabel('Adventure game world')).toBeVisible();
  await advance(page, 0);
  const canvas = await page.getByLabel('Adventure game world').boundingBox();
  expect(canvas).not.toBeNull();
  await page.screenshot({ path: path.join(captures, 'adventure-primary-start.png') });
  await page.mouse.move(canvas!.x + 115, canvas!.y + 350); await page.mouse.down(); await page.mouse.move(canvas!.x + 235, canvas!.y + 350, { steps: 4 }); await page.mouse.up();
  let state = await snapshot(page); expect(state.player).toEqual({ x: 2, y: 1 });
  await page.getByRole('button', { name: 'RESET', exact: true }).click();
  await completeAdventure(page);
  state = await snapshot(page); expect(state.phase).toBe('complete'); expect(state.inventory.chips).toBe(10); expect(state.doors.chipGateOpen).toBe(true); expect(state.plateActive).toBe(true);
  expect(state.terminals.signal.solved).toBe(true); expect(state.terminals.archive.solved).toBe(true); expect(state.moves).toBe(ADVENTURE_SOLUTION.expectedMoves); expect(state.portalOpen).toBe(true);
  await page.screenshot({ path: path.join(captures, 'adventure-primary-complete.png') });
});

test('daily formula preview runs Adventure, two themed prototypes, and the named Watcher finale', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?legacy=1&lab=formula');
  await expect(page.getByRole('heading', { name: 'The Verdant Orrery' })).toBeVisible();
  await page.getByRole('button', { name: 'ENTER THE ADVENTURE' }).click();
  await advance(page, 0);
  await completeAdventure(page);
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

test('Prototype Corridor exposes Adventure and Labs 03 through 21 with matching deterministic state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?legacy=1');
  await page.getByRole('button', { name: /PREVIEW TESTER GAME/i }).click();
  await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Venture Circuit.*Main mode/i })).toBeVisible();
  for (const title of ['Relic Run', 'Sky Stack', 'River Relay', 'Trail Coil', 'Prism Break', 'Rune Merge', 'Lantern Grid', 'Icebound Route', 'Crate Circuit', 'Echo Sequence', 'Gear Links', 'Orbit Pulse', 'Rune Word', 'Relic Groups', 'Prism Survey', 'Bridge Forge', 'Floodwell', 'Starfold', 'Peg Vault', 'Domino Seal', 'Rune Ascent', 'Signal Path', 'Magnet Chamber', 'Circuit Untangle']) {
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  }
  await page.screenshot({ path: path.join(captures, 'prototype-corridor-twenty-two-games.png') });

  const labs = [
    { id: 3, title: 'Relic Run', act: async () => page.keyboard.press('ArrowRight') },
    { id: 4, title: 'Sky Stack', act: async () => { await page.keyboard.press('ArrowLeft'); await page.keyboard.press('q'); await page.getByLabel('Sky Stack game world').click({ position: { x: 195, y: 330 } }); } },
    { id: 5, title: 'River Relay', act: async () => page.keyboard.press('ArrowUp') },
    { id: 6, title: 'Trail Coil', act: async () => advance(page, 260) },
    { id: 7, title: 'Prism Break', act: async () => page.getByRole('button', { name: 'Move light bar right' }).click() },
    { id: 8, title: 'Rune Merge', act: async () => page.keyboard.press('ArrowLeft') },
    { id: 9, title: 'Lantern Grid', act: async () => page.getByRole('button', { name: /Lantern rune 1, 1/ }).click() },
    { id: 10, title: 'Icebound Route', act: async () => page.keyboard.press('ArrowUp') },
    { id: 11, title: 'Crate Circuit', act: async () => page.keyboard.press('ArrowUp') },
    { id: 12, title: 'Echo Sequence', act: async () => { await advance(page, 2080); const pad = page.getByRole('button', { name: /Echo pad 1/ }); await pad.click(); await expect(pad).toHaveClass(/pressed/); } },
    { id: 13, title: 'Gear Links', act: async () => page.getByRole('button', { name: /Gear link 1, 1/ }).click() },
    { id: 14, title: 'Orbit Pulse', act: async () => { await advance(page, 290); await page.getByRole('button', { name: 'PULSE' }).click(); } },
    { id: 15, title: 'Rune Word', act: async () => { await page.keyboard.type('STONE'); await page.keyboard.press('Enter'); } },
    { id: 16, title: 'Relic Groups', act: async () => { for (const word of ['COMPASS', 'MAP', 'BEACON', 'SEXTANT']) await page.getByRole('button', { name: word, exact: true }).click(); await page.getByRole('button', { name: 'SUBMIT GROUP' }).click(); } },
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
    if (lab.id === 12) {
      expect(state.inputIndex).toBe(1); expect(state.pressedPad).toBe(0);
      await page.screenshot({ path: path.join(captures, 'lab-12-echo-press-feedback.png') });
      await advance(page, 180); await expect(page.getByRole('button', { name: /Echo pad 1/ })).not.toHaveClass(/pressed/);
    }
    if (lab.id === 13) expect(state.moves).toBe(1);
    if (lab.id === 14) expect(state.gate).toBe(1);
    if (lab.id === 15) {
      expect(state.guesses).toHaveLength(1); expect(state.guessesRemaining).toBe(5);
      await expect(page.getByRole('button', { name: 'Letter S' })).toHaveAttribute('data-letter-state', 'absent');
      await expect(page.getByRole('button', { name: 'Letter T' })).toHaveAttribute('data-letter-state', 'present');
    }
    if (lab.id === 16) { expect(state.solved).toEqual(['NAVIGATION']); expect(state.mistakes).toBe(0); }
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
    if (lab.id === 15) {
      await page.getByRole('button', { name: 'RESET', exact: true }).click();
      await page.keyboard.type('TRAIL'); await page.keyboard.press('Enter');
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.guesses[0].word).toBe('TRAIL');
      await page.screenshot({ path: path.join(captures, 'lab-15-rune-word-clear.png') });
    }
    if (lab.id === 16) {
      for (const group of [['PINE', 'OAK', 'ELM', 'BIRCH'], ['TORCH', 'LANTERN', 'CANDLE', 'STAR'], ['RAIN', 'HAIL', 'SLEET', 'SNOW']]) {
        for (const word of group) await page.getByRole('button', { name: word, exact: true }).click();
        await page.getByRole('button', { name: 'SUBMIT GROUP' }).click();
      }
      state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.solved).toHaveLength(4);
      await page.screenshot({ path: path.join(captures, 'lab-16-relic-groups-clear.png') });
    }
    await page.getByRole('button', { name: 'Back to Lab corridor' }).click();
    await expect(page.getByRole('heading', { name: 'Prototype Corridor' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('Motion Labs 17 through 21 provide five complete animated puzzle routes', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/?legacy=1&lab=17');
  for (const index of BEAM_TARGET) { const point = motionGridPoint(5, index % 5, Math.floor(index / 5)); await clickCanvasLogical(page, 'Prism Survey game world', point.x, point.y); }
  await page.getByRole('button', { name: 'SUBMIT' }).click();
  let state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.selected).toEqual(BEAM_TARGET);
  await page.screenshot({ path: path.join(captures, 'lab-17-prism-survey-clear.png') });

  await page.goto('/?legacy=1&lab=18');
  for (let index = 0; index < 4; index += 1) {
    const edge = BRIDGE_EDGES[index]; const a = BRIDGE_ISLANDS[edge.a]; const b = BRIDGE_ISLANDS[edge.b]; const pa = motionGridPoint(4, a.x, a.y); const pb = motionGridPoint(4, b.x, b.y);
    await clickCanvasLogical(page, 'Bridge Forge game world', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2); await advance(page, 120);
  }
  await advance(page, 600);
  state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.edges.slice(0, 4).every((edge: { links: number; spring: number }) => edge.links === 1 && edge.spring > 0)).toBe(true);
  await page.screenshot({ path: path.join(captures, 'lab-18-bridge-forge-clear.png') });

  await page.goto('/?legacy=1&lab=19');
  for (const color of FLOOD_SOLUTION) { await page.getByRole('button', { name: `Flood color ${color + 1}` }).click(); await advance(page, 140); }
  state = await snapshot(page); expect(state.status).toBe('complete'); expect(new Set(state.board.flat()).size).toBe(1); expect(state.moves).toBe(4);
  await page.screenshot({ path: path.join(captures, 'lab-19-floodwell-clear.png') });

  await page.goto('/?legacy=1&lab=20');
  state = await snapshot(page);
  for (let index = 0; index < STAR_TARGET.length; index += 1) {
    const point = motionGridPoint(4, index % 4, Math.floor(index / 4));
    while (state.assignments[index] !== STAR_TARGET[index]) { await clickCanvasLogical(page, 'Starfold game world', point.x, point.y); state = await snapshot(page); }
  }
  expect(state.status).toBe('complete'); expect(state.assignments).toEqual(STAR_TARGET);
  await page.screenshot({ path: path.join(captures, 'lab-20-starfold-clear.png') });

  await page.goto('/?legacy=1&lab=21');
  for (const [from, to] of PEG_SOLUTION) {
    const source = motionPegPoint(from); const target = motionPegPoint(to);
    await clickCanvasLogical(page, 'Peg Vault game world', source.x, source.y); await clickCanvasLogical(page, 'Peg Vault game world', target.x, target.y); await advance(page, 520);
  }
  state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.remaining).toBe(1); expect(state.victory.phase).toBe('celebrating');
  await page.screenshot({ path: path.join(captures, 'lab-21-peg-vault-clear.png') });
  await advance(page, 1000); await walkRoute(page, 'RRRR'); state = await snapshot(page); expect(state.victory.phase).toBe('departed');
  expect(errors).toEqual([]);
});

test('Motion Labs 22 through 26 provide five more distinct complete routes', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/?legacy=1&lab=22');
  for (const [first, second] of DOMINO_SOLUTION) {
    for (const index of [first, second]) { const point = motionGridPoint(4, index % 4, Math.floor(index / 4)); await clickCanvasLogical(page, 'Domino Seal game world', point.x, point.y); }
    await advance(page, 520);
  }
  let state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.pairs).toHaveLength(6); expect(state.deployProgress).toBe(1);
  await page.screenshot({ path: path.join(captures, 'lab-22-domino-seal-clear.png') });

  await page.goto('/?legacy=1&lab=23');
  state = await snapshot(page);
  for (let index = 0; index < INEQUALITY_TARGET.length; index += 1) {
    const point = motionGridPoint(4, index % 4, Math.floor(index / 4));
    while (state.values[index] !== INEQUALITY_TARGET[index]) { await clickCanvasLogical(page, 'Rune Ascent game world', point.x, point.y); state = await snapshot(page); }
  }
  expect(state.status).toBe('complete'); expect(state.conflicts).toBe(0);
  await page.screenshot({ path: path.join(captures, 'lab-23-rune-ascent-clear.png') });

  await page.goto('/?legacy=1&lab=24');
  for (const index of SIGNAL_PATH) { const point = motionGridPoint(4, index % 4, Math.floor(index / 4)); await clickCanvasLogical(page, 'Signal Path game world', point.x, point.y); await advance(page, 90); }
  state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.progress).toBe(SIGNAL_PATH.length); expect(state.strikes).toBe(0);
  await page.screenshot({ path: path.join(captures, 'lab-24-signal-path-clear.png') });

  await page.goto('/?legacy=1&lab=25');
  for (let index = 0; index < MAGNET_TARGET.length; index += 1) { await clickCanvasLogical(page, 'Magnet Chamber game world', index % 2 ? 260 : 130, 225 + Math.floor(index / 2) * 67); await advance(page, 120); }
  await advance(page, 800); state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.balanced).toBe(8); expect(state.angles.every((angle: number, index: number) => Math.abs(angle - MAGNET_TARGET[index] * Math.PI) < .12)).toBe(true);
  await page.screenshot({ path: path.join(captures, 'lab-25-magnet-chamber-clear.png') });

  await page.goto('/?legacy=1&lab=26');
  for (const [firstSlot, secondSlot] of UNTANGLE_SOLUTION) {
    state = await snapshot(page);
    for (const slot of [firstSlot, secondSlot]) { const node = state.nodeAtSlots[slot]; const point = state.display.find((item: { node: number }) => item.node === node); await clickCanvasLogical(page, 'Circuit Untangle game world', 195 + point.x * 128, 322 + point.y * 112); }
    await advance(page, 600);
  }
  state = await snapshot(page); expect(state.status).toBe('complete'); expect(state.crossings).toBe(0);
  await page.screenshot({ path: path.join(captures, 'lab-26-circuit-untangle-clear.png') });
  expect(errors).toEqual([]);
});

test('Motion Lab controls and perspective remain visible on compact phones', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  for (const id of [17, 18, 19, 20, 21, 22, 23, 24, 25, 26]) {
    await page.goto(`/?legacy=1&lab=${id}`);
    await expect(page.locator('.motion-lab-screen')).toBeVisible();
    const controls = await page.locator('.motion-controls').boundingBox(); const stage = await page.locator('.phone-stage').boundingBox();
    expect(controls).not.toBeNull(); expect(stage).not.toBeNull(); expect(controls!.y + controls!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
    const state = await snapshot(page); expect(state.perspective).toBe([18, 21, 23, 25].includes(id) ? 'world-board' : 'remote-board');
    await page.screenshot({ path: path.join(captures, `lab-${id}-compact.png`) });
  }
});

test('classic Lab controls remain reachable on the compact phone layout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  for (const id of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
    await page.goto(`/?legacy=1&lab=${String(id).padStart(2, '0')}`);
    await expect(page.locator('.classic-lab-screen')).toBeVisible();
    const controls = await page.locator('.classic-controls').boundingBox();
    const reset = await page.getByRole('button', { name: 'RESET', exact: true }).boundingBox();
    expect(controls).not.toBeNull(); expect(reset).not.toBeNull();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(640);
    expect(reset!.height).toBeGreaterThanOrEqual(44);
    expect(reset!.y + reset!.height).toBeLessThan(controls!.y);
    if (id === 15) {
      const keyboard = await page.getByLabel('Rune Word keyboard').boundingBox();
      const stage = await page.locator('.phone-stage').boundingBox();
      expect(keyboard).not.toBeNull(); expect(stage).not.toBeNull();
      expect(Math.abs((keyboard!.x + keyboard!.width / 2) - (stage!.x + stage!.width / 2))).toBeLessThanOrEqual(1);
    }
  }
});

test('expanded Adventure map and controls fit every supported phone size', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?legacy=1&lab=adventure');
    await expect(page.getByLabel('Adventure game world')).toBeVisible();
    const state = await snapshot(page);
    expect(state.coordinateSystem).toContain('21x21');
    expect(state.map).toHaveLength(21);
    expect(state.inventory.chipTotal).toBe(10);
    const controls = await page.locator('.lab-controls').boundingBox();
    const stage = await page.locator('.phone-stage').boundingBox();
    expect(controls).not.toBeNull(); expect(stage).not.toBeNull();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
    await page.screenshot({ path: path.join(captures, `adventure-expanded-${viewport.width}x${viewport.height}.png`) });
  }
});
