import { drawScenery } from '../venture/scenery';
import { isGamePaused, gameFeedback } from '../venture/runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import {
  ADVENTURE_CHIP_TOTAL,
  ADVENTURE_EXIT,
  ADVENTURE_MAP,
  ADVENTURE_TERMINALS,
  adventureSnapshot,
  backspaceAdventureTerminal,
  closeAdventureTerminal,
  initialAdventureState,
  inputAdventureTerminalLetter,
  interactAdventure,
  moveAdventure,
  resetAdventureTerminal,
  scoreAdventureWordGuess,
  submitAdventureTerminal,
  tickAdventure,
  type AdventureDirection,
  type AdventurePoint,
  type AdventureState,
  type AdventureTerminalId,
  type WordLetterScore,
} from './adventure';
import { PROTOTYPE_THEME, themeCss, type LabTheme } from './theme';
import { useSwipeDirection } from './useSwipeDirection';

const WIDTH = 390;
const HEIGHT = 844;
const TILE_W = 38;
const TILE_H = 27;
const CAMERA = { x: 195, y: 316 };
const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function iso(point: AdventurePoint, focus: AdventurePoint) {
  const dx = point.x - focus.x; const dy = point.y - focus.y;
  return { x: CAMERA.x + (dx - dy) * TILE_W / 2, y: CAMERA.y + (dx + dy) * TILE_H / 2 };
}

function diamond(ctx: CanvasRenderingContext2D, center: AdventurePoint, fill: string, stroke = '#ffffff24') {
  ctx.beginPath(); ctx.moveTo(center.x, center.y - TILE_H / 2); ctx.lineTo(center.x + TILE_W / 2, center.y); ctx.lineTo(center.x, center.y + TILE_H / 2); ctx.lineTo(center.x - TILE_W / 2, center.y); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
}

function drawWall(ctx: CanvasRenderingContext2D, center: AdventurePoint, theme: LabTheme) {
  const h = 27;
  ctx.beginPath(); ctx.moveTo(center.x, center.y - TILE_H / 2 - h); ctx.lineTo(center.x + TILE_W / 2, center.y - h); ctx.lineTo(center.x + TILE_W / 2, center.y); ctx.lineTo(center.x, center.y + TILE_H / 2); ctx.lineTo(center.x - TILE_W / 2, center.y); ctx.lineTo(center.x - TILE_W / 2, center.y - h); ctx.closePath();
  ctx.fillStyle = theme.surface; ctx.fill(); ctx.strokeStyle = '#ffffff25'; ctx.stroke();
  diamond(ctx, { x: center.x, y: center.y - h }, theme.surfaceAlt, '#ffffff46');
}

function drawDoor(ctx: CanvasRenderingContext2D, center: AdventurePoint, color: string, open: boolean, symbol: string) {
  ctx.save(); ctx.translate(center.x, center.y - 25); ctx.globalAlpha = open ? .28 : 1; ctx.shadowColor = color; ctx.shadowBlur = open ? 5 : 13; ctx.strokeStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-15, 16); ctx.lineTo(-15, -14); ctx.quadraticCurveTo(0, -31, 15, -14); ctx.lineTo(15, 16); ctx.stroke();
  if (!open) { ctx.fillStyle = `${color}cc`; ctx.beginPath(); ctx.roundRect(-12, -13, 24, 28, 4); ctx.fill(); ctx.fillStyle = '#102a30'; ctx.font = '950 11px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(symbol, 0, 5); }
  ctx.restore();
}

function drawComputer(ctx: CanvasRenderingContext2D, center: AdventurePoint, solved: boolean, color: string, label: string, time: number) {
  const pulse = .65 + Math.sin(time / 340) * .2;
  ctx.save(); ctx.translate(center.x, center.y - 26); ctx.shadowColor = color; ctx.shadowBlur = solved ? 5 : 14 * pulse; ctx.fillStyle = '#17383e'; ctx.strokeStyle = solved ? '#93b5ad' : color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-14, -15, 28, 25, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = solved ? '#7bc49b' : color; ctx.fillRect(-10, -11, 20, 13); ctx.fillStyle = '#0c252b'; ctx.font = '950 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(solved ? '✓' : label, 0, 0);
  ctx.fillStyle = '#5d7472'; ctx.fillRect(-10, 12, 20, 5); ctx.restore();
}

