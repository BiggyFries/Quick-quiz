import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BLOCK_SHIFT_GOAL,
  BLOCK_SHIFT_HEIGHT,
  BLOCK_SHIFT_WALLS,
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

interface VisualTransition {
  from: BlockShiftState;
  to: BlockShiftState;
  startedAt: number;
  durationMs: number;
}

const TILE_W = 52;
const TILE_H = 28;
const ORIGIN = { x: 195, y: 150 };

function iso(point: GridPoint) {
  return {
    x: ORIGIN.x + (point.x - point.y) * TILE_W / 2,
    y: ORIGIN.y + (point.x + point.y) * TILE_H / 2,
  };
}

function lerp(a: number, b: number, progress: number) {
  return a + (b - a) * progress;
}

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

function drawDiamond(ctx: CanvasRenderingContext2D, point: GridPoint, fill: string, stroke?: string) {
  const center = iso(point);
  path(ctx, [
    { x: center.x, y: center.y - TILE_H / 2 },
    { x: center.x + TILE_W / 2, y: center.y },
    { x: center.x, y: center.y + TILE_H / 2 },
    { x: center.x - TILE_W / 2, y: center.y },
  ]);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
}

function drawWall(ctx: CanvasRenderingContext2D, point: GridPoint) {
  const center = iso(point);
  const height = 24;
  drawDiamond(ctx, { x: point.x, y: point.y }, '#536c69', '#8ba19b');
  path(ctx, [
    { x: center.x - TILE_W / 2, y: center.y },
    { x: center.x, y: center.y + TILE_H / 2 },
    { x: center.x, y: center.y + TILE_H / 2 + height },
    { x: center.x - TILE_W / 2, y: center.y + height },
  ]);
  ctx.fillStyle = '#263f40'; ctx.fill();
  path(ctx, [
    { x: center.x + TILE_W / 2, y: center.y },
    { x: center.x, y: center.y + TILE_H / 2 },
    { x: center.x, y: center.y + TILE_H / 2 + height },
    { x: center.x + TILE_W / 2, y: center.y + height },
  ]);
  ctx.fillStyle = '#1d3437'; ctx.fill();
}

function drawCube(ctx: CanvasRenderingContext2D, block: ShiftBlock, point: GridPoint, pulse: number) {
  const center = iso(point);
  const halfW = block.kind === 'keystone' ? 20 : 22;
  const halfH = block.kind === 'keystone' ? 10 : 12;
  const height = block.kind === 'keystone' ? 28 : 34;
  const topY = center.y - height;
  ctx.save();
  if (block.kind === 'keystone') {
    ctx.shadowColor = block.color;
    ctx.shadowBlur = 13 + pulse * 7;
  }
  path(ctx, [
    { x: center.x - halfW, y: center.y - halfH }, { x: center.x, y: center.y },
    { x: center.x, y: topY + halfH }, { x: center.x - halfW, y: topY },
  ]);
  ctx.fillStyle = colorShade(block.color, -42); ctx.fill();
  path(ctx, [
    { x: center.x + halfW, y: center.y - halfH }, { x: center.x, y: center.y },
    { x: center.x, y: topY + halfH }, { x: center.x + halfW, y: topY },
  ]);
  ctx.fillStyle = colorShade(block.color, -68); ctx.fill();
  path(ctx, [
    { x: center.x, y: topY - halfH }, { x: center.x + halfW, y: topY },
    { x: center.x, y: topY + halfH }, { x: center.x - halfW, y: topY },
  ]);
  ctx.fillStyle = block.color; ctx.fill();
  ctx.strokeStyle = '#fff9'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = block.kind === 'keystone' ? '#263334' : '#f8fbf7';
  ctx.font = '800 9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(block.kind === 'keystone' ? 'KEY' : block.label.slice(0, 1), center.x, topY + 1);
  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, open: boolean, time: number) {
  const center = iso(BLOCK_SHIFT_GOAL);
  const pulse = (Math.sin(time / 260) + 1) / 2;
  ctx.save();
  ctx.shadowColor = open ? '#f6c85f' : '#55d4c1';
  ctx.shadowBlur = 15 + pulse * 10;
  ctx.fillStyle = open ? '#f6c85f' : '#42a99d';
  ctx.beginPath();
  ctx.roundRect(center.x - 25, center.y - 79, 50, 70, [23, 23, 5, 5]);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = open ? '#fff2b0' : '#102d31';
  ctx.beginPath();
  ctx.roundRect(center.x - 18, center.y - 69, 36, 60, [18, 18, 3, 3]);
  ctx.fill();
  ctx.strokeStyle = '#f7fbf0aa'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(center.x, center.y - 64); ctx.lineTo(center.x, center.y - 17); ctx.stroke();
  ctx.restore();
}

