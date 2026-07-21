import { useCallback, useEffect, useRef, useState } from 'react';
import { drawCharacterCanvas, type CharacterCustomization } from '../character/character';
import { AdventureLab } from './AdventureLab';
import { ClassicLab } from './ClassicLab';
import { WATCHER_TEST_THEME } from './theme';
import { useSwipeDirection } from './useSwipeDirection';
import { beginVictoryJourney, idleVictoryJourney, moveVictoryJourney, tickVictoryJourney, type VictoryJourney } from './victory';

type FormulaStage = 'arrival' | 'adventure' | 'prototype-one' | 'prototype-two' | 'watcher' | 'complete';
type WatcherPhase = 'welcome' | 'quiz' | 'failed' | 'celebrating' | 'portal-open' | 'complete';

const WATCHER_QUESTIONS = [
  { prompt: 'Which part of a plant captures most of the sunlight used for photosynthesis?', choices: ['Roots', 'Leaves', 'Flowers', 'Seeds'], answer: 1 },
  { prompt: 'Two connected gears turn in which relationship?', choices: ['The same direction', 'Opposite directions', 'Only clockwise', 'They cannot move'], answer: 1 },
  { prompt: 'A traditional compass needle points toward which cardinal direction?', choices: ['East', 'South', 'West', 'North'], answer: 3 },
  { prompt: 'Why does Earth’s Moon appear bright in the night sky?', choices: ['It makes its own fire', 'It reflects sunlight', 'It stores lightning', 'It glows from wind'], answer: 1 },
];

function useAnimatedCanvas(draw: (ctx: CanvasRenderingContext2D, time: number) => void, active = true) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return; const canvas = ref.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0; const render = (time: number) => { draw(ctx, time); frame = requestAnimationFrame(render); }; frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [active, draw]);
  return ref;
}

function FormulaArrival({ character, enter, onExit }: { character: CharacterCustomization; enter: () => void; onExit: () => void }) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const theme = WATCHER_TEST_THEME; const gradient = ctx.createLinearGradient(0, 0, 0, 844); gradient.addColorStop(0, theme.skyTop); gradient.addColorStop(.55, theme.skyMid); gradient.addColorStop(1, theme.skyBottom); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 390, 844);
    ctx.fillStyle = '#0a1f2778'; ctx.beginPath(); ctx.moveTo(0, 570); ctx.lineTo(0, 130); ctx.lineTo(90, 185); ctx.lineTo(120, 570); ctx.fill(); ctx.beginPath(); ctx.moveTo(390, 570); ctx.lineTo(390, 130); ctx.lineTo(300, 185); ctx.lineTo(270, 570); ctx.fill();
    const glow = ctx.createRadialGradient(195, 420, 18, 195, 420, 185); glow.addColorStop(0, '#b8f4df65'); glow.addColorStop(1, '#b8f4df00'); ctx.fillStyle = glow; ctx.fillRect(0, 220, 390, 390);
    ctx.save(); ctx.shadowColor = theme.portal; ctx.shadowBlur = 24; ctx.strokeStyle = theme.portal; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(195, 413, 48, 83, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    drawCharacterCanvas(ctx, character, { x: 195, groundY: 521, scale: .82, time, pose: 'idle', facing: 'down' });
  }, [character]);
  const canvas = useAnimatedCanvas(draw);
  return <section className="lab-screen formula-arrival" aria-label="Daily formula arrival"><canvas ref={canvas} width="390" height="844" aria-label="Explorer arriving in the Verdant Orrery" /><button className="formula-close icon-button glass" onClick={onExit} aria-label="Return home">×</button><div className="formula-story-card"><div className="eyebrow">DAILY FORMULA TEST · ARRIVAL</div><h1>The Verdant Orrery</h1><p>A forgotten sky-garden turns beneath a silent moon. Its ancient paths wake as {character.name} steps through the Wayfinder portal to restore the Watcher’s compass.</p><button className="primary-button" onClick={enter}>ENTER THE ADVENTURE</button></div></section>;
}

