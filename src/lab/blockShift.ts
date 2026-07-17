export type LabDirection = 'up' | 'down' | 'left' | 'right';
export type LabStatus = 'playing' | 'complete';

export interface GridPoint { x: number; y: number }

export interface ShiftBlock extends GridPoint {
  id: 'keystone' | 'amber' | 'jade' | 'azure';
  kind: 'keystone' | 'block';
  label: string;
  color: string;
}

interface StoredBlockShiftState {
  player: GridPoint;
  blocks: ShiftBlock[];
  moves: number;
  pushes: number;
  status: LabStatus;
  message: string;
}

export interface BlockShiftState extends StoredBlockShiftState {
  history: StoredBlockShiftState[];
}

export const BLOCK_SHIFT_WIDTH = 7;
export const BLOCK_SHIFT_HEIGHT = 7;
export const BLOCK_SHIFT_GOAL: GridPoint = { x: 6, y: 3 };
export const BLOCK_SHIFT_WALLS: GridPoint[] = [
  ...Array.from({ length: BLOCK_SHIFT_WIDTH }, (_, x) => ({ x, y: 0 })),
  ...Array.from({ length: BLOCK_SHIFT_WIDTH }, (_, x) => ({ x, y: BLOCK_SHIFT_HEIGHT - 1 })),
];

const DIRECTIONS: Record<LabDirection, GridPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function cloneBlocks(blocks: ShiftBlock[]) {
  return blocks.map((block) => ({ ...block }));
}

function store(state: BlockShiftState): StoredBlockShiftState {
  return {
    player: { ...state.player }, blocks: cloneBlocks(state.blocks), moves: state.moves,
    pushes: state.pushes, status: state.status, message: state.message,
  };
}

export function initialBlockShiftState(): BlockShiftState {
  return {
    player: { x: 1, y: 4 },
    blocks: [
      { id: 'keystone', kind: 'keystone', label: 'Keystone', color: '#f6c85f', x: 1, y: 3 },
      { id: 'amber', kind: 'block', label: 'Amber block', color: '#df8350', x: 2, y: 3 },
      { id: 'jade', kind: 'block', label: 'Jade block', color: '#55b7a5', x: 3, y: 3 },
      { id: 'azure', kind: 'block', label: 'Azure block', color: '#6e91cb', x: 4, y: 3 },
    ],
    moves: 0,
    pushes: 0,
    status: 'playing',
    message: 'Clear the center lane, then push the keystone into the glowing door.',
    history: [],
  };
}

function isWall(point: GridPoint) {
  return BLOCK_SHIFT_WALLS.some((wall) => wall.x === point.x && wall.y === point.y);
}

function isInside(point: GridPoint) {
  return point.x >= 0 && point.x < BLOCK_SHIFT_WIDTH && point.y >= 0 && point.y < BLOCK_SHIFT_HEIGHT;
}

function blockAt(blocks: ShiftBlock[], point: GridPoint) {
  return blocks.find((block) => block.x === point.x && block.y === point.y);
}

function isGoal(point: GridPoint) {
  return point.x === BLOCK_SHIFT_GOAL.x && point.y === BLOCK_SHIFT_GOAL.y;
}

export function moveBlockShift(state: BlockShiftState, direction: LabDirection): BlockShiftState {
  if (state.status === 'complete') return { ...state, message: 'The door is open. Undo or reset to keep testing.' };
  const delta = DIRECTIONS[direction];
  const destination = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!isInside(destination) || isWall(destination)) return { ...state, message: 'The explorer cannot cross the room wall.' };

  const pushed = blockAt(state.blocks, destination);
  if (!pushed) {
    return {
      ...state, player: destination, moves: state.moves + 1,
      message: `Moved ${direction}.`, history: [...state.history, store(state)].slice(-100),
    };
  }

  const blockDestination = { x: pushed.x + delta.x, y: pushed.y + delta.y };
  const keystoneOffRail = pushed.kind === 'keystone' && delta.y !== 0;
  const blocked = keystoneOffRail
    || !isInside(blockDestination)
    || isWall(blockDestination)
    || Boolean(blockAt(state.blocks, blockDestination))
    || (isGoal(blockDestination) && pushed.kind !== 'keystone');
  if (blocked) return { ...state, message: keystoneOffRail ? 'The keystone is locked to the center rail.' : `${pushed.label} cannot move ${direction}. Find another side.` };

  const blocks = state.blocks.map((block) => block.id === pushed.id ? { ...block, ...blockDestination } : block);
  const complete = pushed.kind === 'keystone' && isGoal(blockDestination);
  return {
    ...state,
    player: destination,
    blocks,
    moves: state.moves + 1,
    pushes: state.pushes + 1,
    status: complete ? 'complete' : 'playing',
    message: complete ? 'Door unlocked. The route to the next room is open.' : `Pushed ${pushed.label} ${direction}.`,
    history: [...state.history, store(state)].slice(-100),
  };
}

export function undoBlockShift(state: BlockShiftState): BlockShiftState {
  const previous = state.history.at(-1);
  if (!previous) return { ...state, message: 'Nothing to undo yet.' };
  return { ...previous, player: { ...previous.player }, blocks: cloneBlocks(previous.blocks), history: state.history.slice(0, -1) };
}

export function blockShiftSnapshot(state: BlockShiftState) {
  const keystone = state.blocks.find((block) => block.kind === 'keystone');
  return {
    mode: 'puzzle-lab',
    puzzle: 'block-shift-01',
    coordinateSystem: '7x7 grid; origin top-left; x right; y down; rows 0 and 6 are walls',
    objective: 'Push the keystone from the left side into the door at (6,3).',
    player: state.player,
    blocks: state.blocks.map(({ id, kind, x, y }) => ({ id, kind, x, y })),
    goal: BLOCK_SHIFT_GOAL,
    keystone,
    moves: state.moves,
    pushes: state.pushes,
    canUndo: state.history.length > 0,
    status: state.status,
    message: state.message,
    controls: 'Arrow keys or WASD; touch D-pad; Z undo; R reset',
  };
}