function drawExplorer(ctx: CanvasRenderingContext2D, point: GridPoint, time: number, complete: boolean) {
  const center = iso(point);
  const bob = complete ? -Math.abs(Math.sin(time / 150)) * 7 : Math.sin(time / 480) * 1.3;
  const x = center.x;
  const y = center.y - 21 + bob;
  const wave = complete ? Math.sin(time / 130) * 5 : 0;
  ctx.save();
  ctx.fillStyle = '#07171b55'; ctx.beginPath(); ctx.ellipse(x, center.y + 5, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4e4039'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 6, y + 21); ctx.lineTo(x - 9, y + 36); ctx.moveTo(x + 6, y + 21); ctx.lineTo(x + 9, y + 36); ctx.stroke();
  ctx.strokeStyle = '#2a3337'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x - 13, y + 36); ctx.lineTo(x - 6, y + 36); ctx.moveTo(x + 7, y + 36); ctx.lineTo(x + 14, y + 36); ctx.stroke();
  ctx.fillStyle = '#c77743'; ctx.beginPath(); ctx.roundRect(x - 14, y - 8, 28, 32, 8); ctx.fill();
  ctx.fillStyle = '#f0b45b'; path(ctx, [{ x: x - 12, y: y - 7 }, { x: x + 10, y: y + 21 }, { x: x + 14, y: y - 7 }]); ctx.fill();
  ctx.strokeStyle = '#c77743'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x - 20, y + 12 - wave); ctx.moveTo(x + 11, y); ctx.lineTo(x + 20, y + 10 + wave); ctx.stroke();
  ctx.fillStyle = '#d99b72'; ctx.beginPath(); ctx.ellipse(x, y - 20, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e302b'; ctx.beginPath(); ctx.ellipse(x - 2, y - 29, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b2b30'; ctx.beginPath(); ctx.arc(x - 4, y - 21, 1.5, 0, Math.PI * 2); ctx.arc(x + 4, y - 21, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7b4e36'; ctx.beginPath(); ctx.roundRect(x - 16, y - 38, 33, 6, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(x - 9, y - 45, 20, 9, 4); ctx.fill();
  ctx.strokeStyle = '#55b7a5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 10); ctx.lineTo(x - 23, y - 14); ctx.stroke();
  ctx.restore();
}

function animatedPoint(transition: VisualTransition | null, id: string, current: GridPoint, now: number) {
  if (!transition) return current;
  const progress = Math.min(1, Math.max(0, (now - transition.startedAt) / transition.durationMs));
  const eased = 1 - Math.pow(1 - progress, 3);
  const from = id === 'player' ? transition.from.player : transition.from.blocks.find((block) => block.id === id) ?? current;
  const to = id === 'player' ? transition.to.player : transition.to.blocks.find((block) => block.id === id) ?? current;
  return { x: lerp(from.x, to.x, eased), y: lerp(from.y, to.y, eased) };
}

function drawLab(ctx: CanvasRenderingContext2D, state: BlockShiftState, transition: VisualTransition | null, time: number) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#183d42'); sky.addColorStop(0.55, '#32686a'); sky.addColorStop(1, '#10282e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(195, 205, 15, 195, 205, 240);
  light.addColorStop(0, '#d9f1cf40'); light.addColorStop(1, '#19383d00');
  ctx.fillStyle = light; ctx.fillRect(0, 70, width, 430);

  ctx.fillStyle = '#0b20265c';
  ctx.beginPath(); ctx.moveTo(0, 480); ctx.lineTo(0, 170); ctx.lineTo(85, 115); ctx.lineTo(110, 480); ctx.fill();
  ctx.beginPath(); ctx.moveTo(390, 480); ctx.lineTo(390, 170); ctx.lineTo(305, 115); ctx.lineTo(280, 480); ctx.fill();

  for (let y = 1; y < BLOCK_SHIFT_HEIGHT - 1; y += 1) {
    for (let x = 0; x < BLOCK_SHIFT_WIDTH; x += 1) {
      const rail = y === 3;
      drawDiamond(ctx, { x, y }, rail ? '#b5b18e' : (x + y) % 2 ? '#78918a' : '#849d94', '#d4e0ce42');
      if (rail) {
        const center = iso({ x, y });
        ctx.strokeStyle = '#f5d47780'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(center.x - 17, center.y); ctx.lineTo(center.x + 17, center.y); ctx.stroke();
      }
    }
  }
  BLOCK_SHIFT_WALLS.forEach((wall) => drawWall(ctx, wall));
  drawDoor(ctx, state.status === 'complete', time);

  const pulse = (Math.sin(time / 240) + 1) / 2;
  const entities: Array<{ depth: number; draw: () => void }> = state.blocks.map((block) => {
    const point = animatedPoint(transition, block.id, block, time);
    return { depth: point.x + point.y, draw: () => drawCube(ctx, block, point, pulse) };
  });
  const playerPoint = animatedPoint(transition, 'player', state.player, time);
  entities.push({ depth: playerPoint.x + playerPoint.y + 0.2, draw: () => drawExplorer(ctx, playerPoint, time, state.status === 'complete') });
  entities.sort((a, b) => a.depth - b.depth).forEach((entity) => entity.draw());

  if (state.status === 'complete') {
    ctx.fillStyle = '#06171bb8'; ctx.beginPath(); ctx.roundRect(55, 392, 280, 66, 18); ctx.fill();
    ctx.fillStyle = '#f6c85f'; ctx.font = '900 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PUZZLE CLEARED', 195, 416);
    ctx.fillStyle = '#fff'; ctx.font = '700 15px Inter, system-ui, sans-serif'; ctx.fillText('The next door is open', 195, 440);
  }
}

