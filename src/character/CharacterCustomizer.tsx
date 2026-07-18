import { useEffect, useState, type CSSProperties } from 'react';
import {
  ACCESSORY_OPTIONS,
  BODY_OPTIONS,
  CHARACTER_PRESETS,
  DEFAULT_CHARACTER,
  EYE_COLORS,
  EYE_SHAPE_OPTIONS,
  FRAME_OPTIONS,
  HAIR_COLORS,
  HAIR_OPTIONS,
  HEAD_OPTIONS,
  LEG_OPTIONS,
  SKIN_TONES,
  drawCharacterCanvas,
  normalizeCharacterCustomization,
  randomizeCharacterCustomization,
  type CharacterCustomization,
} from './character';

function PreviewCanvas({ character, portrait = false }: { character: CharacterCustomization; portrait?: boolean }) {
  const width = portrait ? 44 : 240; const height = portrait ? 44 : 240;
  return <canvas
    width={width}
    height={height}
    className={portrait ? 'character-portrait' : 'character-preview-canvas'}
    aria-label={portrait ? `${character.name} character icon` : `${character.name} character preview`}
    ref={(canvas) => {
      if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (!portrait) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#dff0e7'); gradient.addColorStop(1, '#79a9a0'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff38'; ctx.beginPath(); ctx.ellipse(width / 2, 215, 88, 22, 0, 0, Math.PI * 2); ctx.fill();
      }
      drawCharacterCanvas(ctx, character, portrait
        ? { x: 22, groundY: 42, scale: .3, time: 0, pose: 'idle' }
        : { x: 120, groundY: 222, scale: 1.45, time: 0, pose: 'idle' });
    }}
  />;
}

export function CharacterPortrait({ character }: { character: CharacterCustomization }) {
  return <PreviewCanvas character={character} portrait />;
}

function ChoiceRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <fieldset className="character-fieldset"><legend>{label}</legend><div className="character-choice-row">
    {options.map((option) => <button type="button" key={option.value} className={value === option.value ? 'selected' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div></fieldset>;
}

function ColorRow({ label, value, colors, onChange }: { label: string; value: string; colors: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <fieldset className="character-fieldset"><legend>{label}</legend><div className="character-color-row">
    {colors.map((color) => <button type="button" key={color.value} className={value === color.value ? 'selected' : ''} style={{ '--swatch': color.value } as CSSProperties} aria-label={`${label}: ${color.label}`} aria-pressed={value === color.value} onClick={() => onChange(color.value)}><span aria-hidden="true" /></button>)}
  </div></fieldset>;
}

export function CharacterCustomizer({ character, onSave }: { character: CharacterCustomization; onSave: (character: CharacterCustomization) => Promise<void> | void }) {
  const [draft, setDraft] = useState(() => normalizeCharacterCustomization(character));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(normalizeCharacterCustomization(character)), [character]);

  const update = <K extends keyof CharacterCustomization>(key: K, value: CharacterCustomization[K]) => {
    setDraft((current) => ({ ...current, [key]: value })); setMessage('');
  };
  const save = async () => {
    if (!draft.name.trim()) { setMessage('Give your explorer a name first.'); return; }
    setSaving(true);
    try { await onSave(normalizeCharacterCustomization(draft)); setMessage(`${draft.name.trim()} is ready for the next Venture.`); }
    catch { setMessage('The character could not be synced. Your local design is still safe.'); }
    finally { setSaving(false); }
  };

  return <div className="character-customizer">
    <div className="character-preview-card">
      <PreviewCanvas character={draft} />
      <div><span>YOUR EXPLORER</span><strong>{draft.name.trim() || 'Unnamed explorer'}</strong><small>Used in labs, Ventures, and future dialogue.</small></div>
    </div>

    <fieldset className="character-fieldset character-presets"><legend>Quick presets</legend><div className="character-preset-row">
      {Object.entries(CHARACTER_PRESETS).map(([name, preset]) => <button type="button" key={name} onClick={() => { setDraft({ ...preset }); setMessage(`${name} preset loaded in the preview.`); }}><strong>{name}</strong><small>{name === 'Matt' ? 'Triangular · blonde · aviators' : name === 'Myles' ? 'Tall · almond eyes · field vest' : 'Sturdy · heritage tee · jean shorts'}</small></button>)}
    </div><button type="button" className="character-randomize-button" onClick={() => { setDraft((current) => randomizeCharacterCustomization(current)); setMessage('A new randomized look is ready in the preview.'); }}>✦ RANDOMIZE LOOK</button></fieldset>

    <label className="character-name-field" htmlFor="character-name">Character name<input id="character-name" maxLength={20} value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Name your explorer" /></label>
    <ChoiceRow label="Head shape" value={draft.head} options={HEAD_OPTIONS} onChange={(value) => update('head', value)} />
    <ChoiceRow label="Build" value={draft.frame} options={FRAME_OPTIONS} onChange={(value) => update('frame', value)} />
    <ColorRow label="Skin tone" value={draft.skinTone} colors={SKIN_TONES} onChange={(value) => update('skinTone', value)} />
    <ChoiceRow label="Body" value={draft.body} options={BODY_OPTIONS} onChange={(value) => update('body', value)} />
    <ChoiceRow label="Legs" value={draft.legs} options={LEG_OPTIONS} onChange={(value) => update('legs', value)} />
    <ChoiceRow label="Hair style" value={draft.hairStyle} options={HAIR_OPTIONS} onChange={(value) => update('hairStyle', value)} />
    <ColorRow label="Hair color" value={draft.hairColor} colors={HAIR_COLORS} onChange={(value) => update('hairColor', value)} />
    <ChoiceRow label="Eye shape" value={draft.eyeShape} options={EYE_SHAPE_OPTIONS} onChange={(value) => update('eyeShape', value)} />
    <ColorRow label="Eye color" value={draft.eyeColor} colors={EYE_COLORS} onChange={(value) => update('eyeColor', value)} />
    <ChoiceRow label="Accessory" value={draft.accessory} options={ACCESSORY_OPTIONS} onChange={(value) => update('accessory', value)} />

    <div className="character-save-row">
      <button type="button" className="secondary-button" onClick={() => { setDraft({ ...DEFAULT_CHARACTER }); setMessage('Default explorer restored in the preview.'); }}>RESET</button>
      <button type="button" className="primary-button" disabled={saving} onClick={save}>{saving ? 'SAVING…' : 'SAVE CHARACTER'}</button>
    </div>
    {message && <p className="character-save-message" aria-live="polite">{message}</p>}
  </div>;
}
