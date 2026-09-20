export type MotionLabId = 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26;
export type MotionLabStatus = 'playing' | 'complete' | 'failed';

export interface MotionLabDefinition {
  id: MotionLabId;
  title: string;
  shortTitle: string;
  inspiration: string;
  objective: string;
  controlHint: string;
  accent: string;
  icon: string;
  perspective: 'remote-board' | 'world-board';
}

export const MOTION_LABS: MotionLabDefinition[] = [
  { id: 17, title: 'Prism Survey', shortTitle: 'Ray deduction', inspiration: 'Open-source ray-box logic study', objective: 'Use the five edge scans to mark the three hidden prism stones.', controlHint: 'Tap three cells, then submit', accent: '#73d7e6', icon: '⌁', perspective: 'remote-board' },
  { id: 18, title: 'Bridge Forge', shortTitle: 'Network building', inspiration: 'Open-source island-network logic study', objective: 'Give every island two links while keeping one connected bridge network.', controlHint: 'Tap a bridge route to cycle its span', accent: '#efb65f', icon: '⌇', perspective: 'world-board' },
  { id: 19, title: 'Floodwell', shortTitle: 'Color flooding', inspiration: 'Open-source flood-fill logic study', objective: 'Flood the complete basin from the northwest spring in six color changes or fewer.', controlHint: 'Choose the next water color', accent: '#6bd4b1', icon: '≈', perspective: 'remote-board' },
  { id: 20, title: 'Starfold', shortTitle: 'Symmetry regions', inspiration: 'Open-source rotational-region logic study', objective: 'Assign every tile to a star so each colored region has rotational symmetry.', controlHint: 'Tap cells to cycle star colors', accent: '#d59bea', icon: '✧', perspective: 'remote-board' },
  { id: 21, title: 'Peg Vault', shortTitle: 'Momentum jumps', inspiration: 'Open-source peg-jump logic study', objective: 'Jump one relic over another into an empty socket until only one relic remains.', controlHint: 'Tap a relic, then its landing socket', accent: '#ee8e6d', icon: '●', perspective: 'world-board' },
  { id: 22, title: 'Domino Seal', shortTitle: 'Adjacent pairing', inspiration: 'Open-source domino-tiling logic study', objective: 'Pair every matching adjacent rune exactly once to seal the twelve-tile floor.', controlHint: 'Tap two neighboring matching tiles', accent: '#e0b06c', icon: '▤', perspective: 'remote-board' },
  { id: 23, title: 'Rune Ascent', shortTitle: 'Inequality towers', inspiration: 'Open-source inequality-Latin logic study', objective: 'Set tower heights 1–4 so every row and column is unique and every inequality points uphill.', controlHint: 'Tap a tower tile to raise its height', accent: '#83cfa4', icon: '⌃', perspective: 'world-board' },
  { id: 24, title: 'Signal Path', shortTitle: 'Arrow tracing', inspiration: 'Open-source directed-path logic study', objective: 'Trace the twelve relay tiles in the only order allowed by their etched arrows.', controlHint: 'Tap the next tile in the route', accent: '#6abfe5', icon: '➜', perspective: 'remote-board' },
  { id: 25, title: 'Magnet Chamber', shortTitle: 'Polarity placement', inspiration: 'Open-source magnet-placement logic study', objective: 'Flip the eight capsules so every row balances and touching poles are opposite.', controlHint: 'Tap a capsule to reverse its poles', accent: '#ef7f86', icon: '±', perspective: 'world-board' },
  { id: 26, title: 'Circuit Untangle', shortTitle: 'Crossing removal', inspiration: 'Open-source graph-untangling logic study', objective: 'Swap pairs of signal nodes until no energy cable crosses another cable.', controlHint: 'Tap two nodes to swap their sockets', accent: '#b393ec', icon: '⌬', perspective: 'remote-board' },
];

interface MotionBase {
  status: MotionLabStatus;
  elapsedMs: number;
  moves: number;
  score: number;
  message: string;
  lastIndex: number | null;
  pulseMs: number;
}

