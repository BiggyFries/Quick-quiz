export type LabDirection = 'up' | 'down' | 'left' | 'right';
export type LabStatus = 'playing' | 'complete';
export type BlockAxis = 'horizontal' | 'vertical' | 'free';

export interface GridPoint { x: number; y: number }

export interface ShiftBlock extends GridPoint {
  id: 'relic' | 'cedar' | 'coral' | 'glacier' | 'lunar' | 'obsidian' | 'saffron' | 'service-beam';
  kind: 'relic' | 'block';
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

export const BLOCK_SHIFT_WIDTH = 12;
export const BLOCK_SHIFT_HEIGHT = 10;
export const BLOCK_SHIFT_GOAL: GridPoint = { x: 10, y: 4 };
export const BLOCK_SHIFT_BAY: GridPoint = { x: 7, y: 7 };

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
    player: { x: 0, y: 8 },
    blocks: [
      { id: 'relic', kind: 'relic', label: 'Sun relic cart', color: '#f5c85d', x: 1, y: 4, width: 2, height: 1, axis: 'horizontal' },
      { id: 'cedar', kind: 'block', label: 'Cedar tower', color: '#a96845', x: 3, y: 3, width: 1, height: 3, axis: 'vertical' },
      { id: 'coral', kind: 'block', label: 'Coral vault', color: '#d76f61', x: 4, y: 3, width: 2, height: 2, axis: 'free' },
      { id: 'glacier', kind: 'block', label: 'Glacier pillar', color: '#72a8cf', x: 6, y: 4, width: 1, height: 2, axis: 'vertical' },
      { id: 'lunar', kind: 'block', label: 'Lunar column', color: '#8b7bc4', x: 7, y: 2, width: 1, height: 3, axis: 'vertical' },
      { id: 'obsidian', kind: 'block', label: 'Obsidian vault', color: '#525d66', x: 8, y: 3, width: 2, height: 2, axis: 'free' },
      { id: 'saffron', kind: 'block', label: 'Saffron pillar', color: '#db934b', x: 10, y: 4, width: 1, height: 2, axis: 'vertical' },
      { id: 'service-beam', kind: 'block', label: 'Service beam', color: '#4fa89f', x: 4, y: 7, width: 3, height: 1, axis: 'horizontal' },
    ],
    moves: 0,
    pushes: 0,
    status: 'playing',
    message: 'Dock the long service beam in its blue bay, clear the gold rail, and deliver the relic cart.',
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

function boardSolved(blocks: ShiftBlock[]) {
  const relic = blocks.find((block) => block.id === 'relic');
  const serviceBeam = blocks.find((block) => block.id === 'service-beam');
  return relic?.x === BLOCK_SHIFT_GOAL.x && relic.y === BLOCK_SHIFT_GOAL.y
    && serviceBeam?.x === BLOCK_SHIFT_BAY.x && serviceBeam.y === BLOCK_SHIFT_BAY.y;
}

function axisAllows(block: ShiftBlock, direction: LabDirection) {
  if (block.axis === 'free') return true;
  if (block.axis === 'horizontal') return direction === 'left' || direction === 'right';
  return direction === 'up' || direction === 'down';
}

export function moveBlockShift(state: BlockShiftState, direction: LabDirection): BlockShiftState {
  if (state.status === 'complete') return { ...state, facing: direction, lastAction: 'blocked', message: 'The relic gate is open. Undo or reset to keep testing.' };
  const delta = DIRECTIONS[direction];
  const destination = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!isInside(destination)) return { ...state, facing: direction, lastAction: 'blocked', message: 'The explorer cannot step beyond the new platform.' };

  const pushed = blockAt(state.blocks, destination);
  if (!pushed) {
    return {
      ...state, player: destination, moves: state.moves + 1, facing: direction, lastAction: 'walk',
      message: `Moved ${direction}.`, history: [...state.history, store(state)].slice(-240),
    };
  }

  if (!axisAllows(pushed, direction)) {
    const constraint = pushed.axis === 'horizontal' ? 'sideways' : 'up and down';
    return { ...state, facing: direction, lastAction: 'blocked', message: `${pushed.label} only slides ${constraint}.` };
  }

  const nextAnchor = { x: pushed.x + delta.x, y: pushed.y + delta.y };
  const occupiedByOther = state.blocks.filter((block) => block.id !== pushed.id);
  const blocked = blockCells(pushed, nextAnchor).some((cell) => !isInside(cell) || Boolean(blockAt(occupiedByOther, cell)));
  if (blocked) return { ...state, facing: direction, lastAction: 'blocked', message: `${pushed.label} is blocked. Find another side or shift a different piece.` };

  const blocks = state.blocks.map((block) => block.id === pushed.id ? { ...block, ...nextAnchor } : block);
  const complete = boardSolved(blocks);
  const bayDocked = pushed.id === 'service-beam' && nextAnchor.x === BLOCK_SHIFT_BAY.x && nextAnchor.y === BLOCK_SHIFT_BAY.y;
  const relicDocked = pushed.id === 'relic' && nextAnchor.x === BLOCK_SHIFT_GOAL.x && nextAnchor.y === BLOCK_SHIFT_GOAL.y;
  const message = complete ? 'Both locks aligned. The relic gate opens into the next room.'
    : bayDocked ? 'Service beam docked. Now clear the gold rail for the relic cart.'
      : relicDocked ? 'Relic cart aligned. The service beam still belongs in the blue bay.'
        : `Pushed ${pushed.label} ${direction}.`;
  return {
    ...state,
    player: destination,
    blocks,
    moves: state.moves + 1,
    pushes: state.pushes + 1,
    status: complete ? 'complete' : 'playing',
    facing: direction,
    lastAction: 'push',
    message,
    history: [...state.history, store(state)].slice(-240),
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
  const relic = state.blocks.find((block) => block.kind === 'relic');
  const serviceBeam = state.blocks.find((block) => block.id === 'service-beam');
  return {
    mode: 'puzzle-lab',
    puzzle: 'block-shift-rebuilt-01',
    coordinateSystem: '12x10 grid; origin top-left; x right; y down',
    objective: 'Dock the 3x1 service beam at (7,7), clear row 4, and push the 2x1 relic cart to (10,4).',
    player: state.player,
    facing: state.facing,
    blocks: state.blocks.map(({ id, kind, x, y, width, height, axis }) => ({ id, kind, x, y, width, height, axis })),
    goals: { relic: BLOCK_SHIFT_GOAL, serviceBay: BLOCK_SHIFT_BAY },
    relic,
    serviceBeam,
    moves: state.moves,
    pushes: state.pushes,
    canUndo: state.history.length > 0,
    status: state.status,
    message: state.message,
    controls: 'Arrow keys or WASD; touch D-pad; Z undo; R reset',
  };
}
