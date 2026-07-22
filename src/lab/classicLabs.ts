export type ClassicLabId = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
export type ClassicDirection = 'up' | 'down' | 'left' | 'right';
export type ClassicLabStatus = 'playing' | 'complete' | 'failed';

export interface LabDefinition {
  id: ClassicLabId;
  title: string;
  shortTitle: string;
  inspiration: string;
  objective: string;
  controlHint: string;
  accent: string;
  icon: string;
}

export const CLASSIC_LABS: LabDefinition[] = [
  { id: 3, title: 'Relic Run', shortTitle: 'Maze chase', inspiration: 'Inspired by maze-chase classics', objective: 'Collect every sun spark, evade three temple shades, then reach the portal.', controlHint: 'Move one tile precisely', accent: '#f6c85f', icon: '☀' },
  { id: 4, title: 'Sky Stack', shortTitle: 'Falling blocks', inspiration: 'Falling-block line challenge', objective: 'Keep the airlock clear for 75 seconds or complete 50 cargo lines.', controlHint: 'Move, rotate, swipe or tap to drop', accent: '#66d6cb', icon: '▦' },
  { id: 5, title: 'River Relay', shortTitle: 'Crossing lanes', inspiration: 'Inspired by Frogger', objective: 'Guide the explorer over beetle roads and floating ruins to the far gate.', controlHint: 'Hop one space', accent: '#72d08f', icon: '≋' },
  { id: 6, title: 'Trail Coil', shortTitle: 'Obstacle trail', inspiration: 'Inspired by growing-trail classics', objective: 'Collect ten signal orbs while dodging stone pylons and your accelerating light trail.', controlHint: 'Queue one precise turn', accent: '#e8a95b', icon: '◇' },
  { id: 7, title: 'Prism Break', shortTitle: 'Ricochet puzzle', inspiration: 'Inspired by Breakout', objective: 'Aim the remote-guided light bar and shatter every suspended seal.', controlHint: 'Slide the light bar', accent: '#e97f78', icon: '◆' },
  { id: 8, title: 'Rune Merge', shortTitle: 'Symbol merge', inspiration: 'Inspired by sliding merge puzzles', objective: 'Combine matching shapes until one rune reaches its sixth stack.', controlHint: 'Swipe the rune board', accent: '#ba91ec', icon: '✦' },
  { id: 9, title: 'Lantern Grid', shortTitle: 'Light-toggle logic', inspiration: 'Inspired by Lights Out', objective: 'Tap a rune to flip it and its neighbors. Light all 25 lanterns.', controlHint: 'Tap rune tiles', accent: '#70b9e8', icon: '✺' },
  { id: 10, title: 'Icebound Route', shortTitle: 'Momentum maze', inspiration: 'Ice-slide pathfinding', objective: 'Slide until a wall stops you, gather four frost sigils, then enter the north gate.', controlHint: 'Choose a slide direction', accent: '#8ed9ef', icon: '❄' },
  { id: 11, title: 'Crate Circuit', shortTitle: 'Push-box logic', inspiration: 'Inspired by Sokoban', objective: 'Push three power crates onto the matching circuit plates without trapping one.', controlHint: 'Walk and push one tile', accent: '#e8a461', icon: '▣' },
  { id: 12, title: 'Echo Sequence', shortTitle: 'Pattern memory', inspiration: 'Inspired by Simon', objective: 'Watch and repeat three increasingly long four-pad signal sequences.', controlHint: 'Tap the glowing pads', accent: '#d58be6', icon: '◈' },
  { id: 13, title: 'Gear Links', shortTitle: 'Circuit rotation', inspiration: 'Rotating pipe logic', objective: 'Rotate all sixteen gear links to match the etched circuit blueprint.', controlHint: 'Tap a link to rotate it', accent: '#74cfa0', icon: '⚙' },
  { id: 14, title: 'Orbit Pulse', shortTitle: 'One-button timing', inspiration: 'Precision timing challenge', objective: 'Pulse inside six moving target windows before three mistimed signals overload the ring.', controlHint: 'Tap PULSE at the target', accent: '#f08c78', icon: '◎' },
  { id: 15, title: 'Rune Word', shortTitle: 'Word deduction', inspiration: 'Five-letter deduction puzzle', objective: 'Deduce the hidden five-letter venture word in six guesses.', controlHint: 'Tap letters, then enter', accent: '#78c9a8', icon: 'A' },
  { id: 16, title: 'Relic Groups', shortTitle: 'Hidden connections', inspiration: 'Four-group association puzzle', objective: 'Sort sixteen relic words into four hidden groups before four mistakes.', controlHint: 'Select four related tiles', accent: '#d99ac8', icon: '▦' },
];

export interface Point { x: number; y: number }

interface BaseLabState {
  status: ClassicLabStatus;
  elapsedMs: number;
  score: number;
  message: string;
}

export const RELIC_MAP = [
  '#############',
  '#.....#.....#',
  '#.###.#.###.#',
  '#...........#',
  '#.###.#.###.#',
  '#.....#.....#',
  '###.#...#.###',
  '#...#...#...#',
  '#.#.#...#.#.#',
  '#.#.......#.#',
  '#.###.#.###.#',
  '#.....#.....#',
  '#.###.#.###.#',
  '#...........#',
  '#############',
];

export interface RelicState extends BaseLabState {
  id: 3;
  player: Point;
  enemies: Array<Point & { id: number }>;
  pellets: string[];
  lives: number;
  enemyClock: number;
  target: number;
  exit: Point;
}

export type StackCell = 0 | 1 | 2 | 3 | 4 | 5;
export interface FallingPiece { shape: Point[]; x: number; y: number; color: StackCell; sequenceIndex: number }
export interface StackState extends BaseLabState {
  id: 4;
  board: StackCell[][];
  active: FallingPiece;
  fallClock: number;
  lines: number;
  pieces: number;
  remainingMs: number;
}

export interface RiverMover { id: number; row: number; x: number; speed: number; width: number; kind: 'beetle' | 'raft' }
export interface RiverState extends BaseLabState {
  id: 5;
  player: Point;
  movers: RiverMover[];
  lives: number;
  hops: number;
  bestRow: number;
}

export interface CoilState extends BaseLabState {
  id: 6;
  trail: Point[];
  direction: ClassicDirection;
  pendingDirection: ClassicDirection;
  orb: Point;
  moveClock: number;
  target: number;
  obstacles: Point[];
}

export interface Seal { id: number; x: number; y: number; color: number }
export interface PrismState extends BaseLabState {
  id: 7;
  paddleX: number;
  ball: Point & { vx: number; vy: number };
  seals: Seal[];
  lives: number;
  combo: number;
}

export interface MergeState extends BaseLabState {
  id: 8;
  board: number[][];
  moves: number;
  turn: number;
  highest: number;
}

export interface LanternState extends BaseLabState {
  id: 9;
  lights: boolean[];
  moves: number;
  lit: number;
}

export const ICE_MAP = [
  '#########', '#..#...G#', '#..#.#..#', '#.......#', '###.#...#', '#...#...#', '#.#...#.#', '#...#...#', '#.#...#.#', '#P......#', '#########',
];
export interface IceState extends BaseLabState { id: 10; player: Point; sigils: Point[]; collected: string[]; moves: number; exit: Point }

