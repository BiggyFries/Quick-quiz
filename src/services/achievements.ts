import type { AchievementCode, AchievementProgress, AttemptRecord } from '../game/types';

const DEFINITIONS: Array<Omit<AchievementProgress, 'current' | 'unlocked' | 'unlockedAt'>> = [
  { code: 'first-failure', title: 'First Failure', description: 'Fall during a Daily Venture.', target: 1 },
  { code: 'fail-10', title: 'Fail 10 Times', description: 'Fail 10 Daily Venture attempts.', target: 10 },
  { code: 'fail-100', title: 'Fail 100 Times', description: 'Fail 100 Daily Venture attempts.', target: 100 },
  { code: 'survive-1', title: 'Survive a Daily Venture', description: 'Survive one unique Daily Venture.', target: 1 },
  { code: 'first-try', title: 'Survive on Your First Try', description: 'Survive an original release on attempt one.', target: 1 },
  { code: 'survive-5', title: 'Survive 5 Daily Ventures', description: 'Survive 5 unique Daily Ventures.', target: 5 },
  { code: 'survive-10', title: 'Survive 10 Daily Ventures', description: 'Survive 10 unique Daily Ventures.', target: 10 },
];

export function calculateAchievements(attempts: AttemptRecord[]): AchievementProgress[] {
  const officialAttempts = attempts.filter((attempt) => !attempt.isPreview);
  const failures = officialAttempts.filter((attempt) => attempt.outcome === 'failed').length;
  const survived = officialAttempts.filter((attempt) => attempt.outcome === 'survived');
  const uniqueSurvivals = new Set(survived.map((attempt) => attempt.adventureId)).size;
  const firstTry = survived.some((attempt) => !attempt.isArchive && attempt.attemptNumber === 1 && attempt.releaseDate === attempt.localDateAtStart);
  const values: Record<AchievementCode, number> = {
    'first-failure': failures,
    'fail-10': failures,
    'fail-100': failures,
    'survive-1': uniqueSurvivals,
    'first-try': firstTry ? 1 : 0,
    'survive-5': uniqueSurvivals,
    'survive-10': uniqueSurvivals,
  };
  return DEFINITIONS.map((definition) => ({
    ...definition,
    current: Math.min(values[definition.code], definition.target),
    unlocked: values[definition.code] >= definition.target,
  }));
}

export function newlyUnlocked(before: AttemptRecord[], after: AttemptRecord[]): AchievementCode[] {
  const previous = new Set(calculateAchievements(before).filter((item) => item.unlocked).map((item) => item.code));
  return calculateAchievements(after).filter((item) => item.unlocked && !previous.has(item.code)).map((item) => item.code);
}
