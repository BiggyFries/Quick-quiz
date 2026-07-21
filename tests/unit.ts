import assert from 'node:assert/strict';
import { CHARACTER_PRESETS, DEFAULT_CHARACTER, loadCharacterCustomization, normalizeCharacterCustomization, randomizeCharacterCustomization, saveCharacterCustomization } from '../src/character/character';
import { WEEK_ONE } from '../src/content/week1';
import { countLogicSolutions, dailyAdventureSchema, satisfiesLogicClues } from '../src/game/schema';
import type { AttemptRecord } from '../src/game/types';
import { blockShiftSnapshot, initialBlockShiftState, moveBlockShift, undoBlockShift } from '../src/lab/blockShift';
import { adventureSnapshot, initialAdventureState, moveAdventure, tickAdventure } from '../src/lab/adventure';
import { CLASSIC_LABS, classicLabSnapshot, initialClassicLabState, updateClassicLab, type ClassicLabState } from '../src/lab/classicLabs';
import { adjacentMineCount, initialMineTrailState, isMine, mineTrailSnapshot, moveMineTrail, revealMineTrail } from '../src/lab/mineTrail';
import { calculateAchievements } from '../src/services/achievements';
import { addDays, localDateKey } from '../src/services/date';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });

const customExplorer = normalizeCharacterCustomization({
  ...DEFAULT_CHARACTER, name: '  Nova   Vale  ', head: 'angular', body: 'storm-coat', legs: 'climbing-gear',
  skinTone: '#8c573f', hairStyle: 'mohawk', hairColor: '#6d4b88', eyeColor: '#4f7a4f', accessory: 'goggles',
});
assert.equal(customExplorer.name, 'Nova Vale');
assert.equal(customExplorer.head, 'angular');
assert.equal(normalizeCharacterCustomization({ head: 'not-an-option' }).head, DEFAULT_CHARACTER.head);
saveCharacterCustomization(customExplorer);
assert.deepEqual(loadCharacterCustomization(), customExplorer);
assert.deepEqual(
  { name: CHARACTER_PRESETS.Matt.name, head: CHARACTER_PRESETS.Matt.head, hairColor: CHARACTER_PRESETS.Matt.hairColor, accessory: CHARACTER_PRESETS.Matt.accessory },
  { name: 'Matt', head: 'triangular', hairColor: '#d8b56b', accessory: 'aviators' },
);
assert.deepEqual({ name: CHARACTER_PRESETS.Myles.name, frame: CHARACTER_PRESETS.Myles.frame, eyeShape: CHARACTER_PRESETS.Myles.eyeShape }, { name: 'Myles', frame: 'tall', eyeShape: 'almond' });
assert.deepEqual({ name: CHARACTER_PRESETS.Ian.name, frame: CHARACTER_PRESETS.Ian.frame, body: CHARACTER_PRESETS.Ian.body, legs: CHARACTER_PRESETS.Ian.legs }, { name: 'Ian', frame: 'sturdy', body: 'heritage-tee', legs: 'jean-shorts' });
const randomizedExplorer = randomizeCharacterCustomization(customExplorer, () => 0);
assert.equal(randomizedExplorer.name, 'Nova Vale'); assert.equal(randomizedExplorer.head, 'round'); assert.equal(randomizedExplorer.accessory, 'none');

