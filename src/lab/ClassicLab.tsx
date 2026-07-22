import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import {
  CLASSIC_LABS,
  CRATE_MAP,
  ICE_MAP,
  RELIC_MAP,
  classicLabSnapshot,
  initialClassicLabState,
  updateClassicLab,
  type ClassicDirection,
  type ClassicLabAction,
  type ClassicLabId,
  type ClassicLabState,
  type CoilState,
  type CrateState,
  type EchoState,
  type GearState,
  type IceState,
  type LabDefinition,
  type LanternState,
  type MergeState,
  type OrbitState,
  type Point,
  type PrismState,
  type RelicState,
  type RiverState,
  type StackState,
  type WordState,
  type ConnectionsState,
} from './classicLabs';
import { PROTOTYPE_THEME, themeCss, type LabTheme } from './theme';
import { useSwipeDirection } from './useSwipeDirection';
import { beginVictoryJourney, idleVictoryJourney, moveVictoryJourney, tickVictoryJourney, victoryJourneyMessage, type VictoryJourney } from './victory';

const CANVAS_WIDTH = 390;
const CANVAS_HEIGHT = 844;
const WORD_KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function drawLabBackdrop(ctx: CanvasRenderingContext2D, definition: LabDefinition, time: number, theme: LabTheme) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, theme.skyTop); gradient.addColorStop(.55, theme.skyMid); gradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const glow = ctx.createRadialGradient(195, 315, 20, 195, 315, 260);
  glow.addColorStop(0, `${theme.accent}42`); glow.addColorStop(1, '#0d2a3000');
  ctx.fillStyle = glow; ctx.fillRect(0, 85, 390, 590);
  ctx.fillStyle = '#061a214c';
  ctx.beginPath(); ctx.moveTo(0, 680); ctx.lineTo(0, 150); ctx.quadraticCurveTo(55, 95, 104, 145); ctx.lineTo(86, 680); ctx.fill();
  ctx.beginPath(); ctx.moveTo(390, 680); ctx.lineTo(390, 150); ctx.quadraticCurveTo(335, 95, 286, 145); ctx.lineTo(304, 680); ctx.fill();
  const pulse = (Math.sin(time / 600) + 1) / 2;
  ctx.strokeStyle = `${theme.accent}${Math.round(80 + pulse * 80).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(195, 376, 182, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  for (let x = 18; x < 390; x += 44) {
    ctx.fillStyle = '#bfe3d317'; ctx.fillRect(x, 138, 1, 510);
  }
}

function drawExplorer(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number, remote = false, facing: ClassicDirection = 'down') {
  const bob = Math.sin(time / 320) * 1.4 * scale;
  const direction = facing === 'left' ? -1 : 1;
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(scale * direction, scale);
  ctx.fillStyle = '#07171b68'; ctx.beginPath(); ctx.ellipse(0, 21, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4c3d35'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-8, 23); ctx.moveTo(6, 8); ctx.lineTo(8, 23); ctx.stroke();
  ctx.strokeStyle = '#25333a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-12, 24); ctx.lineTo(-5, 24); ctx.moveTo(5, 24); ctx.lineTo(12, 24); ctx.stroke();
  ctx.fillStyle = '#c77743'; ctx.beginPath(); ctx.roundRect(-14, -19, 28, 31, 8); ctx.fill();
  ctx.fillStyle = '#f2b75f'; ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(10, 10); ctx.lineTo(14, -18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c77743'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(-20, remote ? 2 : -1); ctx.moveTo(11, -11); ctx.lineTo(20, remote ? 2 : -1); ctx.stroke();
  if (remote) {
    ctx.fillStyle = '#183c43'; ctx.strokeStyle = '#81e1d1'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-11, -1, 22, 17, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6c85f'; ctx.beginPath(); ctx.arc(-4, 6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#75d9cc'; ctx.fillRect(2, 4, 5, 4);
  }
  ctx.fillStyle = '#d99b72'; ctx.beginPath(); ctx.ellipse(0, -32, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e302b'; ctx.beginPath(); ctx.ellipse(-2, -41, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b2b30'; ctx.beginPath(); ctx.arc(-4, -33, 1.5, 0, Math.PI * 2); ctx.arc(4, -33, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7b4e36'; ctx.beginPath(); ctx.roundRect(-17, -50, 34, 6, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(-9, -57, 20, 9, 4); ctx.fill();
  ctx.restore();
}

let suppressGameCharacter = false;

function drawCustomizedExplorer(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number, character: CharacterCustomization, remote = false, facing: ClassicDirection = 'down') {
  if (suppressGameCharacter) return;
  drawCharacterCanvas(ctx, character, { x, groundY: y + 24 * scale, scale: scale * .82, time, pose: 'idle', remote, facing });
}

function drawShade(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number) {
  const bob = Math.sin(time / 230 + x) * 2;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.shadowColor = color; ctx.shadowBlur = 9; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, -6, 8, Math.PI, 0); ctx.lineTo(9, 9); ctx.lineTo(4, 6); ctx.lineTo(0, 10); ctx.lineTo(-4, 6); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#f8fbdf'; ctx.beginPath(); ctx.arc(-3, -6, 1.5, 0, Math.PI * 2); ctx.arc(3, -6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRelic(ctx: CanvasRenderingContext2D, state: RelicState, time: number, character: CharacterCustomization) {
  const cellW = 25; const cellH = 27; const left = 32; const top = 158;
  roundedRect(ctx, 22, 146, 346, 430, 22, '#071a20da', '#d7fff238');
  RELIC_MAP.forEach((row, y) => [...row].forEach((cell, x) => {
    const px = left + x * cellW; const py = top + y * cellH;
    if (cell === '#') {
      ctx.fillStyle = '#173b3e'; ctx.fillRect(px, py + 4, cellW - 1, cellH - 2);
      ctx.fillStyle = '#5d8880'; ctx.fillRect(px, py, cellW - 1, cellH - 7);
      ctx.strokeStyle = '#b5d8c440'; ctx.strokeRect(px + .5, py + .5, cellW - 2, cellH - 8);
    } else {
      ctx.fillStyle = (x + y) % 2 ? '#254c4e' : '#2b5554'; ctx.fillRect(px, py, cellW - 1, cellH - 1);
    }
  }));
  const exitX = left + state.exit.x * cellW + cellW / 2; const exitY = top + state.exit.y * cellH + cellH / 2;
  ctx.save(); ctx.shadowColor = state.pellets.length === 0 ? '#f6c85f' : '#496b6b'; ctx.shadowBlur = state.pellets.length === 0 ? 17 : 4;
  ctx.fillStyle = state.pellets.length === 0 ? '#f6c85f' : '#4d6767'; ctx.beginPath(); ctx.arc(exitX, exitY, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#142b2f'; ctx.beginPath(); ctx.arc(exitX, exitY, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  state.pellets.forEach((key) => {
    const [x, y] = key.split(',').map(Number); const pulse = 1 + Math.sin(time / 180 + x + y) * .2;
    ctx.fillStyle = '#ffe58b'; ctx.beginPath(); ctx.arc(left + x * cellW + cellW / 2, top + y * cellH + cellH / 2, 2.7 * pulse, 0, Math.PI * 2); ctx.fill();
  });
  state.enemies.forEach((enemy, index) => drawShade(ctx, left + enemy.x * cellW + cellW / 2, top + enemy.y * cellH + cellH / 2 + 4, index ? '#ca7eaa' : '#72c9d4', time));
  drawCustomizedExplorer(ctx, left + state.player.x * cellW + cellW / 2, top + state.player.y * cellH + cellH / 2 + 2, .38, time, character, false);
}

const STACK_COLORS = ['#0000', '#e5bd58', '#5dc6bd', '#dc8159', '#846fc5', '#5e98cf'];

function drawStack(ctx: CanvasRenderingContext2D, state: StackState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 87, 146, 216, 428, 24, '#07171ddf', '#b9fff25c');
  roundedRect(ctx, 101, 157, 188, 372, 12, '#10262d', '#ffffff35');
  const cellW = 18; const cellH = 20; const left = 105; const top = 163;
  ctx.fillStyle = '#f07d7166'; ctx.fillRect(left, top + cellH * 3, 180, 2);
  for (let y = 0; y < 18; y += 1) for (let x = 0; x < 10; x += 1) {
    ctx.fillStyle = '#ffffff08'; ctx.fillRect(left + x * cellW + 1, top + y * cellH + 1, cellW - 2, cellH - 2);
    const cell = state.board[y][x]; if (!cell) continue;
    ctx.fillStyle = STACK_COLORS[cell]; ctx.fillRect(left + x * cellW + 1, top + y * cellH + 1, cellW - 2, cellH - 2);
    ctx.fillStyle = '#ffffff45'; ctx.fillRect(left + x * cellW + 3, top + y * cellH + 3, cellW - 6, 3);
  }
  state.active.shape.forEach((cell) => {
    const x = state.active.x + cell.x; const y = state.active.y + cell.y; if (y < 0) return;
    ctx.fillStyle = STACK_COLORS[state.active.color]; ctx.fillRect(left + x * cellW + 1, top + y * cellH + 1, cellW - 2, cellH - 2);
    ctx.strokeStyle = '#fff9'; ctx.strokeRect(left + x * cellW + 2, top + y * cellH + 2, cellW - 4, cellH - 4);
  });
  ctx.fillStyle = '#b6e5db'; ctx.font = '800 9px Inter, system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`SCORE ${state.score}  ·  LINES ${state.lines}/50  ·  ${Math.ceil(state.remainingMs / 1000)}s`, 195, 548);
  drawCustomizedExplorer(ctx, 195, 572, .76, time, character, true);
}

function riverX(x: number) { return 45 + x * 37.5; }

function drawRiver(ctx: CanvasRenderingContext2D, state: RiverState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 23, 148, 344, 438, 22, '#0a2228d9', '#c6fff33d');
  const top = 164; const rowH = 36; const left = 29; const width = 332;
  for (let row = 0; row <= 10; row += 1) {
    const y = top + row * rowH;
    const fill = row === 0 ? '#856c3f' : row === 5 || row === 10 ? '#557951' : row <= 4 ? '#256d77' : '#26383b';
    ctx.fillStyle = fill; ctx.fillRect(left, y, width, rowH - 2);
    if (row >= 1 && row <= 4) {
      ctx.strokeStyle = '#a2eef222'; ctx.beginPath(); ctx.moveTo(left, y + 12); ctx.lineTo(left + width, y + 12); ctx.moveTo(left, y + 25); ctx.lineTo(left + width, y + 25); ctx.stroke();
    }
    if (row >= 6 && row <= 9) {
      ctx.setLineDash([12, 10]); ctx.strokeStyle = '#e7d98d58'; ctx.beginPath(); ctx.moveTo(left, y + rowH / 2); ctx.lineTo(left + width, y + rowH / 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  ctx.fillStyle = '#f6c85f'; ctx.beginPath(); ctx.roundRect(163, top + 5, 64, 24, 12); ctx.fill();
  ctx.fillStyle = '#173033'; ctx.font = '900 8px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('FAR GATE', 195, top + 20);
  state.movers.forEach((mover) => {
    const x = riverX(mover.x); const y = top + mover.row * rowH + rowH / 2;
    if (mover.kind === 'raft') {
      ctx.fillStyle = '#8c774c'; ctx.beginPath(); ctx.roundRect(x - mover.width * 18.5, y - 9, mover.width * 37, 18, 7); ctx.fill();
      ctx.fillStyle = '#b7a56c'; ctx.fillRect(x - mover.width * 13, y - 7, mover.width * 26, 4);
    } else {
      ctx.fillStyle = mover.speed > 0 ? '#da754e' : '#78a9c4'; ctx.beginPath(); ctx.ellipse(x, y, mover.width * 17, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#263336'; ctx.beginPath(); ctx.arc(x + Math.sign(mover.speed) * mover.width * 12, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#132124'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y - 7); ctx.lineTo(x - 15, y - 13); ctx.moveTo(x + 3, y - 8); ctx.lineTo(x + 6, y - 14); ctx.stroke();
    }
  });
  drawCustomizedExplorer(ctx, riverX(state.player.x), top + state.player.y * rowH + 21, .52, time, character, false, 'up');
}

function drawCoil(ctx: CanvasRenderingContext2D, state: CoilState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 31, 151, 328, 404, 22, '#071a20dc', '#e8a95b59');
  const left = 45; const top = 169; const cell = 20;
  for (let y = 0; y < 16; y += 1) for (let x = 0; x < 15; x += 1) {
    ctx.fillStyle = (x + y) % 2 ? '#26484a' : '#2c5050'; ctx.fillRect(left + x * cell, top + y * cell, cell - 1, cell - 1);
  }
  state.obstacles.forEach((point) => {
    const x = left + point.x * cell + 10; const y = top + point.y * cell + 10;
    ctx.fillStyle = '#172d32'; ctx.strokeStyle = '#b88454'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 7, y - 2); ctx.lineTo(x + 5, y + 8); ctx.lineTo(x - 6, y + 7); ctx.lineTo(x - 8, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.strokeStyle = '#e8a95b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); state.trail.slice().reverse().forEach((point, index) => {
    const x = left + point.x * cell + cell / 2; const y = top + point.y * cell + cell / 2;
    if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }); ctx.stroke();
  state.trail.slice(1).forEach((point, index) => {
    ctx.fillStyle = `rgba(246, 200, 95, ${Math.max(.2, 1 - index / state.trail.length)})`; ctx.beginPath(); ctx.arc(left + point.x * cell + 10, top + point.y * cell + 10, 4, 0, Math.PI * 2); ctx.fill();
  });
  const pulse = 7 + Math.sin(time / 150) * 2;
  ctx.save(); ctx.shadowColor = '#8bf5e1'; ctx.shadowBlur = 15; ctx.fillStyle = '#9af5df'; ctx.beginPath(); ctx.arc(left + state.orb.x * cell + 10, top + state.orb.y * cell + 10, pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const head = state.trail[0];
  drawCustomizedExplorer(ctx, left + head.x * cell + 10, top + head.y * cell + 13, .32, time, character, false, state.direction);
}

function drawPrism(ctx: CanvasRenderingContext2D, state: PrismState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 21, 145, 348, 490, 24, '#07171dde', '#ffbdb45c');
  const sky = ctx.createLinearGradient(0, 155, 0, 625); sky.addColorStop(0, '#253b50'); sky.addColorStop(1, '#12282f');
  ctx.fillStyle = sky; ctx.fillRect(29, 157, 332, 466);
  state.seals.forEach((seal) => {
    ctx.fillStyle = STACK_COLORS[seal.color]; ctx.beginPath(); ctx.roundRect(seal.x - 24, seal.y - 12, 48, 24, 6); ctx.fill();
    ctx.fillStyle = '#ffffff4f'; ctx.fillRect(seal.x - 18, seal.y - 8, 29, 3);
  });
  ctx.save(); ctx.shadowColor = '#fff0a6'; ctx.shadowBlur = 15; ctx.fillStyle = '#fff0a6'; ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.shadowColor = '#71e3d0'; ctx.shadowBlur = 12; ctx.fillStyle = '#71e3d0'; ctx.beginPath(); ctx.roundRect(state.paddleX - 46, 560, 92, 13, 7); ctx.fill(); ctx.restore();
  drawCustomizedExplorer(ctx, 195, 530, .68, time, character, true);
}

const MERGE_COLORS: Record<number, string> = { 2: '#5d8e88', 4: '#55a99c', 8: '#d6a351', 16: '#d37b51', 32: '#a76fb9', 64: '#f6c85f', 128: '#ef8378' };
const MERGE_SYMBOLS: Record<number, string> = { 2: '●', 4: '▲', 8: '■', 16: '◆', 32: '✦', 64: '☀', 128: '✺' };

function drawMerge(ctx: CanvasRenderingContext2D, state: MergeState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 48, 151, 294, 382, 26, '#07171ddd', '#d8b7ff59');
  roundedRect(ctx, 63, 167, 264, 264, 18, '#203d43');
  const left = 70; const top = 174; const cell = 61;
  state.board.forEach((row, y) => row.forEach((value, x) => {
    const px = left + x * cell; const py = top + y * cell;
    roundedRect(ctx, px, py, 55, 55, 12, value ? MERGE_COLORS[value] ?? '#e2746d' : '#ffffff0d', value ? '#ffffff52' : '#ffffff15');
    if (value) {
      ctx.fillStyle = value >= 64 ? '#1f2a2b' : '#fff'; ctx.font = '900 24px Inter, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(MERGE_SYMBOLS[value] ?? '✺', px + 27.5, py + 28);
    }
  }));
  ctx.fillStyle = '#d7c6ec'; ctx.font = '800 10px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('WAYFINDER RUNE FORGE', 195, 458);
  drawCustomizedExplorer(ctx, 195, 552, .84, time, character, true);
}

function drawLantern(ctx: CanvasRenderingContext2D, state: LanternState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 40, 151, 310, 424, 25, '#07171ddd', '#9bd8ff5c');
  const left = 55; const top = 171; const cell = 56;
  ctx.strokeStyle = '#70b9e846'; ctx.lineWidth = 5;
  for (let y = 0; y < 5; y += 1) {
    ctx.beginPath(); ctx.moveTo(left + 28, top + y * cell + 28); ctx.lineTo(left + 4 * cell + 28, top + y * cell + 28); ctx.stroke();
  }
  for (let x = 0; x < 5; x += 1) {
    ctx.beginPath(); ctx.moveTo(left + x * cell + 28, top + 28); ctx.lineTo(left + x * cell + 28, top + 4 * cell + 28); ctx.stroke();
  }
  state.lights.forEach((lit, index) => {
    const x = index % 5; const y = Math.floor(index / 5); const px = left + x * cell; const py = top + y * cell;
    ctx.save();
    if (lit) { ctx.shadowColor = '#f6c85f'; ctx.shadowBlur = 13 + Math.sin(time / 220 + index) * 3; }
    roundedRect(ctx, px + 3, py + 3, 50, 50, 13, lit ? '#f6c85f' : '#31565b', lit ? '#fff2b2' : '#6d9291');
    ctx.shadowBlur = 0; ctx.translate(px + 28, py + 28); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = lit ? '#6c5423' : '#9ab9b5'; ctx.lineWidth = 3; ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  });
  ctx.fillStyle = '#b7d6da'; ctx.font = '800 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('WAYFINDER LANTERN CIRCUIT', 195, 473);
  drawCustomizedExplorer(ctx, 195, 548, .76, time, character, true);
}

function drawIce(ctx: CanvasRenderingContext2D, state: IceState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 28, 150, 334, 430, 24, '#071a20dd', '#b9efff66');
  const cell = 34; const left = 42; const top = 169; const collected = new Set(state.collected);
  ICE_MAP.forEach((row, y) => [...row].forEach((tile, x) => {
    const px = left + x * cell; const py = top + y * cell;
    if (tile === '#') { roundedRect(ctx, px + 1, py + 1, cell - 2, cell - 2, 7, '#28505d', '#83b9c3'); return; }
    ctx.fillStyle = (x + y) % 2 ? '#72acc0' : '#7db7c8'; ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
    ctx.strokeStyle = '#d8f8ff38'; ctx.beginPath(); ctx.moveTo(px + 5, py + 10); ctx.lineTo(px + 28, py + 4); ctx.moveTo(px + 12, py + 29); ctx.lineTo(px + 30, py + 20); ctx.stroke();
  }));
  const exitX = left + state.exit.x * cell + cell / 2; const exitY = top + state.exit.y * cell + cell / 2;
  ctx.save(); ctx.shadowColor = '#f6c85f'; ctx.shadowBlur = 14; ctx.fillStyle = '#f6c85f'; ctx.beginPath(); ctx.arc(exitX, exitY, 11, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  state.sigils.forEach((sigil, index) => { if (collected.has(`${sigil.x},${sigil.y}`)) return; const x = left + sigil.x * cell + 17; const y = top + sigil.y * cell + 17; ctx.save(); ctx.translate(x, y); ctx.rotate(time / 900 + index); ctx.strokeStyle = '#e7fbff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke(); ctx.restore(); });
  drawCustomizedExplorer(ctx, left + state.player.x * cell + 17, top + state.player.y * cell + 23, .45, time, character, false, 'up');
}

function drawCrate(ctx: CanvasRenderingContext2D, state: CrateState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 20, 150, 350, 430, 24, '#071a20dd', '#ffd9a36b');
  const cell = 42; const left = 27; const top = 169;
  CRATE_MAP.forEach((row, y) => [...row].forEach((tile, x) => {
    const px = left + x * cell; const py = top + y * cell;
    roundedRect(ctx, px + 1, py + 1, cell - 2, cell - 2, 6, tile === '#' ? '#365157' : (x + y) % 2 ? '#486b67' : '#4f736e', tile === '#' ? '#7c9a97' : '#ffffff16');
  }));
  state.goals.forEach((goal) => { const x = left + goal.x * cell + 21; const y = top + goal.y * cell + 21; ctx.strokeStyle = '#f6c85f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke(); });
  state.crates.forEach((crate) => { const x = left + crate.x * cell; const y = top + crate.y * cell; const powered = state.goals.some((goal) => goal.x === crate.x && goal.y === crate.y); roundedRect(ctx, x + 5, y + 5, 32, 32, 7, powered ? '#f6c85f' : '#d78250', '#fff6'); ctx.strokeStyle = powered ? '#735820' : '#7c412b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 11, y + 11); ctx.lineTo(x + 31, y + 31); ctx.moveTo(x + 31, y + 11); ctx.lineTo(x + 11, y + 31); ctx.stroke(); });
  drawCustomizedExplorer(ctx, left + state.player.x * cell + 21, top + state.player.y * cell + 28, .52, time, character, false);
}

const ECHO_PAD_POSITIONS = [{ x: 195, y: 215 }, { x: 287, y: 326 }, { x: 195, y: 437 }, { x: 103, y: 326 }];
function drawEcho(ctx: CanvasRenderingContext2D, state: EchoState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 29, 151, 332, 424, 26, '#07171ddd', '#e7b4f562');
  ctx.strokeStyle = '#d58be64a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(195, 326, 112, 0, Math.PI * 2); ctx.stroke();
  const length = 4 + state.round * 2; const activePad = state.acceptingInput ? -1 : state.sequence[Math.min(state.revealIndex, length - 1)];
  ECHO_PAD_POSITIONS.forEach((position, index) => { const active = activePad === index; ctx.save(); if (active) { ctx.shadowColor = '#fff0a6'; ctx.shadowBlur = 24; } roundedRect(ctx, position.x - 38, position.y - 38, 76, 76, 22, active ? '#f6c85f' : ['#7cc6bd', '#d8847d', '#8da8df', '#ca91dc'][index], '#ffffff88'); ctx.fillStyle = active ? '#183238' : '#fff'; ctx.font = '900 20px Inter, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1), position.x, position.y); ctx.restore(); });
  ctx.fillStyle = '#d9cde3'; ctx.font = '800 10px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(state.acceptingInput ? `REPEAT ${length} SIGNALS` : `WATCH · ROUND ${state.round + 1}`, 195, 333);
  drawCustomizedExplorer(ctx, 195, 563, .74, time, character, true);
}

function drawGear(ctx: CanvasRenderingContext2D, state: GearState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 39, 151, 312, 422, 25, '#07171ddd', '#a8efc16b');
  const left = 55; const top = 170; const cell = 70;
  state.rotations.forEach((rotation, index) => {
    const x = left + index % 4 * cell; const y = top + Math.floor(index / 4) * cell; const aligned = rotation === state.target[index];
    roundedRect(ctx, x + 4, y + 4, 62, 62, 14, aligned ? '#4f9a73' : '#31585a', aligned ? '#b9f7cf' : '#6d9291');
    const cx = x + 35; const cy = y + 35; const currentAngle = rotation * Math.PI / 2 - Math.PI / 2; const targetAngle = state.target[index] * Math.PI / 2 - Math.PI / 2;
    ctx.strokeStyle = aligned ? '#e9ffbd' : '#d7e8e3'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(currentAngle) * 22, cy + Math.sin(currentAngle) * 22); ctx.stroke();
    ctx.fillStyle = '#f6c85f'; ctx.beginPath(); ctx.arc(cx + Math.cos(targetAngle) * 27, cy + Math.sin(targetAngle) * 27, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17343a'; ctx.beginPath(); ctx.arc(cx, cy, 7 + Math.sin(time / 500 + index) * .5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#b9ddd0'; ctx.font = '800 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('WHITE ARM → GOLD BLUEPRINT MARK', 195, 478);
  drawCustomizedExplorer(ctx, 195, 558, .76, time, character, true);
}

function drawOrbit(ctx: CanvasRenderingContext2D, state: OrbitState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 26, 151, 338, 430, 26, '#07171ddd', '#ffb8aa66');
  const cx = 195; const cy = 326; const radius = 118;
  ctx.strokeStyle = '#6b8f91'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#f6c85f'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, radius, state.targetAngle - state.targetWidth, state.targetAngle + state.targetWidth); ctx.stroke();
  const sparkX = cx + Math.cos(state.angle) * radius; const sparkY = cy + Math.sin(state.angle) * radius;
  ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff5bf'; ctx.beginPath(); ctx.arc(sparkX, sparkY, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#203e43'; ctx.beginPath(); ctx.arc(cx, cy, 71, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f6c85f'; ctx.font = '900 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${state.gate}/6`, cx, cy - 4);
  ctx.fillStyle = '#acd4ce'; ctx.font = '800 9px Inter, system-ui'; ctx.fillText('ORBIT GATES', cx, cy + 24);
  drawCustomizedExplorer(ctx, 195, 561, .74, time, character, true);
}

