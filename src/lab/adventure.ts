export type AdventureDirection = 'up' | 'down' | 'left' | 'right';
export type AdventurePhase = 'playing' | 'terminal' | 'celebrating' | 'portal-open' | 'complete';
export type AdventureTerminalId = 'signal' | 'archive';

export interface AdventurePoint { x: number; y: number }

export interface WordGridTerminalState {
  kind: 'word-grid';
  currentGuess: string;
  guesses: string[];
  solved: boolean;
  failed: boolean;
}

export interface HangmanTerminalState {
  kind: 'hangman';
  guessed: string[];
  misses: number;
  solved: boolean;
  failed: boolean;
}

export type AdventureTerminalState = WordGridTerminalState | HangmanTerminalState;

export interface AdventureState {
  player: AdventurePoint;
  crate: AdventurePoint;
  facing: AdventureDirection;
  phase: AdventurePhase;
  activeTerminal: AdventureTerminalId | null;
  terminals: Record<AdventureTerminalId, AdventureTerminalState>;
  celebrationMs: number;
  elapsedMs: number;
  moves: number;
  chips: string[];
  visited: string[];
  redKey: boolean;
  blueKey: boolean;
  flippers: boolean;
  fireBoots: boolean;
  redDoorOpen: boolean;
  blueDoorOpen: boolean;
  signalDoorOpen: boolean;
  archiveDoorOpen: boolean;
  chipGateOpen: boolean;
  plateActive: boolean;
  message: string;
}

export const ADVENTURE_MAP = [
  '#####################',
  '#P..#c....#1....#r..#',
  '###.###.#.###.#.###.#',
  '#E#.#...#.....#A..#.#',
  '#G#.#.###########.#.#',
  '#.#...#.........#...#',
  '#B#####.###.###.###.#',
  '#..b#....f#...#c#...#',
  '#.###F#######D###.###',
  '#.#..F#....c#.#.Rc#c#',
  '#.#.###.###.#.#.###.#',
  '#.#.#...#oO...#.#tc.#',
  '#.#.#.#######.#.###.#',
  '#.#c#c#.....#.#...#.#',
  '#.#.#.#.###.#.###.#.#',
  '#.#.#.#c#c#.#..2#.#.#',
  '#.#.#.#.#.#W#####.#.#',
  '#.#.#...#.#W#.....#.#',
  '#.#.#####.#W#.#####.#',
  '#.........#.........#',
  '#####################',
];

export const ADVENTURE_TERMINALS = {
  signal: {
    id: 'signal' as const,
    tile: '1',
    title: 'Wayfinder Signal',
    kind: 'word-grid' as const,
    answer: 'ORBIT',
    clue: 'A curved path held by gravity.',
    doorLabel: 'cyan signal gate',
  },
  archive: {
    id: 'archive' as const,
    tile: '2',
    title: 'Archive Decoder',
    kind: 'hangman' as const,
    answer: 'GLYPH',
    clue: 'A carved symbol in an ancient code.',
    doorLabel: 'violet archive gate',
  },
};

function findTile(tile: string): AdventurePoint {
  const y = ADVENTURE_MAP.findIndex((row) => row.includes(tile));
  return { x: ADVENTURE_MAP[y].indexOf(tile), y };
}

export const ADVENTURE_START = findTile('P');
export const ADVENTURE_CRATE_START = findTile('O');
export const ADVENTURE_PLATE = findTile('o');
export const ADVENTURE_EXIT = findTile('E');
export const ADVENTURE_CHIP_TOTAL = ADVENTURE_MAP.join('').split('c').length - 1;

const pointKey = ({ x, y }: AdventurePoint) => `${x},${y}`;
const equal = (a: AdventurePoint, b: AdventurePoint) => a.x === b.x && a.y === b.y;
const delta: Record<AdventureDirection, AdventurePoint> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

const blankTerminals = (): Record<AdventureTerminalId, AdventureTerminalState> => ({
  signal: { kind: 'word-grid', currentGuess: '', guesses: [], solved: false, failed: false },
  archive: { kind: 'hangman', guessed: [], misses: 0, solved: false, failed: false },
});

export function initialAdventureState(): AdventureState {
  return {
    player: { ...ADVENTURE_START }, crate: { ...ADVENTURE_CRATE_START }, facing: 'right', phase: 'playing', activeTerminal: null,
    terminals: blankTerminals(), celebrationMs: 0, elapsedMs: 0, moves: 0, chips: [], visited: [pointKey(ADVENTURE_START)],
    redKey: false, blueKey: false, flippers: false, fireBoots: false, redDoorOpen: false, blueDoorOpen: false,
    signalDoorOpen: false, archiveDoorOpen: false, chipGateOpen: false, plateActive: false,
    message: `Recover ${ADVENTURE_CHIP_TOTAL} circuit chips, solve both computers, power the plate, and reach the portal.`,
  };
}