assert.equal(WEEK_ONE.length, 7);
for (const [index, adventure] of WEEK_ONE.entries()) {
  assert.equal(adventure.weekIndex, index);
  assert.equal(adventure.status, 'draft');
  assert.equal(adventure.publishDate, null);
  assert.equal(adventure.levelOrder.length, 5);
  assert.equal(adventure.levelOrder[4], 'finale');
  assert.deepEqual(new Set(adventure.levelOrder.slice(0, 4)), new Set(['trivia', 'logic', 'rhythm', 'memory']));
  assert.equal(adventure.puzzles.trivia.questions.length, 3);
  adventure.puzzles.trivia.questions.forEach((question) => assert.ok(question.correct >= 0 && question.correct <= 3));
  assert.equal(adventure.puzzles.rhythm.beatMap.length, 12);
  assert.ok(adventure.puzzles.rhythm.beatMap.every((beat, beatIndex, map) => beatIndex === 0 || beat > map[beatIndex - 1]));
  assert.equal(adventure.puzzles.rhythm.durationMs, 30000);
  assert.equal(adventure.puzzles.rhythm.maxErrors, 3);
  assert.deepEqual(adventure.puzzles.memory.rounds.map((round) => round.length), [4, 5, 6]);
  assert.ok(adventure.puzzles.memory.rounds.flat().every((symbol) => adventure.puzzles.memory.symbols.includes(symbol)));
  if (adventure.puzzles.logic.mechanic === 'order') {
    assert.equal(countLogicSolutions(adventure.puzzles.logic), 1);
    assert.ok(satisfiesLogicClues(adventure.puzzles.logic.solution, adventure.puzzles.logic));
  } else {
    assert.ok(adventure.puzzles.logic.correct >= 0 && adventure.puzzles.logic.correct <= 3);
  }
  dailyAdventureSchema.parse(adventure);
}

assert.equal(addDays('2028-02-28', 1), '2028-02-29');
assert.equal(addDays('2028-02-29', 1), '2028-03-01');
const boundary = new Date('2026-01-01T07:30:00Z');
assert.equal(localDateKey(boundary, 'America/Los_Angeles'), '2025-12-31');
assert.equal(localDateKey(boundary, 'Asia/Tokyo'), '2026-01-01');

const attempt = (overrides: Partial<AttemptRecord> = {}): AttemptRecord => ({
  id: crypto.randomUUID(), adventureId: 'venture-1', attemptNumber: 1, isArchive: false, isPreview: false,
  releaseDate: '2026-07-14', startedAt: '2026-07-14T12:00:00Z', localDateAtStart: '2026-07-14', outcome: 'failed', activeMs: 1000, levelResults: [], ...overrides,
});

const abandoned = attempt({ outcome: 'abandoned' });
assert.equal(calculateAchievements([abandoned]).find((item) => item.code === 'first-failure')?.unlocked, false);
const previewFailure = attempt({ isPreview: true });
assert.equal(calculateAchievements([previewFailure]).find((item) => item.code === 'first-failure')?.unlocked, false);
const hundredFailures = Array.from({ length: 100 }, (_, index) => attempt({ id: `failure-${index}`, attemptNumber: index + 1 }));
assert.equal(calculateAchievements(hundredFailures).find((item) => item.code === 'fail-100')?.unlocked, true);
const archiveVictory = attempt({ outcome: 'survived', isArchive: true });
const archiveProgress = calculateAchievements([archiveVictory]);
assert.equal(archiveProgress.find((item) => item.code === 'survive-1')?.unlocked, true);
assert.equal(archiveProgress.find((item) => item.code === 'first-try')?.unlocked, false);
const releaseVictory = attempt({ outcome: 'survived' });
assert.equal(calculateAchievements([releaseVictory]).find((item) => item.code === 'first-try')?.unlocked, true);
const uniqueVictories = Array.from({ length: 10 }, (_, index) => attempt({ id: `win-${index}`, adventureId: `venture-${index}`, outcome: 'survived', attemptNumber: 2 }));
assert.equal(calculateAchievements(uniqueVictories).find((item) => item.code === 'survive-10')?.unlocked, true);

const initialLab = initialBlockShiftState();
assert.equal(initialLab.status, 'playing');
assert.deepEqual(initialLab.blocks.find((block) => block.id === 'keystone'), {
  id: 'keystone', kind: 'keystone', label: 'Keystone sled', color: '#f6c85f',
  x: 1, y: 3, width: 2, height: 1, axis: 'horizontal',
});
const blockedRailMove = moveBlockShift({ ...initialLab, player: { x: 1, y: 4 } }, 'up');
assert.equal(blockedRailMove.moves, 0);
assert.match(blockedRailMove.message, /sideways/i);

