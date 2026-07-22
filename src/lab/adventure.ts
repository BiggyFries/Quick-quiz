export type AdventureDirection = 'up' | 'down' | 'left' | 'right';
export type AdventurePhase = 'playing' | 'celebrating' | 'portal-open' | 'complete';

export interface AdventurePoint { x: number; y: number }

export interface AdventureState {
  player: AdventurePoint;
  crate: AdventurePoint;
  facing: AdventureDirection;
  phase: AdventurePhase;
  celebrationMs: number;
  elapsedMs: number;
  moves: number;
  chips: string[];
  redKey: boolean;
  blueKey: boolean;
  boots: boolean;
  redDoorOpen: boolean;
  blueDoorOpen: boolean;
  plateActive: boolean;
  message: string;
}

export const ADVENTURE_MAP = [
  '###########',
  '###########',
  '##P.c.rR###',
  '##.#.#...##',
  '##...#.#.##',
  '##c.tW.bB##',
  '##.###...##',
  '##.O.o.#.##',
  '##c....#E##',
  '###########',
  '###########',
];

export const ADVENTURE_CHIP_TOTAL = ADVENTURE_MAP.join('').split('c').length - 1;
const pointKey = ({ x, y }: AdventurePoint) => `${x},${y}`;
const equal = (a: AdventurePoint, b: AdventurePoint) => a.x === b.x && a.y === b.y;
const delta: Record<AdventureDirection, AdventurePoint> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

export function initialAdventureState(): AdventureState {
  return {
    player: { x: 2, y: 2 }, crate: { x: 3, y: 7 }, facing: 'down', phase: 'playing', celebrationMs: 0,
    elapsedMs: 0, moves: 0, chips: [], redKey: false, blueKey: false, boots: false,
    redDoorOpen: false, blueDoorOpen: false, plateActive: false,
    message: 'Collect three venture chips, equip the tide boots, unlock the gates, and power the floor plate.',
  };
}

function tileAt(point: AdventurePoint) {
  return ADVENTURE_MAP[point.y]?.[point.x] ?? '#';
}

function objectivesReady(state: AdventureState) {
  return state.chips.length === ADVENTURE_CHIP_TOTAL && state.plateActive;
}

function collectAt(state: AdventureState, player: AdventurePoint): AdventureState {
  const tile = tileAt(player);
  const key = pointKey(player);
  if (tile === 'c' && !state.chips.includes(key)) {
    const chips = [...state.chips, key];
    return { ...state, chips, message: `Venture chip secured. ${ADVENTURE_CHIP_TOTAL - chips.length} remain.` };
  }
  if (tile === 'r' && !state.redKey) return { ...state, redKey: true, message: 'Crimson key acquired. The crimson gate can now open.' };
  if (tile === 'b' && !state.blueKey) return { ...state, blueKey: true, message: 'Azure key acquired. The final lock recognizes you.' };
  if (tile === 't' && !state.boots) return { ...state, boots: true, message: 'Tide boots equipped. Water tiles are now safe.' };
  return state;
}

export function moveAdventure(state: AdventureState, direction: AdventureDirection): AdventureState {
  if (state.phase === 'celebrating' || state.phase === 'complete') return state;
  const step = delta[direction];
  const destination = { x: state.player.x + step.x, y: state.player.y + step.y };
  const tile = tileAt(destination);
  const faced = { ...state, facing: direction };
  if (tile === '#') return { ...faced, message: 'Ancient stone blocks that direction.' };
  if (tile === 'W' && !state.boots) return { ...faced, message: 'The flooded passage needs tide boots.' };
  if (tile === 'R' && !state.redDoorOpen && !state.redKey) return { ...faced, message: 'The crimson gate needs its matching key.' };
  if (tile === 'B' && !state.blueDoorOpen && !state.blueKey) return { ...faced, message: 'The azure gate is still locked.' };

  let crate = state.crate;
  let plateActive = state.plateActive;
  if (equal(destination, state.crate)) {
    const pushed = { x: state.crate.x + step.x, y: state.crate.y + step.y };
    const pushedTile = tileAt(pushed);
    if (pushedTile === '#' || pushedTile === 'W' || pushedTile === 'R' || pushedTile === 'B' || pushedTile === 'E') {
      return { ...faced, message: 'The power crate cannot be pushed there.' };
    }
    crate = pushed;
    plateActive = pushedTile === 'o';
  }

  let next = collectAt({
    ...faced, player: destination, crate, plateActive, moves: state.moves + 1,
    redDoorOpen: state.redDoorOpen || tile === 'R', blueDoorOpen: state.blueDoorOpen || tile === 'B',
    message: plateActive && !state.plateActive ? 'The power crate locks onto the sun plate.' : 'The explorer advances one tile.',
  }, destination);

  if (tile === 'E') {
    if (state.phase === 'portal-open' && objectivesReady(next)) return { ...next, phase: 'complete', message: 'Portal crossed. Adventure room complete!' };
    return { ...state, facing: direction, message: 'The portal needs all three venture chips and the powered floor plate.' };
  }

  if (state.phase === 'playing' && objectivesReady(next)) {
    next = { ...next, phase: 'celebrating', celebrationMs: 0, message: 'Room solved! One-second celebration—then walk to the portal.' };
  }
  return next;
}

export function tickAdventure(state: AdventureState, ms: number): AdventureState {
  if (state.phase === 'complete') return state;
  const elapsedMs = state.elapsedMs + Math.max(0, ms);
  if (state.phase !== 'celebrating') return { ...state, elapsedMs };
  const celebrationMs = Math.min(1000, state.celebrationMs + Math.max(0, ms));
  return celebrationMs >= 1000
    ? { ...state, elapsedMs, celebrationMs, phase: 'portal-open', message: 'Portal open. Keep controlling the explorer and walk into it.' }
    : { ...state, elapsedMs, celebrationMs };
}

export function adventureSnapshot(state: AdventureState) {
  return {
    mode: 'puzzle-lab', puzzle: 'adventure-primary', coordinateSystem: '9x9 tile grid; origin top-left; x right; y down',
    objective: 'Collect 3 chips, activate the floor plate, then manually walk through the portal',
    map: ADVENTURE_MAP, player: state.player, crate: state.crate, phase: state.phase, celebrationMs: state.celebrationMs,
    inventory: { chips: state.chips.length, chipTotal: ADVENTURE_CHIP_TOTAL, redKey: state.redKey, blueKey: state.blueKey, tideBoots: state.boots },
    doors: { redOpen: state.redDoorOpen, blueOpen: state.blueDoorOpen }, plateActive: state.plateActive,
    portalOpen: state.phase === 'portal-open' || state.phase === 'complete', moves: state.moves, elapsedMs: state.elapsedMs, message: state.message,
  };
}
