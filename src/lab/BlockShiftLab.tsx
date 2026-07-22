import { useCallback, useEffect, useRef, useState } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import {
  BLOCK_SHIFT_GOAL,
  BLOCK_SHIFT_HEIGHT,
  BLOCK_SHIFT_WIDTH,
  blockShiftSnapshot,
  initialBlockShiftState,
  moveBlockShift,
  undoBlockShift,
  type BlockShiftState,
  type GridPoint,
  type LabDirection,
  type ShiftBlock,
} from './blockShift';
import { PROTOTYPE_THEME, themeCss, type LabTheme } from './theme';
import { useSwipeDirection } from './useSwipeDirection';
import { beginVictoryJourney, idleVictoryJourney, moveVictoryJourney, tickVictoryJourney, victoryJourneyMessage, type VictoryJourney } from './victory';

interface VisualTransition {
  from: BlockShiftState;
  to: BlockShiftState;
  startedAt: number;
  durationMs: number;
  pushed: boolean;
}

const TILE_W = 43;
const TILE_H = 31;
const ORIGIN = { x: 195, y: 210 };

function iso(point: GridPoint) {
  return {
    x: ORIGIN.x + (point.x - point.y) * TILE_W / 2,
    y: ORIGIN.y + (point.x + point.y) * TILE_H / 2,
  };
}

function lerp(a: number, b: number, progress: number) { return a + (b - a) * progress; }