function drawWatcherWorld(ctx: CanvasRenderingContext2D, time: number, character: CharacterCustomization, phase: WatcherPhase, journey: VictoryJourney) {
  const theme = WATCHER_TEST_THEME; const gradient = ctx.createLinearGradient(0, 0, 0, 844); gradient.addColorStop(0, theme.skyTop); gradient.addColorStop(.58, theme.skyMid); gradient.addColorStop(1, theme.skyBottom); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 390, 844);
  ctx.fillStyle = '#122a31'; ctx.beginPath(); ctx.moveTo(30, 610); ctx.lineTo(76, 216); ctx.lineTo(124, 174); ctx.lineTo(150, 610); ctx.fill(); ctx.beginPath(); ctx.moveTo(360, 610); ctx.lineTo(314, 216); ctx.lineTo(266, 174); ctx.lineTo(240, 610); ctx.fill();
  const pulse = 1 + Math.sin(time / 450) * .03; ctx.save(); ctx.translate(195, 292); ctx.scale(pulse, pulse); ctx.fillStyle = '#6c8276'; ctx.beginPath(); ctx.roundRect(-67, -55, 134, 195, 27); ctx.fill(); ctx.fillStyle = '#81998a'; ctx.beginPath(); ctx.ellipse(0, -70, 60, 64, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f1c96b'; ctx.beginPath(); ctx.arc(-22, -75, 6, 0, Math.PI * 2); ctx.arc(22, -75, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#40594e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-26, -38); ctx.quadraticCurveTo(0, -18, 26, -38); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#f1c96b'; ctx.font = '900 10px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('THE WATCHER', 195, 455);

  if (phase === 'portal-open' || phase === 'complete') {
    ctx.save(); ctx.shadowColor = theme.portal; ctx.shadowBlur = 22; ctx.strokeStyle = theme.portal; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(329, 590, 24, 43, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  const x = phase === 'portal-open' || phase === 'complete' ? 71 + journey.x * 61 : 195; const pose = phase === 'failed' ? 'failed' : phase === 'celebrating' || phase === 'complete' ? 'celebrate' : phase === 'portal-open' ? 'walk' : 'idle';
  drawCharacterCanvas(ctx, character, { x, groundY: 640 + journey.lane * 24, scale: .68, time, pose, facing: 'right' });
}

function WatcherRoom({ character, onExit, onComplete }: { character: CharacterCustomization; onExit: () => void; onComplete: () => void }) {
  const [phase, setPhase] = useState<WatcherPhase>('welcome'); const phaseRef = useRef(phase);
  const [question, setQuestion] = useState(0); const [journey, setJourney] = useState<VictoryJourney>(idleVictoryJourney); const journeyRef = useRef(journey); const manualTime = useRef(false);
  const setPhaseBoth = useCallback((next: WatcherPhase) => { phaseRef.current = next; setPhase(next); }, []);
  const updateJourney = useCallback((update: (current: VictoryJourney) => VictoryJourney) => { const next = update(journeyRef.current); journeyRef.current = next; setJourney(next); if (next.phase === 'departed') setPhaseBoth('complete'); }, [setPhaseBoth]);
  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => drawWatcherWorld(ctx, time, character, phaseRef.current, journeyRef.current), [character]);
  const canvas = useAnimatedCanvas(draw);

  const answer = useCallback((index: number) => {
    if (phaseRef.current !== 'quiz') return;
    if (index !== WATCHER_QUESTIONS[question].answer) { setPhaseBoth('failed'); navigator.vibrate?.([70, 40, 90]); return; }
    if (question === WATCHER_QUESTIONS.length - 1) { const next = beginVictoryJourney(); journeyRef.current = next; setJourney(next); setPhaseBoth('celebrating'); }
    else setQuestion((current) => current + 1);
  }, [question, setPhaseBoth]);
  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => { if (phaseRef.current === 'portal-open') updateJourney((current) => moveVictoryJourney(current, direction)); }, [updateJourney]);
  const tick = useCallback((ms: number) => {
    if (phaseRef.current !== 'celebrating') return; const next = tickVictoryJourney(journeyRef.current, ms); journeyRef.current = next; setJourney(next); if (next.phase === 'portal-open') setPhaseBoth('portal-open');
  }, [setPhaseBoth]);
  const restart = useCallback(() => { setQuestion(0); const idle = idleVictoryJourney(); journeyRef.current = idle; setJourney(idle); setPhaseBoth('welcome'); }, [setPhaseBoth]);

  useEffect(() => { const timer = window.setInterval(() => { if (!manualTime.current) tick(50); }, 50); return () => window.clearInterval(timer); }, [tick]);
  useEffect(() => { if (phase === 'complete') onComplete(); }, [onComplete, phase]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); const direction = key === 'arrowup' || key === 'w' ? 'up' : key === 'arrowdown' || key === 's' ? 'down' : key === 'arrowleft' || key === 'a' ? 'left' : key === 'arrowright' || key === 'd' ? 'right' : null; if (direction) { event.preventDefault(); move(direction); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [move]);
  useEffect(() => {
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; tick(ms); };
    bridge.render_game_to_text = () => JSON.stringify({ mode: 'daily-formula', room: 'watcher', phase: phaseRef.current, question: question + 1, totalQuestions: 4, characterName: character.name, victory: journeyRef.current, spoilerSafe: true });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character.name, question, tick]);
  const swipe = useSwipeDirection(move, phase !== 'portal-open');

  return <section className="lab-screen watcher-room" aria-label="Watcher trivia finale"><canvas ref={canvas} width="390" height="844" aria-label="The Watcher statue and explorer" {...swipe} /><header className="lab-header"><button className="icon-button glass" onClick={onExit} aria-label="Leave formula preview">×</button><div><span>FORMULA TEST · FINAL ROOM</span><h1>The Watcher</h1></div><button className="lab-small-button glass" onClick={restart}>RESET</button></header>
    {phase === 'welcome' && <div className="watcher-card"><div className="eyebrow">THE WATCHER AWAKENS</div><h2>“Welcome, {character.name}.”</h2><p>Answer all four questions correctly. One mistake ends the trial.</p><button className="primary-button" onClick={() => setPhaseBoth('quiz')}>FACE THE WATCHER</button></div>}
    {phase === 'quiz' && <div className="watcher-card quiz"><div className="eyebrow">QUESTION {question + 1} OF 4</div><h2>{WATCHER_QUESTIONS[question].prompt}</h2><div className="choice-grid single-column">{WATCHER_QUESTIONS[question].choices.map((choice, index) => <button key={choice} onClick={() => answer(index)}><span>{index + 1}</span>{choice}</button>)}</div></div>}
    {phase === 'failed' && <div className="watcher-card failed"><div className="eyebrow">THE WATCHER’S JUDGMENT</div><h2>The trial ends here</h2><p>{character.name} dissolves into harmless portal light. Retry the four-question trial when ready.</p><button className="primary-button" onClick={restart}>RETRY WATCHER</button></div>}
    {phase === 'celebrating' && <div className="watcher-card compact"><div className="eyebrow">4 OF 4 CORRECT</div><h2>{character.name} celebrates!</h2><p>The finishing portal will open after one second.</p></div>}
    {phase === 'portal-open' && <div className="watcher-exit-controls"><p>Portal open—swipe or steer {character.name} into it.</p><div className="lab-dpad"><button className="up" onClick={() => move('up')} aria-label="Move up">↑</button><button className="left" onClick={() => move('left')} aria-label="Move left">←</button><span>◇</span><button className="right" onClick={() => move('right')} aria-label="Move right">→</button><button className="down" onClick={() => move('down')} aria-label="Move down">↓</button></div></div>}
  </section>;
}

