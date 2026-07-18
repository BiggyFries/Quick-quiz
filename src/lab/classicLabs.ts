export type ClassicLabId = 3 | 4 | 5 | 6 | 7 | 8 | 9;
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
  { id: 3, title: 'Relic Run', shortTitle: 'Maze chase', inspiration: 'Inspired by Pac-Man', objective: 'Collect 14 sun sparks, evade the temple shades, then reach the portal.', controlHint: 'Move the explorer', accent: '#f6c85f', icon: '☀' },
  { id: 4, title: 'Sky Stack', shortTitle: 'Falling blocks', inspiration: 'Inspired by Tetris', objective: 'Use the explorer’s remote to keep the airlock clear for 60 seconds.', controlHint: 'Move, rotate and drop', accent: '#66d6cb', icon: '▦' },
  { id: 5, title: 'River Relay', shortTitle: 'Crossing lanes', inspiration: 'Inspired by Frogger', objective: 'Guide the explorer over beetle roads and floating ruins to the far gate.', controlHint: 'Hop one space', accent: '#72d08f', icon: '≋' },
  { id: 6, title: 'Trail Coil', shortTitle: 'Growing trail', inspiration: 'Inspired by Snake', objective: 'Collect eight signal orbs without crossing the explorer’s light trail.', controlHint: 'Steer the explorer', accent: '#e8a95b', icon: '◇' },
  { id: 7, title: 'Prism Break', shortTitle: 'Ricochet puzzle', inspiration: 'Inspired by Breakout', objective: 'Aim the remote-guided light bar and shatter every suspended seal.', controlHint: 'Slide the light bar', accent: '#e97f78', icon: '◆' },
  { id: 8, title: 'Rune Merge', shortTitle: 'Number merge', inspiration: 'Inspired by 2048', objective: 'Shift matching runes together until the explorer forges a level-64 rune.', controlHint: 'Shift the rune board', accent: '#ba91ec', icon: '✦' },
  { id: 9, title: 'Lantern Grid', shortTitle: 'Light-toggle logic', inspiration: 'Inspired by Lights Out', objective: 'Tap a rune to flip it and its neighbors. Light all 25 lanterns.', controlHint: 'Tap rune tiles', accent: '#70b9e8', icon: '✺' },
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

export type ClassicLabState = RelicState | StackState | RiverState | CoilState | PrismState | MergeState | LanternState;

export type ClassicLabAction =
  | { type: 'move'; direction: ClassicDirection }
  | { type: 'tick'; ms: number }
  | { type: 'rotate' }
  | { type: 'hard-drop' }
  | { type: 'activate'; index: number };

const pointKey = ({ x, y }: Point) => `${x},${y}`;
const pointEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const directionDelta: Record<ClassicDirection, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

function initialRelicState(): RelicState {
  const pellets: string[] = [];
  RELIC_MAP.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === '.' && !(x === 11 && y === 1)) pellets.push(pointKey({ x, y })); }));
  return {
    id: 3, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Gather 14 sun sparks. The portal opens when it has enough light.',
    player: { x: 1, y: 13 }, enemies: [{ id: 0, x: 6, y: 7 }, { id: 1, x: 7, y: 7 }],
    pellets, lives: 3, enemyClock: 0, target: 14, exit: { x: 11, y: 1 },
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
    fallClock: 0, lines: 0, pieces: 0, remainingMs: 60000,
  };
}

