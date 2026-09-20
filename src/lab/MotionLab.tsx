import { drawScenery } from '../venture/scenery';
import { isGamePaused, gameFeedback } from '../venture/runtime';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import {
  BEAM_CLUES,
  BRIDGE_EDGES,
  BRIDGE_ISLANDS,
  MAGNET_TARGET,
  MOTION_LABS,
  PEG_HOLES,
  SIGNAL_PATH,
  UNTANGLE_EDGES,
  initialMotionLabState,
  motionLabSnapshot,
  updateMotionLab,
  type MotionLabAction,
  type MotionLabId,
  type MotionLabState,
} from './motionLabs';
import { PROTOTYPE_THEME, themeCss } from './theme';
import { beginVictoryJourney, idleVictoryJourney, moveVictoryJourney, tickVictoryJourney, victoryJourneyMessage, type VictoryJourney } from './victory';
import type { ClassicDirection } from './classicLabs';

const WIDTH = 390;
const HEIGHT = 844;
const TILE_COLORS = ['#64b9d7', '#edb95f', '#79c88d', '#c78bd9'];

interface ScreenPoint { x: number; y: number }

function gridPoint(size: number, x: number, y: number): ScreenPoint {
  const spread = size === 5 ? 29 : 35;
  return { x: 195 + (x - y) * spread, y: 245 + (x + y) * 16 };
}

function pegPoint(index: number): ScreenPoint {
  const hole = PEG_HOLES[index];
  return { x: 195 + (hole.column - hole.row / 2) * 55, y: 245 + hole.row * 47 };
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, depth = 7) {
  ctx.fillStyle = '#061b20aa';
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y + h + depth); ctx.lineTo(x + w, y + depth); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.strokeStyle = '#dff7ef82'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, definition: (typeof MOTION_LABS)[number], time: number) {
  drawScenery(ctx, definition.id, time);
}

function drawPlatform(ctx: CanvasRenderingContext2D, accent: string) {
  ctx.fillStyle = '#0b252bd9'; ctx.beginPath(); ctx.moveTo(195, 185); ctx.lineTo(372, 310); ctx.lineTo(195, 505); ctx.lineTo(18, 310); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `${accent}66`; ctx.lineWidth = 2; ctx.stroke();
}

function drawRayLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 17 }>, time: number) {
  drawPlatform(ctx, '#73d7e6');
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) {
    const index = y * 5 + x; const point = gridPoint(5, x, y); const selected = state.selected.includes(index);
    diamond(ctx, point.x, point.y, 28, 15, selected ? '#4fc7df' : '#315b61', selected ? 12 : 6);
    if (selected) {
      const pulse = 1 + Math.sin(time / 95) * .12; ctx.save(); ctx.translate(point.x, point.y - 16); ctx.scale(pulse, pulse);
      ctx.fillStyle = '#d7fbff'; ctx.strokeStyle = '#73d7e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 0); ctx.lineTo(0, 15); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  const rayStarts = [{ x: 120, y: 205 }, { x: 48, y: 300 }, { x: 342, y: 300 }, { x: 195, y: 467 }, { x: 270, y: 205 }];
  const rayEnds = [{ x: 270, y: 382 }, { x: 285, y: 275 }, { x: 175, y: 365 }, { x: 135, y: 260 }, { x: 215, y: 340 }];
  const start = rayStarts[state.activeRay]; const end = rayEnds[state.activeRay]; const distance = state.rayDistance;
  ctx.strokeStyle = '#bffaff'; ctx.lineWidth = 3; ctx.shadowColor = '#75e9ff'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(start.x + (end.x - start.x) * distance, start.y + (end.y - start.y) * distance); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center';
  BEAM_CLUES.forEach((clue, index) => { const p = rayStarts[index]; ctx.fillStyle = index === state.activeRay ? '#d7fbff' : '#9dc6c7'; ctx.fillText(clue.split(' ')[0], p.x, p.y - 8); });
}

function bridgePoint(index: number): ScreenPoint {
  const island = BRIDGE_ISLANDS[index]; return gridPoint(4, island.x, island.y);
}

function drawBridgeLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 18 }>, time: number) {
  drawPlatform(ctx, '#efb65f');
  BRIDGE_EDGES.forEach((edge, index) => {
    const a = bridgePoint(edge.a); const b = bridgePoint(edge.b); const amount = Math.max(0, state.spring[index]);
    if (amount < .04) { ctx.strokeStyle = '#c9e6dc2b'; ctx.setLineDash([5, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); return; }
    const spanCount = Math.max(1, Math.ceil(Math.min(state.links[index], amount))); const extension = Math.min(1, amount / Math.max(1, state.links[index]));
    const end = { x: a.x + (b.x - a.x) * extension, y: a.y + (b.y - a.y) * extension };
    for (let span = 0; span < spanCount; span += 1) {
      const offset = (span - (spanCount - 1) / 2) * 7; ctx.strokeStyle = '#f1bd65'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.shadowColor = '#f0c36b'; ctx.shadowBlur = state.lastIndex === index && state.pulseMs > 0 ? 12 : 0;
      ctx.beginPath(); ctx.moveTo(a.x + offset, a.y + offset * .2); ctx.quadraticCurveTo((a.x + end.x) / 2, (a.y + end.y) / 2 + Math.sin(time / 180 + index) * 2, end.x + offset, end.y + offset * .2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
  });
  const degrees = BRIDGE_ISLANDS.map((_, islandIndex) => BRIDGE_EDGES.reduce((total, edge, edgeIndex) => total + (edge.a === islandIndex || edge.b === islandIndex ? state.links[edgeIndex] : 0), 0));
  BRIDGE_ISLANDS.forEach((island, index) => {
    const p = bridgePoint(index); ctx.fillStyle = '#24484b'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 31, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = degrees[index] === island.target ? '#efb65f' : '#70a29c'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 29, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#102d32'; ctx.font = '950 13px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${degrees[index]}/${island.target}`, p.x, p.y + 5);
  });
}

function drawFloodLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 19 }>) {
  drawPlatform(ctx, '#6bd4b1');
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const p = gridPoint(4, x, y); diamond(ctx, p.x, p.y, 34, 18, TILE_COLORS[state.board[y][x]], 8);
    ctx.fillStyle = '#e6fff61f'; ctx.beginPath(); ctx.ellipse(p.x - 7, p.y - 4, 11, 4, -.3, 0, Math.PI * 2); ctx.fill();
  }
  const source = gridPoint(4, 0, 0); ctx.strokeStyle = '#efffff'; ctx.lineWidth = 3; ctx.globalAlpha = 1 - state.waveRadius;
  ctx.beginPath(); ctx.ellipse(source.x, source.y, 24 + state.waveRadius * 130, 12 + state.waveRadius * 68, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}

function drawStarLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 20 }>, time: number) {
  drawPlatform(ctx, '#d59bea');
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const index = y * 4 + x; const assignment = state.assignments[index]; const p = gridPoint(4, x, y);
    diamond(ctx, p.x, p.y, 34, 18, assignment < 0 ? '#314f55' : TILE_COLORS[assignment], 7);
  }
  const anchors = [0, 2, 8, 10];
  anchors.forEach((index, star) => {
    const p = gridPoint(4, index % 4, Math.floor(index / 4)); const angle = state.orbitAngle + star * 1.4;
    ctx.fillStyle = '#fff3c3'; ctx.font = '950 24px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('✦', p.x, p.y + 7);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * 18, p.y + Math.sin(angle) * 9, 3, 0, Math.PI * 2); ctx.fill();
  });
  if (state.pulseMs > 0 && state.lastIndex !== null) {
    const p = gridPoint(4, state.lastIndex % 4, Math.floor(state.lastIndex / 4)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = state.pulseMs / 360; ctx.beginPath(); ctx.ellipse(p.x, p.y, 42, 24, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function drawPegLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 21 }>, time: number) {
  ctx.fillStyle = '#17383d'; ctx.beginPath(); ctx.moveTo(195, 190); ctx.lineTo(370, 445); ctx.lineTo(20, 445); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ee8e6d70'; ctx.lineWidth = 3; ctx.stroke();
  PEG_HOLES.forEach((_, index) => {
    const p = pegPoint(index); ctx.fillStyle = '#071b20'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 5, 17, 9, 0, 0, Math.PI * 2); ctx.fill();
  });
  const jump = state.jump; const jumpProgress = jump ? Math.min(1, jump.elapsedMs / jump.durationMs) : 0;
  state.pegs.forEach((present, index) => {
    if (!present || (jump && index === jump.to)) return; const p = pegPoint(index); const selected = state.selected === index;
    ctx.fillStyle = selected ? '#fff1b0' : '#ee8e6d'; ctx.shadowColor = selected ? '#fff1b0' : '#ee8e6d'; ctx.shadowBlur = selected ? 16 : 5; ctx.beginPath(); ctx.arc(p.x, p.y - 10 + Math.sin(time / 240 + index) * 1.4, 13, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  });
  if (jump) {
    const a = pegPoint(jump.from); const b = pegPoint(jump.to); const x = a.x + (b.x - a.x) * jumpProgress; const y = a.y + (b.y - a.y) * jumpProgress - Math.sin(Math.PI * jumpProgress) * 62;
    ctx.fillStyle = '#fff1b0'; ctx.shadowColor = '#ee8e6d'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(x, y - 10, 14, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
}

function drawDominoLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 22 }>, time: number) {
  drawPlatform(ctx, '#e0b06c');
  for (let y = 0; y < 3; y += 1) for (let x = 0; x < 4; x += 1) {
    const index = y * 4 + x; const p = gridPoint(4, x, y); const paired = state.pairs.some(([a, b]) => a === index || b === index); const selected = state.selected === index;
    diamond(ctx, p.x, p.y, 34, 18, paired ? '#886c46' : selected ? '#f6d991' : '#486a68', paired ? 4 : 8);
    ctx.fillStyle = paired ? '#d9c7a2' : '#fff4c7'; ctx.font = '950 18px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(['●', '▲', '■', '◆', '✦', '☾'][state.board[index]], p.x, p.y + 6);
  }
  state.pairs.forEach((pair, pairIndex) => {
    const a = gridPoint(4, pair[0] % 4, Math.floor(pair[0] / 4)); const b = gridPoint(4, pair[1] % 4, Math.floor(pair[1] / 4)); const newest = pairIndex === state.pairs.length - 1; const progress = newest ? Math.min(1, state.deployMs / 520) : 1;
    ctx.strokeStyle = '#e0b06c'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.shadowColor = '#e0b06c'; ctx.shadowBlur = newest ? 14 : 5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress); ctx.stroke(); ctx.shadowBlur = 0;
  });
  if (state.pulseMs > 0 && state.selected !== null) { const p = gridPoint(4, state.selected % 4, Math.floor(state.selected / 4)); ctx.strokeStyle = '#fff'; ctx.globalAlpha = state.pulseMs / 280; ctx.beginPath(); ctx.ellipse(p.x, p.y, 41, 22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
}

function drawInequalityLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 23 }>, time: number) {
  drawPlatform(ctx, '#83cfa4');
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const index = y * 4 + x; const p = gridPoint(4, x, y); const value = state.values[index]; diamond(ctx, p.x, p.y, 33, 17, '#365c59', 5);
    for (let level = 0; level < value; level += 1) { const lift = level * 8; ctx.fillStyle = level === value - 1 ? '#83cfa4' : '#497b70'; ctx.fillRect(p.x - 13 + level, p.y - 3 - lift, 26 - level * 2, 7); }
    ctx.fillStyle = value ? '#f0fff7' : '#91aaa6'; ctx.font = '950 11px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(value ? String(value) : '·', p.x, p.y - value * 8 - 7 + Math.sin(time / 250 + index) * .7);
  }
  const signs = [
    { a: 0, b: 1, text: '<' }, { a: 1, b: 2, text: '<' }, { a: 2, b: 3, text: '<' },
    { a: 4, b: 5, text: '<' }, { a: 6, b: 7, text: '<' }, { a: 8, b: 9, text: '>' }, { a: 10, b: 11, text: '>' }, { a: 12, b: 13, text: '>' },
  ];
  ctx.fillStyle = '#ffedb1'; ctx.font = '950 12px Inter, system-ui';
  signs.forEach((sign) => { const a = gridPoint(4, sign.a % 4, Math.floor(sign.a / 4)); const b = gridPoint(4, sign.b % 4, Math.floor(sign.b / 4)); ctx.fillText(sign.text, (a.x + b.x) / 2, (a.y + b.y) / 2 - 5); });
}