function drawItem(ctx: CanvasRenderingContext2D, tile: string, center: AdventurePoint, time: number, state: AdventureState, point: AdventurePoint, theme: LabTheme) {
  const key = `${point.x},${point.y}`;
  if (tile === 'c' && state.chips.includes(key)) return;
  if (tile === 'r' && state.redKey || tile === 'b' && state.blueKey || tile === 't' && state.flippers || tile === 'f' && state.fireBoots) return;
  const bob = Math.sin(time / 260 + point.x + point.y) * 2;
  ctx.save(); ctx.translate(center.x, center.y - 17 + bob);
  if (tile === 'c') {
    ctx.shadowColor = theme.accent; ctx.shadowBlur = 15; ctx.fillStyle = theme.accent;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, -3); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.lineTo(-8, -3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#17343a'; ctx.fillRect(-2, -5, 4, 9);
  } else if (tile === 'r' || tile === 'b') {
    ctx.strokeStyle = tile === 'r' ? '#ef7c69' : '#72bdf0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-4, -3, 6, 0, Math.PI * 2); ctx.moveTo(1, 1); ctx.lineTo(11, 11); ctx.moveTo(6, 6); ctx.lineTo(11, 1); ctx.stroke();
  } else if (tile === 't') {
    ctx.fillStyle = '#75dbe6'; ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-2, -7); ctx.lineTo(-5, 9); ctx.lineTo(-15, 9); ctx.closePath(); ctx.moveTo(4, -7); ctx.lineTo(14, -7); ctx.lineTo(17, 9); ctx.lineTo(7, 9); ctx.closePath(); ctx.fill();
  } else if (tile === 'f') {
    ctx.fillStyle = '#f1a34f'; ctx.beginPath(); ctx.roundRect(-13, -8, 10, 18, 3); ctx.roundRect(3, -8, 10, 18, 3); ctx.fill(); ctx.fillStyle = '#ffdf73'; ctx.fillRect(-13, 3, 10, 4); ctx.fillRect(3, 3, 10, 4);
  }
  ctx.restore();
}

function floorColor(tile: string, x: number, y: number, state: AdventureState, theme: LabTheme) {
  if (tile === 'W') return '#2d7d92';
  if (tile === 'F') return '#a94f39';
  if (tile === 'o') return state.plateActive ? theme.accent : '#806744';
  if (tile === 'G') return '#70558e';
  if (tile === 'A') return '#386f82';
  if (tile === 'D') return '#654b78';
  return (x + y) % 2 ? theme.surface : theme.surfaceAlt;
}

function drawMiniMap(ctx: CanvasRenderingContext2D, state: AdventureState, theme: LabTheme) {
  const cell = 3.15; const left = 289; const top = 463; const visited = new Set(state.visited);
  ctx.fillStyle = '#06171be8'; ctx.beginPath(); ctx.roundRect(left - 8, top - 15, 82, 87, 10); ctx.fill(); ctx.strokeStyle = `${theme.accent}66`; ctx.stroke();
  ctx.fillStyle = '#9ac5be'; ctx.font = '800 6px Inter, system-ui'; ctx.textAlign = 'left'; ctx.fillText('FIELD MAP', left, top - 5);
  ADVENTURE_MAP.forEach((row, y) => [...row].forEach((tile, x) => {
    if (tile === '#') return;
    const key = `${x},${y}`; ctx.globalAlpha = visited.has(key) ? .9 : .2;
    ctx.fillStyle = tile === 'E' ? theme.portal : tile === 'c' && !state.chips.includes(key) ? theme.accent : '#a7c9c2';
    ctx.fillRect(left + x * cell, top + y * cell, 2.35, 2.35);
  }));
  ctx.globalAlpha = 1; ctx.fillStyle = '#ff705f'; ctx.beginPath(); ctx.arc(left + state.player.x * cell + 1, top + state.player.y * cell + 1, 2.4, 0, Math.PI * 2); ctx.fill();
}

