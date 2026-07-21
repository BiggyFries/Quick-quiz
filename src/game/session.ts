import type {
  DailyAdventure,
  FinaleConfig,
  GameSnapshot,
  LevelResult,
  LogicConfig,
  MemoryConfig,
  PuzzleConfig,
  RhythmConfig,
  ScreenMode,
  TriviaConfig,
} from './types';

type ResolutionOutcome = 'success' | 'failed';
type MemoryPhase = 'showing' | 'recall';

export type PuzzleState =
  | { kind: 'none' }
  | { kind: 'trivia'; questionIndex: number; fact: string }
  | { kind: 'logic'; selected: string[]; choice: number | null }
  | { kind: 'rhythm'; elapsedMs: number; beatIndex: number; hits: number; errors: number }
  | { kind: 'memory'; phase: MemoryPhase; roundIndex: number; revealIndex: number; elapsedMs: number; selected: string[]; replayUsed: boolean }
  | { kind: 'finale'; phase: 'question' | 'order' | 'memory' | 'rhythm' | 'physics'; selected: string[]; memoryPhase: MemoryPhase; memoryRevealIndex: number; memoryElapsedMs: number; replayUsed: boolean; elapsedMs: number; beatIndex: number; errors: number; physicsChoice: number | null };

export interface SessionState {
  mode: ScreenMode;
  adventure: DailyAdventure | null;
  levelIndex: number;
  attemptNumber: number;
  attemptId: string | null;
  isArchive: boolean;
  authenticated: boolean;
  reviewer: boolean;
  isTesting: boolean;
  activeMs: number;
  levelActiveMs: number;
  results: LevelResult[];
  puzzle: PuzzleState;
  resolutionOutcome: ResolutionOutcome | null;
  resolutionElapsedMs: number;
  exitPosition: { x: number; lane: number };
  finalOutcome: 'failed' | 'survived' | null;
  newlyUnlocked: string[];
  reducedMotion: boolean;
}

export type SessionAction =
  | { type: 'OPEN_INTRO'; adventure: DailyAdventure; attemptNumber: number; attemptId: string | null; isArchive: boolean; authenticated: boolean; reviewer: boolean; reducedMotion: boolean }
  | { type: 'SHOW_READY' }
  | { type: 'BEGIN_LEVEL' }
  | { type: 'JUMP_TO_LEVEL'; levelIndex: number }
  | { type: 'CHOOSE'; value: number | string }
  | { type: 'CONFIRM' }
  | { type: 'MEMORY_REPLAY' }
  | { type: 'RHYTHM_TAP' }
  | { type: 'EXIT_MOVE'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'TICK'; ms: number }
  | { type: 'SET_NEW_ACHIEVEMENTS'; codes: string[] }
  | { type: 'GO_HOME' };

export const initialSessionState: SessionState = {
  mode: 'home', adventure: null, levelIndex: 0, attemptNumber: 1, attemptId: null, isArchive: false,
  authenticated: false, reviewer: false, isTesting: false, activeMs: 0, levelActiveMs: 0,
  results: [], puzzle: { kind: 'none' }, resolutionOutcome: null, resolutionElapsedMs: 0,
  exitPosition: { x: 0, lane: 0 },
  finalOutcome: null, newlyUnlocked: [], reducedMotion: false,
};

export function currentPuzzleConfig(state: SessionState): PuzzleConfig | null {
  if (!state.adventure) return null;
  return state.adventure.puzzles[state.adventure.levelOrder[state.levelIndex]];
}

function initPuzzle(config: PuzzleConfig): PuzzleState {
  if (config.type === 'trivia') return { kind: 'trivia', questionIndex: 0, fact: '' };
  if (config.type === 'logic') return { kind: 'logic', selected: [], choice: null };
  if (config.type === 'rhythm') return { kind: 'rhythm', elapsedMs: 0, beatIndex: 0, hits: 0, errors: 0 };
  if (config.type === 'memory') return { kind: 'memory', phase: 'showing', roundIndex: 0, revealIndex: 0, elapsedMs: 0, selected: [], replayUsed: false };
  return {
    kind: 'finale', phase: 'question', selected: [], memoryPhase: 'showing', memoryRevealIndex: 0,
    memoryElapsedMs: 0, replayUsed: false, elapsedMs: 0, beatIndex: 0, errors: 0, physicsChoice: null,
  };
}

function resolveLevel(state: SessionState, success: boolean): SessionState {
  const config = currentPuzzleConfig(state);
  if (!config || state.mode !== 'puzzle') return state;
  const result: LevelResult = { type: config.type, success, activeMs: Math.round(state.levelActiveMs) };
  return {
    ...state, mode: 'resolution', results: [...state.results, result],
    resolutionOutcome: success ? 'success' : 'failed', resolutionElapsedMs: 0, exitPosition: { x: 0, lane: 0 },
  };
}

