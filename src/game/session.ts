import type {
  DailyAdventure,
  FinaleConfig,
  GameSnapshot,
  LevelResult,
  LogicConfig,
  PuzzleConfig,
  PuzzleType,
  RhythmConfig,
  ScreenMode,
  SpatialConfig,
  TriviaConfig,
} from './types';

type ResolutionOutcome = 'success' | 'failed';

export type PuzzleState =
  | { kind: 'none' }
  | { kind: 'trivia'; questionIndex: number; fact: string }
  | { kind: 'logic'; selected: string[] }
  | { kind: 'rhythm'; elapsedMs: number; beatIndex: number; hits: number; errors: number }
  | { kind: 'spatial'; taps: number; hint: string }
  | { kind: 'finale'; phase: 'question' | 'order' | 'scan' | 'rhythm' | 'physics'; selected: string[]; scanTaps: number; elapsedMs: number; beatIndex: number; errors: number; physicsChoice: number | null };

export interface SessionState {
  mode: ScreenMode;
  adventure: DailyAdventure | null;
  levelIndex: number;
  attemptNumber: number;
  attemptId: string | null;
  isArchive: boolean;
  authenticated: boolean;
  reviewer: boolean;
  activeMs: number;
  levelActiveMs: number;
  results: LevelResult[];
  puzzle: PuzzleState;
  resolutionOutcome: ResolutionOutcome | null;
  resolutionElapsedMs: number;
  finalOutcome: 'failed' | 'survived' | null;
  newlyUnlocked: string[];
  reducedMotion: boolean;
}

export type SessionAction =
  | { type: 'OPEN_INTRO'; adventure: DailyAdventure; attemptNumber: number; attemptId: string | null; isArchive: boolean; authenticated: boolean; reviewer: boolean; reducedMotion: boolean }
  | { type: 'SHOW_READY' }
  | { type: 'BEGIN_LEVEL' }
  | { type: 'CHOOSE'; value: number | string }
  | { type: 'CONFIRM' }
  | { type: 'RHYTHM_TAP' }
  | { type: 'CANVAS_TAP'; x: number; y: number }
  | { type: 'TICK'; ms: number }
  | { type: 'SET_NEW_ACHIEVEMENTS'; codes: string[] }
  | { type: 'GO_HOME' };

export const initialSessionState: SessionState = {
  mode: 'home', adventure: null, levelIndex: 0, attemptNumber: 1, attemptId: null, isArchive: false, authenticated: false, reviewer: false, activeMs: 0, levelActiveMs: 0, results: [], puzzle: { kind: 'none' }, resolutionOutcome: null, resolutionElapsedMs: 0, finalOutcome: null, newlyUnlocked: [], reducedMotion: false,
};

export function currentPuzzleConfig(state: SessionState): PuzzleConfig | null {
  if (!state.adventure) return null;
  return state.adventure.puzzles[state.adventure.levelOrder[state.levelIndex]];
}

function initPuzzle(config: PuzzleConfig): PuzzleState {
  if (config.type === 'trivia') return { kind: 'trivia', questionIndex: 0, fact: '' };
  if (config.type === 'logic') return { kind: 'logic', selected: [] };
  if (config.type === 'rhythm') return { kind: 'rhythm', elapsedMs: 0, beatIndex: 0, hits: 0, errors: 0 };
  if (config.type === 'spatial') return { kind: 'spatial', taps: 0, hint: '' };
  return { kind: 'finale', phase: 'question', selected: [], scanTaps: 0, elapsedMs: 0, beatIndex: 0, errors: 0, physicsChoice: null };
}