export const CRATE_MAP = [
  '########', '#......#', '#.G.GG.#', '#......#', '#......#', '#......#', '#P.....#', '########',
];
export interface CrateState extends BaseLabState { id: 11; player: Point; crates: Point[]; goals: Point[]; pushes: number; moves: number }

export interface EchoState extends BaseLabState {
  id: 12; sequence: number[]; round: number; revealIndex: number; revealClock: number; acceptingInput: boolean; inputIndex: number; strikes: number;
  pressedPad: number | null; pressedMs: number;
}

export interface GearState extends BaseLabState { id: 13; rotations: number[]; target: number[]; moves: number; aligned: number }

export interface OrbitState extends BaseLabState { id: 14; angle: number; targetAngle: number; targetWidth: number; gate: number; misses: number; speed: number }

export type WordMark = 'correct' | 'present' | 'absent';
export interface WordGuess { word: string; marks: WordMark[] }
export interface WordState extends BaseLabState { id: 15; target: string; current: string; guesses: WordGuess[]; maxGuesses: number }

export interface ConnectionGroup { name: string; words: string[]; color: string }
export interface ConnectionsState extends BaseLabState { id: 16; groups: ConnectionGroup[]; words: string[]; selected: string[]; solved: string[]; mistakes: number; maxMistakes: number }

export type ClassicLabState = RelicState | StackState | RiverState | CoilState | PrismState | MergeState | LanternState | IceState | CrateState | EchoState | GearState | OrbitState | WordState | ConnectionsState;

export type ClassicLabAction =
  | { type: 'move'; direction: ClassicDirection }
  | { type: 'tick'; ms: number }
  | { type: 'rotate' }
  | { type: 'hard-drop' }
  | { type: 'activate'; index: number }
  | { type: 'letter'; letter: string }
  | { type: 'backspace' }
  | { type: 'submit-word' }
  | { type: 'toggle-connection'; word: string }
  | { type: 'submit-connection' }
  | { type: 'shuffle-connection' };

const pointKey = ({ x, y }: Point) => `${x},${y}`;
const pointEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const directionDelta: Record<ClassicDirection, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

function initialRelicState(): RelicState {
  const pellets: string[] = [];
  RELIC_MAP.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '.' && !(x === 11 && y === 1) && !(x === 1 && y === 13)) pellets.push(pointKey({ x, y }));
  }));
  return {
    id: 3, status: 'playing', elapsedMs: 0, score: 0,
    message: `Gather every one of the ${pellets.length} sun sparks. Three shades patrol the maze.`,
    player: { x: 1, y: 13 }, enemies: [{ id: 0, x: 6, y: 7 }, { id: 1, x: 7, y: 7 }, { id: 2, x: 5, y: 7 }],
    pellets, lives: 3, enemyClock: 0, target: pellets.length, exit: { x: 11, y: 1 },
  };
}

const SHAPES: Point[][] = [
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }],
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
];

function stackPiece(sequenceIndex: number): FallingPiece {
  const shapeIndex = sequenceIndex % SHAPES.length;
  return { shape: SHAPES[shapeIndex].map((point) => ({ ...point })), x: 4, y: 0, color: (shapeIndex + 1) as StackCell, sequenceIndex };
}

function initialStackState(): StackState {
  return {
    id: 4, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Airlock stable. Keep the falling cargo below the warning line.',
    board: Array.from({ length: 18 }, () => Array<StackCell>(10).fill(0)), active: stackPiece(0),
    fallClock: 0, lines: 0, pieces: 0, remainingMs: 75000,
  };
}

function initialRiverState(): RiverState {
  const specs: Array<[number, number, number, number, RiverMover['kind']]> = [
    [9, 1, 1.23, 1.4, 'beetle'], [9, 6, 1.23, 1.4, 'beetle'],
    [8, 3, -1.5, 1.6, 'beetle'], [8, 8, -1.5, 1.6, 'beetle'],
    [7, 0, 1.83, 1.25, 'beetle'], [7, 4, 1.83, 1.25, 'beetle'], [7, 8, 1.83, 1.25, 'beetle'],
    [6, 2, -1.18, 2.1, 'beetle'], [6, 8, -1.18, 2.1, 'beetle'],
    [4, 1, .88, 2.35, 'raft'], [4, 6, .88, 2.35, 'raft'],
    [3, 3, -1.04, 2.8, 'raft'], [3, 9, -1.04, 2.8, 'raft'],
    [2, 0, 1.21, 2.05, 'raft'], [2, 5, 1.21, 2.05, 'raft'],
    [1, 2, -.8, 3, 'raft'], [1, 8, -.8, 3, 'raft'],
  ];
  return {
    id: 5, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Cross the moving lanes. Rest on the moss strip halfway.',
    player: { x: 4, y: 10 }, movers: specs.map(([row, x, speed, width, kind], id) => ({ id, row, x, speed, width, kind })),
    lives: 3, hops: 0, bestRow: 10,
  };
}

const ORB_SEQUENCE: Point[] = [
  { x: 4, y: 10 }, { x: 11, y: 9 }, { x: 10, y: 4 }, { x: 3, y: 3 },
  { x: 2, y: 8 }, { x: 8, y: 11 }, { x: 12, y: 6 }, { x: 6, y: 2 }, { x: 1, y: 5 },
];

const COIL_OBSTACLES: Point[] = [
  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 10, y: 2 }, { x: 11, y: 2 },
  { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 7 },
  { x: 5, y: 8 }, { x: 6, y: 8 }, { x: 1, y: 11 }, { x: 2, y: 11 },
  { x: 11, y: 12 }, { x: 12, y: 12 },
];

function initialCoilState(): CoilState {
  return {
    id: 6, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Follow the signal orbs. Dodge the stone pylons and never cross your own glowing trail.',
    trail: [{ x: 7, y: 13 }, { x: 7, y: 14 }, { x: 7, y: 15 }], direction: 'up', pendingDirection: 'up',
    orb: { ...ORB_SEQUENCE[0] }, moveClock: 0, target: 10, obstacles: COIL_OBSTACLES.map((point) => ({ ...point })),
  };
}

function initialPrismState(): PrismState {
  const colors = [1, 2, 3, 4, 5];
  const seals: Seal[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) seals.push({ id: row * 6 + col, x: 50 + col * 58, y: 190 + row * 32, color: colors[(row + col) % colors.length] });
  }
  return {
    id: 7, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Keep the prism in flight. Slide the light bar beneath it.',
    paddleX: 195, ball: { x: 195, y: 500, vx: 138, vy: -190 }, seals, lives: 3, combo: 0,
  };
}

function initialMergeState(): MergeState {
  const board = Array.from({ length: 4 }, () => Array<number>(4).fill(0));
  board[1][1] = 2; board[2][2] = 2;
  return {
    id: 8, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Matching shapes fuse when they collide. Forge a sixth-stack sun rune.',
    board, moves: 0, turn: 0, highest: 2,
  };
}

function lanternNeighbors(index: number) {
  const x = index % 5; const y = Math.floor(index / 5); const neighbors = [index];
  if (x > 0) neighbors.push(index - 1);
  if (x < 4) neighbors.push(index + 1);
  if (y > 0) neighbors.push(index - 5);
  if (y < 4) neighbors.push(index + 5);
  return neighbors;
}