export interface BeamState extends MotionBase {
  id: 17;
  selected: number[];
  strikes: number;
  rayDistance: number;
  activeRay: number;
}

export interface BridgeEdge { a: number; b: number }
export interface BridgeState extends MotionBase {
  id: 18;
  links: number[];
  spring: number[];
  velocity: number[];
}

export interface FloodState extends MotionBase {
  id: 19;
  board: number[][];
  currentColor: number;
  waveRadius: number;
}

export interface StarState extends MotionBase {
  id: 20;
  assignments: number[];
  orbitAngle: number;
}

export interface PegHole { row: number; column: number }
export interface PegJump { from: number; over: number; to: number; elapsedMs: number; durationMs: number }
export interface PegState extends MotionBase {
  id: 21;
  pegs: boolean[];
  selected: number | null;
  jump: PegJump | null;
}

export interface DominoState extends MotionBase {
  id: 22;
  selected: number | null;
  pairs: Array<[number, number]>;
  board: number[];
  deployMs: number;
}

export interface InequalityState extends MotionBase {
  id: 23;
  values: number[];
}

export interface SignalState extends MotionBase {
  id: 24;
  progress: number;
  strikes: number;
  signalTravel: number;
}

export interface MagnetState extends MotionBase {
  id: 25;
  orientations: number[];
  angles: number[];
  angularVelocity: number[];
}

export interface UntangleState extends MotionBase {
  id: 26;
  nodeAtSlots: number[];
  selected: number | null;
  displayX: number[];
  displayY: number[];
  velocityX: number[];
  velocityY: number[];
  crossings: number;
}

export type MotionLabState = BeamState | BridgeState | FloodState | StarState | PegState | DominoState | InequalityState | SignalState | MagnetState | UntangleState;
export type MotionLabAction =
  | { type: 'tick'; ms: number }
  | { type: 'activate'; index: number }
  | { type: 'submit' };

export const BEAM_TARGET = [6, 8, 17];
export const BEAM_CLUES = ['N2 bends east', 'W4 returns west', 'E2 strikes stone', 'S3 bends west', 'N4 strikes stone'];

export const BRIDGE_ISLANDS = [
  { x: 0, y: 0, target: 2 }, { x: 3, y: 0, target: 2 }, { x: 3, y: 3, target: 2 }, { x: 0, y: 3, target: 2 },
];
export const BRIDGE_EDGES: BridgeEdge[] = [
  { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 }, { a: 0, b: 2 }, { a: 1, b: 3 },
];
export const BRIDGE_TARGET = [1, 1, 1, 1, 0, 0];

export const FLOOD_START = [
  [0, 1, 2, 2],
  [0, 1, 1, 2],
  [3, 3, 1, 2],
  [3, 0, 0, 2],
];
export const FLOOD_SOLUTION = [1, 3, 0, 2];

export const STAR_TARGET = [
  0, 0, 1, 1,
  0, 0, 1, 1,
  2, 2, 3, 3,
  2, 2, 3, 3,
];
const STAR_CLUES = new Set([0, 5, 2, 7, 8, 13, 10, 15]);

export const PEG_HOLES: PegHole[] = Array.from({ length: 5 }, (_, row) => Array.from({ length: row + 1 }, (_, column) => ({ row, column }))).flat();
export const PEG_SOLUTION: Array<[number, number]> = [[3, 0], [5, 3], [0, 5], [6, 1], [9, 2], [11, 4], [12, 5], [1, 8], [2, 9], [14, 5], [5, 12], [13, 11], [10, 12]];

export const DOMINO_BOARD = [0, 0, 1, 2, 3, 4, 1, 2, 3, 4, 5, 5];
export const DOMINO_SOLUTION: Array<[number, number]> = [[0, 1], [2, 6], [3, 7], [4, 8], [5, 9], [10, 11]];

export const INEQUALITY_TARGET = [
  1, 2, 3, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1,
];
const INEQUALITY_CLUES = new Set([0, 3, 5, 6, 9, 10, 12, 15]);

export const SIGNAL_PATH = [0, 1, 5, 9, 10, 14, 15, 11, 7, 6, 2, 3];