function drawAdventure(ctx: CanvasRenderingContext2D, state: AdventureState, time: number, character: CharacterCustomization, theme: LabTheme) {
  drawScenery(ctx, 0, time);
  const entities: Array<{ depth: number; draw: () => void }> = [];
  ADVENTURE_MAP.forEach((row, y) => [...row].forEach((tile, x) => {
    const point = { x, y }; const center = iso(point, state.player); const depth = x + y;
    if (center.x < -55 || center.x > WIDTH + 55 || center.y < 105 || center.y > 580) return;
    if (tile === '#') entities.push({ depth, draw: () => drawWall(ctx, center, theme) });
    else {
      diamond(ctx, center, floorColor(tile, x, y, state, theme));
      if (tile === 'W') { ctx.strokeStyle = '#b9f5f485'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(center.x, center.y, 10, .1, Math.PI - .1); ctx.stroke(); }
      if (tile === 'F') { ctx.fillStyle = '#ffd065'; ctx.beginPath(); ctx.moveTo(center.x - 7, center.y + 5); ctx.quadraticCurveTo(center.x - 10, center.y - 8, center.x, center.y - 10); ctx.quadraticCurveTo(center.x + 10, center.y - 7, center.x + 7, center.y + 5); ctx.fill(); }
      if (tile === 'R') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#ef7c69', state.redDoorOpen, 'R') });
      if (tile === 'B') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#72bdf0', state.blueDoorOpen, 'B') });
      if (tile === 'A') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#64d9ed', state.signalDoorOpen, '1') });
      if (tile === 'D') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#d59bf2', state.archiveDoorOpen, '2') });
      if (tile === 'G') entities.push({ depth: depth + .2, draw: () => drawDoor(ctx, center, '#d2adff', state.chipGateOpen, '◆') });
      if ('crbtf'.includes(tile)) entities.push({ depth: depth + .15, draw: () => drawItem(ctx, tile, center, time, state, point, theme) });
      if (tile === '1') entities.push({ depth: depth + .3, draw: () => drawComputer(ctx, center, state.terminals.signal.solved, '#64d9ed', '1', time) });
      if (tile === '2') entities.push({ depth: depth + .3, draw: () => drawComputer(ctx, center, state.terminals.archive.solved, '#d59bf2', '2', time) });
    }
  }));

  const crateCenter = iso(state.crate, state.player); entities.push({ depth: state.crate.x + state.crate.y + .6, draw: () => {
    ctx.fillStyle = state.plateActive ? theme.accent : '#b67947'; ctx.strokeStyle = '#fff8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(crateCenter.x - 16, crateCenter.y - 36, 32, 31, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5d3d2c'; ctx.beginPath(); ctx.moveTo(crateCenter.x - 10, crateCenter.y - 31); ctx.lineTo(crateCenter.x + 10, crateCenter.y - 10); ctx.moveTo(crateCenter.x + 10, crateCenter.y - 31); ctx.lineTo(crateCenter.x - 10, crateCenter.y - 10); ctx.stroke();
  } });

  const exit = iso(ADVENTURE_EXIT, state.player); const portalOpen = state.phase === 'portal-open' || state.phase === 'complete';
  entities.push({ depth: ADVENTURE_EXIT.x + ADVENTURE_EXIT.y + .1, draw: () => { ctx.save(); ctx.shadowColor = portalOpen ? theme.portal : '#51666a'; ctx.shadowBlur = portalOpen ? 24 : 4; ctx.strokeStyle = portalOpen ? theme.portal : '#51666a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(exit.x, exit.y - 31, 19, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } });

  entities.sort((a, b) => a.depth - b.depth).forEach((entity) => entity.draw());
  drawCharacterCanvas(ctx, character, { x: CAMERA.x, groundY: CAMERA.y + 8, scale: .5, time, pose: state.phase === 'celebrating' || state.phase === 'complete' ? 'celebrate' : 'walk', facing: state.facing });

  ctx.fillStyle = '#06171be8'; ctx.beginPath(); ctx.roundRect(24, 450, 342, 108, 18); ctx.fill(); ctx.strokeStyle = `${theme.accent}70`; ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.font = '900 8px Inter, system-ui'; ctx.textAlign = 'left'; ctx.fillText(state.phase === 'celebrating' ? 'CIRCUIT SOLVED · CELEBRATING' : portalOpen ? 'PORTAL ONLINE · FIND THE EXIT' : 'VENTURE CIRCUIT · CAMERA FOLLOW', 43, 474);
  ctx.fillStyle = '#fff'; ctx.font = '900 12px Inter, system-ui'; ctx.fillText(`${state.chips.length}/${ADVENTURE_CHIP_TOTAL} CIRCUITS`, 43, 498);
  const terminalsSolved = Number(state.terminals.signal.solved) + Number(state.terminals.archive.solved);
  ctx.fillStyle = '#c6dcd8'; ctx.font = '750 8px Inter, system-ui'; ctx.fillText(`${terminalsSolved}/2 COMPUTERS  ·  ${state.plateActive ? 'PLATE ON' : 'PLATE OFF'}`, 43, 518);
  ctx.fillStyle = '#9fb9b6'; ctx.font = '700 7px Inter, system-ui'; ctx.fillText(`${state.redKey ? '◆' : '◇'} RED  ${state.blueKey ? '◆' : '◇'} BLUE  ${state.flippers ? '◆' : '◇'} FINS  ${state.fireBoots ? '◆' : '◇'} FIRE`, 43, 539);
  drawMiniMap(ctx, state, theme);
}

function DirectionPad({ move, disabled }: { move: (direction: AdventureDirection) => void; disabled: boolean }) {
  return <div className="lab-dpad"><button className="up" disabled={disabled} onClick={() => move('up')} aria-label="Move up">↑</button><button className="left" disabled={disabled} onClick={() => move('left')} aria-label="Move left">←</button><span aria-hidden="true">◆</span><button className="right" disabled={disabled} onClick={() => move('right')} aria-label="Move right">→</button><button className="down" disabled={disabled} onClick={() => move('down')} aria-label="Move down">↓</button></div>;
}

function wordKeyboardState(letter: string, guesses: string[]): WordLetterScore | undefined {
  let score: WordLetterScore | undefined;
  for (const guess of guesses) {
    scoreAdventureWordGuess(guess).forEach((value, index) => { if (guess[index] !== letter) return; if (value === 'correct' || value === 'present' && score !== 'correct' || value === 'absent' && !score) score = value; });
  }
  return score;
}

function TerminalKeyboard({ onLetter, used, scores }: { onLetter: (letter: string) => void; used?: string[]; scores?: Record<string, WordLetterScore | undefined> }) {
  return <div className="adventure-keyboard">{KEYBOARD_ROWS.map((row) => <div key={row}>{[...row].map((letter) => <button key={letter} aria-label={`Letter ${letter}`} disabled={used?.includes(letter)} data-letter-state={scores?.[letter]} onClick={() => onLetter(letter)}>{letter}</button>)}</div>)}</div>;
}

function ComputerPanel({ state, letter, backspace, submit, retry, close }: { state: AdventureState; letter: (value: string) => void; backspace: () => void; submit: () => void; retry: () => void; close: () => void }) {
  const id = state.activeTerminal as AdventureTerminalId; const terminal = state.terminals[id]; const config = ADVENTURE_TERMINALS[id];
  if (terminal.kind === 'word-grid') {
    const scores = Object.fromEntries([...KEYBOARD_ROWS.join('')].map((key) => [key, wordKeyboardState(key, terminal.guesses)]));
    const rows = Array.from({ length: 6 }, (_, index) => index < terminal.guesses.length ? terminal.guesses[index] : index === terminal.guesses.length ? terminal.currentGuess : '');
    return <div className="adventure-computer-panel word-computer" role="dialog" aria-modal="true" aria-label={config.title}>
      <button className="computer-close" onClick={close} aria-label="Close computer">×</button><div className="eyebrow">COMPUTER 1 · WORD GRID</div><h2>{config.title}</h2><p>{config.clue}</p>
      <div className="computer-word-grid">{rows.map((row, rowIndex) => [...config.answer].map((_, column) => { const filled = row[column] ?? ''; const score = rowIndex < terminal.guesses.length ? scoreAdventureWordGuess(row)[column] : undefined; return <span key={`${rowIndex}-${column}`} data-score={score}>{filled}</span>; }))}</div>
      {terminal.solved ? <div className="computer-result solved"><strong>ACCESS GRANTED</strong><span>Cyan world gate powered.</span><button onClick={close}>RETURN TO TRAIL</button></div> : terminal.failed ? <div className="computer-result failed"><strong>SIGNAL LOCKOUT</strong><button onClick={retry}>RESET TERMINAL</button></div> : <><TerminalKeyboard onLetter={letter} scores={scores} /><div className="computer-actions"><button onClick={backspace}>DELETE</button><button className="transmit" disabled={terminal.currentGuess.length !== 5} onClick={submit}>TRANSMIT</button></div></>}
    </div>;
  }
  const pattern = [...config.answer].map((value) => terminal.guessed.includes(value) ? value : '_').join(' ');
  return <div className="adventure-computer-panel hangman-computer" role="dialog" aria-modal="true" aria-label={config.title}>
    <button className="computer-close" onClick={close} aria-label="Close computer">×</button><div className="eyebrow">COMPUTER 2 · ARCHIVE DECODER</div><h2>{config.title}</h2><p>{config.clue}</p>
    <div className="hangman-signal" aria-label={`${terminal.misses} of 6 misses`}><div>{Array.from({ length: 6 }, (_, index) => <i key={index} className={index < terminal.misses ? 'lost' : ''} />)}</div><strong>{pattern}</strong><small>{6 - terminal.misses} signal bars remain</small></div>
    {terminal.solved ? <div className="computer-result solved"><strong>ARCHIVE RESTORED</strong><span>Violet world gate powered.</span><button onClick={close}>RETURN TO TRAIL</button></div> : terminal.failed ? <div className="computer-result failed"><strong>DECODER LOCKOUT</strong><button onClick={retry}>RESET TERMINAL</button></div> : <TerminalKeyboard onLetter={letter} used={terminal.guessed} />}
  </div>;
}

export function AdventureLab({ onExit, onComplete, character, theme = PROTOTYPE_THEME, contextLabel = 'DAILY VENTURE · MAIN MODE' }: { onExit: () => void; onComplete?: () => void; character: CharacterCustomization; theme?: LabTheme; contextLabel?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<AdventureState>(initialAdventureState);
  const stateRef = useRef(state); const manualTime = useRef(false); const completionSent = useRef(false); const drawRef = useRef<(() => void) | null>(null);

  const commit = useCallback((update: (current: AdventureState) => AdventureState) => {
    if(isGamePaused()) return;
    const previous = stateRef.current; const next = update(previous); stateRef.current = next; setState(next); drawRef.current?.();
    if (next.moves !== previous.moves) { navigator.vibrate?.(8);gameFeedback(); }
  }, []);
  const move = useCallback((direction: AdventureDirection) => commit((current) => moveAdventure(current, direction)), [commit]);
  const useComputer = useCallback(() => commit(interactAdventure), [commit]);
  const reset = useCallback(() => { const next = initialAdventureState(); stateRef.current = next; setState(next); completionSent.current = false; drawRef.current?.(); }, []);
  const terminalLetter = useCallback((letter: string) => commit((current) => inputAdventureTerminalLetter(current, letter)), [commit]);
  const terminalBackspace = useCallback(() => commit(backspaceAdventureTerminal), [commit]);
  const terminalSubmit = useCallback(() => commit(submitAdventureTerminal), [commit]);
  const terminalRetry = useCallback(() => commit(resetAdventureTerminal), [commit]);
  const terminalClose = useCallback(() => commit(closeAdventureTerminal), [commit]);

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
      const key = event.key.toLowerCase();
      if (stateRef.current.phase === 'terminal') {
        if (/^[a-z]$/.test(key)) { event.preventDefault(); terminalLetter(key); }
        else if (key === 'backspace') { event.preventDefault(); terminalBackspace(); }
        else if (key === 'enter') { event.preventDefault(); terminalSubmit(); }
        else if (key === 'escape') terminalClose();
        return;
      }
      if (key === 'f') { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); return; }
      const direction = key === 'arrowup' || key === 'w' ? 'up' : key === 'arrowdown' || key === 's' ? 'down' : key === 'arrowleft' || key === 'a' ? 'left' : key === 'arrowright' || key === 'd' ? 'right' : null;
      if (direction) { event.preventDefault(); move(direction); } else if (key === ' ' || key === 'e') { event.preventDefault(); useComputer(); } else if (key === 'r') reset();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [move, reset, terminalBackspace, terminalClose, terminalLetter, terminalSubmit, useComputer]);
  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; commit((current) => tickAdventure(current, ms)); };
    bridge.render_game_to_text = () => JSON.stringify({ ...adventureSnapshot(stateRef.current), character, theme: { id: theme.id, worldName: theme.worldName, portalName: theme.portalName } });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character, commit, theme]);
  const tapMove = useCallback(({ x, y }: { x: number; y: number }) => { const dx = x - .5; const dy = y - .46; move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up'); }, [move]);
  const movementLocked = state.phase === 'terminal' || state.phase === 'celebrating' || state.phase === 'complete';
  const swipe = useSwipeDirection(move, movementLocked, tapMove);

  return <section className="lab-screen adventure-lab-screen" aria-label="Adventure primary puzzle" style={themeCss(theme)}>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Adventure game world" {...swipe} />
    <header className="lab-header"><button className="icon-button glass" onClick={onExit} aria-label="Back to Lab corridor">←</button><div><span>{contextLabel}</span><h1>Venture Circuit · Computer Labyrinth</h1></div><button className="lab-small-button glass" onClick={reset}>RESET</button></header>
    <div className="lab-brief"><div><strong>{state.chips.length}/{ADVENTURE_CHIP_TOTAL}</strong><small>circuits</small></div><p>Explore the maze, solve both computers, master the hazard gear, and power the crate plate.</p><div><strong>{state.moves}</strong><small>moves</small></div></div>
    <div className={`lab-message ${state.phase === 'complete' ? 'complete' : ''}`} aria-live="polite">{state.message}</div>
    <div className="lab-controls adventure-controls"><button className="lab-utility use-computer" disabled={movementLocked && state.phase !== 'terminal'} onClick={useComputer}>USE<small>SPACE / E</small></button><DirectionPad move={move} disabled={movementLocked} /><button className="lab-utility" onClick={reset}>RESET<small>R</small></button><p>Camera follows · tap or swipe world · arrows/WASD · F fullscreen</p></div>
    {state.phase === 'terminal' && state.activeTerminal && <ComputerPanel state={state} letter={terminalLetter} backspace={terminalBackspace} submit={terminalSubmit} retry={terminalRetry} close={terminalClose} />}
  </section>;
}
