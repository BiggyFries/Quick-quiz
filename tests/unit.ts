import assert from 'node:assert/strict';
import { WEEK_ONE } from '../src/content/week1';
import { countLogicSolutions, dailyAdventureSchema, satisfiesLogicClues } from '../src/game/schema';
import type { AttemptRecord } from '../src/game/types';
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

console.log('unit: 7 schemas, timezone gating, attempts, archive rules, idempotency, and achievement thresholds passed');