function toggleLanterns(lights: boolean[], index: number) {
  const next = [...lights]; lanternNeighbors(index).forEach((neighbor) => { next[neighbor] = !next[neighbor]; }); return next;
}

function initialLanternState(): LanternState {
  let lights = Array<boolean>(25).fill(true);
  for (const index of [0, 2, 6, 10, 12, 14, 18, 22, 24]) lights = toggleLanterns(lights, index);
  return {
    id: 9, status: 'playing', elapsedMs: 0, score: 0,
    message: 'The remote is linked. Each rune flips itself and its four direct neighbors.',
    lights, moves: 0, lit: lights.filter(Boolean).length,
  };
}

function initialIceState(): IceState {
  return {
    id: 10, status: 'playing', elapsedMs: 0, score: 0, message: 'Each move slides until stone stops you. Gather every frost sigil before the north gate.',
    player: { x: 1, y: 9 }, sigils: [{ x: 7, y: 9 }, { x: 7, y: 5 }, { x: 3, y: 3 }, { x: 1, y: 1 }], collected: [], moves: 0, exit: { x: 7, y: 1 },
  };
}

function initialCrateState(): CrateState {
  return {
    id: 11, status: 'playing', elapsedMs: 0, score: 0, message: 'Stand behind a crate to push it. A crate against the wrong wall cannot be pulled back.',
    player: { x: 1, y: 6 }, crates: [{ x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 5 }], goals: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }], pushes: 0, moves: 0,
  };
}

const ECHO_SEQUENCE = [0, 2, 1, 3, 2, 0, 3, 1];
function echoRoundLength(round: number) { return 4 + round * 2; }
function initialEchoState(): EchoState {
  return {
    id: 12, status: 'playing', elapsedMs: 0, score: 0, message: 'Watch the four pads. Input unlocks when the whole pattern has played.',
    sequence: ECHO_SEQUENCE, round: 0, revealIndex: 0, revealClock: 0, acceptingInput: false, inputIndex: 0, strikes: 0,
    pressedPad: null, pressedMs: 0,
  };
}

const GEAR_TARGET = [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2];
function initialGearState(): GearState {
  const rotations = GEAR_TARGET.map((target, index) => (target + 1 + index % 3) % 4);
  return { id: 13, status: 'playing', elapsedMs: 0, score: 0, message: 'Tap a link to rotate it clockwise. Match every etched corner mark.', rotations, target: [...GEAR_TARGET], moves: 0, aligned: 0 };
}

const ORBIT_TARGETS = [.55, 2.2, 4.55, 1.2, 3.4, 5.7];
function initialOrbitState(): OrbitState {
  return { id: 14, status: 'playing', elapsedMs: 0, score: 0, message: 'Pulse only when the orbiting spark crosses the highlighted window.', angle: 0, targetAngle: ORBIT_TARGETS[0], targetWidth: .34, gate: 0, misses: 0, speed: 1.9 };
}

function initialWordState(): WordState {
  return { id: 15, status: 'playing', elapsedMs: 0, score: 0, message: 'Enter a five-letter word. Green is exact; gold belongs somewhere else.', target: 'TRAIL', current: '', guesses: [], maxGuesses: 6 };
}

const CONNECTION_GROUPS: ConnectionGroup[] = [
  { name: 'NAVIGATION', words: ['COMPASS', 'MAP', 'BEACON', 'SEXTANT'], color: '#73c8b0' },
  { name: 'TREES', words: ['PINE', 'OAK', 'ELM', 'BIRCH'], color: '#86bd75' },
  { name: 'LIGHT SOURCES', words: ['TORCH', 'LANTERN', 'CANDLE', 'STAR'], color: '#e8bd62' },
  { name: 'WINTER WEATHER', words: ['RAIN', 'HAIL', 'SLEET', 'SNOW'], color: '#8ab8d9' },
];
const CONNECTION_ORDER = ['COMPASS', 'PINE', 'TORCH', 'RAIN', 'MAP', 'OAK', 'LANTERN', 'HAIL', 'BEACON', 'ELM', 'CANDLE', 'SLEET', 'SEXTANT', 'BIRCH', 'STAR', 'SNOW'];
function initialConnectionsState(): ConnectionsState {
  return { id: 16, status: 'playing', elapsedMs: 0, score: 0, message: 'Select four words that share one precise connection.', groups: CONNECTION_GROUPS.map((group) => ({ ...group, words: [...group.words] })), words: [...CONNECTION_ORDER], selected: [], solved: [], mistakes: 0, maxMistakes: 4 };
}

export function initialClassicLabState(id: ClassicLabId): ClassicLabState {
  if (id === 3) return initialRelicState();
  if (id === 4) return initialStackState();
  if (id === 5) return initialRiverState();
  if (id === 6) return initialCoilState();
  if (id === 7) return initialPrismState();
  if (id === 8) return initialMergeState();
  if (id === 9) return initialLanternState();
  if (id === 10) return initialIceState();
  if (id === 11) return initialCrateState();
  if (id === 12) return initialEchoState();
  if (id === 13) return initialGearState();
  if (id === 14) return initialOrbitState();
  if (id === 15) return initialWordState();
  return initialConnectionsState();
}

function relicWalkable(point: Point) {
  return point.y >= 0 && point.y < RELIC_MAP.length && point.x >= 0 && point.x < RELIC_MAP[0].length && RELIC_MAP[point.y][point.x] !== '#';
}

function loseRelicLife(state: RelicState): RelicState {
  const lives = state.lives - 1;
  return {
    ...state, lives, player: { x: 1, y: 13 }, enemies: [{ id: 0, x: 6, y: 7 }, { id: 1, x: 7, y: 7 }, { id: 2, x: 5, y: 7 }],
    status: lives <= 0 ? 'failed' : 'playing',
    message: lives <= 0 ? 'The temple shades caught the explorer. Reset the lab to try again.' : `A shade found you. ${lives} lantern ${lives === 1 ? 'charge' : 'charges'} remain.`,
  };
}

function moveRelic(state: RelicState, direction: ClassicDirection): RelicState {
  if (state.status !== 'playing') return state;
  const delta = directionDelta[direction];
  const player = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!relicWalkable(player)) return { ...state, message: 'A carved wall blocks that route.' };
  if (pointEqual(player, state.exit) && state.pellets.length) return { ...state, message: `${state.pellets.length} more sun ${state.pellets.length === 1 ? 'spark is' : 'sparks are'} needed to open the portal.` };
  if (state.enemies.some((enemy) => pointEqual(enemy, player))) return loseRelicLife(state);
  const key = pointKey(player);
  const collected = state.pellets.includes(key);
  const pellets = collected ? state.pellets.filter((pellet) => pellet !== key) : state.pellets;
  const score = state.score + (collected ? 1 : 0);
  const complete = pointEqual(player, state.exit) && pellets.length === 0;
  return {
    ...state, player, pellets, score, status: complete ? 'complete' : 'playing',
    message: complete ? 'Every spark gathered. Relic Run is clear.' : pellets.length === 0 ? 'Every spark is yours. Reach the glowing gate!' : collected ? `Sun spark secured. ${pellets.length} remain.` : 'Keep moving—the shades are closing in.',
  };
}