function signalDirection(from: number, to: number) {
  const dx = to % 4 - from % 4; const dy = Math.floor(to / 4) - Math.floor(from / 4);
  return Math.abs(dx) > Math.abs(dy) ? dx > 0 ? '→' : '←' : dy > 0 ? '↓' : '↑';
}

function drawSignalLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 24 }>, time: number) {
  drawPlatform(ctx, '#6abfe5'); const energized = new Set(SIGNAL_PATH.slice(0, state.progress));
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const index = y * 4 + x; const p = gridPoint(4, x, y); const active = energized.has(index); diamond(ctx, p.x, p.y, 34, 18, active ? '#438eb8' : '#34565b', active ? 10 : 6);
    const routeIndex = SIGNAL_PATH.indexOf(index); const next = SIGNAL_PATH[routeIndex + 1]; ctx.fillStyle = active ? '#e9ffff' : routeIndex >= 0 ? '#8fb4b8' : '#516e70'; ctx.font = '950 18px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(next === undefined ? '◎' : signalDirection(index, next), p.x, p.y + 6);
  }
  if (state.progress > 1) {
    const aIndex = SIGNAL_PATH[state.progress - 2]; const bIndex = SIGNAL_PATH[state.progress - 1]; const a = gridPoint(4, aIndex % 4, Math.floor(aIndex / 4)); const b = gridPoint(4, bIndex % 4, Math.floor(bIndex / 4)); const travel = state.signalTravel;
    ctx.fillStyle = '#e6ffff'; ctx.shadowColor = '#6abfe5'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * travel, a.y + (b.y - a.y) * travel - 7 - Math.sin(time / 130) * 2, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
}