export function BlockShiftLab({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState(initialBlockShiftState);
  const stateRef = useRef(state);
  const transitionRef = useRef<VisualTransition | null>(null);
  const manualTimeOffset = useRef(0);
  const drawNowRef = useRef<(() => void) | null>(null);

  const commit = useCallback((update: (current: BlockShiftState) => BlockShiftState) => {
    setState((current) => {
      const next = update(current);
      if (next.moves !== current.moves || next.player.x !== current.player.x || next.player.y !== current.player.y) {
        transitionRef.current = { from: current, to: next, startedAt: performance.now() + manualTimeOffset.current, durationMs: 190 };
      }
      stateRef.current = next;
      navigator.vibrate?.(next.pushes > current.pushes ? 24 : 10);
      return next;
    });
  }, []);

  const move = useCallback((direction: LabDirection) => commit((current) => moveBlockShift(current, direction)), [commit]);
  const undo = useCallback(() => commit(undoBlockShift), [commit]);
  const reset = useCallback(() => {
    transitionRef.current = null;
    const next = initialBlockShiftState();
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    const render = () => {
      const time = performance.now() + manualTimeOffset.current;
      drawLab(ctx, stateRef.current, transitionRef.current, time);
      frame = requestAnimationFrame(render);
    };
    drawNowRef.current = () => drawLab(ctx, stateRef.current, transitionRef.current, performance.now() + manualTimeOffset.current);
    render();
    return () => { cancelAnimationFrame(frame); drawNowRef.current = null; };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      const direction = key === 'arrowup' || key === 'w' ? 'up'
        : key === 'arrowdown' || key === 's' ? 'down'
          : key === 'arrowleft' || key === 'a' ? 'left'
            : key === 'arrowright' || key === 'd' ? 'right' : null;
      if (direction) { event.preventDefault(); move(direction); }
      else if (key === 'z') { event.preventDefault(); undo(); }
      else if (key === 'r') { event.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, reset, undo]);

  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTimeOffset.current += ms; drawNowRef.current?.(); };
    bridge.render_game_to_text = () => JSON.stringify(blockShiftSnapshot(stateRef.current));
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, []);

  return <section className="lab-screen" aria-label="Preview tester game">
    <canvas ref={canvasRef} width="390" height="844" aria-label="Block Shift puzzle room" />
    <header className="lab-header">
      <button className="icon-button glass" onClick={onExit} aria-label="Back to home">←</button>
      <div><span>PREVIEW TESTER GAME</span><h1>Block Shift · Lab 01</h1></div>
      <button className="lab-small-button glass" onClick={reset}>RESET</button>
    </header>
    <div className="lab-brief">
      <div><strong>{state.moves}</strong><small>moves</small></div>
      <p>Push the gold keystone along its rail. Move the three colored blocks out of its path.</p>
      <div><strong>{state.pushes}</strong><small>pushes</small></div>
    </div>
    <div className={`lab-message ${state.status === 'complete' ? 'complete' : ''}`} aria-live="polite">{state.message}</div>
    <div className="lab-controls" aria-label="Movement controls">
      <button className="lab-utility" onClick={undo} disabled={!state.history.length}>UNDO <small>Z</small></button>
      <div className="lab-dpad">
        <button className="up" onClick={() => move('up')} aria-label="Move up">↑</button>
        <button className="left" onClick={() => move('left')} aria-label="Move left">←</button>
        <span aria-hidden="true">◆</span>
        <button className="right" onClick={() => move('right')} aria-label="Move right">→</button>
        <button className="down" onClick={() => move('down')} aria-label="Move down">↓</button>
      </div>
      <button className="lab-utility" onClick={reset}>RESET <small>R</small></button>
      <p>Touch the arrows · Desktop: Arrow keys or WASD</p>
    </div>
  </section>;
}