function resolveLevel(state: SessionState, success: boolean): SessionState {
  const config = currentPuzzleConfig(state);
  if (!config || state.mode !== 'puzzle') return state;
  const result: LevelResult = { type: config.type, success, activeMs: Math.round(state.levelActiveMs) };
  return {
    ...state,
    mode: 'resolution',
    results: [...state.results, result],
    resolutionOutcome: success ? 'success' : 'failed',
    resolutionElapsedMs: 0,
  };
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function tickRhythm(state: SessionState, config: RhythmConfig, puzzle: Extract<PuzzleState, { kind: 'rhythm' }>, ms: number): SessionState {
  let elapsedMs = puzzle.elapsedMs + ms;
  let beatIndex = puzzle.beatIndex;
  let errors = puzzle.errors;
  while (beatIndex < config.beatMap.length && elapsedMs > config.beatMap[beatIndex] + config.windowMs) {
    beatIndex += 1;
    errors += 1;
    if (errors >= config.maxErrors) return resolveLevel({ ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms, puzzle: { ...puzzle, elapsedMs, beatIndex, errors } }, false);
  }
  const next = { ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms, puzzle: { ...puzzle, elapsedMs, beatIndex, errors } };
  return elapsedMs >= config.durationMs ? resolveLevel(next, true) : next;
}

function tickFinale(state: SessionState, config: FinaleConfig, puzzle: Extract<PuzzleState, { kind: 'finale' }>, ms: number): SessionState {
  if (puzzle.phase !== 'rhythm') return { ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms };
  let elapsedMs = puzzle.elapsedMs + ms;
  let beatIndex = puzzle.beatIndex;
  let errors = puzzle.errors;
  while (beatIndex < config.rhythmBeats.length && elapsedMs > config.rhythmBeats[beatIndex] + 360) {
    beatIndex += 1;
    errors += 1;
    if (errors >= 2) return resolveLevel({ ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms, puzzle: { ...puzzle, elapsedMs, beatIndex, errors } }, false);
  }
  if (beatIndex >= config.rhythmBeats.length) return { ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms, puzzle: { ...puzzle, phase: 'physics', elapsedMs, beatIndex, errors } };
  return { ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms, puzzle: { ...puzzle, elapsedMs, beatIndex, errors } };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (action.type === 'OPEN_INTRO') return {
    ...initialSessionState,
    mode: 'intro', adventure: action.adventure, attemptNumber: action.attemptNumber, attemptId: action.attemptId, isArchive: action.isArchive, authenticated: action.authenticated, reviewer: action.reviewer, reducedMotion: action.reducedMotion,
  };
  if (action.type === 'SHOW_READY' && state.adventure) return { ...state, mode: 'ready', puzzle: { kind: 'none' } };
  if (action.type === 'BEGIN_LEVEL') {
    const config = currentPuzzleConfig(state);
    return config ? { ...state, mode: 'puzzle', levelActiveMs: 0, puzzle: initPuzzle(config) } : state;
  }
  if (action.type === 'GO_HOME') return initialSessionState;
  if (action.type === 'SET_NEW_ACHIEVEMENTS') return { ...state, newlyUnlocked: action.codes };

  const config = currentPuzzleConfig(state);
  if (!config) return state;

  if (action.type === 'TICK') {
    if (state.mode === 'resolution') {
      const elapsed = state.resolutionElapsedMs + action.ms;
      const duration = state.reducedMotion ? 1200 : 4800;
      if (elapsed < duration) return { ...state, resolutionElapsedMs: elapsed };
      if (state.resolutionOutcome === 'failed') return { ...state, mode: 'results', finalOutcome: 'failed', resolutionElapsedMs: duration };
      if (state.levelIndex >= 4) return { ...state, mode: 'results', finalOutcome: 'survived', resolutionElapsedMs: duration };
      return { ...state, mode: 'ready', levelIndex: state.levelIndex + 1, resolutionOutcome: null, resolutionElapsedMs: 0, puzzle: { kind: 'none' } };
    }
    if (state.mode !== 'puzzle') return state;
    if (config.type === 'rhythm' && state.puzzle.kind === 'rhythm') return tickRhythm(state, config, state.puzzle, action.ms);
    if (config.type === 'finale' && state.puzzle.kind === 'finale') return tickFinale(state, config, state.puzzle, action.ms);
    return { ...state, activeMs: state.activeMs + action.ms, levelActiveMs: state.levelActiveMs + action.ms };
  }

  if (state.mode !== 'puzzle') return state;

  if (action.type === 'CHOOSE') {
    if (config.type === 'trivia' && state.puzzle.kind === 'trivia' && typeof action.value === 'number') {
      const question = (config as TriviaConfig).questions[state.puzzle.questionIndex];
      if (action.value !== question.correct) return resolveLevel(state, false);
      if (state.puzzle.questionIndex === 2) return resolveLevel(state, true);
      return { ...state, puzzle: { ...state.puzzle, questionIndex: state.puzzle.questionIndex + 1, fact: question.fact } };
    }
    if (config.type === 'logic' && state.puzzle.kind === 'logic' && typeof action.value === 'string') {
      if (state.puzzle.selected.includes(action.value) || state.puzzle.selected.length >= 4) return state;
      return { ...state, puzzle: { ...state.puzzle, selected: [...state.puzzle.selected, action.value] } };
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale') {
      const finaleConfig = config as FinaleConfig;
      if (state.puzzle.phase === 'question' && typeof action.value === 'number') return action.value === finaleConfig.question.correct ? { ...state, puzzle: { ...state.puzzle, phase: 'order' } } : resolveLevel(state, false);
      if (state.puzzle.phase === 'order' && typeof action.value === 'string' && !state.puzzle.selected.includes(action.value)) return { ...state, puzzle: { ...state.puzzle, selected: [...state.puzzle.selected, action.value].slice(0, 3) } };
      if (state.puzzle.phase === 'physics' && typeof action.value === 'number') return { ...state, puzzle: { ...state.puzzle, physicsChoice: action.value } };
    }
  }

  if (action.type === 'CONFIRM') {
    if (config.type === 'logic' && state.puzzle.kind === 'logic') {
      const correct = (config as LogicConfig).solution.every((token, index) => state.puzzle.kind === 'logic' && state.puzzle.selected[index] === token);
      return resolveLevel(state, correct);
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale') {
      const finaleConfig = config as FinaleConfig;
      if (state.puzzle.phase === 'order') {
        const correct = finaleConfig.orderSolution.every((token, index) => state.puzzle.kind === 'finale' && state.puzzle.selected[index] === token);
        return correct ? { ...state, puzzle: { ...state.puzzle, phase: 'scan', selected: [] } } : resolveLevel(state, false);
      }
      if (state.puzzle.phase === 'physics' && state.puzzle.physicsChoice !== null) return resolveLevel(state, state.puzzle.physicsChoice === finaleConfig.physics.correct);
    }
  }

  if (action.type === 'RHYTHM_TAP') {
    if (config.type === 'rhythm' && state.puzzle.kind === 'rhythm') {
      const rhythmConfig = config as RhythmConfig;
      const currentBeat = rhythmConfig.beatMap[state.puzzle.beatIndex];
      if (currentBeat !== undefined && Math.abs(state.puzzle.elapsedMs - currentBeat) <= rhythmConfig.windowMs) return { ...state, puzzle: { ...state.puzzle, beatIndex: state.puzzle.beatIndex + 1, hits: state.puzzle.hits + 1 } };
      const errors = state.puzzle.errors + 1;
      return errors >= rhythmConfig.maxErrors ? resolveLevel({ ...state, puzzle: { ...state.puzzle, errors } }, false) : { ...state, puzzle: { ...state.puzzle, errors } };
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale' && state.puzzle.phase === 'rhythm') {
      const finaleConfig = config as FinaleConfig;
      const currentBeat = finaleConfig.rhythmBeats[state.puzzle.beatIndex];
      if (currentBeat !== undefined && Math.abs(state.puzzle.elapsedMs - currentBeat) <= 360) {
        const beatIndex = state.puzzle.beatIndex + 1;
        return { ...state, puzzle: { ...state.puzzle, beatIndex, phase: beatIndex >= finaleConfig.rhythmBeats.length ? 'physics' : 'rhythm' } };
      }
      const errors = state.puzzle.errors + 1;
      return errors >= 2 ? resolveLevel({ ...state, puzzle: { ...state.puzzle, errors } }, false) : { ...state, puzzle: { ...state.puzzle, errors } };
    }
  }

  if (action.type === 'CANVAS_TAP') {
    if (config.type === 'spatial' && state.puzzle.kind === 'spatial') {
      const spatialConfig = config as SpatialConfig;
      if (distance(action.x, action.y, spatialConfig.target.x, spatialConfig.target.y) <= spatialConfig.target.radius) return resolveLevel(state, true);
      const taps = state.puzzle.taps + 1;
      return taps >= spatialConfig.maxTaps ? resolveLevel({ ...state, puzzle: { ...state.puzzle, taps } }, false) : { ...state, puzzle: { ...state.puzzle, taps, hint: spatialConfig.hints[taps - 1] } };
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale' && state.puzzle.phase === 'scan') {
      const finaleConfig = config as FinaleConfig;
      if (distance(action.x, action.y, finaleConfig.scanTarget.x, finaleConfig.scanTarget.y) <= finaleConfig.scanTarget.radius) return { ...state, puzzle: { ...state.puzzle, phase: 'rhythm', elapsedMs: 0, beatIndex: 0, errors: 0 } };
      const scanTaps = state.puzzle.scanTaps + 1;
      return scanTaps >= 3 ? resolveLevel({ ...state, puzzle: { ...state.puzzle, scanTaps } }, false) : { ...state, puzzle: { ...state.puzzle, scanTaps } };
    }
  }

  return state;
}

export function sessionSnapshot(state: SessionState): GameSnapshot {
  const config = currentPuzzleConfig(state);
  const puzzle = state.puzzle.kind === 'rhythm'
    ? { ...state.puzzle, nextBeatMs: (config as RhythmConfig | null)?.beatMap[state.puzzle.beatIndex] ?? null }
    : state.puzzle.kind === 'finale'
      ? { ...state.puzzle }
      : { ...state.puzzle };
  return {
    coordinateSystem: '390x844 portrait canvas; origin top-left; x right; y down', mode: state.mode, adventureId: state.adventure?.id, adventureTitle: state.adventure?.title, levelIndex: state.levelIndex, levelType: config?.type, attemptNumber: state.attemptNumber, authenticated: state.authenticated, reviewer: state.reviewer, results: state.results, activeMs: Math.round(state.activeMs), puzzle,
  };
}