export const MAGNET_TARGET = [0, 1, 1, 0, 1, 0, 0, 1];

export const UNTANGLE_START = [0, 2, 4, 1, 3, 5];
export const UNTANGLE_SOLUTION: Array<[number, number]> = [[1, 3], [2, 3], [3, 4]];
export const UNTANGLE_EDGES: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];

function base(message: string): MotionBase {
  return { status: 'playing', elapsedMs: 0, moves: 0, score: 0, message, lastIndex: null, pulseMs: 0 };
}

function untangleSlot(index: number) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function orientation(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function countUntangleCrossings(nodeAtSlots: number[]) {
  const slotByNode = Array(6).fill(0); nodeAtSlots.forEach((node, slot) => { slotByNode[node] = slot; });
  let crossings = 0;
  for (let first = 0; first < UNTANGLE_EDGES.length; first += 1) for (let second = first + 1; second < UNTANGLE_EDGES.length; second += 1) {
    const [aNode, bNode] = UNTANGLE_EDGES[first]; const [cNode, dNode] = UNTANGLE_EDGES[second];
    if (aNode === cNode || aNode === dNode || bNode === cNode || bNode === dNode) continue;
    const a = untangleSlot(slotByNode[aNode]); const b = untangleSlot(slotByNode[bNode]); const c = untangleSlot(slotByNode[cNode]); const d = untangleSlot(slotByNode[dNode]);
    if (orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0) crossings += 1;
  }
  return crossings;
}

export function initialMotionLabState(id: MotionLabId): MotionLabState {
  if (id === 17) return { ...base('Five calibrated edge scans are etched around the chamber. Mark exactly three prism stones.'), id, selected: [], strikes: 0, rayDistance: 0, activeRay: 0 };
  if (id === 18) return { ...base('Each island requires two total bridge links. Diagonal routes cross and should remain empty.'), id, links: [0, 0, 0, 0, 0, 0], spring: [0, 0, 0, 0, 0, 0], velocity: [0, 0, 0, 0, 0, 0] };
  if (id === 19) return { ...base('The northwest spring controls every connected tile of its current color.'), id, board: FLOOD_START.map((row) => [...row]), currentColor: 0, waveRadius: 0 };
  if (id === 20) return { ...base('Clue tiles are fixed. Cycle the blank tiles until four symmetric star regions emerge.'), id, assignments: STAR_TARGET.map((value, index) => STAR_CLUES.has(index) ? value : -1), orbitAngle: 0 };
  if (id === 21) return { ...base('The top socket begins empty. Every legal jump removes the relic that was crossed.'), id, pegs: PEG_HOLES.map((_, index) => index !== 0), selected: null, jump: null };
  if (id === 22) return { ...base('Each rune appears exactly twice. Pair matching neighbors without reusing a floor tile.'), id, selected: null, pairs: [], board: [...DOMINO_BOARD], deployMs: 0 };
  if (id === 23) return { ...base('Half the towers are fixed clues. Raise the blank towers until every etched comparison is true.'), id, values: INEQUALITY_TARGET.map((value, index) => INEQUALITY_CLUES.has(index) ? value : 0) };
  if (id === 24) return { ...base('Begin at the pulsing northwest relay, then follow each arrow to the next tile.'), id, progress: 0, strikes: 0, signalTravel: 0 };
  if (id === 25) return { ...base('Every capsule begins reversed. Flip polarity until the chamber reaches its balanced field.'), id, orientations: MAGNET_TARGET.map((value) => 1 - value), angles: MAGNET_TARGET.map((value) => (1 - value) * Math.PI), angularVelocity: Array(8).fill(0) };
  const slots = UNTANGLE_START.map((_, index) => untangleSlot(index));
  return { ...base('Six signal nodes are wired in a loop, but the cable order is tangled. Swap two sockets at a time.'), id, nodeAtSlots: [...UNTANGLE_START], selected: null, displayX: slots.map((slot) => slot.x), displayY: slots.map((slot) => slot.y), velocityX: Array(6).fill(0), velocityY: Array(6).fill(0), crossings: countUntangleCrossings(UNTANGLE_START) };
}

function sameNumbers(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function tickBridge(state: BridgeState, ms: number): BridgeState {
  const spring = [...state.spring]; const velocity = [...state.velocity];
  let remaining = Math.max(0, ms);
  while (remaining > 0) {
    const stepMs = Math.min(16, remaining); const dt = stepMs / 1000; remaining -= stepMs;
    for (let index = 0; index < spring.length; index += 1) {
      const force = (state.links[index] - spring[index]) * 42 - velocity[index] * 10;
      velocity[index] += force * dt;
      spring[index] += velocity[index] * dt;
    }
  }
  return { ...state, elapsedMs: state.elapsedMs + ms, pulseMs: Math.max(0, state.pulseMs - ms), spring, velocity };
}

function floodRegion(board: number[][], fromColor: number, nextColor: number) {
  const result = board.map((row) => [...row]);
  const queue = [{ x: 0, y: 0 }]; const visited = new Set<string>();
  while (queue.length) {
    const point = queue.shift()!; const key = `${point.x},${point.y}`;
    if (visited.has(key) || point.x < 0 || point.y < 0 || point.y >= result.length || point.x >= result[0].length || result[point.y][point.x] !== fromColor) continue;
    visited.add(key); result[point.y][point.x] = nextColor;
    queue.push({ x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y }, { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 });
  }
  return result;
}

function activateBeam(state: BeamState, index: number): BeamState {
  if (index < 0 || index >= 25 || state.status !== 'playing') return state;
  const selected = state.selected.includes(index) ? state.selected.filter((item) => item !== index) : state.selected.length < 3 ? [...state.selected, index].sort((a, b) => a - b) : state.selected;
  return { ...state, selected, moves: state.moves + 1, lastIndex: index, pulseMs: 420, rayDistance: 0, activeRay: (state.activeRay + 1) % BEAM_CLUES.length, message: selected.length === 3 ? 'Three locations marked. Submit the survey when ready.' : `${selected.length}/3 prism locations marked.` };
}

function submitBeam(state: BeamState): BeamState {
  if (state.status !== 'playing' || state.selected.length !== 3) return { ...state, message: 'Mark exactly three prism locations before submitting.' };
  if (sameNumbers(state.selected, BEAM_TARGET)) return { ...state, status: 'complete', score: 300 - state.strikes * 50, pulseMs: 800, message: 'All three hidden prisms resolved. The survey gate is stable.' };
  const strikes = state.strikes + 1;
  return { ...state, selected: [], strikes, status: strikes >= 3 ? 'failed' : 'playing', pulseMs: 700, message: strikes >= 3 ? 'The survey overloaded after three incorrect maps. Reset to recalibrate.' : `The ray paths disagree with that map. ${3 - strikes} calibration attempts remain.` };
}

function bridgeDegrees(links: number[]) {
  const degrees = BRIDGE_ISLANDS.map(() => 0);
  BRIDGE_EDGES.forEach((edge, index) => { degrees[edge.a] += links[index]; degrees[edge.b] += links[index]; });
  return degrees;
}

function activateBridge(state: BridgeState, index: number): BridgeState {
  if (index < 0 || index >= BRIDGE_EDGES.length || state.status !== 'playing') return state;
  const links = [...state.links]; links[index] = (links[index] + 1) % 3;
  const complete = sameNumbers(links, BRIDGE_TARGET);
  return { ...state, links, moves: state.moves + 1, score: complete ? 400 : state.score, status: complete ? 'complete' : 'playing', lastIndex: index, pulseMs: 480, message: complete ? 'Every island carries two links and the bridge network holds.' : `Bridge route ${index + 1} now carries ${links[index]} ${links[index] === 1 ? 'span' : 'spans'}.` };
}

function activateFlood(state: FloodState, color: number): FloodState {
  if (color < 0 || color > 3 || state.status !== 'playing' || color === state.currentColor) return { ...state, message: 'Choose a different current for the next flood wave.' };
  const board = floodRegion(state.board, state.currentColor, color);
  const moves = state.moves + 1; const complete = board.every((row) => row.every((cell) => cell === color));
  const failed = !complete && moves >= 6;
  return { ...state, board, currentColor: color, moves, score: complete ? Math.max(100, 700 - moves * 75) : state.score, status: complete ? 'complete' : failed ? 'failed' : 'playing', waveRadius: 0, pulseMs: 500, lastIndex: color, message: complete ? `Basin unified in ${moves} waves. The water portal rises.` : failed ? 'Six waves passed before the basin unified. Reset and find a shorter current.' : `Wave ${moves}/6 carried color ${color + 1} through the connected spring.` };
}

function activateStar(state: StarState, index: number): StarState {
  if (index < 0 || index >= 16 || state.status !== 'playing' || STAR_CLUES.has(index)) return state;
  const assignments = [...state.assignments]; assignments[index] = assignments[index] >= 3 ? -1 : assignments[index] + 1;
  const complete = sameNumbers(assignments, STAR_TARGET);
  return { ...state, assignments, moves: state.moves + 1, score: complete ? 500 : state.score, status: complete ? 'complete' : 'playing', lastIndex: index, pulseMs: 360, message: complete ? 'Four rotational star regions lock into perfect symmetry.' : assignments[index] < 0 ? 'Tile cleared.' : `Tile assigned to star ${assignments[index] + 1}.` };
}

function pegMidpoint(from: number, to: number) {
  const a = PEG_HOLES[from]; const b = PEG_HOLES[to];
  const dr = b.row - a.row; const dc = b.column - a.column;
  if (![[0, 2], [0, -2], [2, 0], [-2, 0], [2, 2], [-2, -2]].some(([row, column]) => row === dr && column === dc)) return -1;
  return PEG_HOLES.findIndex((hole) => hole.row === a.row + dr / 2 && hole.column === a.column + dc / 2);
}

function activatePeg(state: PegState, index: number): PegState {
  if (index < 0 || index >= state.pegs.length || state.status !== 'playing' || state.jump) return state;
  if (state.selected === null) return state.pegs[index] ? { ...state, selected: index, lastIndex: index, pulseMs: 250, message: 'Relic selected. Choose an empty socket two steps away.' } : { ...state, message: 'Choose a relic before choosing its landing socket.' };
  if (index === state.selected) return { ...state, selected: null, message: 'Relic released.' };
  if (state.pegs[index]) return { ...state, selected: index, lastIndex: index, pulseMs: 250, message: 'New relic selected.' };
  const over = pegMidpoint(state.selected, index);
  if (over < 0 || !state.pegs[over]) return { ...state, message: 'That landing needs one adjacent relic to jump over.' };
  const pegs = [...state.pegs]; pegs[state.selected] = false; pegs[over] = false; pegs[index] = true;
  const remaining = pegs.filter(Boolean).length; const complete = remaining === 1;
  return { ...state, pegs, selected: null, moves: state.moves + 1, score: 15 - remaining, status: complete ? 'complete' : 'playing', lastIndex: index, pulseMs: 520, jump: { from: state.selected, over, to: index, elapsedMs: 0, durationMs: 520 }, message: complete ? 'One relic remains. The vault mechanism releases.' : `Clean jump. ${remaining} relics remain.` };
}

function dominoAdjacent(a: number, b: number) {
  const ax = a % 4; const ay = Math.floor(a / 4); const bx = b % 4; const by = Math.floor(b / 4);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

function activateDomino(state: DominoState, index: number): DominoState {
  if (index < 0 || index >= 12 || state.status !== 'playing' || state.pairs.some(([a, b]) => a === index || b === index)) return state;
  if (state.selected === null) return { ...state, selected: index, lastIndex: index, pulseMs: 280, message: `Rune ${state.board[index] + 1} selected. Choose its matching neighbor.` };
  if (state.selected === index) return { ...state, selected: null, message: 'Pair selection cleared.' };
  if (!dominoAdjacent(state.selected, index) || state.board[state.selected] !== state.board[index]) return { ...state, selected: index, pulseMs: 420, lastIndex: index, message: 'Those tiles do not form a matching adjacent pair. The second tile is now selected.' };
  const pairs: Array<[number, number]> = [...state.pairs, [state.selected, index]]; const complete = pairs.length === 6;
  return { ...state, selected: null, pairs, moves: state.moves + 1, score: pairs.length, status: complete ? 'complete' : 'playing', pulseMs: 520, deployMs: 0, lastIndex: index, message: complete ? 'Six matching domino seals cover the complete floor.' : `Domino ${pairs.length}/6 locked into the floor.` };
}

function activateInequality(state: InequalityState, index: number): InequalityState {
  if (index < 0 || index >= 16 || state.status !== 'playing' || INEQUALITY_CLUES.has(index)) return state;
  const values = [...state.values]; values[index] = values[index] >= 4 ? 0 : values[index] + 1; const complete = sameNumbers(values, INEQUALITY_TARGET);
  return { ...state, values, moves: state.moves + 1, score: complete ? 16 : state.score, status: complete ? 'complete' : 'playing', pulseMs: 360, lastIndex: index, message: complete ? 'Every row, column, and uphill comparison is balanced.' : values[index] ? `Tower raised to height ${values[index]}.` : 'Tower returned to an empty foundation.' };
}

function activateSignal(state: SignalState, index: number): SignalState {
  if (index < 0 || index >= 16 || state.status !== 'playing') return state;
  const expected = SIGNAL_PATH[state.progress];
  if (index !== expected) {
    const strikes = state.strikes + 1; return { ...state, strikes, progress: 0, moves: state.moves + 1, status: strikes >= 3 ? 'failed' : 'playing', pulseMs: 520, lastIndex: index, message: strikes >= 3 ? 'Three broken traces overloaded the relay. Reset the path.' : `That tile breaks the arrow chain. Trace reset; ${3 - strikes} retries remain.` };
  }
  const progress = state.progress + 1; const complete = progress === SIGNAL_PATH.length;
  return { ...state, progress, moves: state.moves + 1, score: progress, status: complete ? 'complete' : 'playing', pulseMs: 320, signalTravel: 0, lastIndex: index, message: complete ? 'The complete relay path carries a clean signal.' : `Relay ${progress}/${SIGNAL_PATH.length} energized. Follow its arrow.` };
}

function tickMagnet(state: MagnetState, ms: number): MagnetState {
  const angles = [...state.angles]; const angularVelocity = [...state.angularVelocity]; let remaining = Math.max(0, ms);
  while (remaining > 0) {
    const stepMs = Math.min(16, remaining); const dt = stepMs / 1000; remaining -= stepMs;
    for (let index = 0; index < angles.length; index += 1) {
      const target = state.orientations[index] * Math.PI; let delta = target - angles[index]; while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2;
      const torque = delta * 48 - angularVelocity[index] * 11; angularVelocity[index] += torque * dt; angles[index] += angularVelocity[index] * dt;
    }
  }
  return { ...state, elapsedMs: state.elapsedMs + ms, pulseMs: Math.max(0, state.pulseMs - ms), angles, angularVelocity };
}

function activateMagnet(state: MagnetState, index: number): MagnetState {
  if (index < 0 || index >= 8 || state.status !== 'playing') return state;
  const orientations = [...state.orientations]; orientations[index] = 1 - orientations[index]; const complete = sameNumbers(orientations, MAGNET_TARGET);
  return { ...state, orientations, moves: state.moves + 1, score: complete ? 8 : state.score, status: complete ? 'complete' : 'playing', pulseMs: 480, lastIndex: index, message: complete ? 'All eight magnetic capsules settle into a balanced field.' : `Capsule ${index + 1} reversed. The field is still shifting.` };
}

function tickUntangle(state: UntangleState, ms: number): UntangleState {
  const displayX = [...state.displayX]; const displayY = [...state.displayY]; const velocityX = [...state.velocityX]; const velocityY = [...state.velocityY];
  const slotByNode = Array(6).fill(0); state.nodeAtSlots.forEach((node, slot) => { slotByNode[node] = slot; }); let remaining = Math.max(0, ms);
  while (remaining > 0) {
    const stepMs = Math.min(16, remaining); const dt = stepMs / 1000; remaining -= stepMs;
    for (let node = 0; node < 6; node += 1) {
      const target = untangleSlot(slotByNode[node]); const forceX = (target.x - displayX[node]) * 38 - velocityX[node] * 9; const forceY = (target.y - displayY[node]) * 38 - velocityY[node] * 9;
      velocityX[node] += forceX * dt; velocityY[node] += forceY * dt; displayX[node] += velocityX[node] * dt; displayY[node] += velocityY[node] * dt;
    }
  }
  return { ...state, elapsedMs: state.elapsedMs + ms, pulseMs: Math.max(0, state.pulseMs - ms), displayX, displayY, velocityX, velocityY };
}

function activateUntangle(state: UntangleState, index: number): UntangleState {
  if (index < 0 || index >= 6 || state.status !== 'playing') return state;
  if (state.selected === null) return { ...state, selected: index, lastIndex: index, pulseMs: 260, message: `Socket ${index + 1} selected. Choose a second socket to swap.` };
  if (state.selected === index) return { ...state, selected: null, message: 'Node swap cancelled.' };
  const nodeAtSlots = [...state.nodeAtSlots]; [nodeAtSlots[state.selected], nodeAtSlots[index]] = [nodeAtSlots[index], nodeAtSlots[state.selected]];
  const crossings = countUntangleCrossings(nodeAtSlots); const complete = crossings === 0;
  return { ...state, nodeAtSlots, selected: null, crossings, moves: state.moves + 1, score: complete ? 600 : state.score, status: complete ? 'complete' : 'playing', lastIndex: index, pulseMs: 600, message: complete ? 'No energy cables cross. The circuit ring spins freely.' : `${crossings} cable ${crossings === 1 ? 'crossing remains' : 'crossings remain'}.` };
}

export function updateMotionLab(state: MotionLabState, action: MotionLabAction): MotionLabState {
  if (action.type === 'tick') {
    if (state.id === 18) return tickBridge(state, action.ms);
    if (state.id === 19) return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms), waveRadius: Math.min(1, state.waveRadius + action.ms / 520) };
    if (state.id === 20) return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms), orbitAngle: (state.orbitAngle + action.ms * .0012) % (Math.PI * 2) };
    if (state.id === 21) {
      const jump = state.jump ? { ...state.jump, elapsedMs: Math.min(state.jump.durationMs, state.jump.elapsedMs + action.ms) } : null;
      return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms), jump: jump && jump.elapsedMs < jump.durationMs ? jump : null };
    }
    if (state.id === 22) return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms), deployMs: Math.min(520, state.deployMs + action.ms) };
    if (state.id === 23) return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms) };
    if (state.id === 24) return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms), signalTravel: Math.min(1, state.signalTravel + action.ms / 320) };
    if (state.id === 25) return tickMagnet(state, action.ms);
    if (state.id === 26) return tickUntangle(state, action.ms);
    return { ...state, elapsedMs: state.elapsedMs + action.ms, pulseMs: Math.max(0, state.pulseMs - action.ms), rayDistance: Math.min(1, state.rayDistance + action.ms / 420) };
  }
  if (action.type === 'submit' && state.id === 17) return submitBeam(state);
  if (action.type !== 'activate') return state;
  if (state.id === 17) return activateBeam(state, action.index);
  if (state.id === 18) return activateBridge(state, action.index);
  if (state.id === 19) return activateFlood(state, action.index);
  if (state.id === 20) return activateStar(state, action.index);
  if (state.id === 21) return activatePeg(state, action.index);
  if (state.id === 22) return activateDomino(state, action.index);
  if (state.id === 23) return activateInequality(state, action.index);
  if (state.id === 24) return activateSignal(state, action.index);
  if (state.id === 25) return activateMagnet(state, action.index);
  return activateUntangle(state, action.index);
}

