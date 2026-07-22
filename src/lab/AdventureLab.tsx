import { useCallback, useEffect, useRef, useState } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import {
  ADVENTURE_CHIP_TOTAL,
  ADVENTURE_EXIT,
  ADVENTURE_MAP,
  adventureSnapshot,
  initialAdventureState,
  moveAdventure,
  tickAdventure,
  type AdventureDirection,
  type AdventurePoint,
  type AdventureState,
} from './adventure';
import { PROTOTYPE_THEME, themeCss, type LabTheme } from './theme';
import { useSwipeDirection } from './useSwipeDirection';

const WIDTH = 390;
const HEIGHT = 844;
const TILE_W = 29;
const TILE_H = 21;
const ORIGIN = { x: 195, y: 178 };

function iso(point: AdventurePoint) {
  return { x: ORIGIN.x + (point.x - point.y) * TILE_W / 2, y: ORIGIN.y + (point.x + point.y) * TILE_H / 2 };
}

function diamond(ctx: CanvasRenderingContext2D, center: AdventurePoint, fill: string, stroke = '#ffffff24') {
  ctx.beginPath(); ctx.moveTo(center.x, center.y - TILE_H / 2); ctx.lineTo(center.x + TILE_W / 2, center.y); ctx.lineTo(center.x, center.y + TILE_H / 2); ctx.lineTo(center.x - TILE_W / 2, center.y); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
}

function drawWall(ctx: CanvasRenderingContext2D, center: AdventurePoint, theme: LabTheme) {
  const h = 23;
  ctx.beginPath(); ctx.moveTo(center.x, center.y - TILE_H / 2 - h); ctx.lineTo(center.x + TILE_W / 2, center.y - h); ctx.lineTo(center.x + TILE_W / 2, center.y); ctx.lineTo(center.x, center.y + TILE_H / 2); ctx.lineTo(center.x - TILE_W / 2, center.y); ctx.lineTo(center.x - TILE_W / 2, center.y - h); ctx.closePath();
  ctx.fillStyle = theme.surface; ctx.fill(); ctx.strokeStyle = '#ffffff25'; ctx.stroke();
  diamond(ctx, { x: center.x, y: center.y - h }, theme.surfaceAlt, '#ffffff46');
}

function drawItem(ctx: CanvasRenderingContext2D, tile: string, center: AdventurePoint, time: number, state: AdventureState, point: AdventurePoint, theme: LabTheme) {
  const key = `${point.x},${point.y}`;
  if (tile === 'c' && state.chips.includes(key)) return;
  const bob = Math.sin(time / 260 + point.x + point.y) * 2;
  ctx.save(); ctx.translate(center.x, center.y - 13 + bob);
  if (tile === 'c') {
    ctx.shadowColor = theme.accent; ctx.shadowBlur = 13; ctx.fillStyle = theme.accent;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 0); ctx.lineTo(0, 8); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
  } else if (tile === 'r' && !state.redKey || tile === 'b' && !state.blueKey) {
    ctx.strokeStyle = tile === 'r' ? '#ef7c69' : '#72bdf0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-3, -2, 5, 0, Math.PI * 2); ctx.moveTo(1, 1); ctx.lineTo(10, 10); ctx.moveTo(6, 6); ctx.lineTo(10, 2); ctx.stroke();
  } else if (tile === 't' && !state.boots) {
    ctx.fillStyle = '#75c9d2'; ctx.beginPath(); ctx.roundRect(-10, -6, 8, 14, 3); ctx.roundRect(2, -6, 8, 14, 3); ctx.fill();
  }
  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, center: AdventurePoint, color: string, open: boolean) {
  ctx.save(); ctx.translate(center.x, center.y - 21); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.globalAlpha = open ? .34 : 1;
  ctx.beginPath(); ctx.moveTo(-13, 13); ctx.lineTo(-13, -13); ctx.quadraticCurveTo(0, -27, 13, -13); ctx.lineTo(13, 13); ctx.stroke();
  if (!open) { ctx.fillStyle = `${color}aa`; ctx.fillRect(-10, -11, 20, 24); }
  ctx.restore();
}