export function adventureTileAt(point: AdventurePoint) {
  const tile = ADVENTURE_MAP[point.y]?.[point.x] ?? '#';
  return tile === 'O' || tile === 'P' ? '.' : tile;
}

function terminalForTile(tile: string): AdventureTerminalId | null {
  if (tile === ADVENTURE_TERMINALS.signal.tile) return 'signal';
  if (tile === ADVENTURE_TERMINALS.archive.tile) return 'archive';
  return null;
}

function objectivesReady(state: AdventureState) {
  return state.chips.length === ADVENTURE_CHIP_TOTAL
    && state.plateActive
    && state.terminals.signal.solved
    && state.terminals.archive.solved
    && state.redDoorOpen
    && state.blueDoorOpen
    && state.signalDoorOpen
    && state.archiveDoorOpen
    && state.chipGateOpen;
}

function collectAt(state: AdventureState, player: AdventurePoint): AdventureState {
  const tile = adventureTileAt(player);
  const key = pointKey(player);
  if (tile === 'c' && !state.chips.includes(key)) {
    const chips = [...state.chips, key];
    return { ...state, chips, message: chips.length === ADVENTURE_CHIP_TOTAL ? 'Every circuit chip is secured. The final chip gate can open.' : `Circuit chip recovered. ${ADVENTURE_CHIP_TOTAL - chips.length} remain.` };
  }
  if (tile === 'r' && !state.redKey) return { ...state, redKey: true, message: 'Crimson key acquired. Its matching lock is deeper in the maze.' };
  if (tile === 'b' && !state.blueKey) return { ...state, blueKey: true, message: 'Azure key acquired. The final color lock is now ready.' };
  if (tile === 't' && !state.flippers) return { ...state, flippers: true, message: 'Tide fins equipped. Flood channels are now safe to cross.' };
  if (tile === 'f' && !state.fireBoots) return { ...state, fireBoots: true, message: 'Ember boots equipped. The fire corridor can no longer stop you.' };
  return state;
}

function withTerminal(state: AdventureState, id: AdventureTerminalId, terminal: AdventureTerminalState, message: string): AdventureState {
  const terminals = { ...state.terminals, [id]: terminal };
  return { ...state, terminals, message };
}

export function interactAdventure(state: AdventureState): AdventureState {
  if (state.phase !== 'playing' && state.phase !== 'portal-open') return state;
  const step = delta[state.facing];
  const target = { x: state.player.x + step.x, y: state.player.y + step.y };
  const id = terminalForTile(adventureTileAt(target));
  if (!id) return { ...state, message: 'Nothing here responds. Face a computer console and use it.' };
  if (state.terminals[id].solved) return { ...state, message: `${ADVENTURE_TERMINALS[id].title} is already solved; its gate remains powered.` };
  return { ...state, phase: 'terminal', activeTerminal: id, message: `${ADVENTURE_TERMINALS[id].title} connected.` };
}

export function inputAdventureTerminalLetter(state: AdventureState, value: string): AdventureState {
  if (state.phase !== 'terminal' || !state.activeTerminal) return state;
  const letter = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
  if (!letter) return state;
  const id = state.activeTerminal;
  const current = state.terminals[id];
  const config = ADVENTURE_TERMINALS[id];
  if (current.solved || current.failed) return state;
  if (current.kind === 'word-grid') {
    if (current.currentGuess.length >= config.answer.length) return state;
    return withTerminal(state, id, { ...current, currentGuess: current.currentGuess + letter }, 'Build a five-letter answer, then transmit it.');
  }
  if (current.guessed.includes(letter)) return state;
  const guessed = [...current.guessed, letter];
  const misses = current.misses + (config.answer.includes(letter) ? 0 : 1);
  const solved = [...config.answer].every((answerLetter) => guessed.includes(answerLetter));
  const failed = !solved && misses >= 6;
  return withTerminal(state, id, { ...current, guessed, misses, solved, failed }, solved ? `${config.title} solved. ${config.doorLabel} is powered.` : failed ? 'Decoder lockout. Reset this terminal to try a fresh code.' : config.answer.includes(letter) ? 'Correct symbol found.' : `No ${letter} in the archive word.`);
}