export function motionLabSnapshot(state: MotionLabState) {
  const base = { mode: 'puzzle-lab', puzzle: `motion-lab-${state.id}`, status: state.status, elapsedMs: Math.round(state.elapsedMs), moves: state.moves, score: state.score, message: state.message, animation: { lastIndex: state.lastIndex, pulseMs: Math.round(state.pulseMs) } };
  if (state.id === 17) return { ...base, coordinateSystem: '5x5 survey grid; index=y*5+x; origin top-left', objective: 'Mark the three hidden prism stones using five edge-scan clues', clues: BEAM_CLUES, selected: state.selected, selectedCount: state.selected.length, strikes: state.strikes, attemptsRemaining: 3 - state.strikes, activeRay: state.activeRay, rayDistance: Number(state.rayDistance.toFixed(2)) };
  if (state.id === 18) return { ...base, coordinateSystem: 'four-island square with six indexed routes', objective: 'Give every island degree two using one connected non-crossing network', islands: BRIDGE_ISLANDS.map((island, index) => ({ ...island, degree: bridgeDegrees(state.links)[index] })), edges: BRIDGE_EDGES.map((edge, index) => ({ ...edge, links: state.links[index], spring: Number(state.spring[index].toFixed(2)) })) };
  if (state.id === 19) return { ...base, coordinateSystem: '4x4 basin; origin top-left; color indices 0-3', objective: 'Unify the basin in six flood waves or fewer', board: state.board, currentColor: state.currentColor, movesRemaining: 6 - state.moves, waveRadius: Number(state.waveRadius.toFixed(2)) };
  if (state.id === 20) return { ...base, coordinateSystem: '4x4 star-region grid; origin top-left; assignments -1 blank or 0-3 star', objective: 'Build four rotationally symmetric regions around the fixed stars', assignments: state.assignments, assigned: state.assignments.filter((value) => value >= 0).length, orbitAngle: Number(state.orbitAngle.toFixed(2)) };
  if (state.id === 21) return { ...base, coordinateSystem: '15 triangular sockets; rows 0-4 from top; index follows row-major order', objective: 'Reduce fourteen relic pegs to one by orthogonal triangular jumps', holes: PEG_HOLES, pegs: state.pegs, selected: state.selected, remaining: state.pegs.filter(Boolean).length, jump: state.jump };
  if (state.id === 22) return { ...base, coordinateSystem: '4x3 domino grid; index=y*4+x; origin top-left', objective: 'Pair all twelve tiles into six matching adjacent dominoes', board: state.board, selected: state.selected, pairs: state.pairs, pairsRemaining: 6 - state.pairs.length, deployProgress: Number((state.deployMs / 520).toFixed(2)) };
  if (state.id === 23) return { ...base, coordinateSystem: '4x4 tower grid; index=y*4+x; heights 0-4', objective: 'Complete a 1-4 Latin square that satisfies the etched inequalities', values: state.values, filled: state.values.filter(Boolean).length, conflicts: state.values.filter((value, index) => value > 0 && value !== INEQUALITY_TARGET[index]).length };
  if (state.id === 24) return { ...base, coordinateSystem: '4x4 relay grid; index=y*4+x; route begins at index 0', objective: 'Trace all twelve arrow relays in order', progress: state.progress, pathLength: SIGNAL_PATH.length, energized: SIGNAL_PATH.slice(0, state.progress), nextStart: state.progress ? SIGNAL_PATH[state.progress - 1] : SIGNAL_PATH[0], strikes: state.strikes, signalTravel: Number(state.signalTravel.toFixed(2)) };
  if (state.id === 25) return { ...base, coordinateSystem: 'eight 2-cell magnet capsules arranged in a 4x4 field', objective: 'Orient every capsule to balance polarity and prevent like-pole contact', orientations: state.orientations, angles: state.angles.map((angle) => Number(angle.toFixed(2))), balanced: state.orientations.filter((value, index) => value === MAGNET_TARGET[index]).length };
  return { ...base, coordinateSystem: 'six sockets around a circle; nodeAtSlots maps slot index to node id', objective: 'Swap nodes until the six-edge circuit has zero crossings', nodeAtSlots: state.nodeAtSlots, selected: state.selected, crossings: state.crossings, display: state.displayX.map((x, node) => ({ node, x: Number(x.toFixed(2)), y: Number(state.displayY[node].toFixed(2)) })) };
}