const WORD_MARK_COLORS = { correct: '#418b67', present: '#b89139', absent: '#405a5d' } as const;
function drawWord(ctx: CanvasRenderingContext2D, state: WordState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 28, 150, 334, 454, 26, '#07171ddd', '#a5efd06b');
  ctx.fillStyle = '#bfe5d6'; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('FIVE-LETTER RUNE LOCK', 195, 174);
  const cell = 43; const gap = 7; const left = 76; const top = 190;
  for (let row = 0; row < state.maxGuesses; row += 1) {
    const guess = state.guesses[row]; const letters = guess?.word ?? (row === state.guesses.length ? state.current : '');
    for (let col = 0; col < 5; col += 1) {
      const x = left + col * (cell + gap); const y = top + row * 47; const fill = guess ? WORD_MARK_COLORS[guess.marks[col]] : row === state.guesses.length ? '#31575b' : '#17383d';
      roundedRect(ctx, x, y, cell, 40, 9, fill, row === state.guesses.length ? '#dffff29c' : '#ffffff30');
      ctx.fillStyle = '#fff'; ctx.font = '900 19px Inter, system-ui'; ctx.textBaseline = 'middle'; ctx.fillText(letters[col] ?? '', x + cell / 2, y + 21);
    }
  }
  ctx.textBaseline = 'alphabetic'; drawCustomizedExplorer(ctx, 340, 425, .58, time, character, true);
}