function initialRiverState(): RiverState {
  const specs: Array<[number, number, number, number, RiverMover['kind']]> = [
    [9, 1, 1.1, 1.4, 'beetle'], [9, 6, 1.1, 1.4, 'beetle'],
    [8, 3, -1.35, 1.6, 'beetle'], [8, 8, -1.35, 1.6, 'beetle'],
    [7, 0, 1.65, 1.25, 'beetle'], [7, 4, 1.65, 1.25, 'beetle'], [7, 8, 1.65, 1.25, 'beetle'],
    [6, 2, -1.05, 2.1, 'beetle'], [6, 8, -1.05, 2.1, 'beetle'],
    [4, 1, .78, 2.5, 'raft'], [4, 6, .78, 2.5, 'raft'],
    [3, 3, -.92, 3, 'raft'], [3, 9, -.92, 3, 'raft'],
    [2, 0, 1.08, 2.2, 'raft'], [2, 5, 1.08, 2.2, 'raft'],
    [1, 2, -.7, 3.2, 'raft'], [1, 8, -.7, 3.2, 'raft'],
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

function initialCoilState(): CoilState {
  return {
    id: 6, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Follow the signal orbs. Never cross your own glowing trail.',
    trail: [{ x: 7, y: 13 }, { x: 7, y: 14 }, { x: 7, y: 15 }], direction: 'up', pendingDirection: 'up',
    orb: { ...ORB_SEQUENCE[0] }, moveClock: 0, target: 8,
  };
}

function initialPrismState(): PrismState {
  const colors = [1, 2, 3, 4, 5];
  const seals: Seal[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) seals.push({ id: row * 6 + col, x: 50 + col * 58, y: 190 + row * 32, color: colors[(row + col) % colors.length] });
  }
  return {
    id: 7, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Keep the prism in flight. Slide the light bar beneath it.',
    paddleX: 195, ball: { x: 195, y: 500, vx: 118, vy: -172 }, seals, lives: 3, combo: 0,
  };
}

function initialMergeState(): MergeState {
  const board = Array.from({ length: 4 }, () => Array<number>(4).fill(0));
  board[1][1] = 2; board[2][2] = 2;
  return {
    id: 8, status: 'playing', elapsedMs: 0, score: 0,
    message: 'Matching runes fuse when they collide. Forge a level-64 rune.',
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
  for (const index of [0, 6, 18, 24]) lights = toggleLanterns(lights, index);
  return {
    id: 9, status: 'playing', elapsedMs: 0, score: 0,
    message: 'The remote is linked. Each rune flips itself and its four direct neighbors.',
    lights, moves: 0, lit: lights.filter(Boolean).length,
  };
}

export function initialClassicLabState(id: ClassicLabId): ClassicLabState {
  if (id === 3) return initialRelicState();
  if (id === 4) return initialStackState();
  if (id === 5) return initialRiverState();
  if (id === 6) return initialCoilState();
  if (id === 7) return initialPrismState();
  if (id === 8) return initialMergeState();
  return initialLanternState();
}

function relicWalkable(point: Point) {
  return point.y >= 0 && point.y < RELIC_MAP.length && point.x >= 0 && point.x < RELIC_MAP[0].length && RELIC_MAP[point.y][point.x] !== '#';
}

function loseRelicLife(state: RelicState): RelicState {
  const lives = state.lives - 1;
  return {
    ...state, lives, player: { x: 1, y: 13 }, enemies: [{ id: 0, x: 6, y: 7 }, { id: 1, x: 7, y: 7 }],
    status: lives <= 0 ? 'failed' : 'playing',
    message: lives <= 0 ? 'The temple shades caught the explorer. Reset the lab to try again.' : `A shade found you. ${lives} lantern ${lives === 1 ? 'charge' : 'charges'} remain.`,
  };
}

function moveRelic(state: RelicState, direction: ClassicDirection): RelicState {
  if (state.status !== 'playing') return state;
  const delta = directionDelta[direction];
  const player = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!relicWalkable(player)) return { ...state, message: 'A carved wall blocks that route.' };
  if (pointEqual(player, state.exit) && state.score < state.target) return { ...state, message: `${state.target - state.score} more sun sparks are needed to open the portal.` };
  if (state.enemies.some((enemy) => pointEqual(enemy, player))) return loseRelicLife(state);
  const key = pointKey(player);
  const collected = state.pellets.includes(key);
  const pellets = collected ? state.pellets.filter((pellet) => pellet !== key) : state.pellets;
  const score = state.score + (collected ? 1 : 0);
  const complete = pointEqual(player, state.exit) && score >= state.target;
  return {
    ...state, player, pellets, score, status: complete ? 'complete' : 'playing',
    message: complete ? 'Portal unlocked. Relic Run is clear.' : score >= state.target ? 'The portal is open. Reach the glowing gate!' : collected ? `Sun spark secured. ${state.target - score} remain.` : 'Keep moving—the shades are closing in.',
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
  while (next.enemyClock >= 620 && steps < 12) {
    next.enemyClock -= 620;
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
  return {
    ...state, board: result.board, active, pieces: state.pieces + 1, lines: state.lines + result.cleared,
    score: state.score + 10 + result.cleared * 100, status: failed ? 'failed' : state.status,
    message: failed ? 'Cargo reached the warning line. Reset the airlock and try again.' : result.cleared ? `${result.cleared} cargo line ${result.cleared === 1 ? 'cleared' : 'cleared'}!` : 'Cargo locked. The next shape is incoming.',
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
  const elapsedMs = Math.min(60000, state.elapsedMs + ms);
  if (elapsedMs >= 60000) return { ...state, elapsedMs, remainingMs: 0, status: 'complete', score: state.score + 600, message: 'Sixty seconds survived. The airlock portal is open!' };
  let next = { ...state, elapsedMs, remainingMs: 60000 - elapsedMs, fallClock: state.fallClock + ms };
  let steps = 0;
  const interval = Math.max(180, 820 - Math.floor(elapsedMs / 10000) * 105);
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
  if (head.x < 0 || head.x >= 15 || head.y < 0 || head.y >= 16 || state.trail.slice(0, -1).some((point) => pointEqual(point, head))) {
    return { ...state, direction, status: 'failed', message: 'The explorer crossed the trail field. Reset to chart a new route.' };
  }
  const collected = pointEqual(head, state.orb);
  const score = state.score + (collected ? 1 : 0);
  const trail = [head, ...state.trail];
  if (!collected) trail.pop();
  const complete = score >= state.target;
  return {
    ...state, trail, direction, score, status: complete ? 'complete' : 'playing',
    orb: complete ? state.orb : { ...ORB_SEQUENCE[score % ORB_SEQUENCE.length] },
    message: complete ? 'Eight signals linked. Trail Coil is clear!' : collected ? `Signal linked. ${state.target - score} remain.` : 'The light trail is growing behind you.',
  };
}

function tickCoil(state: CoilState, ms: number): CoilState {
  if (state.status !== 'playing') return state;
  let next = { ...state, elapsedMs: state.elapsedMs + ms, moveClock: state.moveClock + ms };
  let steps = 0;
  const interval = Math.max(105, 260 - state.score * 14);
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
      ball = { x: next.paddleX, y: 500, vx: next.lives % 2 ? 118 : -118, vy: -172 };
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
    message: complete ? 'Level-64 rune forged. Rune Merge is clear!' : failed ? 'The rune board is locked. Reset and try a new merge path.' : gain ? `Runes fused for ${gain} energy.` : 'Rune board shifted.',
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

export function updateClassicLab(state: ClassicLabState, action: ClassicLabAction): ClassicLabState {
  if (action.type === 'tick') {
    if (state.id === 3) return tickRelic(state, action.ms);
    if (state.id === 4) return tickStack(state, action.ms);
    if (state.id === 5) return tickRiver(state, action.ms);
    if (state.id === 6) return tickCoil(state, action.ms);
    if (state.id === 7) return tickPrism(state, action.ms);
    return state.status === 'playing' ? { ...state, elapsedMs: state.elapsedMs + action.ms } : state;
  }
  if (action.type === 'move') {
    if (state.id === 3) return moveRelic(state, action.direction);
    if (state.id === 4) return moveStack(state, action.direction);
    if (state.id === 5) return moveRiver(state, action.direction);
    if (state.id === 6) return steerCoil(state, action.direction);
    if (state.id === 7) return movePrism(state, action.direction);
    if (state.id === 8) return moveMerge(state, action.direction);
    return state;
  }
  if (action.type === 'rotate' && state.id === 4) return rotateStack(state);
  if (action.type === 'hard-drop' && state.id === 4) return hardDropStack(state);
  if (action.type === 'activate' && state.id === 9) return activateLantern(state, action.index);
  return state;
}

export function classicLabSnapshot(state: ClassicLabState) {
  const base = {
    mode: 'puzzle-lab', puzzle: `classic-lab-${String(state.id).padStart(2, '0')}`,
    status: state.status, elapsedMs: Math.round(state.elapsedMs), score: state.score, message: state.message,
  };
  if (state.id === 3) return { ...base, coordinateSystem: '13x15 maze; origin top-left; x right; y down', objective: `Collect ${state.target} sparks and reach exit`, player: state.player, enemies: state.enemies, visibleSparks: state.pellets, collected: state.score, target: state.target, lives: state.lives, exit: state.exit, portalOpen: state.score >= state.target };
  if (state.id === 4) return { ...base, coordinateSystem: '10x18 stack grid; origin top-left; x right; y down', objective: 'Survive 60 seconds', board: state.board, active: state.active, remainingMs: state.remainingMs, lines: state.lines, pieces: state.pieces };
  if (state.id === 5) return { ...base, coordinateSystem: '9x11 crossing grid; origin at far-left gate; x right; y toward explorer', objective: 'Reach row 0', player: state.player, movers: state.movers.map(({ id, row, x, width, kind }) => ({ id, row, x: Number(x.toFixed(2)), width, kind })), lives: state.lives, hops: state.hops };
  if (state.id === 6) return { ...base, coordinateSystem: '15x16 trail grid; origin top-left; x right; y down', objective: `Collect ${state.target} signal orbs`, explorer: state.trail[0], direction: state.direction, pendingDirection: state.pendingDirection, trail: state.trail, orb: state.orb, collected: state.score, target: state.target };
  if (state.id === 7) return { ...base, coordinateSystem: '390x844 canvas pixels; origin top-left; x right; y down', objective: 'Break all prism seals', paddleX: Math.round(state.paddleX), ball: { x: Math.round(state.ball.x), y: Math.round(state.ball.y), vx: Math.round(state.ball.vx), vy: Math.round(state.ball.vy) }, seals: state.seals, lives: state.lives, combo: state.combo };
  if (state.id === 8) return { ...base, coordinateSystem: '4x4 merge grid; origin top-left; x right; y down', objective: 'Forge a level-64 rune', board: state.board, moves: state.moves, highest: state.highest };
  return { ...base, coordinateSystem: '5x5 light grid; index=y*5+x; origin top-left', objective: 'Turn all 25 lanterns on; activating a tile toggles itself and its direct neighbors', lights: state.lights, lit: state.lit, moves: state.moves, dark: 25 - state.lit };
}
