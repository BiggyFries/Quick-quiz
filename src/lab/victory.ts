import type { ClassicDirection } from './classicLabs';

export type VictoryPhase = 'idle' | 'celebrating' | 'portal-open' | 'departed';

export interface VictoryJourney {
  phase: VictoryPhase;
  elapsedMs: number;
  x: number;
  lane: number;
}

export const VICTORY_CELEBRATION_MS = 1000;
export const EXIT_PORTAL_X = 4;

export function idleVictoryJourney(): VictoryJourney {
  return { phase: 'idle', elapsedMs: 0, x: 0, lane: 0 };
}

export function beginVictoryJourney(): VictoryJourney {
  return { phase: 'celebrating', elapsedMs: 0, x: 0, lane: 0 };
}

export function tickVictoryJourney(journey: VictoryJourney, ms: number): VictoryJourney {
  if (journey.phase !== 'celebrating') return journey;
  const elapsedMs = Math.min(VICTORY_CELEBRATION_MS, journey.elapsedMs + Math.max(0, ms));
  return elapsedMs >= VICTORY_CELEBRATION_MS
    ? { ...journey, phase: 'portal-open', elapsedMs }
    : { ...journey, elapsedMs };
}

export function moveVictoryJourney(journey: VictoryJourney, direction: ClassicDirection): VictoryJourney {
  if (journey.phase !== 'portal-open') return journey;
  const x = Math.max(0, Math.min(EXIT_PORTAL_X, journey.x + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0)));
  const lane = Math.max(-1, Math.min(1, journey.lane + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0)));
  return { ...journey, x, lane, phase: x === EXIT_PORTAL_X && lane === 0 ? 'departed' : 'portal-open' };
}

export function victoryJourneyMessage(journey: VictoryJourney, portalName = 'portal') {
  if (journey.phase === 'celebrating') return 'Challenge solved — celebrate!';
  if (journey.phase === 'portal-open') return `The ${portalName} is open. Swipe or steer the explorer into it.`;
  if (journey.phase === 'departed') return `Portal crossed. The route to the next room is clear.`;
  return '';
}