const labStep = ['right', 'right', 'right', 'up'].reduce(moveBlockShift, initialLab);
assert.deepEqual(
  (({ x, y }) => ({ x, y }))(labStep.blocks.find((block) => block.id === 'amber')!),
  { x: 3, y: 2 },
);
assert.equal(labStep.pushes, 1);
const undoneLabStep = undoBlockShift(labStep);
assert.deepEqual(
  (({ x, y }) => ({ x, y }))(undoneLabStep.blocks.find((block) => block.id === 'amber')!),
  { x: 3, y: 3 },
);
assert.deepEqual(undoneLabStep.player, { x: 3, y: 5 });
assert.equal(undoneLabStep.moves, 3);

const labSolution = [
  'right', 'right', 'right', 'right', 'right', 'right', 'up', 'up', 'down', 'right',
  'up', 'down', 'left', 'left', 'up', 'up', 'left', 'left', 'down', 'up', 'left', 'left', 'left', 'down',
  'right', 'right', 'right', 'right', 'right', 'right',
] as const;
const completedLab = labSolution.reduce(moveBlockShift, initialBlockShiftState());
assert.equal(completedLab.status, 'complete');
assert.deepEqual(completedLab.blocks.find((block) => block.id === 'keystone'), {
  id: 'keystone', kind: 'keystone', label: 'Keystone sled', color: '#f6c85f',
  x: 7, y: 3, width: 2, height: 1, axis: 'horizontal',
});
assert.equal(completedLab.moves, 30);
assert.equal(completedLab.pushes, 12);
assert.equal(moveBlockShift(completedLab, 'left').moves, 30);
assert.equal(blockShiftSnapshot(completedLab).status, 'complete');

const initialMineTrail = initialMineTrailState();
assert.equal(adjacentMineCount({ x: 0, y: 0 }), 1);
assert.deepEqual(initialMineTrail.player, { x: 2, y: 2 });
assert.equal(mineTrailSnapshot(initialMineTrail).cells.filter((cell) => cell.state === 'safe').length, 1);
const firstReveal = revealMineTrail({ ...initialMineTrail, player: { x: 0, y: 4 } });
assert.equal(firstReveal.status, 'playing');
assert.equal(firstReveal.revealed.length, 5);
assert.equal(mineTrailSnapshot(firstReveal).safeTilesRemaining, 14);
let failedMineTrail = initialMineTrailState();
for (const direction of ['left', 'up'] as const) failedMineTrail = moveMineTrail(failedMineTrail, direction);
failedMineTrail = revealMineTrail(failedMineTrail);
assert.equal(failedMineTrail.status, 'failed');
assert.deepEqual(failedMineTrail.detonated, { x: 1, y: 1 });
let completedMineTrail = initialMineTrailState();
for (let y = 0; y < 5; y += 1) {
  for (let x = 0; x < 5; x += 1) {
    if (!isMine({ x, y })) completedMineTrail = revealMineTrail({ ...completedMineTrail, player: { x, y } });
  }
}
assert.equal(completedMineTrail.status, 'complete');
assert.equal(mineTrailSnapshot(completedMineTrail).safeTilesRemaining, 0);

