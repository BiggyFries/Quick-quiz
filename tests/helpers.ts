import assert from 'node:assert/strict';
import type { DailyAdventure, FinaleConfig, PuzzleConfig } from '../src/game/types';
import { currentPuzzleConfig, initialSessionState, sessionReducer, type SessionAction, type SessionState } from '../src/game/session';

export function openAdventure(adventure: DailyAdventure): SessionState {
  return sessionReducer(initialSessionState, {
    type: 'OPEN_INTRO', adventure, attemptNumber: 1, attemptId: 'test-attempt', isArchive: false, authenticated: true, reviewer: true, reducedMotion: false,
  });
}

function send(state: SessionState, action: SessionAction): SessionState {
  return sessionReducer(state, action);
}

export function beginCurrentLevel(state: SessionState): SessionState {
  if (state.mode === 'intro') state = send(state, { type: 'SHOW_READY' });
  assert.equal(state.mode, 'ready');
  state = send(state, { type: 'BEGIN_LEVEL' });
  assert.equal(state.mode, 'puzzle');
  return state;
}

export function winCurrentPuzzle(state: SessionState): SessionState {
  const config = currentPuzzleConfig(state);
  assert.ok(config);
  if (config.type === 'trivia') {
    for (const question of config.questions) state = send(state, { type: 'CHOOSE', value: question.correct });
  } else if (config.type === 'logic') {
    if (config.mechanic === 'order') for (const token of config.solution) state = send(state, { type: 'CHOOSE', value: token });
    else state = send(state, { type: 'CHOOSE', value: config.correct });
    state = send(state, { type: 'CONFIRM' });
  } else if (config.type === 'memory') {
    for (const sequence of config.rounds) {
      state = send(state, { type: 'TICK', ms: sequence.length * config.revealMs });
      for (const symbol of sequence) state = send(state, { type: 'CHOOSE', value: symbol });
    }
  } else if (config.type === 'rhythm') {
    let elapsed = 0;
    for (const beat of config.beatMap) {
      state = send(state, { type: 'TICK', ms: beat - elapsed });
      elapsed = beat;
      state = send(state, { type: 'RHYTHM_TAP' });
    }
    state = send(state, { type: 'TICK', ms: config.durationMs - elapsed });
  } else {
    state = winFinale(state, config);
  }
  assert.equal(state.mode, 'resolution');
  assert.equal(state.resolutionOutcome, 'success');
  return state;
}

function winFinale(state: SessionState, config: FinaleConfig): SessionState {
  state = send(state, { type: 'CHOOSE', value: config.question.correct });
  for (const token of config.orderSolution) state = send(state, { type: 'CHOOSE', value: token });
  state = send(state, { type: 'CONFIRM' });
  state = send(state, { type: 'TICK', ms: config.memorySequence.length * config.memoryRevealMs });
  for (const symbol of config.memorySequence) state = send(state, { type: 'CHOOSE', value: symbol });
  let elapsed = 0;
  for (const beat of config.rhythmBeats) {
    state = send(state, { type: 'TICK', ms: beat - elapsed });
    elapsed = beat;
    state = send(state, { type: 'RHYTHM_TAP' });
  }
  state = send(state, { type: 'CHOOSE', value: config.physics.correct });
  return send(state, { type: 'CONFIRM' });
}

export function finishResolution(state: SessionState): SessionState {
  assert.equal(state.mode, 'resolution');
  if (state.resolutionOutcome === 'failed') return send(state, { type: 'TICK', ms: 4800 });
  state = send(state, { type: 'TICK', ms: 1000 });
  for (let step = 0; step < 4; step += 1) state = send(state, { type: 'EXIT_MOVE', direction: 'right' });
  return state;
}

export function failCurrentPuzzle(state: SessionState, config: PuzzleConfig): SessionState {
  if (config.type === 'trivia') {
    state = send(state, { type: 'CHOOSE', value: (config.questions[0].correct + 1) % 4 });
  } else if (config.type === 'logic') {
    if (config.mechanic === 'order') for (const token of [...config.solution].reverse()) state = send(state, { type: 'CHOOSE', value: token });
    else state = send(state, { type: 'CHOOSE', value: (config.correct + 1) % 4 });
    state = send(state, { type: 'CONFIRM' });
  } else if (config.type === 'rhythm') {
    state = send(state, { type: 'RHYTHM_TAP' });
    state = send(state, { type: 'RHYTHM_TAP' });
    state = send(state, { type: 'RHYTHM_TAP' });
  } else if (config.type === 'memory') {
    const sequence = config.rounds[0];
    state = send(state, { type: 'TICK', ms: sequence.length * config.revealMs });
    state = send(state, { type: 'CHOOSE', value: config.symbols.find((symbol) => symbol !== sequence[0])! });
  } else {
    state = send(state, { type: 'CHOOSE', value: (config.question.correct + 1) % 4 });
  }
  assert.equal(state.mode, 'resolution');
  assert.equal(state.resolutionOutcome, 'failed');
  return state;
}
