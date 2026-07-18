import type { GridPoint, LabDirection } from './blockShift';

export type MineTrailStatus = 'playing' | 'failed' | 'complete';

export interface MineTrailState {
  player: GridPoint;
  facing: LabDirection;
  revealed: string[];
  detonated: GridPoint | null;
  moves: number;
  actions: number;
  status: MineTrailStatus;
  message: string;
  lastAction: 'idle' | 'walk' | 'reveal' | 'blocked' | 'detonate';
}

export const MINE_TRAIL_WIDTH = 5;
export const MINE_TRAIL_HEIGHT = 5;
export const MINE_TRAIL_MINES: GridPoint[] = [
  { x: 3, y: 0 },
  { x: 1, y: 1 },
  { x: 4, y: 2 },
  { x: 2, y: 3 },
  { x: 4, y: 4 },
  { x: 0, y: 2 },
];

const DIRECTIONS: Record<LabDirection, GridPoint> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

const key = (point: GridPoint) => `${point.x},${point.y}`;
const isInside = (point: GridPoint) => point.x >= 0 && point.x < MINE_TRAIL_WIDTH && point.y >= 0 && point.y < MINE_TRAIL_HEIGHT;
export const isMine = (point: GridPoint) => MINE_TRAIL_MINES.some((mine) => mine.x === point.x && mine.y === point.y);

function neighbors(point: GridPoint) {
  const points: GridPoint[] = [];
  for (let y = -1; y <= 1; y += 1) {
    for (let x = -1; x <= 1; x += 1) {
      if (x === 0 && y === 0) continue;
      const neighbor = { x: point.x + x, y: point.y + y };
      if (isInside(neighbor)) points.push(neighbor);
    }
  }
  return points;
}

export function adjacentMineCount(point: GridPoint) {
  return neighbors(point).filter(isMine).length;
}

export function initialMineTrailState(): MineTrailState {
  return {
    player: { x: 0, y: 4 }, facing: 'right', revealed: [], detonated: null,
    moves: 0, actions: 0, status: 'playing',
    message: 'Move across the covered tiles. Press ACTION to reveal the tile beneath the explorer.',
    lastAction: 'idle',
  };
}

export function moveMineTrail(state: MineTrailState, direction: LabDirection): MineTrailState {
  if (state.status !== 'playing') return { ...state, facing: direction, lastAction: 'blocked', message: state.status === 'complete' ? 'The safe route is mapped. Reset to test again.' : 'The minefield has collapsed. Reset to try again.' };
  const delta = DIRECTIONS[direction];
  const destination = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!isInside(destination)) return { ...state, facing: direction, lastAction: 'blocked', message: 'The explorer cannot leave the minefield platform.' };
  return { ...state, player: destination, facing: direction, moves: state.moves + 1, lastAction: 'walk', message: state.revealed.includes(key(destination)) ? 'This tile is already mapped.' : 'Covered tile. Press ACTION to investigate.' };
}

function floodReveal(origin: GridPoint, revealed: Set<string>) {
  const queue = [origin];
  while (queue.length) {
    const point = queue.shift()!;
    const pointKey = key(point);
    if (revealed.has(pointKey) || isMine(point)) continue;
    revealed.add(pointKey);
    if (adjacentMineCount(point) === 0) {
      for (const neighbor of neighbors(point)) if (!revealed.has(key(neighbor)) && !isMine(neighbor)) queue.push(neighbor);
    }
  }
}

export function revealMineTrail(state: MineTrailState): MineTrailState {
  if (state.status !== 'playing') return { ...state, lastAction: 'blocked', message: state.status === 'complete' ? 'Every safe tile is mapped.' : 'Reset the minefield before revealing another tile.' };
  const playerKey = key(state.player);
  if (state.revealed.includes(playerKey)) return { ...state, lastAction: 'blocked', message: 'That tile is already revealed. Follow the numbers to a covered tile.' };
  if (isMine(state.player)) {
    return {
      ...state, revealed: [...state.revealed, playerKey], detonated: { ...state.player }, actions: state.actions + 1,
      status: 'failed', lastAction: 'detonate', message: 'Mine triggered. The test route has ended.',
    };
  }
  const revealed = new Set(state.revealed);
  floodReveal(state.player, revealed);
  const safeTotal = MINE_TRAIL_WIDTH * MINE_TRAIL_HEIGHT - MINE_TRAIL_MINES.length;
  const complete = revealed.size === safeTotal;
  const number = adjacentMineCount(state.player);
  return {
    ...state, revealed: [...revealed], actions: state.actions + 1, status: complete ? 'complete' : 'playing',
    lastAction: 'reveal', message: complete ? 'Minefield cleared. Every safe tile is mapped.' : number ? `Revealed ${number}. That many mines touch this tile.` : 'Clear ground. Nearby empty tiles opened automatically.',
  };
}

export function mineTrailSnapshot(state: MineTrailState) {
  const revealed = new Set(state.revealed);
  const cells = Array.from({ length: MINE_TRAIL_HEIGHT }, (_, y) => Array.from({ length: MINE_TRAIL_WIDTH }, (_, x) => {
    const point = { x, y }; const visible = revealed.has(key(point));
    return { x, y, state: !visible ? 'covered' : isMine(point) ? 'mine' : 'safe', clue: visible && !isMine(point) ? adjacentMineCount(point) : null };
  })).flat();
  const safeTotal = MINE_TRAIL_WIDTH * MINE_TRAIL_HEIGHT - MINE_TRAIL_MINES.length;
  return {
    mode: 'puzzle-lab', puzzle: 'mine-trail-02',
    coordinateSystem: '5x5 grid; origin top-left; x right; y down',
    objective: 'Move onto tiles and press ACTION to reveal every safe tile without revealing a mine.',
    player: state.player, facing: state.facing, status: state.status, moves: state.moves, actions: state.actions,
    safeTilesRemaining: safeTotal - state.revealed.filter((item) => !MINE_TRAIL_MINES.some((mine) => key(mine) === item)).length,
    cells, message: state.message,
    controls: 'Arrow keys or WASD; touch D-pad; Space or Enter to reveal; R reset',
  };
}