function chaseStep(enemy: Point & { id: number }, player: Point, enemies: Array<Point & { id: number }>) {
  const candidates = (['up', 'left', 'down', 'right'] as ClassicDirection[])
    .map((direction) => ({ direction, point: { x: enemy.x + directionDelta[direction].x, y: enemy.y + directionDelta[direction].y } }))
    .filter(({ point }) => relicWalkable(point) && !enemies.some((other) => other.id !== enemy.id && pointEqual(other, point)))
    .sort((a, b) => {
      const aDistance = Math.abs(a.point.x - player.x) + Math.abs(a.point.y - player.y);
      const bDistance = Math.abs(b.point.x - player.x) + Math.abs(b.point.y - player.y);
      return aDistance - bDistance || a.direction.localeCompare(b.direction);
    });
  return { ...enemy, ...(candidates[0]?.point ?? enemy) };
}

function tickRelic(state: RelicState, ms: number): RelicState {
  if (state.status !== 'playing') return state;
  let next = { ...state, elapsedMs: state.elapsedMs + ms, enemyClock: state.enemyClock + ms };
  let steps = 0;
  while (next.enemyClock >= 520 && steps < 12) {
    next.enemyClock -= 520;
    const enemies: RelicState['enemies'] = [];
    for (const enemy of next.enemies) enemies.push(chaseStep(enemy, next.player, [...enemies, ...next.enemies.slice(enemies.length)]));
    next = { ...next, enemies };
    if (enemies.some((enemy) => pointEqual(enemy, next.player))) return loseRelicLife(next);
    steps += 1;
  }
  return next;
}

function stackCollides(board: StackCell[][], piece: FallingPiece) {
  return piece.shape.some((cell) => {
    const x = piece.x + cell.x; const y = piece.y + cell.y;
    return x < 0 || x >= 10 || y >= 18 || (y >= 0 && board[y][x] !== 0);
  });
}

function clearStackLines(board: StackCell[][]) {
  const kept = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = 18 - kept.length;
  return { board: [...Array.from({ length: cleared }, () => Array<StackCell>(10).fill(0)), ...kept], cleared };
}

function lockStackPiece(state: StackState): StackState {
  const board = state.board.map((row) => [...row]);
  state.active.shape.forEach((cell) => {
    const y = state.active.y + cell.y; const x = state.active.x + cell.x;
    if (y >= 0 && y < 18 && x >= 0 && x < 10) board[y][x] = state.active.color;
  });
  const result = clearStackLines(board);
  const active = stackPiece(state.active.sequenceIndex + 1);
  const failed = stackCollides(result.board, active);
  const lines = state.lines + result.cleared;
  const lineScores = [0, 100, 300, 500, 800];
  const complete = lines >= 50;
  return {
    ...state, board: result.board, active, pieces: state.pieces + 1, lines,
    score: state.score + 10 + lineScores[result.cleared], status: complete ? 'complete' : failed ? 'failed' : state.status,
    message: complete ? 'Fifty cargo lines cleared. The airlock portal is open!'
      : failed ? 'Cargo reached the warning line. Reset the airlock and try again.'
        : result.cleared ? `${result.cleared} cargo line ${result.cleared === 1 ? 'cleared' : 'cleared'} · +${lineScores[result.cleared]} points!` : 'Cargo locked. The next shape is incoming.',
  };
}

function moveStack(state: StackState, direction: ClassicDirection): StackState {
  if (state.status !== 'playing') return state;
  if (direction === 'up') return rotateStack(state);
  const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const dy = direction === 'down' ? 1 : 0;
  const active = { ...state.active, x: state.active.x + dx, y: state.active.y + dy };
  if (!stackCollides(state.board, active)) return { ...state, active, score: state.score + (dy ? 1 : 0), message: dy ? 'Cargo lowered.' : 'Cargo shifted.' };
  return dy ? lockStackPiece(state) : { ...state, message: 'The cargo cannot move farther that way.' };
}

function rotateStack(state: StackState): StackState {
  if (state.status !== 'playing') return state;
  const rotated = { ...state.active, shape: state.active.shape.map(({ x, y }) => ({ x: -y, y: x })) };
  if (!stackCollides(state.board, rotated)) return { ...state, active: rotated, message: 'Cargo rotated.' };
  for (const nudge of [-1, 1, -2, 2]) {
    const kicked = { ...rotated, x: rotated.x + nudge };
    if (!stackCollides(state.board, kicked)) return { ...state, active: kicked, message: 'Cargo rotated against the wall.' };
  }
  return { ...state, message: 'There is no room to rotate this shape.' };
}

function hardDropStack(state: StackState): StackState {
  if (state.status !== 'playing') return state;
  let active = { ...state.active };
  let distance = 0;
  while (!stackCollides(state.board, { ...active, y: active.y + 1 })) { active = { ...active, y: active.y + 1 }; distance += 1; }
  return lockStackPiece({ ...state, active, score: state.score + distance * 2 });
}

function tickStack(state: StackState, ms: number): StackState {
  if (state.status !== 'playing') return state;
  if (state.lines >= 50) return { ...state, status: 'complete', message: 'Fifty cargo lines cleared. The airlock portal is open!' };
  const elapsedMs = Math.min(75000, state.elapsedMs + ms);
  if (elapsedMs >= 75000) return { ...state, elapsedMs, remainingMs: 0, status: 'complete', score: state.score + 750, message: 'Seventy-five seconds survived. The airlock portal is open!' };
  let next = { ...state, elapsedMs, remainingMs: 75000 - elapsedMs, fallClock: state.fallClock + ms };
  let steps = 0;
  const urgency = elapsedMs / 75000;
  const interval = Math.max(105, 650 - urgency * 520);
  while (next.fallClock >= interval && next.status === 'playing' && steps < 30) {
    next = { ...moveStack(next, 'down'), fallClock: next.fallClock - interval };
    steps += 1;
  }
  return next;
}

function wrapMoverX(x: number) {
  let next = x;
  while (next > 11) next -= 13;
  while (next < -2) next += 13;
  return next;
}

function loseRiverLife(state: RiverState, reason: string): RiverState {
  const lives = state.lives - 1;
  return {
    ...state, lives, player: { x: 4, y: 10 }, status: lives <= 0 ? 'failed' : 'playing',
    message: lives <= 0 ? `${reason} The relay is over—reset to try again.` : `${reason} ${lives} trail ${lives === 1 ? 'token' : 'tokens'} remain.`,
  };
}

function checkRiver(state: RiverState, carryMs = 0): RiverState {
  const row = Math.round(state.player.y);
  if (row >= 6 && row <= 9) {
    const hit = state.movers.some((mover) => mover.kind === 'beetle' && mover.row === row && Math.abs(mover.x - state.player.x) < mover.width / 2 + .28);
    if (hit) return loseRiverLife(state, 'A cargo beetle clipped the explorer.');
  }
  if (row >= 1 && row <= 4) {
    const raft = state.movers.find((mover) => mover.kind === 'raft' && mover.row === row && Math.abs(mover.x - state.player.x) < mover.width / 2);
    if (!raft) return loseRiverLife(state, 'The explorer missed the floating ruin.');
    const x = state.player.x + raft.speed * carryMs / 1000;
    if (x < -.35 || x > 8.35) return loseRiverLife(state, 'The current carried the explorer beyond the bank.');
    return { ...state, player: { x, y: state.player.y } };
  }
  return state;
}