export function FormulaPreview({ character, onExit }: { character: CharacterCustomization; onExit: () => void }) {
  const [stage, setStage] = useState<FormulaStage>('arrival');
  useEffect(() => {
    if (stage !== 'arrival' && stage !== 'complete') return; const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = () => undefined; bridge.render_game_to_text = () => JSON.stringify({ mode: 'daily-formula', stage, sequence: ['arrival', 'adventure', 'gear-links', 'echo-sequence', 'watcher', 'complete'], characterName: character.name, theme: WATCHER_TEST_THEME.worldName });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [character.name, stage]);
  if (stage === 'arrival') return <FormulaArrival character={character} onExit={onExit} enter={() => setStage('adventure')} />;
  if (stage === 'adventure') return <AdventureLab character={character} theme={WATCHER_TEST_THEME} contextLabel="VERDANT ORRERY · ROOM 1" onExit={onExit} onComplete={() => setStage('prototype-one')} />;
  if (stage === 'prototype-one') return <ClassicLab key="formula-gear" id={13} character={character} theme={WATCHER_TEST_THEME} contextLabel="VERDANT ORRERY · ROOM 2" onExit={onExit} onComplete={() => setStage('prototype-two')} />;
  if (stage === 'prototype-two') return <ClassicLab key="formula-echo" id={12} character={character} theme={WATCHER_TEST_THEME} contextLabel="VERDANT ORRERY · ROOM 3" onExit={onExit} onComplete={() => setStage('watcher')} />;
  if (stage === 'watcher') return <WatcherRoom character={character} onExit={onExit} onComplete={() => setStage('complete')} />;
  return <section className="lab-screen formula-complete"><div className="formula-finish-card"><div className="eyebrow">FORMULA TEST COMPLETE</div><h1>The Watcher’s compass turns again</h1><p>{character.name} survived the Adventure, two prototype rooms, and the four-question Watcher trial.</p><button className="primary-button" onClick={() => setStage('arrival')}>PLAY AGAIN</button><button className="secondary-button" onClick={onExit}>RETURN HOME</button></div></section>;
}
