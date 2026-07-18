export type LabDirection = 'up' | 'down' | 'left' | 'right';
export type LabStatus = 'playing' | 'complete';
export type BlockAxis = 'horizontal' | 'vertical' | 'free';

export interface GridPoint { x: number; y: number }

export interface ShiftBlock extends GridPoint {
  id: 'keystone' | 'amber' | 'jade' | 'azure' | 'basalt';
  kind: 'keystone' | 'block';
  label: string;
  color: string;
  width: number;
  height: number;
  axis: BlockAxis;
}

interface StoredBlockShiftState {
  player: GridPoint;
  blocks: ShiftBlock[];
  moves: number;
  pushes: number;
  status: LabStatus;
  message: string;
  facing: LabDirection;
  lastAction: 'idle' | 'walk' | 'push' | 'blocked' | 'undo';
}

export interface BlockShiftState extends StoredBlockShiftState {
  history: StoredBlockShiftState[];
}

export const BLOCK_SHIFT_WIDTH = 9;
export const BLOCK_SHIFT_HEIGHT = 8;
export const BLOCK_SHIFT_GOAL: GridPoint = { x: 7, y: 3 };

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
    facing: state.facing, lastAction: state.lastAction,
  };
}

export function initialBlockShiftState(): BlockShiftState {
  return {
    player: { x: 0, y: 5 },
    blocks: [
      { id: 'keystone', kind: 'keystone', label: 'Keystone sled', color: '#f6c85f', x: 1, y: 3, width: 2, height: 1, axis: 'horizontal' },
      { id: 'amber', kind: 'block', label: 'Amber pillar', color: '#df8350', x: 3, y: 3, width: 1, height: 2, axis: 'vertical' },
      { id: 'jade', kind: 'block', label: 'Jade vault', color: '#55b7a5', x: 4, y: 2, width: 2, height: 2, axis: 'free' },
      { id: 'azure', kind: 'block', label: 'Azure column', color: '#6e91cb', x: 6, y: 2, width: 1, height: 3, axis: 'vertical' },
      { id: 'basalt', kind: 'block', label: 'Basalt beam', color: '#70777d', x: 3, y: 6, width: 3, height: 1, axis: 'horizontal' },
    ],
    moves: 0,
    pushes: 0,
    status: 'playing',
    message: 'Clear every shape from the gold lane, then push the keystone sled into the door.',
    facing: 'right',
    lastAction: 'idle',
    history: [],
  };
}

export function blockCells(block: ShiftBlock, at: GridPoint = block) {
  const cells: GridPoint[] = [];
  for (let y = 0; y < block.height; y += 1) {
    for (let x = 0; x < block.width; x += 1) cells.push({ x: at.x + x, y: at.y + y });
  }
  return cells;
}

function isInside(point: GridPoint) {
  return point.x >= 0 && point.x < BLOCK_SHIFT_WIDTH && point.y >= 0 && point.y < BLOCK_SHIFT_HEIGHT;
}

function blockAt(blocks: ShiftBlock[], point: GridPoint) {
  return blocks.find((block) => blockCells(block).some((cell) => cell.x === point.x && cell.y === point.y));
}

function isGoal(block: ShiftBlock) {
  return block.id === 'keystone' && block.x === BLOCK_SHIFT_GOAL.x && block.y === BLOCK_SHIFT_GOAL.y;
}

function axisAllows(block: ShiftBlock, direction: LabDirection) {
  if (block.axis === 'free') return true;
  if (block.axis === 'horizontal') return direction === 'left' || direction === 'right';
  return direction === 'up' || direction === 'down';
}

export function moveBlockShift(state: BlockShiftState, direction: LabDirection): BlockShiftState {
  if (state.status === 'complete') return { ...state, facing: direction, lastAction: 'blocked', message: 'The door is open. Undo or reset to keep testing.' };
  const delta = DIRECTIONS[direction];
  const destination = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!isInside(destination)) return { ...state, facing: direction, lastAction: 'blocked', message: 'The explorer cannot step beyond the platform.' };

  const pushed = blockAt(state.blocks, destination);
  if (!pushed) {
    return {
      ...state, player: destination, moves: state.moves + 1, facing: direction, lastAction: 'walk',
      message: `Moved ${direction}.`, history: [...state.history, store(state)].slice(-150),
    };
  }

  if (!axisAllows(pushed, direction)) {
    const constraint = pushed.axis === 'horizontal' ? 'sideways' : 'up and down';
    return { ...state, facing: direction, lastAction: 'blocked', message: `${pushed.label} only slides ${constraint}.` };
  }

  const nextAnchor = { x: pushed.x + delta.x, y: pushed.y + delta.y };
  const occupiedByOther = state.blocks.filter((block) => block.id !== pushed.id);
  const blocked = blockCells(pushed, nextAnchor).some((cell) => !isInside(cell) || Boolean(blockAt(occupiedByOther, cell)));
  if (blocked) return { ...state, facing: direction, lastAction: 'blocked', message: `${pushed.label} is blocked. Reach another side or move a different piece.` };

  const blocks = state.blocks.map((block) => block.id === pushed.id ? { ...block, ...nextAnchor } : block);
  const shifted = blocks.find((block) => block.id === pushed.id)!;
  const complete = isGoal(shifted);
  return {
    ...state,
    player: destination,
    blocks,
    moves: state.moves + 1,
    pushes: state.pushes + 1,
    status: complete ? 'complete' : 'playing',
    facing: direction,
    lastAction: 'push',
    message: complete ? 'Door unlocked. The route to the next room is open.' : `Pushed ${pushed.label} ${direction}.`,
    history: [...state.history, store(state)].slice(-150),
  };
}

export function undoBlockShift(state: BlockShiftState): BlockShiftState {
  const previous = state.history.at(-1);
  if (!previous) return { ...state, lastAction: 'blocked', message: 'Nothing to undo yet.' };
  return {
    ...previous, player: { ...previous.player }, blocks: cloneBlocks(previous.blocks),
    lastAction: 'undo', message: 'Last move undone.', history: state.history.slice(0, -1),
  };
}

export function blockShiftSnapshot(state: BlockShiftState) {
  const keystone = state.blocks.find((block) => block.kind === 'keystone');
  return {
    mode: 'puzzle-lab',
    puzzle: 'block-shift-01',
    coordinateSystem: '9x8 grid; origin top-left; x right; y down',
    objective: 'Clear row 3 and push the 2x1 keystone sled to anchor (7,3).',
    player: state.player,
    facing: state.facing,
    blocks: state.blocks.map(({ id, kind, x, y, width, height, axis }) => ({ id, kind, x, y, width, height, axis })),
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
