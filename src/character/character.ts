export type HeadStyle = 'round' | 'oval' | 'angular';
export type BodyStyle = 'trail-jacket' | 'field-vest' | 'storm-coat';
export type LegStyle = 'trail-boots' | 'scout-pants' | 'climbing-gear';
export type HairStyle = 'short' | 'waves' | 'braids' | 'mohawk' | 'bun' | 'bald';
export type AccessoryStyle = 'none' | 'round-glasses' | 'goggles' | 'bandana' | 'flower' | 'trail-hat';

export interface CharacterCustomization {
  version: 1;
  name: string;
  head: HeadStyle;
  body: BodyStyle;
  legs: LegStyle;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyeColor: string;
  accessory: AccessoryStyle;
}

export interface CharacterDrawOptions {
  x: number;
  groundY: number;
  scale?: number;
  time?: number;
  pose?: 'idle' | 'walk' | 'push' | 'reveal' | 'celebrate' | 'failed';
  facing?: 'left' | 'right' | 'up' | 'down';
  remote?: boolean;
}

export const CHARACTER_STORAGE_KEY = 'dailyVentureCharacter';

export const DEFAULT_CHARACTER: CharacterCustomization = {
  version: 1,
  name: 'Ari',
  head: 'oval',
  body: 'trail-jacket',
  legs: 'trail-boots',
  skinTone: '#d99b72',
  hairStyle: 'short',
  hairColor: '#3e302b',
  eyeColor: '#315b63',
  accessory: 'trail-hat',
};

export const HEAD_OPTIONS = [
  { value: 'round', label: 'Round' }, { value: 'oval', label: 'Oval' }, { value: 'angular', label: 'Angular' },
] as const;
export const BODY_OPTIONS = [
  { value: 'trail-jacket', label: 'Trail jacket' }, { value: 'field-vest', label: 'Field vest' }, { value: 'storm-coat', label: 'Storm coat' },
] as const;
export const LEG_OPTIONS = [
  { value: 'trail-boots', label: 'Trail boots' }, { value: 'scout-pants', label: 'Scout pants' }, { value: 'climbing-gear', label: 'Climbing gear' },
] as const;
export const HAIR_OPTIONS = [
  { value: 'short', label: 'Short' }, { value: 'waves', label: 'Waves' }, { value: 'braids', label: 'Braids' },
  { value: 'mohawk', label: 'Mohawk' }, { value: 'bun', label: 'Bun' }, { value: 'bald', label: 'Bald' },
] as const;
export const ACCESSORY_OPTIONS = [
  { value: 'none', label: 'None' }, { value: 'round-glasses', label: 'Glasses' }, { value: 'goggles', label: 'Goggles' },
  { value: 'bandana', label: 'Bandana' }, { value: 'flower', label: 'Flower' }, { value: 'trail-hat', label: 'Trail hat' },
] as const;
export const SKIN_TONES = [
  { value: '#f2c7a5', label: 'Light' }, { value: '#e5ad83', label: 'Warm light' }, { value: '#d99b72', label: 'Medium' },
  { value: '#b97855', label: 'Warm brown' }, { value: '#8c573f', label: 'Deep brown' }, { value: '#5d382d', label: 'Rich deep' },
] as const;
export const HAIR_COLORS = [
  { value: '#201b1a', label: 'Black' }, { value: '#3e302b', label: 'Dark brown' }, { value: '#75492f', label: 'Brown' },
  { value: '#c08b4f', label: 'Golden' }, { value: '#b9513d', label: 'Copper' }, { value: '#6d4b88', label: 'Violet' },
] as const;
export const EYE_COLORS = [
  { value: '#315b63', label: 'Teal' }, { value: '#3f6f9d', label: 'Blue' }, { value: '#4f7a4f', label: 'Green' },
  { value: '#79583e', label: 'Brown' }, { value: '#8d6e9f', label: 'Violet' },
] as const;

const allowed = <T extends readonly { value: string }[]>(options: T, value: unknown, fallback: string): T[number]['value'] =>
  options.some((option) => option.value === value) ? value as T[number]['value'] : fallback as T[number]['value'];

