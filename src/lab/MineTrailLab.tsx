import { useCallback, useEffect, useRef, useState } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import type { GridPoint, LabDirection } from './blockShift';
import {
  MINE_TRAIL_HEIGHT,
  MINE_TRAIL_WIDTH,
  adjacentMineCount,
  initialMineTrailState,
  isMine,
  mineTrailSnapshot,
  moveMineTrail,
  revealMineTrail,
  type MineTrailState,
} from './mineTrail';
import { PROTOTYPE_THEME, themeCss, type LabTheme } from './theme';
import { useSwipeDirection } from './useSwipeDirection';
import { beginVictoryJourney, idleVictoryJourney, moveVictoryJourney, tickVictoryJourney, victoryJourneyMessage, type VictoryJourney } from './victory';

interface MoveTransition { from: GridPoint; to: GridPoint; startedAt: number; durationMs: number }

const TILE_W = 68;
const TILE_H = 37;
const ORIGIN = { x: 195, y: 275 };
const key = (point: GridPoint) => `${point.x},${point.y}`;

function iso(point: GridPoint) {
  return { x: ORIGIN.x + (point.x - point.y) * TILE_W / 2, y: ORIGIN.y + (point.x + point.y) * TILE_H / 2 };
}

function path(ctx: CanvasRenderingContext2D, points: GridPoint[]) {
  ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.closePath();
}

function diamond(point: GridPoint) {
  const center = iso(point);
  return [
    { x: center.x, y: center.y - TILE_H / 2 }, { x: center.x + TILE_W / 2, y: center.y },
    { x: center.x, y: center.y + TILE_H / 2 }, { x: center.x - TILE_W / 2, y: center.y },
  ];
}