function moveRiver(state: RiverState, direction: ClassicDirection): RiverState {
  if (state.status !== 'playing') return state;
  const delta = directionDelta[direction];
  const player = { x: Math.max(0, Math.min(8, Math.round(state.player.x) + delta.x)), y: Math.max(0, Math.min(10, state.player.y + delta.y)) };
  const hops = state.hops + (pointEqual(player, state.player) ? 0 : 1);
  const bestRow = Math.min(state.bestRow, player.y);
  const moved: RiverState = { ...state, player, hops, bestRow, score: (10 - bestRow) * 10, message: 'Hop timed. Watch the next moving lane.' };
  if (player.y === 0) return { ...moved, status: 'complete', score: moved.score + 200, message: 'Far gate reached. River Relay is clear!' };
  return checkRiver(moved);
}

function tickRiver(state: RiverState, ms: number): RiverState {
  if (state.status !== 'playing') return state;
  const movers = state.movers.map((mover) => ({ ...mover, x: wrapMoverX(mover.x + mover.speed * ms / 1000) }));
  return checkRiver({ ...state, elapsedMs: state.elapsedMs + ms, movers }, ms);
}

function opposite(a: ClassicDirection, b: ClassicDirection) {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') || (a === 'left' && b === 'right') || (a === 'right' && b === 'left');
}

function steerCoil(state: CoilState, direction: ClassicDirection): CoilState {
  if (state.status !== 'playing' || opposite(state.direction, direction)) return state;
  return { ...state, pendingDirection: direction, message: `Trail turning ${direction} at the next marker.` };
}

function stepCoil(state: CoilState): CoilState {
  const direction = state.pendingDirection;
  const delta = directionDelta[direction];
  const head = { x: state.trail[0].x + delta.x, y: state.trail[0].y + delta.y };
  const hitObstacle = state.obstacles.some((point) => pointEqual(point, head));
  if (head.x < 0 || head.x >= 15 || head.y < 0 || head.y >= 16 || hitObstacle || state.trail.slice(0, -1).some((point) => pointEqual(point, head))) {
    return { ...state, direction, status: 'failed', message: hitObstacle ? 'The explorer struck a stone pylon. Reset and weave a safer trail.' : 'The explorer crossed the trail field. Reset to chart a new route.' };
  }
  const collected = pointEqual(head, state.orb);
  const score = state.score + (collected ? 1 : 0);
  const trail = [head, ...state.trail];
  if (!collected) trail.pop();
  const complete = score >= state.target;
  return {
    ...state, trail, direction, score, status: complete ? 'complete' : 'playing',
    orb: complete ? state.orb : { ...ORB_SEQUENCE[score % ORB_SEQUENCE.length] },
    message: complete ? 'Ten signals linked. Trail Coil is clear!' : collected ? `Signal linked. ${state.target - score} remain.` : 'The light trail is growing behind you.',
  };
}

function tickCoil(state: CoilState, ms: number): CoilState {
  if (state.status !== 'playing') return state;
  let next = { ...state, elapsedMs: state.elapsedMs + ms, moveClock: state.moveClock + ms };
  let steps = 0;
  const interval = Math.max(90, 235 - state.score * 12);
  while (next.moveClock >= interval && next.status === 'playing' && steps < 40) {
    next = { ...stepCoil(next), moveClock: next.moveClock - interval };
    steps += 1;
  }
  return next;
}

function movePrism(state: PrismState, direction: ClassicDirection): PrismState {
  if (state.status !== 'playing' || (direction !== 'left' && direction !== 'right')) return state;
  const paddleX = Math.max(70, Math.min(320, state.paddleX + (direction === 'left' ? -34 : 34)));
  return { ...state, paddleX, message: `Light bar shifted ${direction}.` };
}

function tickPrism(state: PrismState, ms: number): PrismState {
  if (state.status !== 'playing') return state;
  let next: PrismState = { ...state, elapsedMs: state.elapsedMs + ms, ball: { ...state.ball }, seals: [...state.seals] };
  let remaining = Math.min(ms, 1200);
  while (remaining > 0 && next.status === 'playing') {
    const step = Math.min(16, remaining); const seconds = step / 1000;
    let ball = { ...next.ball, x: next.ball.x + next.ball.vx * seconds, y: next.ball.y + next.ball.vy * seconds };
    if (ball.x <= 29 || ball.x >= 361) { ball.x = Math.max(29, Math.min(361, ball.x)); ball.vx *= -1; }
    if (ball.y <= 158) { ball.y = 158; ball.vy = Math.abs(ball.vy); }
    if (ball.vy > 0 && ball.y >= 560 && ball.y <= 578 && Math.abs(ball.x - next.paddleX) <= 48) {
      const offset = (ball.x - next.paddleX) / 48;
      ball.y = 559; ball.vy = -Math.abs(ball.vy) * 1.025; ball.vx = Math.max(-220, Math.min(220, ball.vx + offset * 75));
    }
    const hit = next.seals.find((seal) => Math.abs(ball.x - seal.x) < 24 && Math.abs(ball.y - seal.y) < 13);
    if (hit) {
      const seals = next.seals.filter((seal) => seal.id !== hit.id);
      const combo = next.combo + 1;
      ball.vy *= -1;
      next = { ...next, seals, combo, score: next.score + 10 * combo, message: `${seals.length} prism seals remain.` };
      if (!seals.length) return { ...next, ball, status: 'complete', score: next.score + 300, message: 'Every seal shattered. Prism Break is clear!' };
    }
    if (ball.y > 630) {
      const lives = next.lives - 1;
      if (lives <= 0) return { ...next, lives: 0, ball, status: 'failed', message: 'The prism fell beyond recovery. Reset the lab to try again.' };
      ball = { x: next.paddleX, y: 500, vx: next.lives % 2 ? 138 : -138, vy: -190 };
      next = { ...next, lives, combo: 0, message: `Prism recovered. ${lives} light ${lives === 1 ? 'charge' : 'charges'} remain.` };
    }
    next = { ...next, ball };
    remaining -= step;
  }
  return next;
}

function mergeLine(line: number[]) {
  const compact = line.filter(Boolean);
  const merged: number[] = [];
  let gain = 0;
  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const value = compact[index] * 2; merged.push(value); gain += value; index += 1;
    } else merged.push(compact[index]);
  }
  while (merged.length < 4) merged.push(0);
  return { line: merged, gain };
}

function boardsEqual(a: number[][], b: number[][]) {
  return a.every((row, y) => row.every((cell, x) => cell === b[y][x]));
}

function canMergeBoard(board: number[][]) {
  if (board.some((row) => row.includes(0))) return true;
  return board.some((row, y) => row.some((cell, x) => board[y]?.[x + 1] === cell || board[y + 1]?.[x] === cell));
}