function magnetPoint(index: number): ScreenPoint {
  return { x: index % 2 ? 260 : 130, y: 225 + Math.floor(index / 2) * 67 };
}

function drawMagnetLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 25 }>) {
  drawPlatform(ctx, '#ef7f86');
  state.angles.forEach((angle, index) => {
    const p = magnetPoint(index); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle); ctx.shadowColor = '#ef7f86'; ctx.shadowBlur = state.lastIndex === index && state.pulseMs > 0 ? 18 : 5;
    ctx.fillStyle = '#d86270'; ctx.beginPath(); ctx.roundRect(-42, -15, 42, 30, [13, 0, 0, 13]); ctx.fill(); ctx.fillStyle = '#6abfe5'; ctx.beginPath(); ctx.roundRect(0, -15, 42, 30, [0, 13, 13, 0]); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '950 17px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('+', -21, 6); ctx.fillText('−', 21, 5); ctx.restore();
  });
  ctx.shadowBlur = 0; ctx.strokeStyle = '#d6fff142'; ctx.setLineDash([3, 7]); for (let row = 0; row < 4; row += 1) { const a = magnetPoint(row * 2); const b = magnetPoint(row * 2 + 1); ctx.beginPath(); ctx.moveTo(a.x + 45, a.y); ctx.lineTo(b.x - 45, b.y); ctx.stroke(); } ctx.setLineDash([]);
}