assert.deepEqual(CLASSIC_LABS.map((lab) => lab.id), [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
for (const lab of CLASSIC_LABS) {
  const initial = initialClassicLabState(lab.id);
  assert.equal(initial.status, 'playing');
  assert.equal(classicLabSnapshot(initial).puzzle, `classic-lab-${String(lab.id).padStart(2, '0')}`);
}

const relicInitial = initialClassicLabState(3);
const relicWalk = updateClassicLab(relicInitial, { type: 'move', direction: 'right' });
assert.deepEqual(relicWalk.player, { x: 2, y: 13 });
assert.equal(relicWalk.score, 1);
const relicClear = updateClassicLab({ ...relicInitial, player: { x: 10, y: 1 }, score: relicInitial.target, pellets: [] } as ClassicLabState, { type: 'move', direction: 'right' });
assert.equal(relicClear.status, 'complete');

const stackInitial = initialClassicLabState(4);
const stackShift = updateClassicLab(stackInitial, { type: 'move', direction: 'left' });
assert.equal(stackShift.active.x, 3);
const stackDropped = updateClassicLab(stackShift, { type: 'hard-drop' });
assert.equal(stackDropped.pieces, 1);
const stackClear = updateClassicLab(stackInitial, { type: 'tick', ms: 75000 });
assert.equal(stackClear.status, 'complete'); assert.equal(stackClear.remainingMs, 0);

const riverInitial = initialClassicLabState(5);
const riverHop = updateClassicLab(riverInitial, { type: 'move', direction: 'up' });
assert.equal(riverHop.player.y, 9);
const riverClear = updateClassicLab({ ...riverInitial, player: { x: 4, y: 1 } } as ClassicLabState, { type: 'move', direction: 'up' });
assert.equal(riverClear.status, 'complete');

const coilInitial = initialClassicLabState(6);
const coilClear = updateClassicLab({ ...coilInitial, score: 9, orb: { x: 7, y: 12 } } as ClassicLabState, { type: 'tick', ms: 260 });
assert.equal(coilClear.status, 'complete'); assert.equal(coilClear.score, 10);

const prismInitial = initialClassicLabState(7);
const prismShift = updateClassicLab(prismInitial, { type: 'move', direction: 'left' });
assert.ok(prismShift.paddleX < prismInitial.paddleX);
const prismClear = updateClassicLab({ ...prismInitial, ball: { x: 195, y: 500, vx: 0, vy: -172 }, seals: [{ id: 99, x: 195, y: 492, color: 1 }] } as ClassicLabState, { type: 'tick', ms: 32 });
assert.equal(prismClear.status, 'complete');

const mergeInitial = initialClassicLabState(8);
const mergeClear = updateClassicLab({ ...mergeInitial, board: [[32, 32, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], highest: 32 } as ClassicLabState, { type: 'move', direction: 'left' });
assert.equal(mergeClear.status, 'complete'); assert.equal(mergeClear.highest, 64);
assert.equal(classicLabSnapshot(mergeClear).highestStack, 6);

let adventure = initialAdventureState();
const adventureMove = (route: string) => { for (const key of route) adventure = moveAdventure(adventure, ({ U: 'up', D: 'down', L: 'left', R: 'right' } as const)[key as 'U' | 'D' | 'L' | 'R']); };
adventureMove('RRLLDDDRRRUUURLDDDLLLLLDDRRLLD');
assert.equal(adventure.phase, 'celebrating'); assert.equal(adventure.chips.length, 3); assert.equal(adventure.plateActive, true);
adventure = tickAdventure(adventure, 999); assert.equal(adventure.phase, 'celebrating');
adventure = tickAdventure(adventure, 1); assert.equal(adventure.phase, 'portal-open');
adventureMove('UUURRRRRRDD D'.replaceAll(' ',''));
assert.equal(adventure.phase, 'complete'); assert.equal(adventureSnapshot(adventure).portalOpen, true);

let lanternComplete = initialClassicLabState(9);
for (const index of [0, 2, 6, 10, 12, 14, 18, 22, 24]) lanternComplete = updateClassicLab(lanternComplete, { type: 'activate', index });
assert.equal(lanternComplete.status, 'complete'); assert.equal(lanternComplete.lit, 25); assert.equal(lanternComplete.moves, 9);

let iceComplete = initialClassicLabState(10);
for (const direction of ['up', 'right', 'up', 'left', 'up', 'down', 'right', 'down', 'up'] as const) iceComplete = updateClassicLab(iceComplete, { type: 'move', direction });
assert.equal(iceComplete.status, 'complete'); assert.equal(iceComplete.score, 4);

let crateComplete = initialClassicLabState(11);
for (const direction of ['up', 'right', 'up', 'up', 'down', 'down', 'right', 'right', 'up', 'up', 'down', 'down', 'down', 'right', 'up', 'up', 'up'] as const) crateComplete = updateClassicLab(crateComplete, { type: 'move', direction });
assert.equal(crateComplete.status, 'complete'); assert.equal(crateComplete.score, 3);

let echoComplete = initialClassicLabState(12);
for (let round = 0; round < 3; round += 1) {
  echoComplete = updateClassicLab(echoComplete, { type: 'tick', ms: (4 + round * 2) * 520 });
  for (const pad of [0, 2, 1, 3, 2, 0, 3, 1].slice(0, 4 + round * 2)) echoComplete = updateClassicLab(echoComplete, { type: 'activate', index: pad });
}
assert.equal(echoComplete.status, 'complete'); assert.equal(echoComplete.score, 18);

let gearComplete = initialClassicLabState(13);
for (let index = 0; index < gearComplete.rotations.length; index += 1) while (gearComplete.rotations[index] !== gearComplete.target[index]) gearComplete = updateClassicLab(gearComplete, { type: 'activate', index });
assert.equal(gearComplete.status, 'complete'); assert.equal(gearComplete.aligned, 16);

let orbitComplete = initialClassicLabState(14);
for (let gate = 0; gate < 6; gate += 1) orbitComplete = updateClassicLab({ ...orbitComplete, angle: orbitComplete.targetAngle } as ClassicLabState, { type: 'activate', index: 0 });
assert.equal(orbitComplete.status, 'complete'); assert.equal(orbitComplete.score, 6);

const { createVentureService, DEFAULT_SETTINGS } = await import('../src/services/ventureService');
assert.equal(DEFAULT_SETTINGS.highContrast, true);
const guestService = createVentureService();
await assert.rejects(() => guestService.startAttempt(WEEK_ONE[0].id, false, 'UTC'), /Authentication/);
const profile = await guestService.enterLocalReview();
assert.equal(profile.role, 'reviewer');
const first = await guestService.startAttempt(WEEK_ONE[0].id, false, 'UTC');
assert.equal(first.attemptNumber, 1);
assert.equal(first.isPreview, true);
const second = await guestService.startAttempt(WEEK_ONE[0].id, false, 'UTC');
assert.equal(second.attemptNumber, 2);
assert.equal((await guestService.getProfile())?.attempts[0].outcome, 'abandoned');
const completed = await guestService.finishAttempt({ attemptId: second.id, outcome: 'failed', activeMs: 1234, levelResults: [] });
assert.equal(completed.outcome, 'failed');
const idempotent = await guestService.finishAttempt({ attemptId: second.id, outcome: 'survived', activeMs: 9999, levelResults: [] });
assert.equal(idempotent.outcome, 'failed');
assert.equal(idempotent.activeMs, 1234);
await guestService.scheduleWeek('2000-01-01');
const official = await guestService.startAttempt(WEEK_ONE[0].id, false, 'UTC');
assert.equal(official.isArchive, true);
assert.equal(official.isPreview, false);
await guestService.scheduleWeek(addDays(localDateKey(new Date(), 'UTC'), 1));
await assert.rejects(() => guestService.startAttempt(WEEK_ONE[0].id, false, 'UTC'), /not released/);

localStorage.clear();
localStorage.setItem('dailyVentureLocalReviewerProfile', JSON.stringify({
  id: 'existing-reviewer', email: 'existing@example.com', role: 'reviewer', attempts: [],
  settings: { ...DEFAULT_SETTINGS, highContrast: false },
}));
const migratedService = createVentureService();
assert.equal((await migratedService.getProfile())?.settings.highContrast, true);
await migratedService.updateCharacter(customExplorer);
assert.deepEqual((await migratedService.getProfile())?.character, customExplorer);
assert.deepEqual(JSON.parse(localStorage.getItem('dailyVentureLocalReviewerProfile') ?? '{}').character, customExplorer);

console.log('unit: character persistence, 7 schemas, Adventure plus fourteen Puzzle Labs, timezone gating, attempts, archive rules, idempotency, and achievement thresholds passed');