function drawAdventure(ctx: CanvasRenderingContext2D, state: AdventureState, time: number, character: CharacterCustomization, theme: LabTheme) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT); sky.addColorStop(0, theme.skyTop); sky.addColorStop(.58, theme.skyMid); sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const halo = ctx.createRadialGradient(195, 330, 20, 195, 330, 300); halo.addColorStop(0, `${theme.accent}50`); halo.addColorStop(1, `${theme.accent}00`); ctx.fillStyle = halo; ctx.fillRect(0, 60, WIDTH, 620);
  ctx.fillStyle = '#07191d66'; ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(0, 125); ctx.lineTo(60, 164); ctx.lineTo(92, 570); ctx.fill(); ctx.beginPath(); ctx.moveTo(390, 560); ctx.lineTo(390, 125); ctx.lineTo(330, 164); ctx.lineTo(298, 570); ctx.fill();

  const entities: Array<{ depth: number; draw: () => void }> = [];
  ADVENTURE_MAP.forEach((row, y) => [...row].forEach((tile, x) => {
    const point = { x, y }; const center = iso(point); const depth = x + y;
    if (tile === '#') entities.push({ depth, draw: () => drawWall(ctx, center, theme) });
    else {
      diamond(ctx, center, tile === 'W' ? '#397b83' : tile === 'G' ? '#755e8f' : tile === 'o' ? state.plateActive ? theme.accent : '#8b7548' : (x + y) % 2 ? theme.surface : theme.surfaceAlt);
      if (tile === 'W') { ctx.strokeStyle = '#b9f5f45d'; ctx.beginPath(); ctx.arc(center.x, center.y, 8, 0, Math.PI); ctx.stroke(); }
      if (tile === 'R') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#ef7c69', state.redDoorOpen) });
      if (tile === 'B') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#72bdf0', state.blueDoorOpen) });
      if (tile === 'G') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#c19be8', state.chipGateOpen) });
      if ('crbt'.includes(tile)) entities.push({ depth: depth + .15, draw: () => drawItem(ctx, tile, center, time, state, point, theme) });
    }
  }));

  const crateCenter = iso(state.crate); entities.push({ depth: state.crate.x + state.crate.y + .6, draw: () => {
    ctx.fillStyle = state.plateActive ? theme.accent : '#b67947'; ctx.strokeStyle = '#fff7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(crateCenter.x - 13, crateCenter.y - 31, 26, 25, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5d3d2c'; ctx.beginPath(); ctx.moveTo(crateCenter.x - 8, crateCenter.y - 27); ctx.lineTo(crateCenter.x + 8, crateCenter.y - 11); ctx.moveTo(crateCenter.x + 8, crateCenter.y - 27); ctx.lineTo(crateCenter.x - 8, crateCenter.y - 11); ctx.stroke();
  } });

  const exit = iso(ADVENTURE_EXIT); const open = state.phase === 'portal-open' || state.phase === 'complete';
  entities.push({ depth: ADVENTURE_EXIT.x + ADVENTURE_EXIT.y + .1, draw: () => { ctx.save(); ctx.shadowColor = open ? theme.portal : '#51666a'; ctx.shadowBlur = open ? 22 : 4; ctx.strokeStyle = open ? theme.portal : '#51666a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(exit.x, exit.y - 27, 16, 29, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } });

  const player = iso(state.player); entities.push({ depth: state.player.x + state.player.y + .8, draw: () => drawCharacterCanvas(ctx, character, { x: player.x, groundY: player.y + 6, scale: .42, time, pose: state.phase === 'celebrating' || state.phase === 'complete' ? 'celebrate' : 'walk', facing: state.facing }) });
  entities.sort((a, b) => a.depth - b.depth).forEach((entity) => entity.draw());

  ctx.fillStyle = '#06171bd9'; ctx.beginPath(); ctx.roundRect(42, 442, 306, 74, 20); ctx.fill(); ctx.strokeStyle = `${theme.accent}77`; ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(state.phase === 'celebrating' ? 'ROOM SOLVED · CELEBRATING' : open ? 'PORTAL OPEN · WALK TO EXIT' : theme.worldName.toUpperCase(), 195, 463);
  ctx.fillStyle = '#fff'; ctx.font = '800 11px Inter, system-ui'; ctx.fillText(`${state.chips.length}/${ADVENTURE_CHIP_TOTAL} CHIPS  ·  ${state.plateActive ? 'PLATE POWERED' : 'PLATE DARK'}`, 195, 486);
  ctx.fillStyle = '#c6dcd8'; ctx.font = '700 8px Inter, system-ui'; ctx.fillText(`${state.redKey ? '◆' : '◇'} RED  ${state.blueKey ? '◆' : '◇'} BLUE  ${state.boots ? '◆' : '◇'} BOOTS  ${state.chipGateOpen ? '◆' : '◇'} CHIP GATE`, 195, 508);
}

function DirectionPad({ move, disabled }: { move: (direction: AdventureDirection) => void; disabled: boolean }) {
  return <div className="lab-dpad"><button className="up" disabled={disabled} onClick={() => move('up')} aria-label="Move up">↑</button><button className="left" disabled={disabled} onClick={() => move('left')} aria-label="Move left">←</button><span aria-hidden="true">◆</span><button className="right" disabled={disabled} onClick={() => move('right')} aria-label="Move right">→</button><button className="down" disabled={disabled} onClick={() => move('down')} aria-label="Move down">↓</button></div>;
}

export function AdventureLab({ onExit, onComplete, character, theme = PROTOTYPE_THEME, contextLabel = 'PRIMARY GAME' }: { onExit: () => void; onComplete?: () => void; character: CharacterCustomization; theme?: LabTheme; contextLabel?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<AdventureState>(initialAdventureState);
  const stateRef = useRef(state); const manualTime = useRef(false); const completionSent = useRef(false); const drawRef = useRef<(() => void) | null>(null);

  const commit = useCallback((update: (current: AdventureState) => AdventureState) => {
    const previous = stateRef.current; const next = update(previous); stateRef.current = next; setState(next); drawRef.current?.();
    if (next.moves !== previous.moves) navigator.vibrate?.(8);
  }, []);
  const move = useCallback((direction: AdventureDirection) => commit((current) => moveAdventure(current, direction)), [commit]);
  const reset = useCallback(() => { const next = initialAdventureState(); stateRef.current = next; setState(next); completionSent.current = false; }, []);

  useEffect(() => { if (state.phase === 'complete' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(); } }, [onComplete, state.phase]);
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0; const draw = () => { drawAdventure(ctx, stateRef.current, performance.now(), character, theme); frame = requestAnimationFrame(draw); };
    drawRef.current = () => drawAdventure(ctx, stateRef.current, performance.now(), character, theme); draw();
    return () => { cancelAnimationFrame(frame); drawRef.current = null; };
  }, [character, theme]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!manualTime.current) commit((current) => tickAdventure(current, 50)); }, 50);
    return () => window.clearInterval(timer);
  }, [commit]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(); const direction = key === 'arrowup' || key === 'w' ? 'up' : key === 'arrowdown' || key === 's' ? 'down' : key === 'arrowleft' || key === 'a' ? 'left' : key === 'arrowright' || key === 'd' ? 'right' : null;
      if (direction) { event.preventDefault(); move(direction); } else if (key === 'r') reset();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [move, reset]);
  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; commit((current) => tickAdventure(current, ms)); };
    bridge.render_game_to_text = () => JSON.stringify({ ...adventureSnapshot(stateRef.current), character, theme: { id: theme.id, worldName: theme.worldName, portalName: theme.portalName } });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character, commit, theme]);
  const tapMove = useCallback(({ x, y }: { x: number; y: number }) => {
    const dx = x - .5; const dy = y - .48;
    move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  }, [move]);
  const swipe = useSwipeDirection(move, state.phase === 'celebrating' || state.phase === 'complete', tapMove);

  return <section className="lab-screen adventure-lab-screen" aria-label="Adventure primary puzzle" style={themeCss(theme)}>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Adventure game world" {...swipe} />
    <header className="lab-header"><button className="icon-button glass" onClick={onExit} aria-label="Back to Lab corridor">←</button><div><span>{contextLabel}</span><h1>Adventure · Venture Circuit</h1></div><button className="lab-small-button glass" onClick={reset}>RESET</button></header>
    <div className="lab-brief"><div><strong>{state.chips.length}/{ADVENTURE_CHIP_TOTAL}</strong><small>chips</small></div><p>Clear both locks and the chip gate, cross the flood, then push the crate onto its plate.</p><div><strong>{state.moves}</strong><small>moves</small></div></div>
    <div className={`lab-message ${state.phase === 'complete' ? 'complete' : ''}`} aria-live="polite">{state.message}</div>
    <div className="lab-controls"><button className="lab-utility side-note" disabled>GEAR<small>{state.redKey ? '◆' : '◇'} {state.blueKey ? '◆' : '◇'} {state.boots ? '◆' : '◇'}</small></button><DirectionPad move={move} disabled={state.phase === 'celebrating' || state.phase === 'complete'} /><button className="lab-utility" onClick={reset}>RESET<small>R</small></button><p>Tap or swipe the world, tap arrows, or use WASD / arrow keys</p></div>
  </section>;
}