export function normalizeCharacterCustomization(value: unknown): CharacterCustomization {
  const source = value && typeof value === 'object' ? value as Partial<CharacterCustomization> : {};
  const cleanedName = typeof source.name === 'string' ? source.name.trim().replace(/\s+/g, ' ').slice(0, 20) : '';
  return {
    version: 1,
    name: cleanedName || DEFAULT_CHARACTER.name,
    head: allowed(HEAD_OPTIONS, source.head, DEFAULT_CHARACTER.head),
    body: allowed(BODY_OPTIONS, source.body, DEFAULT_CHARACTER.body),
    legs: allowed(LEG_OPTIONS, source.legs, DEFAULT_CHARACTER.legs),
    skinTone: allowed(SKIN_TONES, source.skinTone, DEFAULT_CHARACTER.skinTone),
    hairStyle: allowed(HAIR_OPTIONS, source.hairStyle, DEFAULT_CHARACTER.hairStyle),
    hairColor: allowed(HAIR_COLORS, source.hairColor, DEFAULT_CHARACTER.hairColor),
    eyeColor: allowed(EYE_COLORS, source.eyeColor, DEFAULT_CHARACTER.eyeColor),
    accessory: allowed(ACCESSORY_OPTIONS, source.accessory, DEFAULT_CHARACTER.accessory),
  };
}

export function loadCharacterCustomization() {
  try { return normalizeCharacterCustomization(JSON.parse(localStorage.getItem(CHARACTER_STORAGE_KEY) ?? 'null')); }
  catch { return { ...DEFAULT_CHARACTER }; }
}