function colorShade(color: string, amount: number) {
  const value = Number.parseInt(color.slice(1), 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, (value >> shift & 255) + amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function path(ctx: CanvasRenderingContext2D, points: GridPoint[], close = true) {
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  if (close) ctx.closePath();
}

function footprint(point: GridPoint, width = 1, height = 1) {
  const north = iso(point);
  const east = iso({ x: point.x + width - 1, y: point.y });
  const south = iso({ x: point.x + width - 1, y: point.y + height - 1 });
  const west = iso({ x: point.x, y: point.y + height - 1 });
  return [
    { x: north.x, y: north.y - TILE_H / 2 },
    { x: east.x + TILE_W / 2, y: east.y },
    { x: south.x, y: south.y + TILE_H / 2 },
    { x: west.x - TILE_W / 2, y: west.y },
  ];
}

function drawTile(ctx: CanvasRenderingContext2D, point: GridPoint, fill: string, stroke = '#e2ede059') {
  path(ctx, footprint(point));
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
}

function drawPrism(ctx: CanvasRenderingContext2D, block: ShiftBlock, point: GridPoint, pulse: number) {
  const base = footprint(point, block.width, block.height);
  const height = block.kind === 'keystone' ? 23 : 29 + Math.min(7, block.width + block.height);
  const top = base.map((item) => ({ x: item.x, y: item.y - height }));
  ctx.save();
  if (block.kind === 'keystone') { ctx.shadowColor = block.color; ctx.shadowBlur = 14 + pulse * 8; }
  path(ctx, [top[1], top[2], base[2], base[1]]); ctx.fillStyle = colorShade(block.color, -62); ctx.fill();
  path(ctx, [top[2], top[3], base[3], base[2]]); ctx.fillStyle = colorShade(block.color, -38); ctx.fill();
  path(ctx, top); ctx.fillStyle = block.color; ctx.fill(); ctx.strokeStyle = '#fff9'; ctx.lineWidth = 1.2; ctx.stroke();
  const centerX = top.reduce((sum, item) => sum + item.x, 0) / 4;
  const centerY = top.reduce((sum, item) => sum + item.y, 0) / 4;
  ctx.shadowBlur = 0; ctx.fillStyle = block.kind === 'keystone' ? '#2b3434' : '#f8fbf7';
  ctx.font = '900 8px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const axis = block.axis === 'horizontal' ? '↔' : block.axis === 'vertical' ? '↕' : '◆';
  ctx.fillText(block.kind === 'keystone' ? 'KEY  ↔' : `${block.width}×${block.height}  ${axis}`, centerX, centerY);
  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, open: boolean, time: number) {
  const center = iso({ x: BLOCK_SHIFT_WIDTH - 1, y: BLOCK_SHIFT_GOAL.y });
  const pulse = (Math.sin(time / 260) + 1) / 2;
  ctx.save(); ctx.shadowColor = open ? '#f6c85f' : '#5ce3d1'; ctx.shadowBlur = 15 + pulse * 9;
  ctx.strokeStyle = open ? '#ffe18a' : '#5ce3d1'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(center.x + 22, center.y - 12); ctx.lineTo(center.x + 22, center.y - 70);
  ctx.quadraticCurveTo(center.x + 22, center.y - 88, center.x + 5, center.y - 88);
  ctx.lineTo(center.x - 11, center.y - 88); ctx.stroke();
  ctx.fillStyle = open ? '#fff2ac99' : '#123d41cc'; ctx.fillRect(center.x - 10, center.y - 82, 31, 70);
  ctx.restore();
}

function transitionProgress(transition: VisualTransition | null, now: number) {
  if (!transition) return 1;
  return Math.min(1, Math.max(0, (now - transition.startedAt) / transition.durationMs));
}

function animatedPoint(transition: VisualTransition | null, id: string, current: GridPoint, now: number) {
  if (!transition) return current;
  const progress = transitionProgress(transition, now);
  const eased = 1 - Math.pow(1 - progress, 3);
  const from = id === 'player' ? transition.from.player : transition.from.blocks.find((block) => block.id === id) ?? current;
  const to = id === 'player' ? transition.to.player : transition.to.blocks.find((block) => block.id === id) ?? current;
  return { x: lerp(from.x, to.x, eased), y: lerp(from.y, to.y, eased) };
}

function drawExplorer(ctx: CanvasRenderingContext2D, point: GridPoint, time: number, transition: VisualTransition | null, complete: boolean) {
  const center = iso(point);
  const progress = transitionProgress(transition, time);
  const moving = Boolean(transition) && progress < 1;
  const pushing = moving && Boolean(transition?.pushed);
  const stride = moving ? Math.sin(progress * Math.PI * 3) : Math.sin(time / 480) * .12;
  const celebrate = complete ? Math.abs(Math.sin(time / 165)) * 7 : 0;
  const bob = moving ? Math.abs(stride) * 2 : Math.sin(time / 520) * 1.1;
  const x = center.x;
  const y = center.y - 25 + bob - celebrate;
  const lean = pushing ? 4 : moving ? 1.5 : 0;
  ctx.save();
  ctx.fillStyle = '#07171b66'; ctx.beginPath(); ctx.ellipse(x, center.y + 6, moving ? 18 : 15, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4e4039'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6 + lean, y + 23); ctx.lineTo(x - 8 - stride * 6, y + 39);
  ctx.moveTo(x + 6 + lean, y + 23); ctx.lineTo(x + 8 + stride * 6, y + 39); ctx.stroke();
  ctx.strokeStyle = '#29363a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x - 13 - stride * 6, y + 39); ctx.lineTo(x - 6 - stride * 6, y + 39);
  ctx.moveTo(x + 6 + stride * 6, y + 39); ctx.lineTo(x + 13 + stride * 6, y + 39); ctx.stroke();
  ctx.fillStyle = '#c77743'; ctx.beginPath(); ctx.roundRect(x - 14 + lean, y - 7, 28, 33, 8); ctx.fill();
  ctx.fillStyle = '#f0b45b'; path(ctx, [{ x: x - 11 + lean, y: y - 6 }, { x: x + lean, y: y + 23 }, { x: x + 14 + lean, y: y - 6 }]); ctx.fill();
  ctx.strokeStyle = '#c77743'; ctx.lineWidth = 5;
  const armReach = pushing ? 22 : 15;
  ctx.beginPath();
  ctx.moveTo(x - 10 + lean, y + 1); ctx.lineTo(x - armReach + (pushing ? 8 : -stride * 4), y + 12);
  ctx.moveTo(x + 11 + lean, y + 1); ctx.lineTo(x + armReach + (pushing ? 8 : stride * 4), y + 10); ctx.stroke();
  ctx.fillStyle = '#d99b72'; ctx.beginPath(); ctx.ellipse(x + lean, y - 20, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e302b'; ctx.beginPath(); ctx.ellipse(x - 2 + lean, y - 29, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b2b30'; ctx.beginPath(); ctx.arc(x - 4 + lean, y - 21, 1.5, 0, Math.PI * 2); ctx.arc(x + 4 + lean, y - 21, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7b4e36'; ctx.beginPath(); ctx.roundRect(x - 16 + lean, y - 38, 33, 6, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(x - 9 + lean, y - 45, 20, 9, 4); ctx.fill();
  ctx.strokeStyle = '#55b7a5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7 + lean, y - 10); ctx.lineTo(x - 23 + lean, y - 15 - stride * 2); ctx.stroke();
  ctx.restore();
}

function drawCustomizedExplorer(ctx: CanvasRenderingContext2D, point: GridPoint, time: number, transition: VisualTransition | null, complete: boolean, facing: LabDirection, character: CharacterCustomization) {
  const center = iso(point); const progress = transitionProgress(transition, time); const moving = Boolean(transition) && progress < 1;
  const delta = facing === 'left' ? { x: -.2, y: 0 } : facing === 'right' ? { x: .2, y: 0 } : facing === 'up' ? { x: 0, y: -.2 } : { x: 0, y: .2 };
  const safeCenter = moving && transition?.pushed ? iso({ x: point.x - delta.x, y: point.y - delta.y }) : center;
  drawCharacterCanvas(ctx, character, { x: safeCenter.x, groundY: safeCenter.y + 9, scale: .54, time, pose: complete ? 'celebrate' : moving && transition?.pushed ? 'push' : moving ? 'walk' : 'idle', facing });
}

function drawVictoryInRoom(ctx: CanvasRenderingContext2D, state: BlockShiftState, journey: VictoryJourney, time: number, character: CharacterCustomization, theme: LabTheme) {
  if (journey.phase === 'idle') return;
  const start = iso(state.player); const portal = iso({ x: BLOCK_SHIFT_WIDTH - .05, y: BLOCK_SHIFT_GOAL.y }); const progress = journey.x / 4;
  const x = start.x + (portal.x - start.x) * progress + journey.lane * 7;
  const y = start.y + (portal.y - start.y) * progress + journey.lane * 19;
  if (journey.phase !== 'celebrating') {
    const pulse = 1 + Math.sin(time / 230) * .04; ctx.save(); ctx.shadowColor = theme.portal; ctx.shadowBlur = 18; ctx.strokeStyle = theme.portal; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(portal.x + 14, portal.y - 36, 19 * pulse, 35 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  drawCharacterCanvas(ctx, character, { x, groundY: y + 8, scale: .54, time, pose: journey.phase === 'celebrating' || journey.phase === 'departed' ? 'celebrate' : 'walk', facing: 'right' });
}

function drawLab(ctx: CanvasRenderingContext2D, state: BlockShiftState, transition: VisualTransition | null, time: number, character: CharacterCustomization, journey: VictoryJourney, theme: LabTheme) {
  const sky = ctx.createLinearGradient(0, 0, 0, 844);
  sky.addColorStop(0, theme.skyTop); sky.addColorStop(.55, theme.skyMid); sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 390, 844);
  const halo = ctx.createRadialGradient(195, 340, 20, 195, 340, 260);
  halo.addColorStop(0, '#dff7cf4d'); halo.addColorStop(1, '#18383d00'); ctx.fillStyle = halo; ctx.fillRect(0, 115, 390, 500);
  ctx.fillStyle = '#0b252b4a'; ctx.beginPath(); ctx.moveTo(0, 510); ctx.lineTo(0, 175); ctx.lineTo(68, 135); ctx.lineTo(96, 510); ctx.fill();
  ctx.beginPath(); ctx.moveTo(390, 510); ctx.lineTo(390, 175); ctx.lineTo(322, 135); ctx.lineTo(294, 510); ctx.fill();

  for (let y = 0; y < BLOCK_SHIFT_HEIGHT; y += 1) {
    for (let x = 0; x < BLOCK_SHIFT_WIDTH; x += 1) {
      const rail = y === BLOCK_SHIFT_GOAL.y;
      drawTile(ctx, { x, y }, rail ? '#bdb38a' : (x + y) % 2 ? '#7e9a91' : '#8aa59a');
      if (rail) {
        const center = iso({ x, y }); ctx.strokeStyle = '#ffe08b99'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(center.x - 15, center.y); ctx.lineTo(center.x + 15, center.y); ctx.stroke();
      }
    }
  }
  const lowerLeft = footprint({ x: 0, y: BLOCK_SHIFT_HEIGHT - 1 })[3];
  const lowerRight = footprint({ x: BLOCK_SHIFT_WIDTH - 1, y: BLOCK_SHIFT_HEIGHT - 1 })[2];
  path(ctx, [lowerLeft, lowerRight, { x: lowerRight.x, y: lowerRight.y + 25 }, { x: lowerLeft.x, y: lowerLeft.y + 25 }]); ctx.fillStyle = '#234b4e'; ctx.fill();
  drawDoor(ctx, state.status === 'complete', time);

  const pulse = (Math.sin(time / 250) + 1) / 2;
  const entities: Array<{ depth: number; draw: () => void }> = state.blocks.map((block) => {
    const point = animatedPoint(transition, block.id, block, time);
    return { depth: point.x + block.width + point.y + block.height, draw: () => drawPrism(ctx, block, point, pulse) };
  });
  const playerPoint = animatedPoint(transition, 'player', state.player, time);
  if (journey.phase === 'idle') entities.push({ depth: playerPoint.x + playerPoint.y + 1.4, draw: () => drawCustomizedExplorer(ctx, playerPoint, time, transition, false, state.facing, character) });
  entities.sort((a, b) => a.depth - b.depth).forEach((entity) => entity.draw());
  drawVictoryInRoom(ctx, state, journey, time, character, theme);

  if (state.status === 'complete' && journey.phase === 'departed') {
    ctx.fillStyle = '#06171bc7'; ctx.beginPath(); ctx.roundRect(55, 505, 280, 63, 18); ctx.fill();
    ctx.fillStyle = '#f6c85f'; ctx.font = '900 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PUZZLE CLEARED', 195, 528);
    ctx.fillStyle = '#fff'; ctx.font = '700 15px Inter, system-ui, sans-serif'; ctx.fillText('The challenge door is open', 195, 551);
  }
}

export function BlockShiftLab({ onExit, onComplete, character, theme = PROTOTYPE_THEME, contextLabel = 'PREVIEW TESTER GAME' }: { onExit: () => void; onComplete?: () => void; character: CharacterCustomization; theme?: LabTheme; contextLabel?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState(initialBlockShiftState);
  const stateRef = useRef(state);
  const transitionRef = useRef<VisualTransition | null>(null);
  const manualTimeOffset = useRef(0);
  const drawNowRef = useRef<(() => void) | null>(null);
  const [journey, setJourney] = useState<VictoryJourney>(idleVictoryJourney);
  const journeyRef = useRef(journey); const manualTime = useRef(false); const completionSent = useRef(false);

  const updateJourney = useCallback((update: (current: VictoryJourney) => VictoryJourney) => {
    const next = update(journeyRef.current); journeyRef.current = next; setJourney(next); drawNowRef.current?.();
  }, []);

  const commit = useCallback((update: (current: BlockShiftState) => BlockShiftState) => {
    setState((current) => {
      const next = update(current);
      const changedBlock = next.blocks.some((block) => {
        const before = current.blocks.find((item) => item.id === block.id);
        return before?.x !== block.x || before.y !== block.y;
      });
      if (next.moves !== current.moves || next.player.x !== current.player.x || next.player.y !== current.player.y) {
        transitionRef.current = { from: current, to: next, startedAt: performance.now() + manualTimeOffset.current, durationMs: changedBlock ? 260 : 215, pushed: changedBlock };
      }
      stateRef.current = next;
      if (current.status !== 'complete' && next.status === 'complete') updateJourney(() => beginVictoryJourney());
      navigator.vibrate?.(changedBlock ? 24 : next.moves !== current.moves ? 9 : 5);
      return next;
    });
  }, [updateJourney]);

  const move = useCallback((direction: LabDirection) => {
    if (journeyRef.current.phase !== 'idle') updateJourney((current) => moveVictoryJourney(current, direction));
    else commit((current) => moveBlockShift(current, direction));
  }, [commit, updateJourney]);
  const undo = useCallback(() => {
    if (journeyRef.current.phase !== 'idle') return;
    commit(undoBlockShift);
  }, [commit]);
  const reset = useCallback(() => {
    transitionRef.current = null; const next = initialBlockShiftState(); stateRef.current = next; setState(next); completionSent.current = false;
    const idle = idleVictoryJourney(); journeyRef.current = idle; setJourney(idle);
  }, []);

  useEffect(() => { if (journey.phase === 'departed' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(); } }, [journey.phase, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0;
    const render = () => { const time = performance.now() + manualTimeOffset.current; drawLab(ctx, stateRef.current, transitionRef.current, time, character, journeyRef.current, theme); frame = requestAnimationFrame(render); };
    drawNowRef.current = () => drawLab(ctx, stateRef.current, transitionRef.current, performance.now() + manualTimeOffset.current, character, journeyRef.current, theme);
    render(); return () => { cancelAnimationFrame(frame); drawNowRef.current = null; };
  }, [character, theme]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (!manualTime.current && journeyRef.current.phase === 'celebrating') updateJourney((current) => tickVictoryJourney(current, 50)); }, 50);
    return () => window.clearInterval(interval);
  }, [updateJourney]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      const direction = key === 'arrowup' || key === 'w' ? 'up' : key === 'arrowdown' || key === 's' ? 'down' : key === 'arrowleft' || key === 'a' ? 'left' : key === 'arrowright' || key === 'd' ? 'right' : null;
      if (direction) { event.preventDefault(); move(direction); }
      else if (key === 'z') { event.preventDefault(); undo(); }
      else if (key === 'r') { event.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [move, reset, undo]);

  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; manualTimeOffset.current += ms; updateJourney((current) => tickVictoryJourney(current, ms)); drawNowRef.current?.(); };
    bridge.render_game_to_text = () => JSON.stringify({ ...blockShiftSnapshot(stateRef.current), victory: journeyRef.current, character, theme: { id: theme.id, worldName: theme.worldName } });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character, theme, updateJourney]);

  const tapMove = useCallback(({ x, y }: { x: number; y: number }) => {
    const dx = x - .5; const dy = y - .46; move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  }, [move]);
  const swipe = useSwipeDirection(move, journey.phase === 'celebrating' || journey.phase === 'departed', tapMove);

  return <section className="lab-screen" aria-label="Block Shift tester game" style={themeCss(theme)}>
    <canvas ref={canvasRef} width="390" height="844" aria-label="Block Shift puzzle room" {...swipe} />
    <header className="lab-header">
      <button className="icon-button glass" onClick={onExit} aria-label="Back to puzzle labs">←</button>
      <div><span>{contextLabel}</span><h1>Block Shift · Lab 01</h1></div>
      <span className="lab-number" aria-hidden="true">01</span>
    </header>
    <div className="lab-brief">
      <div><strong>{state.moves}</strong><small>moves</small></div>
      <p>Slide the varied-size pieces from the gold lane. Arrows show how each piece can move.</p>
      <div><strong>{state.pushes}</strong><small>pushes</small></div>
    </div>
    <div className="lab-tool-row">
      <button className="lab-utility" onClick={undo} disabled={!state.history.length || journey.phase !== 'idle'}>↶ UNDO <small>Z</small></button>
      <button className="lab-utility" onClick={reset}>RESET ↻ <small>R</small></button>
    </div>
    <div className={`lab-message ${state.status === 'complete' ? 'complete' : ''}`} aria-live="polite">{journey.phase === 'idle' ? state.message : victoryJourneyMessage(journey, 'challenge door')}</div>
    <div className="lab-controls block-controls" aria-label="Movement controls">
      <div className="lab-dpad">
        <button className="up" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('up')} aria-label="Move up">↑</button>
        <button className="left" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('left')} aria-label="Move left">←</button>
        <span aria-hidden="true">◆</span>
        <button className="right" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('right')} aria-label="Move right">→</button>
        <button className="down" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('down')} aria-label="Move down">↓</button>
      </div>
      <p>Tap or swipe the world · Walk into the in-room door after solving</p>
    </div>
  </section>;
}