function finishSuccessfulResolution(state: SessionState): SessionState {
  if (state.isTesting) return { ...state, mode: 'ready', results: [], puzzle: { kind: 'none' }, resolutionOutcome: null, resolutionElapsedMs: 0, exitPosition: { x: 0, lane: 0 } };
  if (state.levelIndex >= 4) return { ...state, mode: 'results', finalOutcome: 'survived' };
  return { ...state, mode: 'ready', levelIndex: state.levelIndex + 1, resolutionOutcome: null, resolutionElapsedMs: 0, exitPosition: { x: 0, lane: 0 }, puzzle: { kind: 'none' } };
}

function tickRhythm(state: SessionState, config: RhythmConfig, puzzle: Extract<PuzzleState, { kind: 'rhythm' }>, ms: number): SessionState {
  const elapsedMs = puzzle.elapsedMs + ms;
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

function tickMemory(state: SessionState, config: MemoryConfig, puzzle: Extract<PuzzleState, { kind: 'memory' }>, ms: number): SessionState {
  const timed = { ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms };
  if (puzzle.phase !== 'showing') return timed;
  const elapsedMs = puzzle.elapsedMs + ms;
  const revealIndex = Math.floor(elapsedMs / config.revealMs);
  const sequence = config.rounds[puzzle.roundIndex];
  if (revealIndex >= sequence.length) return { ...timed, puzzle: { ...puzzle, phase: 'recall', revealIndex: sequence.length, elapsedMs: 0 } };
  return { ...timed, puzzle: { ...puzzle, elapsedMs, revealIndex } };
}

function tickFinale(state: SessionState, config: FinaleConfig, puzzle: Extract<PuzzleState, { kind: 'finale' }>, ms: number): SessionState {
  const timed = { ...state, activeMs: state.activeMs + ms, levelActiveMs: state.levelActiveMs + ms };
  if (puzzle.phase === 'memory' && puzzle.memoryPhase === 'showing') {
    const memoryElapsedMs = puzzle.memoryElapsedMs + ms;
    const memoryRevealIndex = Math.floor(memoryElapsedMs / config.memoryRevealMs);
    if (memoryRevealIndex >= config.memorySequence.length) return { ...timed, puzzle: { ...puzzle, memoryPhase: 'recall', memoryRevealIndex: config.memorySequence.length, memoryElapsedMs: 0 } };
    return { ...timed, puzzle: { ...puzzle, memoryElapsedMs, memoryRevealIndex } };
  }
  if (puzzle.phase !== 'rhythm') return timed;
  const elapsedMs = puzzle.elapsedMs + ms;
  let beatIndex = puzzle.beatIndex;
  let errors = puzzle.errors;
  while (beatIndex < config.rhythmBeats.length && elapsedMs > config.rhythmBeats[beatIndex] + 360) {
    beatIndex += 1;
    errors += 1;
    if (errors >= 2) return resolveLevel({ ...timed, puzzle: { ...puzzle, elapsedMs, beatIndex, errors } }, false);
  }
  if (beatIndex >= config.rhythmBeats.length) return { ...timed, puzzle: { ...puzzle, phase: 'physics', elapsedMs, beatIndex, errors } };
  return { ...timed, puzzle: { ...puzzle, elapsedMs, beatIndex, errors } };
}

function chooseMemory(state: SessionState, config: MemoryConfig, puzzle: Extract<PuzzleState, { kind: 'memory' }>, value: string): SessionState {
  if (puzzle.phase !== 'recall') return state;
  const sequence = config.rounds[puzzle.roundIndex];
  if (value !== sequence[puzzle.selected.length]) return resolveLevel(state, false);
  const selected = [...puzzle.selected, value];
  if (selected.length < sequence.length) return { ...state, puzzle: { ...puzzle, selected } };
  if (puzzle.roundIndex >= config.rounds.length - 1) return resolveLevel(state, true);
  return { ...state, puzzle: { ...puzzle, phase: 'showing', roundIndex: puzzle.roundIndex + 1, revealIndex: 0, elapsedMs: 0, selected: [] } };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (action.type === 'OPEN_INTRO') return {
    ...initialSessionState,
    mode: 'intro', adventure: action.adventure, attemptNumber: action.attemptNumber, attemptId: action.attemptId,
    isArchive: action.isArchive, authenticated: action.authenticated, reviewer: action.reviewer, reducedMotion: action.reducedMotion,
  };
  if (action.type === 'SHOW_READY' && state.adventure) return { ...state, mode: 'ready', puzzle: { kind: 'none' } };
  if (action.type === 'JUMP_TO_LEVEL' && state.adventure && state.reviewer && action.levelIndex >= 0 && action.levelIndex < 5) return {
    ...state, mode: 'ready', levelIndex: action.levelIndex, isTesting: true, activeMs: 0, levelActiveMs: 0,
    results: [], puzzle: { kind: 'none' }, resolutionOutcome: null, resolutionElapsedMs: 0, exitPosition: { x: 0, lane: 0 }, finalOutcome: null,
  };
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
      if (state.resolutionOutcome === 'success') return { ...state, resolutionElapsedMs: Math.min(1000, state.resolutionElapsedMs + action.ms) };
      const elapsed = state.resolutionElapsedMs + action.ms;
      const duration = state.reducedMotion ? 1200 : 4800;
      if (elapsed < duration) return { ...state, resolutionElapsedMs: elapsed };
      if (state.resolutionOutcome === 'failed') return { ...state, mode: 'results', finalOutcome: 'failed', resolutionElapsedMs: duration };
      return state;
    }
    if (state.mode !== 'puzzle') return state;
    if (config.type === 'rhythm' && state.puzzle.kind === 'rhythm') return tickRhythm(state, config, state.puzzle, action.ms);
    if (config.type === 'memory' && state.puzzle.kind === 'memory') return tickMemory(state, config, state.puzzle, action.ms);
    if (config.type === 'finale' && state.puzzle.kind === 'finale') return tickFinale(state, config, state.puzzle, action.ms);
    return { ...state, activeMs: state.activeMs + action.ms, levelActiveMs: state.levelActiveMs + action.ms };
  }

  if (action.type === 'EXIT_MOVE' && state.mode === 'resolution' && state.resolutionOutcome === 'success' && state.resolutionElapsedMs >= 1000) {
    const x = Math.max(0, Math.min(4, state.exitPosition.x + (action.direction === 'right' ? 1 : action.direction === 'left' ? -1 : 0)));
    const lane = Math.max(-1, Math.min(1, state.exitPosition.lane + (action.direction === 'down' ? 1 : action.direction === 'up' ? -1 : 0)));
    const moved = { ...state, exitPosition: { x, lane } };
    return x === 4 && lane === 0 ? finishSuccessfulResolution(moved) : moved;
  }

  if (state.mode !== 'puzzle') return state;

  if (action.type === 'MEMORY_REPLAY') {
    if (config.type === 'memory' && state.puzzle.kind === 'memory' && state.puzzle.phase === 'recall' && !state.puzzle.replayUsed) return { ...state, puzzle: { ...state.puzzle, phase: 'showing', revealIndex: 0, elapsedMs: 0, selected: [], replayUsed: true } };
    if (config.type === 'finale' && state.puzzle.kind === 'finale' && state.puzzle.phase === 'memory' && state.puzzle.memoryPhase === 'recall' && !state.puzzle.replayUsed) return { ...state, puzzle: { ...state.puzzle, memoryPhase: 'showing', memoryRevealIndex: 0, memoryElapsedMs: 0, selected: [], replayUsed: true } };
  }

  if (action.type === 'CHOOSE') {
    if (config.type === 'trivia' && state.puzzle.kind === 'trivia' && typeof action.value === 'number') {
      const question = (config as TriviaConfig).questions[state.puzzle.questionIndex];
      if (action.value !== question.correct) return resolveLevel(state, false);
      if (state.puzzle.questionIndex === 2) return resolveLevel(state, true);
      return { ...state, puzzle: { ...state.puzzle, questionIndex: state.puzzle.questionIndex + 1, fact: question.fact } };
    }
    if (config.type === 'logic' && state.puzzle.kind === 'logic') {
      const logicConfig = config as LogicConfig;
      if (logicConfig.mechanic === 'order' && typeof action.value === 'string') {
        if (state.puzzle.selected.includes(action.value) || state.puzzle.selected.length >= logicConfig.tokens.length) return state;
        return { ...state, puzzle: { ...state.puzzle, selected: [...state.puzzle.selected, action.value] } };
      }
      if (logicConfig.mechanic === 'deduction' && typeof action.value === 'number') return { ...state, puzzle: { ...state.puzzle, choice: action.value } };
    }
    if (config.type === 'memory' && state.puzzle.kind === 'memory') {
      const symbol = typeof action.value === 'number' ? config.symbols[action.value] : action.value;
      if (symbol) return chooseMemory(state, config, state.puzzle, symbol);
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale') {
      const finaleConfig = config as FinaleConfig;
      if (state.puzzle.phase === 'question' && typeof action.value === 'number') return action.value === finaleConfig.question.correct ? { ...state, puzzle: { ...state.puzzle, phase: 'order' } } : resolveLevel(state, false);
      if (state.puzzle.phase === 'order' && typeof action.value === 'string' && !state.puzzle.selected.includes(action.value)) return { ...state, puzzle: { ...state.puzzle, selected: [...state.puzzle.selected, action.value].slice(0, 3) } };
      if (state.puzzle.phase === 'memory') {
        const symbol = typeof action.value === 'number' ? finaleConfig.memorySymbols[action.value] : action.value;
        if (state.puzzle.memoryPhase !== 'recall' || !symbol) return state;
        if (symbol !== finaleConfig.memorySequence[state.puzzle.selected.length]) return resolveLevel(state, false);
        const selected = [...state.puzzle.selected, symbol];
        return selected.length === finaleConfig.memorySequence.length
          ? { ...state, puzzle: { ...state.puzzle, phase: 'rhythm', selected: [], elapsedMs: 0, beatIndex: 0, errors: 0 } }
          : { ...state, puzzle: { ...state.puzzle, selected } };
      }
      if (state.puzzle.phase === 'physics' && typeof action.value === 'number') return { ...state, puzzle: { ...state.puzzle, physicsChoice: action.value } };
    }
  }

  if (action.type === 'CONFIRM') {
    if (config.type === 'logic' && state.puzzle.kind === 'logic') {
      const logicConfig = config as LogicConfig;
      if (logicConfig.mechanic === 'order') return resolveLevel(state, logicConfig.solution.every((token, index) => state.puzzle.kind === 'logic' && state.puzzle.selected[index] === token));
      if (state.puzzle.choice !== null) return resolveLevel(state, state.puzzle.choice === logicConfig.correct);
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale') {
      const finaleConfig = config as FinaleConfig;
      if (state.puzzle.phase === 'order') {
        const correct = finaleConfig.orderSolution.every((token, index) => state.puzzle.kind === 'finale' && state.puzzle.selected[index] === token);
        return correct ? { ...state, puzzle: { ...state.puzzle, phase: 'memory', selected: [], memoryPhase: 'showing', memoryRevealIndex: 0, memoryElapsedMs: 0 } } : resolveLevel(state, false);
      }
      if (state.puzzle.phase === 'physics' && state.puzzle.physicsChoice !== null) return resolveLevel(state, state.puzzle.physicsChoice === finaleConfig.physics.correct);
    }
  }

  if (action.type === 'RHYTHM_TAP') {
    if (config.type === 'rhythm' && state.puzzle.kind === 'rhythm') {
      const currentBeat = config.beatMap[state.puzzle.beatIndex];
      if (currentBeat !== undefined && Math.abs(state.puzzle.elapsedMs - currentBeat) <= config.windowMs) return { ...state, puzzle: { ...state.puzzle, beatIndex: state.puzzle.beatIndex + 1, hits: state.puzzle.hits + 1 } };
      const errors = state.puzzle.errors + 1;
      return errors >= config.maxErrors ? resolveLevel({ ...state, puzzle: { ...state.puzzle, errors } }, false) : { ...state, puzzle: { ...state.puzzle, errors } };
    }
    if (config.type === 'finale' && state.puzzle.kind === 'finale' && state.puzzle.phase === 'rhythm') {
      const currentBeat = config.rhythmBeats[state.puzzle.beatIndex];
      if (currentBeat !== undefined && Math.abs(state.puzzle.elapsedMs - currentBeat) <= 360) {
        const beatIndex = state.puzzle.beatIndex + 1;
        return { ...state, puzzle: { ...state.puzzle, beatIndex, phase: beatIndex >= config.rhythmBeats.length ? 'physics' : 'rhythm' } };
      }
      const errors = state.puzzle.errors + 1;
      return errors >= 2 ? resolveLevel({ ...state, puzzle: { ...state.puzzle, errors } }, false) : { ...state, puzzle: { ...state.puzzle, errors } };
    }
  }

  return state;
}

export function sessionSnapshot(state: SessionState): GameSnapshot {
  const config = currentPuzzleConfig(state);
  const puzzle = state.puzzle.kind === 'rhythm'
    ? { ...state.puzzle, nextBeatMs: (config as RhythmConfig | null)?.beatMap[state.puzzle.beatIndex] ?? null }
    : { ...state.puzzle };
  return {
    coordinateSystem: '390x844 portrait canvas; origin top-left; x right; y down', mode: state.mode,
    adventureId: state.adventure?.id, adventureTitle: state.adventure?.title, levelIndex: state.levelIndex,
    levelType: config?.type, attemptNumber: state.attemptNumber, authenticated: state.authenticated,
    reviewer: state.reviewer, testing: state.isTesting, results: state.results, activeMs: Math.round(state.activeMs), puzzle,
    resolutionOutcome: state.resolutionOutcome, resolutionElapsedMs: state.resolutionElapsedMs, exitPosition: state.exitPosition,
  };
}