function moveMerge(state: MergeState, direction: ClassicDirection): MergeState {
  if (state.status !== 'playing') return state;
  let board = state.board.map((row) => [...row]);
  let gain = 0;
  const getLine = (index: number) => direction === 'left' || direction === 'right'
    ? [...board[index]]
    : board.map((row) => row[index]);
  const setLine = (index: number, line: number[]) => {
    if (direction === 'left' || direction === 'right') board[index] = line;
    else line.forEach((value, row) => { board[row][index] = value; });
  };
  for (let index = 0; index < 4; index += 1) {
    let line = getLine(index);
    const reverse = direction === 'right' || direction === 'down';
    if (reverse) line.reverse();
    const result = mergeLine(line); gain += result.gain;
    if (reverse) result.line.reverse();
    setLine(index, result.line);
  }
  if (boardsEqual(board, state.board)) return { ...state, message: 'No runes can move in that direction.' };
  const turn = state.turn + 1;
  const empty = board.flatMap((row, y) => row.map((value, x) => value ? null : ({ x, y }))).filter((point): point is Point => point !== null);
  if (empty.length) {
    const spawn = empty[(turn * 7 + 3) % empty.length];
    board[spawn.y][spawn.x] = turn % 5 === 0 ? 4 : 2;
  }
  const highest = Math.max(...board.flat());
  const complete = highest >= 64;
  const failed = !complete && !canMergeBoard(board);
  return {
    ...state, board, turn, moves: state.moves + 1, score: state.score + gain, highest,
    status: complete ? 'complete' : failed ? 'failed' : 'playing',
    message: complete ? 'Six symbol stacks forged the sun rune. Rune Merge is clear!' : failed ? 'The rune board is locked. Reset and try a new merge path.' : gain ? 'Matching symbols fused into a stronger shape.' : 'Rune board shifted.',
  };
}

function activateLantern(state: LanternState, index: number): LanternState {
  if (state.status !== 'playing' || index < 0 || index >= 25) return state;
  const lights = toggleLanterns(state.lights, index);
  const lit = lights.filter(Boolean).length;
  const complete = lit === 25;
  return {
    ...state, lights, lit, moves: state.moves + 1, score: lit * 10, status: complete ? 'complete' : 'playing',
    message: complete ? 'Every lantern is linked. Lantern Grid is clear!' : `${25 - lit} lantern ${25 - lit === 1 ? 'remains' : 'remain'} dark.`,
  };
}

function iceWalkable(point: Point) {
  return point.y >= 0 && point.y < ICE_MAP.length && point.x >= 0 && point.x < ICE_MAP[0].length && ICE_MAP[point.y][point.x] !== '#';
}

function moveIce(state: IceState, direction: ClassicDirection): IceState {
  if (state.status !== 'playing') return state;
  const delta = directionDelta[direction]; let player = { ...state.player }; const crossed: Point[] = [];
  while (iceWalkable({ x: player.x + delta.x, y: player.y + delta.y })) {
    player = { x: player.x + delta.x, y: player.y + delta.y }; crossed.push(player);
  }
  if (!crossed.length) return { ...state, message: 'Stone blocks that slide. Choose a different direction.' };
  const collected = [...state.collected];
  for (const sigil of state.sigils) if (crossed.some((point) => pointEqual(point, sigil)) && !collected.includes(pointKey(sigil))) collected.push(pointKey(sigil));
  const score = collected.length; const atExit = pointEqual(player, state.exit); const complete = atExit && score === state.sigils.length;
  return {
    ...state, player, collected, score, moves: state.moves + 1, status: complete ? 'complete' : 'playing',
    message: complete ? 'All frost sigils carried through the north gate. Icebound Route is clear!'
      : atExit ? `${state.sigils.length - score} frost sigils are still missing. Slide away and circle back.`
        : score > state.score ? `Frost sigil gathered. ${state.sigils.length - score} remain.` : `Slide ended at ${player.x}, ${player.y}.`,
  };
}

function crateWalkable(point: Point) {
  return point.y >= 0 && point.y < CRATE_MAP.length && point.x >= 0 && point.x < CRATE_MAP[0].length && CRATE_MAP[point.y][point.x] !== '#';
}

function moveCrate(state: CrateState, direction: ClassicDirection): CrateState {
  if (state.status !== 'playing') return state;
  const delta = directionDelta[direction]; const destination = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!crateWalkable(destination)) return { ...state, message: 'The workshop wall blocks that step.' };
  const crateIndex = state.crates.findIndex((crate) => pointEqual(crate, destination));
  if (crateIndex < 0) return { ...state, player: destination, moves: state.moves + 1, message: 'Position set. Line up behind a power crate.' };
  const crateDestination = { x: destination.x + delta.x, y: destination.y + delta.y };
  if (!crateWalkable(crateDestination) || state.crates.some((crate, index) => index !== crateIndex && pointEqual(crate, crateDestination))) return { ...state, message: 'That crate cannot move. Reposition before pushing again.' };
  const crates = state.crates.map((crate, index) => index === crateIndex ? crateDestination : crate);
  const aligned = crates.filter((crate) => state.goals.some((goal) => pointEqual(crate, goal))).length; const complete = aligned === state.goals.length;
  return {
    ...state, player: destination, crates, pushes: state.pushes + 1, moves: state.moves + 1, score: aligned, status: complete ? 'complete' : 'playing',
    message: complete ? 'Every power crate is linked. Crate Circuit is clear!' : aligned ? `${aligned} of ${state.goals.length} circuit plates are powered.` : 'Crate pushed. Avoid sealing it against an unpowered wall.',
  };
}

function tickEcho(state: EchoState, ms: number): EchoState {
  const pressedMs = Math.max(0, state.pressedMs - ms);
  const pressedPad = pressedMs > 0 ? state.pressedPad : null;
  if (state.status !== 'playing') return pressedMs !== state.pressedMs ? { ...state, pressedPad, pressedMs } : state;
  if (state.acceptingInput) return { ...state, elapsedMs: state.elapsedMs + ms, pressedPad, pressedMs };
  let revealClock = state.revealClock + ms; let revealIndex = state.revealIndex; const length = echoRoundLength(state.round); let steps = 0;
  while (revealClock >= 520 && steps < 30) { revealClock -= 520; revealIndex += 1; steps += 1; }
  if (revealIndex >= length) return { ...state, elapsedMs: state.elapsedMs + ms, revealClock: 0, revealIndex: length, acceptingInput: true, inputIndex: 0, pressedPad, pressedMs, message: `Your turn. Repeat all ${length} signals.` };
  return { ...state, elapsedMs: state.elapsedMs + ms, revealClock, revealIndex, pressedPad, pressedMs };
}