function untanglePoint(state: Extract<MotionLabState, { id: 26 }>, node: number): ScreenPoint {
  return { x: 195 + state.displayX[node] * 128, y: 322 + state.displayY[node] * 112 };
}

function drawUntangleLab(ctx: CanvasRenderingContext2D, state: Extract<MotionLabState, { id: 26 }>, time: number) {
  drawPlatform(ctx, '#b393ec');
  UNTANGLE_EDGES.forEach(([aNode, bNode], index) => { const a = untanglePoint(state, aNode); const b = untanglePoint(state, bNode); ctx.strokeStyle = '#b393ecb8'; ctx.lineWidth = 4; ctx.shadowColor = '#b393ec'; ctx.shadowBlur = 7 + Math.sin(time / 180 + index) * 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }); ctx.shadowBlur = 0;
  const selectedNode = state.selected === null ? null : state.nodeAtSlots[state.selected];
  for (let node = 0; node < 6; node += 1) { const p = untanglePoint(state, node); const selected = node === selectedNode; ctx.fillStyle = selected ? '#fff0b8' : '#b393ec'; ctx.shadowColor = '#b393ec'; ctx.shadowBlur = selected ? 20 : 8; ctx.beginPath(); ctx.arc(p.x, p.y, selected ? 20 : 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#192938'; ctx.font = '950 12px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(node + 1), p.x, p.y + 4); }
  ctx.shadowBlur = 0; ctx.fillStyle = '#f4eaff'; ctx.font = '900 11px Inter, system-ui'; ctx.fillText(`${state.crossings} CROSSINGS`, 195, 475);
}

function drawVictory(ctx: CanvasRenderingContext2D, journey: VictoryJourney, character: CharacterCustomization, time: number) {
  const portalX = 344; ctx.strokeStyle = '#9ff4e4'; ctx.lineWidth = 9; ctx.shadowColor = '#9ff4e4'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(portalX, 465, 29, 55, 0, Math.PI, 0); ctx.stroke(); ctx.shadowBlur = 0;
  const x = 78 + journey.x * 59; const groundY = 500 + journey.lane * 18;
  drawCharacterCanvas(ctx, character, { x, groundY, scale: .68, time, pose: journey.phase === 'celebrating' ? 'celebrate' : journey.phase === 'portal-open' ? 'walk' : 'idle', facing: 'right' });
}

function drawMotionLab(ctx: CanvasRenderingContext2D, state: MotionLabState, character: CharacterCustomization, journey: VictoryJourney, time: number) {
  const definition = MOTION_LABS.find((item) => item.id === state.id)!; drawBackdrop(ctx, definition, time);
  if (state.id === 17) drawRayLab(ctx, state, time);
  else if (state.id === 18) drawBridgeLab(ctx, state, time);
  else if (state.id === 19) drawFloodLab(ctx, state);
  else if (state.id === 20) drawStarLab(ctx, state, time);
  else if (state.id === 21) drawPegLab(ctx, state, time);
  else if (state.id === 22) drawDominoLab(ctx, state, time);
  else if (state.id === 23) drawInequalityLab(ctx, state, time);
  else if (state.id === 24) drawSignalLab(ctx, state, time);
  else if (state.id === 25) drawMagnetLab(ctx, state);
  else drawUntangleLab(ctx, state, time);
  if (journey.phase !== 'idle') drawVictory(ctx, journey, character, time);
  else if (definition.perspective === 'remote-board') drawCharacterCanvas(ctx, character, { x: 58, groundY: 500, scale: .62, time, pose: 'idle', facing: 'right', remote: true });
  else drawCharacterCanvas(ctx, character, { x: 325, groundY: 500, scale: .62, time, pose: state.pulseMs > 0 ? 'reveal' : 'idle', facing: 'left' });
  ctx.fillStyle = '#eafff8'; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('ONE MORE LITTLE DISCOVERY', 195, 535);
}

function nearest(point: ScreenPoint, candidates: ScreenPoint[], limit: number) {
  let best = -1; let distance = limit;
  candidates.forEach((candidate, index) => { const value = Math.hypot(candidate.x - point.x, candidate.y - point.y); if (value < distance) { distance = value; best = index; } });
  return best;
}

function pointerPoint(event: ReactPointerEvent<HTMLCanvasElement>): ScreenPoint {
  const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
}

function hitIndex(state: MotionLabState, point: ScreenPoint) {
  if (state.id === 17) return nearest(point, Array.from({ length: 25 }, (_, index) => gridPoint(5, index % 5, Math.floor(index / 5))), 31);
  if (state.id === 18) return nearest(point, BRIDGE_EDGES.map((edge) => { const a = bridgePoint(edge.a); const b = bridgePoint(edge.b); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }), 42);
  if (state.id === 19) return nearest(point, Array.from({ length: 16 }, (_, index) => gridPoint(4, index % 4, Math.floor(index / 4))), 37);
  if (state.id === 20) return nearest(point, Array.from({ length: 16 }, (_, index) => gridPoint(4, index % 4, Math.floor(index / 4))), 37);
  if (state.id === 21) return nearest(point, PEG_HOLES.map((_, index) => pegPoint(index)), 29);
  if (state.id === 22) return nearest(point, Array.from({ length: 12 }, (_, index) => gridPoint(4, index % 4, Math.floor(index / 4))), 37);
  if (state.id === 23 || state.id === 24) return nearest(point, Array.from({ length: 16 }, (_, index) => gridPoint(4, index % 4, Math.floor(index / 4))), 37);
  if (state.id === 25) return nearest(point, Array.from({ length: 8 }, (_, index) => magnetPoint(index)), 49);
  const node = nearest(point, Array.from({ length: 6 }, (_, index) => untanglePoint(state, index)), 31);
  return node < 0 ? -1 : state.nodeAtSlots.indexOf(node);
}

function stats(state: MotionLabState) {
  if (state.id === 17) return [`${state.selected.length}/3`, `${state.strikes}/3`, 'marked', 'errors'];
  if (state.id === 18) return [`${state.links.reduce((sum, value) => sum + value, 0)}/4`, String(state.moves), 'links', 'moves'];
  if (state.id === 19) return [`${state.moves}/6`, String(new Set(state.board.flat()).size), 'waves', 'colors'];
  if (state.id === 20) return [`${state.assignments.filter((value) => value >= 0).length}/16`, String(state.moves), 'assigned', 'moves'];
  if (state.id === 21) return [String(state.pegs.filter(Boolean).length), String(state.moves), 'relics', 'jumps'];
  if (state.id === 22) return [`${state.pairs.length}/6`, String(state.moves), 'dominoes', 'pairs'];
  if (state.id === 23) return [`${state.values.filter(Boolean).length}/16`, String(state.moves), 'towers', 'moves'];
  if (state.id === 24) return [`${state.progress}/${SIGNAL_PATH.length}`, `${state.strikes}/3`, 'relays', 'errors'];
  if (state.id === 25) return [`${state.orientations.filter((value, index) => value === MAGNET_TARGET[index]).length}/8`, String(state.moves), 'balanced', 'flips'];
  return [String(state.crossings), String(state.moves), 'crossings', 'swaps'];
}

function DirectionPad({ move, disabled }: { move: (direction: ClassicDirection) => void; disabled: boolean }) {
  return <div className="lab-dpad compact-dpad"><button className="up" disabled={disabled} onClick={() => move('up')} aria-label="Move up">↑</button><button className="left" disabled={disabled} onClick={() => move('left')} aria-label="Move left">←</button><span>◇</span><button className="right" disabled={disabled} onClick={() => move('right')} aria-label="Move right">→</button><button className="down" disabled={disabled} onClick={() => move('down')} aria-label="Move down">↓</button></div>;
}

export function MotionLab({ id, onExit, onComplete, character }: { id: MotionLabId; onExit: () => void; onComplete?: () => void; character: CharacterCustomization }) {
  const definition = MOTION_LABS.find((item) => item.id === id)!;
  const canvasRef = useRef<HTMLCanvasElement>(null); const [state, setState] = useState<MotionLabState>(() => initialMotionLabState(id)); const stateRef = useRef(state);
  const [journey, setJourney] = useState<VictoryJourney>(idleVictoryJourney); const journeyRef = useRef(journey); const manualTime = useRef(false); const completionSent = useRef(false); const drawRef = useRef<(() => void) | null>(null);

  const history = useRef<MotionLabState[]>([]);
  const setJourneyBoth = useCallback((next: VictoryJourney) => { journeyRef.current = next; setJourney(next); }, []);
  const commit = useCallback((action: MotionLabAction) => {
    if(isGamePaused()) return;
    if (action.type === 'tick' && journeyRef.current.phase !== 'idle') {
      const animated = updateMotionLab(stateRef.current, action); stateRef.current = animated; setState(animated); setJourneyBoth(tickVictoryJourney(journeyRef.current, action.ms)); drawRef.current?.(); return;
    }
    if (journeyRef.current.phase !== 'idle') return;
    const current = stateRef.current; if(action.type !== 'tick' && current.status === 'playing'){history.current.push(structuredClone(current));if(history.current.length>100)history.current.shift();} const next = updateMotionLab(current, action); if(action.type !== 'tick')gameFeedback(next.status==='complete'); stateRef.current = next; setState(next);
    if (current.status !== 'complete' && next.status === 'complete') setJourneyBoth(beginVictoryJourney());
    drawRef.current?.(); if (action.type !== 'tick') navigator.vibrate?.(next.status === 'complete' ? [30, 40, 60] : 10);
  }, [setJourneyBoth]);

  useEffect(()=>{const undo=()=>{if(isGamePaused() || journeyRef.current.phase !== 'idle')return;const previous=history.current.pop();if(previous){stateRef.current=previous;setState(previous);drawRef.current?.();gameFeedback();}};window.addEventListener('venture-undo',undo);return()=>window.removeEventListener('venture-undo',undo);},[]);

  const reset = useCallback(() => { history.current=[]; const next = initialMotionLabState(id); stateRef.current = next; setState(next); setJourneyBoth(idleVictoryJourney()); completionSent.current = false; drawRef.current?.(); }, [id, setJourneyBoth]);
  const moveJourney = useCallback((direction: ClassicDirection) => { if (isGamePaused() || journeyRef.current.phase !== 'portal-open') return; setJourneyBoth(moveVictoryJourney(journeyRef.current, direction)); }, [setJourneyBoth]);

  useEffect(() => { if (journey.phase === 'departed' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(); } }, [journey.phase, onComplete]);
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; let frame = 0;
    const draw = () => { drawMotionLab(ctx, stateRef.current, character, journeyRef.current, performance.now()); frame = requestAnimationFrame(draw); };
    drawRef.current = () => drawMotionLab(ctx, stateRef.current, character, journeyRef.current, performance.now()); draw(); return () => { cancelAnimationFrame(frame); drawRef.current = null; };
  }, [character]);
  useEffect(() => { const interval = window.setInterval(() => { if (!manualTime.current) commit({ type: 'tick', ms: 50 }); }, 50); return () => window.clearInterval(interval); }, [commit]);
  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms) => { manualTime.current = true; commit({ type: 'tick', ms }); };
    bridge.render_game_to_text = () => JSON.stringify({ ...motionLabSnapshot(stateRef.current), victory: journeyRef.current, character, perspective: definition.perspective });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character, commit, definition.perspective]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); const direction = key === 'arrowup' || key === 'w' ? 'up' : key === 'arrowdown' || key === 's' ? 'down' : key === 'arrowleft' || key === 'a' ? 'left' : key === 'arrowright' || key === 'd' ? 'right' : null;
      if (direction && journeyRef.current.phase !== 'idle') { event.preventDefault(); moveJourney(direction); }
      else if ((event.code === 'Space' || key === 'enter') && stateRef.current.id === 17) { event.preventDefault(); commit({ type: 'submit' }); }
      else if (key === 'r') { event.preventDefault(); reset(); }
    }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [commit, moveJourney, reset]);

  const clickCanvas = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (journeyRef.current.phase !== 'idle') return;
    const index = hitIndex(stateRef.current, pointerPoint(event)); if (index < 0) return;
    if (stateRef.current.id === 19) commit({ type: 'activate', index: stateRef.current.board[Math.floor(index / 4)][index % 4] }); else commit({ type: 'activate', index });
  };
  const values = stats(state); const controlsDisabled = state.status !== 'playing';

  return <section className="lab-screen classic-lab-screen motion-lab-screen" aria-label={`${definition.title} puzzle lab`} style={{ ...themeCss(PROTOTYPE_THEME), '--motion-accent': definition.accent } as CSSProperties}>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={`${definition.title} game world`} onPointerUp={clickCanvas} />
    <header className="lab-header"><button className="icon-button glass" onClick={onExit} aria-label="Back to Lab corridor">←</button><div><span>THE PUZZLE ARCADE · ROOM {id}</span><h1>{definition.title} · {definition.shortTitle}</h1></div><button className="lab-small-button glass" onClick={reset}>RESET</button></header>
    <div className="lab-brief"><div><strong>{values[0]}</strong><small>{values[2]}</small></div><p>{definition.objective}</p><div><strong>{values[1]}</strong><small>{values[3]}</small></div></div>
    <div className={`lab-message classic-message ${state.status}`} aria-live="polite">{journey.phase === 'idle' ? state.message : victoryJourneyMessage(journey, PROTOTYPE_THEME.portalName)}</div>
    <div className="lab-controls classic-controls motion-controls" aria-label={`${definition.title} controls`}>
      {journey.phase !== 'idle' ? <><button className="lab-utility side-note" disabled>{journey.phase === 'celebrating' ? 'CHEER' : journey.phase === 'departed' ? 'CLEAR' : 'EXIT'}<small>{journey.x} / 4</small></button><DirectionPad move={moveJourney} disabled={journey.phase !== 'portal-open'} /><button className="lab-utility" onClick={reset}>RESET <small>R</small></button></>
        : state.id === 17 ? <><button className="lab-mode-key active" disabled>MARKED <small>{state.selected.length} / 3</small></button><button className="motion-submit" disabled={state.selected.length !== 3 || controlsDisabled} onClick={() => commit({ type: 'submit' })}>SUBMIT<small>ENTER</small></button><button className="lab-mode-key" onClick={reset}>RESET <small>survey</small></button></>
          : state.id === 19 ? <><button className="lab-mode-key active" disabled>WAVES <small>{state.moves} / 6</small></button><div className="flood-color-controls">{TILE_COLORS.map((color, index) => <button key={color} style={{ background: color }} disabled={controlsDisabled || index === state.currentColor} onClick={() => commit({ type: 'activate', index })} aria-label={`Flood color ${index + 1}`} />)}</div><button className="lab-mode-key" onClick={reset}>RESET <small>basin</small></button></>
            : <><button className="lab-mode-key active" disabled>{state.id === 18 ? 'NETWORK' : state.id === 20 ? 'REGIONS' : 'RELICS'}<small>{values[0]} {values[2]}</small></button><div className="remote-center"><span>{definition.icon}</span><small>TAP THE WORLD</small></div><button className="lab-mode-key" onClick={reset}>RESET <small>room</small></button></>}
      <p>{definition.controlHint} · Touch-first world controls · R resets</p>
    </div>
  </section>;
}