export function backspaceAdventureTerminal(state: AdventureState): AdventureState {
  if (state.phase !== 'terminal' || state.activeTerminal !== 'signal') return state;
  const current = state.terminals.signal;
  if (current.kind !== 'word-grid' || current.solved || current.failed || current.currentGuess.length === 0) return state;
  return withTerminal(state, 'signal', { ...current, currentGuess: current.currentGuess.slice(0, -1) }, 'Last cipher letter removed.');
}

export function submitAdventureTerminal(state: AdventureState): AdventureState {
  if (state.phase !== 'terminal' || !state.activeTerminal) return state;
  const id = state.activeTerminal;
  const current = state.terminals[id];
  const config = ADVENTURE_TERMINALS[id];
  if (current.kind !== 'word-grid' || current.solved || current.failed) return state;
  if (current.currentGuess.length !== config.answer.length) return withTerminal(state, id, current, `The cipher requires ${config.answer.length} letters.`);
  const guesses = [...current.guesses, current.currentGuess];
  const solved = current.currentGuess === config.answer;
  const failed = !solved && guesses.length >= 6;
  return withTerminal(state, id, { ...current, currentGuess: '', guesses, solved, failed }, solved ? `${config.title} solved. ${config.doorLabel} is powered.` : failed ? 'Signal lockout. Reset this terminal to try a fresh code.' : 'Cipher rejected. The color marks reveal what to change.');
}

export function resetAdventureTerminal(state: AdventureState): AdventureState {
  if (state.phase !== 'terminal' || !state.activeTerminal) return state;
  const id = state.activeTerminal;
  const blank = blankTerminals()[id];
  return withTerminal(state, id, blank, `${ADVENTURE_TERMINALS[id].title} reset.`);
}

export function closeAdventureTerminal(state: AdventureState): AdventureState {
  if (state.phase !== 'terminal') return state;
  return { ...state, phase: 'playing', activeTerminal: null, message: state.activeTerminal && state.terminals[state.activeTerminal].solved ? 'Computer link closed. Its world gate is now unlocked.' : 'Computer link paused. Your progress remains on this terminal.' };
}

export type WordLetterScore = 'correct' | 'present' | 'absent';

export function scoreAdventureWordGuess(guess: string, answer = ADVENTURE_TERMINALS.signal.answer): WordLetterScore[] {
  const result: WordLetterScore[] = Array(answer.length).fill('absent');
  const remaining = [...answer];
  [...guess].forEach((letter, index) => { if (letter === answer[index]) { result[index] = 'correct'; remaining[index] = ''; } });
  [...guess].forEach((letter, index) => { if (result[index] === 'correct') return; const match = remaining.indexOf(letter); if (match >= 0) { result[index] = 'present'; remaining[match] = ''; } });
  return result;
}

export function moveAdventure(state: AdventureState, direction: AdventureDirection): AdventureState {
  if (state.phase === 'terminal' || state.phase === 'celebrating' || state.phase === 'complete') return state;
  const step = delta[direction];
  const destination = { x: state.player.x + step.x, y: state.player.y + step.y };
  const tile = adventureTileAt(destination);
  const faced = { ...state, facing: direction };
  const terminalId = terminalForTile(tile);
  if (terminalId) return { ...faced, message: state.terminals[terminalId].solved ? `${ADVENTURE_TERMINALS[terminalId].title} is solved.` : `${ADVENTURE_TERMINALS[terminalId].title} is ready. Press USE.` };
  if (tile === '#') return { ...faced, message: 'Ancient stone blocks that direction.' };
  if (tile === 'W' && !state.flippers) return { ...faced, message: 'The flood channel needs tide fins.' };
  if (tile === 'F' && !state.fireBoots) return { ...faced, message: 'The ember floor needs fireproof boots.' };
  if (tile === 'R' && !state.redDoorOpen && !state.redKey) return { ...faced, message: 'The crimson lock needs its matching key.' };
  if (tile === 'B' && !state.blueDoorOpen && !state.blueKey) return { ...faced, message: 'The azure lock needs its matching key.' };
  if (tile === 'A' && !state.signalDoorOpen && !state.terminals.signal.solved) return { ...faced, message: 'The cyan gate is controlled by the Wayfinder Signal computer.' };
  if (tile === 'D' && !state.archiveDoorOpen && !state.terminals.archive.solved) return { ...faced, message: 'The violet gate is controlled by the Archive Decoder.' };
  if (tile === 'G' && !state.chipGateOpen && state.chips.length < ADVENTURE_CHIP_TOTAL) return { ...faced, message: `The final gate needs all ${ADVENTURE_CHIP_TOTAL} circuit chips.` };

  let crate = state.crate;
  let plateActive = state.plateActive;
  if (equal(destination, state.crate)) {
    const pushed = { x: state.crate.x + step.x, y: state.crate.y + step.y };
    const pushedTile = adventureTileAt(pushed);
    if (!['.', 'o'].includes(pushedTile) || equal(pushed, ADVENTURE_EXIT)) return { ...faced, message: 'The power crate cannot be pushed there.' };
    crate = pushed;
    plateActive = equal(pushed, ADVENTURE_PLATE);
  }

  const visited = state.visited.includes(pointKey(destination)) ? state.visited : [...state.visited, pointKey(destination)];
  let next = collectAt({
    ...faced, player: destination, crate, plateActive, visited, moves: state.moves + 1,
    redDoorOpen: state.redDoorOpen || tile === 'R',
    blueDoorOpen: state.blueDoorOpen || tile === 'B',
    signalDoorOpen: state.signalDoorOpen || tile === 'A',
    archiveDoorOpen: state.archiveDoorOpen || tile === 'D',
    chipGateOpen: state.chipGateOpen || tile === 'G',
    message: plateActive && !state.plateActive ? 'The power crate locks onto the circuit plate.' : 'The explorer advances one tile.',
  }, destination);

  if (tile === 'E') {
    if (state.phase === 'portal-open' && objectivesReady(next)) return { ...next, phase: 'complete', message: 'Portal crossed. Daily Venture circuit complete!' };
    return { ...state, facing: direction, message: 'The portal is dormant. Recover every circuit chip, solve both computers, and power the plate.' };
  }

  if (state.phase === 'playing' && objectivesReady(next)) {
    next = { ...next, phase: 'celebrating', celebrationMs: 0, message: 'Full circuit solved! One-second celebration—then navigate to the portal.' };
  }
  return next;
}