function drawConnections(ctx: CanvasRenderingContext2D, state: ConnectionsState, time: number, character: CharacterCustomization) {
  roundedRect(ctx, 24, 150, 342, 454, 26, '#07171ddd', '#efb6df69');
  ctx.fillStyle = '#e8cfe3'; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('RELIC ASSOCIATION ARCHIVE', 195, 174);
  ctx.fillStyle = '#ffffff18'; ctx.beginPath(); ctx.moveTo(48, 188); ctx.lineTo(342, 188); ctx.lineTo(322, 512); ctx.lineTo(68, 512); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff22'; ctx.stroke();
  drawCustomizedExplorer(ctx, 195, 596, .48, time, character, true);
}

function drawExitJourney(ctx: CanvasRenderingContext2D, journey: VictoryJourney, time: number, character: CharacterCustomization, theme: LabTheme) {
  if (journey.phase === 'idle') return;
  const portalX = 338; const portalY = 548; const pulse = 1 + Math.sin(time / 230) * .04;
  if (journey.phase !== 'celebrating') { ctx.save(); ctx.shadowColor = theme.portal; ctx.shadowBlur = 18; ctx.strokeStyle = theme.portal; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(portalX, portalY - 28, 22 * pulse, 40 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  const x = 195 + journey.x / 4 * (portalX - 195); const y = 560 + journey.lane * 24;
  drawCharacterCanvas(ctx, character, { x, groundY: y, scale: .56, time, pose: journey.phase === 'celebrating' || journey.phase === 'departed' ? 'celebrate' : 'walk', facing: 'right' });
}

function drawStatusOverlay(ctx: CanvasRenderingContext2D, state: ClassicLabState, definition: LabDefinition, journey: VictoryJourney) {
  if (state.status === 'playing' || (state.status === 'complete' && journey.phase !== 'departed')) return;
  roundedRect(ctx, 53, 332, 284, 108, 22, '#06171bef', state.status === 'complete' ? '#ffe596' : '#ff9b8e');
  ctx.fillStyle = state.status === 'complete' ? definition.accent : '#ff8e82'; ctx.font = '900 11px Inter, system-ui'; ctx.textAlign = 'center';
  ctx.fillText(state.status === 'complete' ? 'LAB CLEARED' : 'SIGNAL LOST', 195, 365);
  ctx.fillStyle = '#fff'; ctx.font = '800 17px Inter, system-ui'; ctx.fillText(state.status === 'complete' ? 'The next portal is open' : 'Reset to run it again', 195, 396);
  ctx.fillStyle = '#b7d4d0'; ctx.font = '700 10px Inter, system-ui'; ctx.fillText(`${definition.title} · Lab ${String(definition.id).padStart(2, '0')}`, 195, 420);
}

function drawClassicLab(ctx: CanvasRenderingContext2D, state: ClassicLabState, definition: LabDefinition, time: number, character: CharacterCustomization, journey: VictoryJourney, theme: LabTheme) {
  drawLabBackdrop(ctx, definition, time, theme);
  suppressGameCharacter = journey.phase !== 'idle';
  if (state.id === 3) drawRelic(ctx, state, time, character);
  else if (state.id === 4) drawStack(ctx, state, time, character);
  else if (state.id === 5) drawRiver(ctx, state, time, character);
  else if (state.id === 6) drawCoil(ctx, state, time, character);
  else if (state.id === 7) drawPrism(ctx, state, time, character);
  else if (state.id === 8) drawMerge(ctx, state, time, character);
  else if (state.id === 9) drawLantern(ctx, state, time, character);
  else if (state.id === 10) drawIce(ctx, state, time, character);
  else if (state.id === 11) drawCrate(ctx, state, time, character);
  else if (state.id === 12) drawEcho(ctx, state, time, character);
  else if (state.id === 13) drawGear(ctx, state, time, character);
  else if (state.id === 14) drawOrbit(ctx, state, time, character);
  else if (state.id === 15) drawWord(ctx, state, time, character);
  else drawConnections(ctx, state, time, character);
  suppressGameCharacter = false;
  drawExitJourney(ctx, journey, time, character, theme);
  drawStatusOverlay(ctx, state, definition, journey);
}

function labStats(state: ClassicLabState) {
  if (state.id === 3) return [{ value: `${Math.min(state.score, state.target)}/${state.target}`, label: 'sparks' }, { value: state.lives, label: 'lives' }];
  if (state.id === 4) return [{ value: state.score, label: 'score' }, { value: `${state.lines}/50`, label: 'lines' }];
  if (state.id === 5) return [{ value: state.lives, label: 'lives' }, { value: 10 - state.bestRow, label: 'lanes' }];
  if (state.id === 6) return [{ value: `${state.score}/${state.target}`, label: 'signals' }, { value: state.trail.length, label: 'trail' }];
  if (state.id === 7) return [{ value: state.seals.length, label: 'seals' }, { value: state.lives, label: 'lives' }];
  if (state.id === 8) return [{ value: `${Math.log2(state.highest)}/6`, label: 'stack' }, { value: state.moves, label: 'moves' }];
  if (state.id === 9) return [{ value: `${state.lit}/25`, label: 'lit' }, { value: state.moves, label: 'moves' }];
  if (state.id === 10) return [{ value: `${state.collected.length}/4`, label: 'sigils' }, { value: state.moves, label: 'slides' }];
  if (state.id === 11) return [{ value: `${state.score}/3`, label: 'powered' }, { value: state.pushes, label: 'pushes' }];
  if (state.id === 12) return [{ value: `${state.round + 1}/3`, label: 'round' }, { value: `${state.strikes}/2`, label: 'errors' }];
  if (state.id === 13) return [{ value: `${state.aligned}/16`, label: 'aligned' }, { value: state.moves, label: 'turns' }];
  if (state.id === 14) return [{ value: `${state.gate}/6`, label: 'gates' }, { value: `${state.misses}/3`, label: 'misses' }];
  if (state.id === 15) return [{ value: `${state.guesses.length}/6`, label: 'guesses' }, { value: state.current.length, label: 'letters' }];
  return [{ value: `${state.solved.length}/4`, label: 'groups' }, { value: `${state.mistakes}/4`, label: 'mistakes' }];
}

function DirectionPad({ move, center, disabled }: { move: (direction: ClassicDirection) => void; center?: ReactNode; disabled?: boolean }) {
  return <div className="lab-dpad compact-dpad">
    <button className="up" disabled={disabled} onClick={() => move('up')} aria-label="Move up">↑</button>
    <button className="left" disabled={disabled} onClick={() => move('left')} aria-label="Move left">←</button>
    <span aria-hidden="true">{center ?? '◆'}</span>
    <button className="right" disabled={disabled} onClick={() => move('right')} aria-label="Move right">→</button>
    <button className="down" disabled={disabled} onClick={() => move('down')} aria-label="Move down">↓</button>
  </div>;
}

export function ClassicLab({ id, onExit, onComplete, character, theme = PROTOTYPE_THEME, contextLabel = 'PROTOTYPE CORRIDOR' }: { id: ClassicLabId; onExit: () => void; onComplete?: () => void; character: CharacterCustomization; theme?: LabTheme; contextLabel?: string }) {
  const definition = CLASSIC_LABS.find((lab) => lab.id === id)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<ClassicLabState>(() => initialClassicLabState(id));
  const stateRef = useRef<ClassicLabState>(state);
  const manualTime = useRef(false);
  const drawNowRef = useRef<(() => void) | null>(null);
  const [gridCursor, setGridCursor] = useState(0);
  const [journey, setJourney] = useState<VictoryJourney>(idleVictoryJourney);
  const journeyRef = useRef(journey);
  const completionSent = useRef(false);

  const updateJourney = useCallback((update: (current: VictoryJourney) => VictoryJourney) => {
    const next = update(journeyRef.current); journeyRef.current = next; setJourney(next); drawNowRef.current?.();
  }, []);

  const commit = useCallback((action: ClassicLabAction) => {
    if (journeyRef.current.phase !== 'idle') {
      if (action.type === 'tick') updateJourney((current) => tickVictoryJourney(current, action.ms));
      else if (action.type === 'move') updateJourney((current) => moveVictoryJourney(current, action.direction));
      return;
    }
    const current = stateRef.current;
    const next = updateClassicLab(current, action);
    const statusChanged = next.status !== current.status;
    stateRef.current = next; setState(next);
    if (current.status !== 'complete' && next.status === 'complete') updateJourney(() => beginVictoryJourney());
    drawNowRef.current?.();
    if (statusChanged || action.type !== 'tick') navigator.vibrate?.(next.status === 'complete' ? [30, 40, 60] : 10);
  }, [updateJourney]);

  const move = useCallback((direction: ClassicDirection) => commit({ type: 'move', direction }), [commit]);
  const reset = useCallback(() => {
    const next = initialClassicLabState(id); stateRef.current = next; setState(next); completionSent.current = false;
    const idle = idleVictoryJourney(); journeyRef.current = idle; setJourney(idle); drawNowRef.current?.();
  }, [id]);

  useEffect(() => {
    if (journey.phase === 'departed' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(); }
  }, [journey.phase, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0;
    const draw = () => { drawClassicLab(ctx, stateRef.current, definition, performance.now(), character, journeyRef.current, theme); frame = requestAnimationFrame(draw); };
    drawNowRef.current = () => drawClassicLab(ctx, stateRef.current, definition, performance.now(), character, journeyRef.current, theme); draw();
    return () => { cancelAnimationFrame(frame); drawNowRef.current = null; };
  }, [character, definition, theme]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (!manualTime.current) commit({ type: 'tick', ms: 50 }); }, 50);
    return () => window.clearInterval(interval);
  }, [commit, id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (id === 15 && journeyRef.current.phase === 'idle') {
        if (/^[a-z]$/.test(key)) { event.preventDefault(); commit({ type: 'letter', letter: key }); }
        else if (key === 'backspace') { event.preventDefault(); commit({ type: 'backspace' }); }
        else if (key === 'enter') { event.preventDefault(); commit({ type: 'submit-word' }); }
        return;
      }
      const direction = key === 'arrowup' || key === 'w' ? 'up'
        : key === 'arrowdown' || key === 's' ? 'down'
          : key === 'arrowleft' || key === 'a' ? 'left'
            : key === 'arrowright' || key === 'd' ? 'right' : null;
      if (direction && journeyRef.current.phase !== 'idle') { event.preventDefault(); move(direction); }
      else if (direction && id === 12) { event.preventDefault(); commit({ type: 'activate', index: direction === 'up' ? 0 : direction === 'right' ? 1 : direction === 'down' ? 2 : 3 }); }
      else if (direction && id === 13) {
        event.preventDefault(); setGridCursor((current) => {
          const x = current % 4; const y = Math.floor(current / 4);
          return direction === 'left' ? y * 4 + Math.max(0, x - 1) : direction === 'right' ? y * 4 + Math.min(3, x + 1) : direction === 'up' ? Math.max(0, y - 1) * 4 + x : Math.min(3, y + 1) * 4 + x;
        });
      }
      else if (direction) { event.preventDefault(); move(direction); }
      else if (key === ' ' && id === 4) { event.preventDefault(); commit({ type: 'hard-drop' }); }
      else if ((key === 'q' || key === 'x') && id === 4) { event.preventDefault(); commit({ type: 'rotate' }); }
      else if ((event.code === 'Space' || key === 'enter') && id === 13) { event.preventDefault(); commit({ type: 'activate', index: gridCursor }); }
      else if ((event.code === 'Space' || key === 'enter') && id === 14) { event.preventDefault(); commit({ type: 'activate', index: 0 }); }
      else if (id === 12 && ['1', '2', '3', '4'].includes(key)) { event.preventDefault(); commit({ type: 'activate', index: Number(key) - 1 }); }
      else if (key === 'r') { event.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [commit, gridCursor, id, move, reset]);

  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; commit({ type: 'tick', ms }); };
    bridge.render_game_to_text = () => JSON.stringify({ ...classicLabSnapshot(stateRef.current), victory: journeyRef.current, character, theme: { id: theme.id, worldName: theme.worldName, portalName: theme.portalName } });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character, commit, theme]);

  const stats = labStats(state);
  const controlsDisabled = state.status !== 'playing';
  const tapAction = useCallback(({ x, y }: { x: number; y: number }) => {
    if (journeyRef.current.phase !== 'idle') {
      const dx = x - .5; const dy = y - .48; move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up'); return;
    }
    if (id === 4) { commit({ type: 'hard-drop' }); return; }
    if (id === 14) { commit({ type: 'activate', index: 0 }); return; }
    const dx = x - .5; const dy = y - .45;
    const direction: ClassicDirection = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
    if (id === 12) commit({ type: 'activate', index: direction === 'up' ? 0 : direction === 'right' ? 1 : direction === 'down' ? 2 : 3 });
    else if (id !== 9 && id !== 13) move(direction);
  }, [commit, id, move]);
  const swipe = useSwipeDirection((direction) => {
    if (journeyRef.current.phase !== 'idle') move(direction);
    else if (id === 12) commit({ type: 'activate', index: direction === 'up' ? 0 : direction === 'right' ? 1 : direction === 'down' ? 2 : 3 });
    else if (id === 13) setGridCursor((current) => {
      const x = current % 4; const y = Math.floor(current / 4);
      return direction === 'left' ? y * 4 + Math.max(0, x - 1) : direction === 'right' ? y * 4 + Math.min(3, x + 1) : direction === 'up' ? Math.max(0, y - 1) * 4 + x : Math.min(3, y + 1) * 4 + x;
    });
    else move(direction);
  }, state.status === 'failed' || journey.phase === 'celebrating' || journey.phase === 'departed', tapAction);

  return <section className="lab-screen classic-lab-screen" aria-label={`${definition.title} puzzle lab`} style={themeCss(theme)}>
    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-label={`${definition.title} game world`} {...swipe} />
    <header className="lab-header">
      <button className="icon-button glass" onClick={onExit} aria-label="Back to Lab corridor">←</button>
      <div><span>{contextLabel} · LAB {String(id).padStart(2, '0')}</span><h1>{definition.title} · {definition.shortTitle}</h1></div>
      <button className="lab-small-button glass" onClick={reset}>RESET</button>
    </header>
    <div className="lab-brief">
      <div><strong>{stats[0].value}</strong><small>{stats[0].label}</small></div>
      <p>{definition.objective}</p>
      <div><strong>{stats[1].value}</strong><small>{stats[1].label}</small></div>
    </div>
    {state.id === 9 && <div className="lantern-hit-grid" aria-label="Lantern grid">
      {state.lights.map((lit, index) => <button key={index} disabled={state.status !== 'playing'} onClick={() => commit({ type: 'activate', index })} aria-label={`Lantern rune ${Math.floor(index / 5) + 1}, ${index % 5 + 1}, ${lit ? 'lit' : 'dark'}`} />)}
    </div>}
    {state.id === 12 && <div className="echo-hit-grid" aria-label="Echo signal pads">
      {['north', 'east', 'south', 'west'].map((label, index) => <button key={label} disabled={state.status !== 'playing' || !state.acceptingInput} onClick={() => commit({ type: 'activate', index })} aria-label={`Echo pad ${index + 1}, ${label}`} />)}
    </div>}
    {state.id === 13 && <div className="gear-hit-grid" aria-label="Gear link grid">
      {state.rotations.map((rotation, index) => <button className={gridCursor === index ? 'keyboard-current' : ''} key={index} disabled={state.status !== 'playing'} onClick={() => { setGridCursor(index); commit({ type: 'activate', index }); }} aria-label={`Gear link ${Math.floor(index / 4) + 1}, ${index % 4 + 1}, orientation ${rotation + 1}`} />)}
    </div>}
    {state.id === 15 && journey.phase === 'idle' && <div className="word-keyboard" aria-label="Rune Word keyboard">
      {WORD_KEY_ROWS.map((row) => <div key={row}>{[...row].map((letter) => <button key={letter} disabled={state.status !== 'playing'} onClick={() => commit({ type: 'letter', letter })} aria-label={`Letter ${letter}`}>{letter}</button>)}</div>)}
      <div className="word-keyboard-actions"><button disabled={state.status !== 'playing'} onClick={() => commit({ type: 'backspace' })} aria-label="Delete letter">⌫ DELETE</button><button disabled={state.status !== 'playing'} onClick={() => commit({ type: 'submit-word' })}>ENTER ↵</button></div>
    </div>}
    {state.id === 16 && journey.phase === 'idle' && <div className="connection-panel" aria-label="Relic connection tiles">
      {state.solved.map((name) => { const group = state.groups.find((item) => item.name === name)!; return <div className="connection-solved" key={name} style={{ '--group-color': group.color } as CSSProperties}><strong>{group.name}</strong><small>{group.words.join(' · ')}</small></div>; })}
      <div className="connection-grid">{state.words.map((word) => <button key={word} className={state.selected.includes(word) ? 'selected' : ''} disabled={state.status !== 'playing'} aria-pressed={state.selected.includes(word)} onClick={() => commit({ type: 'toggle-connection', word })}>{word}</button>)}</div>
      <div className="connection-actions"><button disabled={state.status !== 'playing'} onClick={() => commit({ type: 'shuffle-connection' })}>SHUFFLE</button><button disabled={state.status !== 'playing' || state.selected.length !== 4} onClick={() => commit({ type: 'submit-connection' })}>SUBMIT GROUP</button></div>
    </div>}
    <div className={`lab-message classic-message ${state.status}`} aria-live="polite">{journey.phase === 'idle' ? state.message : victoryJourneyMessage(journey, theme.portalName)}</div>
    <div className={`lab-controls classic-controls lab-controls-${state.id}`} aria-label={`${definition.title} controls`}>
      {journey.phase !== 'idle' ? <>
        <button className="lab-utility side-note" disabled>{journey.phase === 'celebrating' ? 'CHEER' : journey.phase === 'departed' ? 'CLEAR' : 'EXIT'}<small>{journey.x} / 4</small></button>
        <DirectionPad move={move} center="◇" disabled={journey.phase !== 'portal-open'} />
        <button className="lab-utility" onClick={reset}>RESET <small>R</small></button>
      </> : state.id === 4 ? <>
        <button className="lab-utility" disabled={controlsDisabled} onClick={() => commit({ type: 'rotate' })}>ROTATE <small>Q / ↑</small></button>
        <DirectionPad move={move} center="▦" disabled={controlsDisabled} />
        <button className="lab-utility" disabled={controlsDisabled} onClick={() => commit({ type: 'hard-drop' })}>DROP <small>SPACE</small></button>
      </> : state.id === 7 ? <>
        <button className="lab-action-key" disabled={controlsDisabled} onClick={() => move('left')} aria-label="Move light bar left">←</button>
        <div className="remote-center"><span>◆</span><small>REMOTE LINK</small></div>
        <button className="lab-action-key" disabled={controlsDisabled} onClick={() => move('right')} aria-label="Move light bar right">→</button>
      </> : state.id === 9 ? <>
        <button className="lab-mode-key active" disabled>GOAL <small>Light all 25</small></button>
        <div className="remote-center"><span>✺</span><small>LANTERN REMOTE</small></div>
        <button className="lab-mode-key" onClick={reset}>RESET <small>New circuit</small></button>
      </> : state.id === 12 ? <>
        <button className="lab-mode-key active" disabled>ROUND <small>{state.round + 1} OF 3</small></button>
        <div className="remote-center"><span>◈</span><small>{state.acceptingInput ? 'YOUR TURN' : 'WATCH SIGNALS'}</small></div>
        <button className="lab-mode-key" onClick={reset}>RESET <small>Replay pattern</small></button>
      </> : state.id === 13 ? <>
        <button className="lab-mode-key active" disabled>LINKS <small>{state.aligned} / 16</small></button>
        <div className="remote-center"><span>⚙</span><small>ARROWS + ENTER</small></div>
        <button className="lab-mode-key" onClick={reset}>RESET <small>Scramble gears</small></button>
      </> : state.id === 14 ? <>
        <button className="lab-mode-key active" disabled>GATES <small>{state.gate} / 6</small></button>
        <button className="orbit-pulse-button" disabled={controlsDisabled} onClick={() => commit({ type: 'activate', index: 0 })}>PULSE<small>SPACE</small></button>
        <button className="lab-mode-key" onClick={reset}>RESET <small>Restart orbit</small></button>
      </> : state.id === 15 ? <>
        <button className="lab-mode-key active" disabled>GUESSES <small>{state.guesses.length} / {state.maxGuesses}</small></button>
        <div className="remote-center"><span>ABC</span><small>TYPE OR TAP LETTERS</small></div>
        <button className="lab-mode-key" onClick={reset}>RESET <small>Clear guesses</small></button>
      </> : state.id === 16 ? <>
        <button className="lab-mode-key active" disabled>GROUPS <small>{state.solved.length} / 4</small></button>
        <div className="remote-center"><span>4×4</span><small>TAP FOUR RELICS</small></div>
        <button className="lab-mode-key" onClick={reset}>RESET <small>Restore archive</small></button>
      </> : <>
        <button className="lab-utility side-note" disabled>{state.id === 11 ? 'PUSH' : state.id === 10 ? 'SLIDE' : state.id === 8 ? 'MERGE' : state.id === 6 ? 'TRAIL' : state.id === 5 ? 'HOP' : 'RUN'}<small>{stats[0].value}</small></button>
        <DirectionPad move={move} center={definition.icon} disabled={controlsDisabled} />
        <button className="lab-utility" onClick={reset}>RESET <small>R</small></button>
      </>}
      <p>{definition.controlHint} · Tap or swipe · Arrow keys or WASD · R resets</p>
    </div>
  </section>;
}