function drawMineTile(ctx: CanvasRenderingContext2D, point: GridPoint, revealed: boolean, detonated: boolean, time: number) {
  const base = diamond(point);
  const rise = revealed ? 2 : 12;
  const top = base.map((item) => ({ x: item.x, y: item.y - rise }));
  path(ctx, [top[1], top[2], base[2], base[1]]); ctx.fillStyle = revealed ? '#31585b' : '#315f62'; ctx.fill();
  path(ctx, [top[2], top[3], base[3], base[2]]); ctx.fillStyle = revealed ? '#3a6666' : '#427778'; ctx.fill();
  path(ctx, top);
  ctx.fillStyle = detonated ? '#e37b5f' : revealed ? '#d9d8b9' : '#7da69a'; ctx.fill();
  ctx.strokeStyle = revealed ? '#fff3b971' : '#d9f4e39e'; ctx.lineWidth = 1.3; ctx.stroke();
  const center = iso(point); const y = center.y - rise;
  if (!revealed) {
    ctx.strokeStyle = '#d9f1d25c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(center.x - 11, y - 1); ctx.lineTo(center.x, y - 7); ctx.lineTo(center.x + 11, y - 1); ctx.stroke();
    ctx.fillStyle = '#effbf089'; ctx.beginPath(); ctx.arc(center.x, y + 4, 2.2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (isMine(point)) {
    const pulse = 1 + Math.sin(time / 80) * .1;
    ctx.save(); ctx.translate(center.x, y); ctx.scale(pulse, pulse); ctx.fillStyle = '#402c2a';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#402c2a'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) { const angle = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7); ctx.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12); ctx.stroke(); }
    ctx.restore(); return;
  }
  const count = adjacentMineCount(point);
  if (count) {
    const colors = ['#246e75', '#3158a7', '#9f4c38', '#6b3d95'];
    ctx.fillStyle = colors[Math.min(colors.length - 1, count - 1)]; ctx.font = '900 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(count), center.x, y);
  } else {
    ctx.fillStyle = '#6f9d87'; ctx.beginPath(); ctx.arc(center.x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}

function animatedPlayer(state: MineTrailState, transition: MoveTransition | null, time: number) {
  if (!transition) return state.player;
  const progress = Math.min(1, Math.max(0, (time - transition.startedAt) / transition.durationMs));
  const eased = 1 - Math.pow(1 - progress, 3);
  return { x: transition.from.x + (transition.to.x - transition.from.x) * eased, y: transition.from.y + (transition.to.y - transition.from.y) * eased };
}

function drawExplorer(ctx: CanvasRenderingContext2D, point: GridPoint, time: number, transition: MoveTransition | null, actionStartedAt: number, status: MineTrailState['status']) {
  const center = iso(point);
  const moveProgress = transition ? Math.min(1, Math.max(0, (time - transition.startedAt) / transition.durationMs)) : 1;
  const moving = Boolean(transition) && moveProgress < 1;
  const actingProgress = Math.min(1, Math.max(0, (time - actionStartedAt) / 520));
  const acting = actingProgress < 1;
  const stride = moving ? Math.sin(moveProgress * Math.PI * 3) : 0;
  const celebrate = status === 'complete' ? Math.abs(Math.sin(time / 165)) * 8 : 0;
  const crouch = acting ? Math.sin(actingProgress * Math.PI) * 7 : 0;
  const x = center.x; const y = center.y - 39 + crouch - celebrate + (moving ? Math.abs(stride) * 2 : Math.sin(time / 500));
  ctx.save(); ctx.fillStyle = '#07171b66'; ctx.beginPath(); ctx.ellipse(x, center.y + 1, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4d413a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(x - 6, y + 23); ctx.lineTo(x - 8 - stride * 6, y + 39); ctx.moveTo(x + 6, y + 23); ctx.lineTo(x + 8 + stride * 6, y + 39); ctx.stroke();
  ctx.strokeStyle = '#28363a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 13 - stride * 6, y + 39); ctx.lineTo(x - 6 - stride * 6, y + 39); ctx.moveTo(x + 6 + stride * 6, y + 39); ctx.lineTo(x + 13 + stride * 6, y + 39); ctx.stroke();
  ctx.fillStyle = '#c77743'; ctx.beginPath(); ctx.roundRect(x - 14, y - 7, 28, 33, 8); ctx.fill();
  ctx.fillStyle = '#f0b45b'; path(ctx, [{ x: x - 11, y: y - 6 }, { x, y: y + 23 }, { x: x + 14, y: y - 6 }]); ctx.fill();
  ctx.strokeStyle = '#c77743'; ctx.lineWidth = 5; const reach = acting ? 22 : 15; ctx.beginPath();
  ctx.moveTo(x - 10, y + 1); ctx.lineTo(x - reach - stride * 3, y + (acting ? 18 : 11)); ctx.moveTo(x + 10, y + 1); ctx.lineTo(x + reach + stride * 3, y + (acting ? 18 : 10)); ctx.stroke();
  ctx.fillStyle = '#d99b72'; ctx.beginPath(); ctx.ellipse(x, y - 20, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e302b'; ctx.beginPath(); ctx.ellipse(x - 2, y - 29, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#172b31'; ctx.beginPath(); ctx.arc(x - 4, y - 21, 1.5, 0, Math.PI * 2); ctx.arc(x + 4, y - 21, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7b4e36'; ctx.beginPath(); ctx.roundRect(x - 16, y - 38, 33, 6, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(x - 9, y - 45, 20, 9, 4); ctx.fill();
  if (acting) { ctx.strokeStyle = '#f6c85f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, center.y - 2, 13 + actingProgress * 12, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function drawCustomizedExplorer(ctx: CanvasRenderingContext2D, point: GridPoint, time: number, transition: MoveTransition | null, actionStartedAt: number, status: MineTrailState['status'], facing: LabDirection, character: CharacterCustomization) {
  const center = iso(point); const progress = transition ? Math.min(1, Math.max(0, (time - transition.startedAt) / transition.durationMs)) : 1;
  const moving = Boolean(transition) && progress < 1; const acting = time - actionStartedAt < 520;
  drawCharacterCanvas(ctx, character, { x: center.x, groundY: center.y - 9, scale: .58, time, pose: status === 'complete' ? 'celebrate' : status === 'failed' ? 'failed' : acting ? 'reveal' : moving ? 'walk' : 'idle', facing });
}

function drawSmoke(ctx: CanvasRenderingContext2D, point: GridPoint, time: number) {
  const center = iso(point);
  for (let i = 0; i < 6; i += 1) {
    const phase = (time / 850 + i / 6) % 1; ctx.fillStyle = `rgba(58,45,43,${.48 * (1 - phase)})`;
    ctx.beginPath(); ctx.arc(center.x + Math.sin(i * 2.4) * 15 * phase, center.y - 18 - phase * 65, 7 + phase * 11, 0, Math.PI * 2); ctx.fill();
  }
}

function drawMineVictory(ctx: CanvasRenderingContext2D, journey: VictoryJourney, time: number, character: CharacterCustomization, theme: LabTheme) {
  if (journey.phase === 'idle') return;
  ctx.fillStyle = '#06171bed'; ctx.beginPath(); ctx.roundRect(38, 438, 314, 137, 24); ctx.fill();
  ctx.strokeStyle = '#ffffff32'; ctx.beginPath(); ctx.moveTo(64, 548); ctx.lineTo(328, 548); ctx.stroke();
  const pulse = 1 + Math.sin(time / 230) * .04; ctx.save(); ctx.shadowColor = theme.portal; ctx.shadowBlur = 18; ctx.strokeStyle = theme.portal; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(322, 518, 21 * pulse, 39 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  drawCharacterCanvas(ctx, character, { x: 78 + journey.x * 57, groundY: 550 + journey.lane * 23, scale: .56, time, pose: journey.phase === 'celebrating' || journey.phase === 'departed' ? 'celebrate' : 'walk', facing: 'right' });
  ctx.fillStyle = theme.accent; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(journey.phase === 'celebrating' ? 'ONE SECOND VICTORY MOMENT' : journey.phase === 'portal-open' ? `STEER INTO THE ${theme.portalName.toUpperCase()}` : 'PORTAL CROSSED', 195, 461);
}

function drawMineLab(ctx: CanvasRenderingContext2D, state: MineTrailState, transition: MoveTransition | null, actionStartedAt: number, time: number, character: CharacterCustomization, journey: VictoryJourney, theme: LabTheme) {
  const sky = ctx.createLinearGradient(0, 0, 0, 844); sky.addColorStop(0, theme.skyTop); sky.addColorStop(.55, theme.skyMid); sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 390, 844);
  const glow = ctx.createRadialGradient(195, 330, 20, 195, 330, 250); glow.addColorStop(0, '#def2d541'); glow.addColorStop(1, '#15293600'); ctx.fillStyle = glow; ctx.fillRect(0, 120, 390, 480);
  ctx.fillStyle = '#1729367d'; ctx.beginPath(); ctx.moveTo(0, 520); ctx.lineTo(0, 195); ctx.lineTo(78, 140); ctx.lineTo(100, 520); ctx.fill();
  ctx.beginPath(); ctx.moveTo(390, 520); ctx.lineTo(390, 195); ctx.lineTo(312, 140); ctx.lineTo(290, 520); ctx.fill();
  const revealed = new Set(state.revealed);
  for (let sum = 0; sum <= MINE_TRAIL_WIDTH + MINE_TRAIL_HEIGHT - 2; sum += 1) {
    for (let y = 0; y < MINE_TRAIL_HEIGHT; y += 1) {
      const x = sum - y; if (x < 0 || x >= MINE_TRAIL_WIDTH) continue;
      const point = { x, y }; drawMineTile(ctx, point, revealed.has(key(point)), state.detonated?.x === x && state.detonated.y === y, time);
    }
  }
  const player = animatedPlayer(state, transition, time); if (journey.phase === 'idle') drawCustomizedExplorer(ctx, player, time, transition, actionStartedAt, state.status, state.facing, character);
  if (state.detonated) drawSmoke(ctx, state.detonated, time);
  drawMineVictory(ctx, journey, time, character, theme);
  if (state.status !== 'playing' && (state.status === 'failed' || journey.phase === 'departed')) {
    ctx.fillStyle = '#071820c7'; ctx.beginPath(); ctx.roundRect(55, 494, 280, 70, 18); ctx.fill();
    ctx.fillStyle = state.status === 'complete' ? '#f6c85f' : '#f09a7f'; ctx.font = '900 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state.status === 'complete' ? 'MINEFIELD CLEARED' : 'ROUTE COLLAPSED', 195, 519);
    ctx.fillStyle = '#fff'; ctx.font = '700 15px Inter, system-ui, sans-serif'; ctx.fillText(state.status === 'complete' ? 'Every safe tile is mapped' : 'A hidden mine was revealed', 195, 543);
  }
}

export function MineTrailLab({ onExit, onComplete, character, theme = PROTOTYPE_THEME, contextLabel = 'PREVIEW TESTER GAME' }: { onExit: () => void; onComplete?: () => void; character: CharacterCustomization; theme?: LabTheme; contextLabel?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState(initialMineTrailState);
  const stateRef = useRef(state); const transitionRef = useRef<MoveTransition | null>(null);
  const actionStartedRef = useRef(-10_000); const manualTimeOffset = useRef(0); const drawNowRef = useRef<(() => void) | null>(null);
  const [journey, setJourney] = useState<VictoryJourney>(idleVictoryJourney); const journeyRef = useRef(journey);
  const manualTime = useRef(false); const completionSent = useRef(false);

  const updateJourney = useCallback((update: (current: VictoryJourney) => VictoryJourney) => {
    const next = update(journeyRef.current); journeyRef.current = next; setJourney(next); drawNowRef.current?.();
  }, []);

  const move = useCallback((direction: LabDirection) => {
    if (journeyRef.current.phase !== 'idle') { updateJourney((current) => moveVictoryJourney(current, direction)); return; }
    setState((current) => {
      const next = moveMineTrail(current, direction);
      if (next.moves !== current.moves) transitionRef.current = { from: current.player, to: next.player, startedAt: performance.now() + manualTimeOffset.current, durationMs: 220 };
      stateRef.current = next; navigator.vibrate?.(next.moves !== current.moves ? 9 : 5); return next;
    });
  }, [updateJourney]);
  const reveal = useCallback(() => {
    setState((current) => {
      const next = revealMineTrail(current); actionStartedRef.current = performance.now() + manualTimeOffset.current;
      if (current.status !== 'complete' && next.status === 'complete') updateJourney(() => beginVictoryJourney());
      stateRef.current = next; navigator.vibrate?.(next.status === 'failed' ? [30, 40, 50] : next.actions !== current.actions ? 22 : 5); return next;
    });
  }, [updateJourney]);
  const reset = useCallback(() => { transitionRef.current = null; actionStartedRef.current = -10_000; const next = initialMineTrailState(); stateRef.current = next; setState(next); completionSent.current = false; const idle = idleVictoryJourney(); journeyRef.current = idle; setJourney(idle); }, []);

  useEffect(() => { if (journey.phase === 'departed' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(); } }, [journey.phase, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0; const render = () => { const time = performance.now() + manualTimeOffset.current; drawMineLab(ctx, stateRef.current, transitionRef.current, actionStartedRef.current, time, character, journeyRef.current, theme); frame = requestAnimationFrame(render); };
    drawNowRef.current = () => drawMineLab(ctx, stateRef.current, transitionRef.current, actionStartedRef.current, performance.now() + manualTimeOffset.current, character, journeyRef.current, theme);
    render(); return () => { cancelAnimationFrame(frame); drawNowRef.current = null; };
  }, [character, theme]);

  useEffect(() => { const interval = window.setInterval(() => { if (!manualTime.current && journeyRef.current.phase === 'celebrating') updateJourney((current) => tickVictoryJourney(current, 50)); }, 50); return () => window.clearInterval(interval); }, [updateJourney]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const keyName = event.key.toLowerCase();
      const direction = keyName === 'arrowup' || keyName === 'w' ? 'up' : keyName === 'arrowdown' || keyName === 's' ? 'down' : keyName === 'arrowleft' || keyName === 'a' ? 'left' : keyName === 'arrowright' || keyName === 'd' ? 'right' : null;
      if (direction) { event.preventDefault(); move(direction); }
      else if (event.code === 'Space' || keyName === 'enter') { event.preventDefault(); reveal(); }
      else if (keyName === 'r') { event.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [move, reset, reveal]);

  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; manualTimeOffset.current += ms; updateJourney((current) => tickVictoryJourney(current, ms)); drawNowRef.current?.(); };
    bridge.render_game_to_text = () => JSON.stringify({ ...mineTrailSnapshot(stateRef.current), victory: journeyRef.current, character, theme: { id: theme.id, worldName: theme.worldName } });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character, theme, updateJourney]);

  const safeRemaining = mineTrailSnapshot(state).safeTilesRemaining;
  const swipe = useSwipeDirection(move, state.status === 'failed' || journey.phase === 'celebrating' || journey.phase === 'departed');
  return <section className="lab-screen mine-lab-screen" aria-label="Mine Trail tester game" style={themeCss(theme)}>
    <canvas ref={canvasRef} width="390" height="844" aria-label="Mine Trail puzzle room" {...swipe} />
    <header className="lab-header">
      <button className="icon-button glass" onClick={onExit} aria-label="Back to puzzle labs">←</button>
      <div><span>{contextLabel}</span><h1>Mine Trail · Lab 02</h1></div>
      <span className="lab-number" aria-hidden="true">02</span>
    </header>
    <div className="lab-brief">
      <div><strong>{safeRemaining}</strong><small>safe left</small></div>
      <p>Walk onto a tile and reveal it. Number clues count mines on all eight neighboring tiles.</p>
      <div><strong>{state.actions}</strong><small>reveals</small></div>
    </div>
    <div className="lab-tool-row single-tool"><span /><button className="lab-utility" onClick={reset}>RESET ↻ <small>R</small></button></div>
    <div className={`lab-message ${state.status === 'complete' ? 'complete' : state.status === 'failed' ? 'failed' : ''}`} aria-live="polite">{journey.phase === 'idle' ? state.message : victoryJourneyMessage(journey, theme.portalName)}</div>
    <div className="lab-controls mine-controls" aria-label="Mine Trail controls">
      <div className="lab-dpad">
        <button className="up" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('up')} aria-label="Move up">↑</button>
        <button className="left" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('left')} aria-label="Move left">←</button>
        <span aria-hidden="true">◆</span>
        <button className="right" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('right')} aria-label="Move right">→</button>
        <button className="down" disabled={journey.phase === 'celebrating' || journey.phase === 'departed'} onClick={() => move('down')} aria-label="Move down">↓</button>
      </div>
      <button className="mine-action" onClick={reveal} disabled={state.status !== 'playing' || journey.phase !== 'idle'} aria-label="Reveal current tile"><span>✦</span>ACTION<small>SPACE</small></button>
      <p>Swipe the world or use arrows · Reveal with ACTION</p>
    </div>
  </section>;
}