export function tickAdventure(state: AdventureState, ms: number): AdventureState {
  if (state.phase === 'complete') return state;
  const elapsedMs = state.elapsedMs + Math.max(0, ms);
  if (state.phase !== 'celebrating') return { ...state, elapsedMs };
  const celebrationMs = Math.min(1000, state.celebrationMs + Math.max(0, ms));
  return celebrationMs >= 1000
    ? { ...state, elapsedMs, celebrationMs, phase: 'portal-open', message: 'Portal online. Keep controlling the explorer and find the exit.' }
    : { ...state, elapsedMs, celebrationMs };
}

function terminalSnapshot(id: AdventureTerminalId, terminal: AdventureTerminalState) {
  const config = ADVENTURE_TERMINALS[id];
  if (terminal.kind === 'word-grid') return { id, kind: terminal.kind, title: config.title, clue: config.clue, guesses: terminal.guesses, currentGuess: terminal.currentGuess, solved: terminal.solved, failed: terminal.failed, maxGuesses: 6 };
  return { id, kind: terminal.kind, title: config.title, clue: config.clue, pattern: [...config.answer].map((letter) => terminal.guessed.includes(letter) ? letter : '_').join(' '), guessed: terminal.guessed, misses: terminal.misses, solved: terminal.solved, failed: terminal.failed, maxMisses: 6 };
}

export function adventureSnapshot(state: AdventureState) {
  return {
    mode: 'daily-venture-adventure', puzzle: 'venture-circuit-01', coordinateSystem: '21x21 tile grid; origin top-left; x right; y down; camera follows player',
    objective: `Recover ${ADVENTURE_CHIP_TOTAL} circuit chips, solve both computers, power the crate plate, then manually navigate through the portal`,
    map: ADVENTURE_MAP, player: state.player, crate: state.crate, plate: ADVENTURE_PLATE, exit: ADVENTURE_EXIT, facing: state.facing,
    phase: state.phase, celebrationMs: state.celebrationMs, activeTerminal: state.activeTerminal,
    terminal: state.activeTerminal ? terminalSnapshot(state.activeTerminal, state.terminals[state.activeTerminal]) : null,
    terminals: { signal: terminalSnapshot('signal', state.terminals.signal), archive: terminalSnapshot('archive', state.terminals.archive) },
    inventory: { chips: state.chips.length, chipTotal: ADVENTURE_CHIP_TOTAL, redKey: state.redKey, blueKey: state.blueKey, tideFins: state.flippers, fireBoots: state.fireBoots },
    doors: { redOpen: state.redDoorOpen, blueOpen: state.blueDoorOpen, signalOpen: state.signalDoorOpen, archiveOpen: state.archiveDoorOpen, chipGateOpen: state.chipGateOpen },
    plateActive: state.plateActive, visitedTiles: state.visited.length, portalOpen: state.phase === 'portal-open' || state.phase === 'complete',
    moves: state.moves, elapsedMs: state.elapsedMs, message: state.message,
  };
}