export function saveCharacterCustomization(character: CharacterCustomization) {
  const normalized = normalizeCharacterCustomization(character);
  localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function characterPalette(character: CharacterCustomization) {
  if (character.body === 'field-vest') return { body: '#39746b', accent: '#f1c55f', pack: '#274f4c', scarf: '#d97b50' };
  if (character.body === 'storm-coat') return { body: '#446b91', accent: '#d7e8ec', pack: '#273e55', scarf: '#e26f5c' };
  return { body: '#c77743', accent: '#f0b45b', pack: '#8b5a3c', scarf: '#55b7a5' };
}

function path(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.closePath();
}

function drawHair(ctx: CanvasRenderingContext2D, character: CharacterCustomization, headY: number, headRx: number, headRy: number) {
  ctx.fillStyle = character.hairColor;
  if (character.hairStyle === 'bald') return;
  if (character.hairStyle === 'mohawk') {
    path(ctx, [{ x: -headRx + 2, y: headY - headRy + 4 }, { x: 0, y: headY - headRy - 18 }, { x: headRx - 2, y: headY - headRy + 4 }]); ctx.fill(); return;
  }
  if (character.hairStyle === 'bun') {
    ctx.beginPath(); ctx.arc(8, headY - headRy - 9, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(-2, headY - headRy + 3, headRx + 2, Math.max(7, headRy * .48), -.08, Math.PI, Math.PI * 2); ctx.fill();
  if (character.hairStyle === 'waves') {
    for (let index = 0; index < 5; index += 1) { ctx.beginPath(); ctx.arc(-headRx + 5 + index * (headRx * 2 - 10) / 4, headY - headRy + 5 + index % 2 * 3, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  if (character.hairStyle === 'braids') {
    ctx.lineWidth = 5; ctx.strokeStyle = character.hairColor; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-headRx + 3, headY - headRy + 5); ctx.lineTo(-headRx - 2, headY + headRy + 15); ctx.moveTo(headRx - 3, headY - headRy + 5); ctx.lineTo(headRx + 2, headY + headRy + 15); ctx.stroke();
  }
}

function drawAccessory(ctx: CanvasRenderingContext2D, character: CharacterCustomization, headY: number, headRx: number, headRy: number) {
  if (character.accessory === 'round-glasses' || character.accessory === 'goggles') {
    ctx.strokeStyle = character.accessory === 'goggles' ? '#d8c477' : '#26363a'; ctx.lineWidth = character.accessory === 'goggles' ? 3 : 2;
    ctx.beginPath(); ctx.arc(-6, headY + 1, character.accessory === 'goggles' ? 6 : 5, 0, Math.PI * 2); ctx.arc(6, headY + 1, character.accessory === 'goggles' ? 6 : 5, 0, Math.PI * 2); ctx.moveTo(-1, headY + 1); ctx.lineTo(1, headY + 1); ctx.stroke();
  } else if (character.accessory === 'bandana') {
    ctx.fillStyle = '#d45f51'; ctx.fillRect(-headRx - 2, headY - headRy + 5, headRx * 2 + 4, 6); path(ctx, [{ x: headRx, y: headY - headRy + 8 }, { x: headRx + 13, y: headY - headRy + 13 }, { x: headRx + 5, y: headY - headRy + 17 }]); ctx.fill();
  } else if (character.accessory === 'flower') {
    ctx.fillStyle = '#f6c85f'; for (let index = 0; index < 5; index += 1) { const angle = index * Math.PI * .4; ctx.beginPath(); ctx.arc(-headRx + Math.cos(angle) * 5, headY - headRy + Math.sin(angle) * 5, 3, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#d96f68'; ctx.beginPath(); ctx.arc(-headRx, headY - headRy, 3, 0, Math.PI * 2); ctx.fill();
  } else if (character.accessory === 'trail-hat') {
    ctx.fillStyle = '#7b4e36'; ctx.beginPath(); ctx.roundRect(-headRx - 8, headY - headRy - 8, headRx * 2 + 16, 7, 4); ctx.fill(); ctx.beginPath(); ctx.roundRect(-10, headY - headRy - 18, 22, 12, 5); ctx.fill();
  }
}

export function drawCharacterCanvas(ctx: CanvasRenderingContext2D, characterValue: CharacterCustomization, options: CharacterDrawOptions) {
  const character = normalizeCharacterCustomization(characterValue);
  const scale = options.scale ?? 1; const time = options.time ?? 0; const pose = options.pose ?? 'idle';
  const gait = pose === 'walk' ? Math.sin(time / 105) : 0; const breath = Math.sin(time / 520);
  const leap = pose === 'celebrate' ? Math.abs(Math.sin(time / 165)) * 8 : 0; const crouch = pose === 'reveal' ? Math.abs(Math.sin(time / 210)) * 6 : 0;
  const direction = options.facing === 'left' ? -1 : 1; const palette = characterPalette(character);
  const bodyWidth = character.body === 'field-vest' ? 34 : character.body === 'storm-coat' ? 44 : 40;
  const legSpread = character.legs === 'climbing-gear' ? 12 : 9; const headRx = character.head === 'round' ? 17 : character.head === 'angular' ? 16 : 15; const headRy = character.head === 'round' ? 17 : character.head === 'angular' ? 18 : 20;
  ctx.save(); ctx.translate(options.x, options.groundY - leap + crouch); ctx.scale(scale * direction, scale);
  ctx.fillStyle = '#07171b55'; ctx.beginPath(); ctx.ellipse(0, 3 + leap, 27, 7, 0, 0, Math.PI * 2); ctx.fill();

  const leftFoot = -legSpread - gait * 8; const rightFoot = legSpread + gait * 8;
  ctx.strokeStyle = character.legs === 'scout-pants' ? '#56665d' : character.legs === 'climbing-gear' ? '#6a526f' : '#5b463d'; ctx.lineWidth = character.legs === 'climbing-gear' ? 8 : 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-7, -43); ctx.lineTo(-9 + gait * 5, -20); ctx.lineTo(leftFoot, -2); ctx.moveTo(7, -43); ctx.lineTo(9 - gait * 5, -20); ctx.lineTo(rightFoot, -2); ctx.stroke();
  ctx.strokeStyle = character.legs === 'scout-pants' ? '#273b36' : '#26343a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(leftFoot - 6, 0); ctx.lineTo(leftFoot + 3, 0); ctx.moveTo(rightFoot - 3, 0); ctx.lineTo(rightFoot + 7, 0); ctx.stroke();

  ctx.fillStyle = palette.pack; ctx.beginPath(); ctx.roundRect(-bodyWidth / 2 - 7, -78, 13, 42, 6); ctx.fill();
  ctx.fillStyle = palette.body; ctx.beginPath(); ctx.roundRect(-bodyWidth / 2, -82 + breath, bodyWidth, 43, character.body === 'storm-coat' ? 6 : 10); ctx.fill();
  ctx.fillStyle = palette.accent; path(ctx, [{ x: -bodyWidth / 2 + 4, y: -80 }, { x: 3, y: -40 }, { x: bodyWidth / 2 - 3, y: -79 }]); ctx.fill();
  if (character.body === 'field-vest') { ctx.strokeStyle = '#d8ece5'; ctx.lineWidth = 2; ctx.strokeRect(-12, -68, 9, 9); ctx.strokeRect(4, -68, 9, 9); }
  if (character.body === 'storm-coat') { ctx.strokeStyle = '#263e55'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, -41); ctx.stroke(); }

  const armsUp = pose === 'celebrate'; const reach = pose === 'push' ? 30 : options.remote ? 15 : 24;
  const leftHandY = armsUp ? -114 : pose === 'reveal' ? -34 : options.remote ? -50 : -44 + gait * 10;
  const rightHandY = armsUp ? -112 : pose === 'reveal' ? -34 : options.remote ? -50 : -44 - gait * 10;
  ctx.strokeStyle = palette.body; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-bodyWidth / 2 + 4, -72); ctx.lineTo(-reach, leftHandY); ctx.moveTo(bodyWidth / 2 - 4, -72); ctx.lineTo(reach, rightHandY); ctx.stroke();
  ctx.fillStyle = character.skinTone; ctx.beginPath(); ctx.arc(-reach, leftHandY, 5, 0, Math.PI * 2); ctx.arc(reach, rightHandY, 5, 0, Math.PI * 2); ctx.fill();
  if (options.remote) { ctx.fillStyle = '#183c43'; ctx.strokeStyle = '#81e1d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-12, -58, 24, 18, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f6c85f'; ctx.beginPath(); ctx.arc(-4, -49, 2, 0, Math.PI * 2); ctx.fill(); }

  const headY = -104;
  ctx.fillStyle = character.skinTone;
  if (character.head === 'angular') { path(ctx, [{ x: -headRx, y: headY - 11 }, { x: -12, y: headY + 14 }, { x: 0, y: headY + headRy }, { x: 13, y: headY + 13 }, { x: headRx, y: headY - 10 }, { x: 0, y: headY - headRy }]); ctx.fill(); }
  else { ctx.beginPath(); ctx.ellipse(0, headY, headRx, headRy, 0, 0, Math.PI * 2); ctx.fill(); }
  drawHair(ctx, character, headY, headRx, headRy);
  ctx.fillStyle = character.eyeColor; ctx.beginPath(); ctx.arc(-6, headY + 1, 2.4, 0, Math.PI * 2); ctx.arc(6, headY + 1, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#10191c'; ctx.beginPath(); ctx.arc(-6, headY + 1, .9, 0, Math.PI * 2); ctx.arc(6, headY + 1, .9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8f5947'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, headY + 10); ctx.quadraticCurveTo(3, headY + 14, 7, headY + 9); ctx.stroke();
  drawAccessory(ctx, character, headY, headRx, headRy);
  ctx.strokeStyle = palette.scarf; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, -86); ctx.lineTo(-28, -90 - gait * 3); ctx.lineTo(-37, -84 - gait * 5); ctx.stroke();
  if (pose === 'failed') { ctx.fillStyle = '#e76f5175'; ctx.beginPath(); ctx.roundRect(-42, -138, 84, 144, 24); ctx.fill(); }
  ctx.restore();
}