function activateEcho(state: EchoState, index: number): EchoState {
  if (state.status !== 'playing' || index < 0 || index > 3) return state;
  if (!state.acceptingInput) return { ...state, message: 'Watch first—the input pads unlock after the final signal.' };
  const length = echoRoundLength(state.round); const correct = state.sequence[state.inputIndex] === index;
  if (!correct) {
    const strikes = state.strikes + 1; const failed = strikes >= 2;
    return { ...state, strikes, acceptingInput: false, inputIndex: 0, revealIndex: 0, revealClock: 0, pressedPad: index, pressedMs: 180, status: failed ? 'failed' : 'playing', message: failed ? 'Two pattern errors overloaded the echo console. Reset to try again.' : 'Pattern mismatch. Watch this round once more.' };
  }
  const inputIndex = state.inputIndex + 1;
  if (inputIndex < length) return { ...state, inputIndex, score: state.score + 1, pressedPad: index, pressedMs: 180, message: `${length - inputIndex} signals remain in this echo.` };
  if (state.round >= 2) return { ...state, inputIndex, score: state.score + 1, pressedPad: index, pressedMs: 180, status: 'complete', message: 'All three echo sequences restored. Echo Sequence is clear!' };
  return { ...state, round: state.round + 1, inputIndex: 0, score: state.score + 1, acceptingInput: false, revealIndex: 0, revealClock: 0, pressedPad: index, pressedMs: 180, message: `Round ${state.round + 2} is longer. Watch closely.` };
}

function activateGear(state: GearState, index: number): GearState {
  if (state.status !== 'playing' || index < 0 || index >= state.rotations.length) return state;
  const rotations = [...state.rotations]; rotations[index] = (rotations[index] + 1) % 4;
  const aligned = rotations.filter((rotation, tile) => rotation === state.target[tile]).length; const complete = aligned === rotations.length;
  return { ...state, rotations, moves: state.moves + 1, aligned, score: aligned, status: complete ? 'complete' : 'playing', message: complete ? 'All sixteen links match the blueprint. Gear Links is clear!' : `${aligned} of 16 gear links aligned.` };
}

function angleDistance(a: number, b: number) {
  const full = Math.PI * 2; const difference = Math.abs(((a - b + Math.PI) % full + full) % full - Math.PI); return difference;
}

function tickOrbit(state: OrbitState, ms: number): OrbitState {
  if (state.status !== 'playing') return state;
  const angle = (state.angle + state.speed * ms / 1000) % (Math.PI * 2);
  return { ...state, angle, elapsedMs: state.elapsedMs + ms };
}

function activateOrbit(state: OrbitState): OrbitState {
  if (state.status !== 'playing') return state;
  const hit = angleDistance(state.angle, state.targetAngle) <= state.targetWidth;
  if (!hit) {
    const misses = state.misses + 1; const failed = misses >= 3;
    return { ...state, misses, status: failed ? 'failed' : 'playing', message: failed ? 'Three mistimed pulses overloaded the orbit. Reset to try again.' : `Pulse missed. ${3 - misses} timing ${3 - misses === 1 ? 'charge' : 'charges'} remain.` };
  }
  const gate = state.gate + 1;
  if (gate >= ORBIT_TARGETS.length) return { ...state, gate, score: gate, status: 'complete', message: 'Six orbit gates synchronized. Orbit Pulse is clear!' };
  return { ...state, gate, score: gate, targetAngle: ORBIT_TARGETS[gate], targetWidth: Math.max(.19, state.targetWidth - .025), speed: state.speed + .22, message: `Gate ${gate} locked. The next orbit is faster and tighter.` };
}

export function markWordGuess(guessValue: string, targetValue: string): WordMark[] {
  const guess = guessValue.toUpperCase(); const target = targetValue.toUpperCase();
  const marks: WordMark[] = Array(guess.length).fill('absent'); const remaining = [...target];
  for (let index = 0; index < guess.length; index += 1) if (guess[index] === target[index]) { marks[index] = 'correct'; remaining[index] = ''; }
  for (let index = 0; index < guess.length; index += 1) {
    if (marks[index] === 'correct') continue; const found = remaining.indexOf(guess[index]);
    if (found >= 0) { marks[index] = 'present'; remaining[found] = ''; }
  }
  return marks;
}

function inputWordLetter(state: WordState, letter: string): WordState {
  if (state.status !== 'playing') return state;
  const clean = letter.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
  if (!clean || state.current.length >= 5) return state;
  return { ...state, current: state.current + clean, message: 'Build a five-letter guess, then press ENTER.' };
}

function submitWord(state: WordState): WordState {
  if (state.status !== 'playing') return state;
  if (state.current.length !== 5) return { ...state, message: 'The rune lock needs exactly five letters.' };
  const guess: WordGuess = { word: state.current, marks: markWordGuess(state.current, state.target) };
  const guesses = [...state.guesses, guess]; const won = state.current === state.target; const failed = !won && guesses.length >= state.maxGuesses;
  return {
    ...state, current: '', guesses, score: won ? Math.max(100, 700 - guesses.length * 100) : state.score,
    status: won ? 'complete' : failed ? 'failed' : 'playing',
    message: won ? `${state.target} unlocked the rune door!` : failed ? `The hidden word was ${state.target}. Reset to try again.` : `${state.maxGuesses - guesses.length} guesses remain. Use every color clue.`,
  };
}

function toggleConnection(state: ConnectionsState, word: string): ConnectionsState {
  if (state.status !== 'playing' || !state.words.includes(word)) return state;
  const selected = state.selected.includes(word) ? state.selected.filter((item) => item !== word) : state.selected.length < 4 ? [...state.selected, word] : state.selected;
  return { ...state, selected, message: selected.length === 4 ? 'Four relics selected. Submit the group when ready.' : `Select ${4 - selected.length} more related ${4 - selected.length === 1 ? 'relic' : 'relics'}.` };
}

function submitConnection(state: ConnectionsState): ConnectionsState {
  if (state.status !== 'playing') return state;
  if (state.selected.length !== 4) return { ...state, message: 'Select exactly four relics before submitting.' };
  const selectedSet = new Set(state.selected);
  const group = state.groups.find((candidate) => !state.solved.includes(candidate.name) && candidate.words.every((word) => selectedSet.has(word)));
  if (group) {
    const solved = [...state.solved, group.name]; const words = state.words.filter((word) => !selectedSet.has(word)); const complete = solved.length === state.groups.length;
    return { ...state, solved, words, selected: [], score: solved.length * 250, status: complete ? 'complete' : 'playing', message: complete ? 'All four relic connections restored. The archive door is open!' : `${group.name} connected. ${state.groups.length - solved.length} groups remain.` };
  }
  const almost = state.groups.some((candidate) => !state.solved.includes(candidate.name) && candidate.words.filter((word) => selectedSet.has(word)).length === 3);
  const mistakes = state.mistakes + 1; const failed = mistakes >= state.maxMistakes;
  return { ...state, mistakes, selected: [], status: failed ? 'failed' : 'playing', message: failed ? 'Four false links sealed the archive. Reset to try again.' : almost ? `One relic away. ${state.maxMistakes - mistakes} mistakes remain.` : `That group does not connect. ${state.maxMistakes - mistakes} mistakes remain.` };
}

function shuffleConnections(state: ConnectionsState): ConnectionsState {
  if (state.status !== 'playing') return state;
  const words = state.words.length ? [...state.words.slice(3), ...state.words.slice(0, 3)] : state.words;
  return { ...state, words, selected: [], message: 'The remaining relics have been rearranged.' };
}

export function updateClassicLab(state: ClassicLabState, action: ClassicLabAction): ClassicLabState {
  if (action.type === 'tick') {
    if (state.id === 3) return tickRelic(state, action.ms);
    if (state.id === 4) return tickStack(state, action.ms);
    if (state.id === 5) return tickRiver(state, action.ms);
    if (state.id === 6) return tickCoil(state, action.ms);
    if (state.id === 7) return tickPrism(state, action.ms);
    if (state.id === 12) return tickEcho(state, action.ms);
    if (state.id === 14) return tickOrbit(state, action.ms);
    return state.status === 'playing' ? { ...state, elapsedMs: state.elapsedMs + action.ms } : state;
  }
  if (action.type === 'move') {
    if (state.id === 3) return moveRelic(state, action.direction);
    if (state.id === 4) return moveStack(state, action.direction);
    if (state.id === 5) return moveRiver(state, action.direction);
    if (state.id === 6) return steerCoil(state, action.direction);
    if (state.id === 7) return movePrism(state, action.direction);
    if (state.id === 8) return moveMerge(state, action.direction);
    if (state.id === 10) return moveIce(state, action.direction);
    if (state.id === 11) return moveCrate(state, action.direction);
    return state;
  }
  if (action.type === 'rotate' && state.id === 4) return rotateStack(state);
  if (action.type === 'hard-drop' && state.id === 4) return hardDropStack(state);
  if (action.type === 'activate' && state.id === 9) return activateLantern(state, action.index);
  if (action.type === 'activate' && state.id === 12) return activateEcho(state, action.index);
  if (action.type === 'activate' && state.id === 13) return activateGear(state, action.index);
  if (action.type === 'activate' && state.id === 14) return activateOrbit(state);
  if (action.type === 'letter' && state.id === 15) return inputWordLetter(state, action.letter);
  if (action.type === 'backspace' && state.id === 15) return { ...state, current: state.current.slice(0, -1), message: 'Last letter removed.' };
  if (action.type === 'submit-word' && state.id === 15) return submitWord(state);
  if (action.type === 'toggle-connection' && state.id === 16) return toggleConnection(state, action.word);
  if (action.type === 'submit-connection' && state.id === 16) return submitConnection(state);
  if (action.type === 'shuffle-connection' && state.id === 16) return shuffleConnections(state);
  return state;
}

export function classicLabSnapshot(state: ClassicLabState) {
  const base = {
    mode: 'puzzle-lab', puzzle: `classic-lab-${String(state.id).padStart(2, '0')}`,
    status: state.status, elapsedMs: Math.round(state.elapsedMs), score: state.score, message: state.message,
  };
  if (state.id === 3) return { ...base, coordinateSystem: '13x15 maze; origin top-left; x right; y down', objective: `Collect all ${state.target} sparks and reach exit`, player: state.player, enemies: state.enemies, visibleSparks: state.pellets, collected: state.score, target: state.target, lives: state.lives, exit: state.exit, portalOpen: state.pellets.length === 0 };
  if (state.id === 4) return { ...base, coordinateSystem: '10x18 stack grid; origin top-left; x right; y down', objective: 'Survive 75 seconds or clear 50 lines', board: state.board, active: state.active, remainingMs: state.remainingMs, lines: state.lines, lineTarget: 50, pieces: state.pieces };
  if (state.id === 5) return { ...base, coordinateSystem: '9x11 crossing grid; origin at far-left gate; x right; y toward explorer', objective: 'Reach row 0', player: state.player, movers: state.movers.map(({ id, row, x, width, kind }) => ({ id, row, x: Number(x.toFixed(2)), width, kind })), lives: state.lives, hops: state.hops };
  if (state.id === 6) return { ...base, coordinateSystem: '15x16 trail grid; origin top-left; x right; y down', objective: `Collect ${state.target} signal orbs while avoiding obstacles`, explorer: state.trail[0], direction: state.direction, pendingDirection: state.pendingDirection, trail: state.trail, obstacles: state.obstacles, orb: state.orb, collected: state.score, target: state.target };
  if (state.id === 7) return { ...base, coordinateSystem: '390x844 canvas pixels; origin top-left; x right; y down', objective: 'Break all prism seals', paddleX: Math.round(state.paddleX), ball: { x: Math.round(state.ball.x), y: Math.round(state.ball.y), vx: Math.round(state.ball.vx), vy: Math.round(state.ball.vy) }, seals: state.seals, lives: state.lives, combo: state.combo };
  if (state.id === 8) return { ...base, coordinateSystem: '4x4 merge grid; origin top-left; x right; y down', objective: 'Forge one six-stack symbol', stackBoard: state.board.map((row) => row.map((value) => value ? Math.log2(value) : 0)), moves: state.moves, highestStack: Math.log2(state.highest) };
  if (state.id === 9) return { ...base, coordinateSystem: '5x5 light grid; index=y*5+x; origin top-left', objective: 'Turn all 25 lanterns on; activating a tile toggles itself and its direct neighbors', lights: state.lights, lit: state.lit, moves: state.moves, dark: 25 - state.lit };
  if (state.id === 10) return { ...base, coordinateSystem: '9x11 ice grid; origin top-left; x right; y down', objective: 'Collect four frost sigils and stop on the north gate', map: ICE_MAP, player: state.player, sigils: state.sigils, collected: state.collected, moves: state.moves, exit: state.exit };
  if (state.id === 11) return { ...base, coordinateSystem: '8x8 crate grid; origin top-left; x right; y down', objective: 'Push all three crates onto circuit goals', map: CRATE_MAP, player: state.player, crates: state.crates, goals: state.goals, pushes: state.pushes, moves: state.moves };
  if (state.id === 12) return { ...base, coordinateSystem: 'four pads indexed 0 top, 1 right, 2 bottom, 3 left', objective: 'Repeat three sequences of lengths 4, 6, and 8', round: state.round + 1, sequenceLength: echoRoundLength(state.round), activePad: state.pressedMs > 0 ? state.pressedPad : state.acceptingInput ? null : state.sequence[Math.min(state.revealIndex, echoRoundLength(state.round) - 1)], pressedPad: state.pressedMs > 0 ? state.pressedPad : null, acceptingInput: state.acceptingInput, inputIndex: state.inputIndex, strikes: state.strikes };
  if (state.id === 13) return { ...base, coordinateSystem: '4x4 gear grid; index=y*4+x; origin top-left', objective: 'Rotate all sixteen links to their target orientations', rotations: state.rotations, target: state.target, aligned: state.aligned, moves: state.moves };
  if (state.id === 14) return { ...base, coordinateSystem: 'circular orbit in radians; zero points right; angles increase clockwise', objective: 'Pulse inside six target windows before three misses', angle: Number(state.angle.toFixed(3)), targetAngle: state.targetAngle, targetWidth: state.targetWidth, gate: state.gate, misses: state.misses, speed: state.speed };
  if (state.id === 15) return { ...base, coordinateSystem: 'six rows of five letters', objective: 'Deduce the hidden five-letter word in six guesses', current: state.current, guesses: state.guesses, guessesRemaining: state.maxGuesses - state.guesses.length };
  return { ...base, coordinateSystem: 'sixteen word tiles; choose groups of four', objective: 'Find four hidden groups before four mistakes', words: state.words, selected: state.selected, solved: state.solved, mistakes: state.mistakes, mistakesRemaining: state.maxMistakes - state.mistakes };
}
