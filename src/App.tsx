import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { WEEK_ONE } from './content/week1';
import { VentureCanvas, type CanvasView } from './game/VentureCanvas';
import { currentPuzzleConfig, initialSessionState, sessionReducer, sessionSnapshot } from './game/session';
import type { DailyAdventure, FinaleConfig, LogicConfig, MemoryConfig, PuzzleConfig, RhythmConfig, Settings, TriviaConfig } from './game/types';
import { BlockShiftLab } from './lab/BlockShiftLab';
import { calculateAchievements, newlyUnlocked } from './services/achievements';
import { formatDate, localDateKey } from './services/date';
import { createVentureService, DEFAULT_SETTINGS, type CalendarDay } from './services/ventureService';

type Modal = 'help' | 'login' | 'achievements' | 'settings' | 'rooms' | null;
type HomePage = 'home' | 'archive' | 'review' | 'lab';

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function resultText(adventure: DailyAdventure, results: boolean[], activeMs: number, attempt: number, isArchive: boolean, playedDate: string, newlyEarned: string[]) {
  const tiles = Array.from({ length: 5 }, (_, index) => results[index] == null ? '⬜' : results[index] ? '🟩' : '🟥').join('');
  const runLabel = adventure.publishDate === null ? 'Reviewer preview' : isArchive ? 'Archive' : attempt === 1 && adventure.publishDate === playedDate ? 'First try' : 'Release day';
  const earned = newlyEarned.length ? `\nNew achievements: ${newlyEarned.join(', ')}` : '';
  return `DAILY VENTURE · ${formatDate(playedDate)}\n${adventure.title} · ${adventure.subtitle}\n${tiles}\n${results.filter(Boolean).length}/5 cleared · ${formatDuration(activeMs)} active · Attempt ${attempt}\n${runLabel}${earned}\nNo puzzle answers shared.`;
}

function AppIcon({ children }: { children: string }) { return <span aria-hidden="true">{children}</span>; }

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </section>
    </div>
  );
}

function ProgressDots({ adventure, levelIndex, results }: { adventure: DailyAdventure; levelIndex: number; results: Array<{ success: boolean }> }) {
  return <div className="progress-dots" aria-label={`Level ${Math.min(levelIndex + 1, 5)} of 5`}>
    {adventure.levelOrder.map((type, index) => <span key={`${type}-${index}`} className={`progress-dot ${results[index]?.success ? 'done' : index === levelIndex ? 'current' : ''}`}>{results[index]?.success ? '✓' : index + 1}</span>)}
  </div>;
}

function TriviaPuzzle({ config, index, choose }: { config: TriviaConfig; index: number; choose: (index: number) => void }) {
  const question = config.questions[index];
  return <div className="puzzle-panel question-panel">
    <div className="eyebrow">Question {index + 1} of 3</div>
    <h2>{question.prompt}</h2>
    <div className="choice-grid single-column">
      {question.choices.map((choice, choiceIndex) => <button key={choice} onClick={() => choose(choiceIndex)}><span>{choiceIndex + 1}</span>{choice}</button>)}
    </div>
  </div>;
}

function LogicPuzzle({ config, selected, choice, choose, confirm }: { config: LogicConfig; selected: string[]; choice: number | null; choose: (value: number | string) => void; confirm: () => void }) {
  if (config.mechanic === 'deduction') return <div className="puzzle-panel logic-panel deduction-panel">
    <div className="eyebrow">Multi-clue deduction</div>
    <h2>{config.prompt}</h2>
    <div className="clue-list">{config.clues.map((clue) => <p key={clue}>• {clue}</p>)}</div>
    <div className="choice-grid two-column">{config.choices.map((answer, index) => <button key={answer} className={choice === index ? 'selected' : ''} onClick={() => choose(index)}>{answer}</button>)}</div>
    <button className="primary-button compact" disabled={choice === null} onClick={confirm}>Commit answer</button>
  </div>;
  return <div className="puzzle-panel logic-panel">
    <div className="eyebrow">Linked-order deduction</div>
    <div className={`logic-slots ${config.tokens.length === 5 ? 'five' : ''}`}>{Array.from({ length: config.tokens.length }, (_, index) => <div key={index} className={selected[index] ? 'filled' : ''}>{selected[index] ?? index + 1}</div>)}</div>
    <div className="clue-list">{config.clues.map((clue) => <p key={clue.text}>• {clue.text}</p>)}</div>
    <div className="choice-grid token-grid">{config.tokens.map((token) => <button key={token} className={selected.includes(token) ? 'selected' : ''} disabled={selected.includes(token)} onClick={() => choose(token)}>{token}</button>)}</div>
    <button className="primary-button compact" disabled={selected.length !== config.tokens.length} onClick={confirm}>Confirm order</button>
  </div>;
}

function RhythmPuzzle({ config, elapsedMs, beatIndex, errors, tap }: { config: RhythmConfig; elapsedMs: number; beatIndex: number; errors: number; tap: () => void }) {
  const nextBeat = config.beatMap[beatIndex];
  const active = nextBeat !== undefined && Math.abs(elapsedMs - nextBeat) <= config.windowMs;
  return <div className="puzzle-panel rhythm-panel">
    <div className="rhythm-stats"><span>{Math.ceil(Math.max(0, config.durationMs - elapsedMs) / 1000)} sec</span><span>{'◇'.repeat(errors)}{'○'.repeat(config.maxErrors - errors)} strikes</span></div>
    <div className="rhythm-meter"><span style={{ width: `${Math.min(100, elapsedMs / config.durationMs * 100)}%` }} /></div>
    <div className={`cue-orb ${active ? 'active' : ''}`} aria-live="polite">{active ? config.cueLabel : 'WAIT'}</div>
    <button className={`rhythm-button ${active ? 'active' : ''}`} onClick={tap}>{config.actionLabel}</button>
    <p>Tap inside the illuminated timing window. The third error ends the run.</p>
  </div>;
}

function MemoryPuzzle({ config, puzzle, choose, replay }: { config: MemoryConfig; puzzle: Extract<ReturnType<typeof sessionSnapshot>['puzzle'], object> & { phase?: string; roundIndex?: number; revealIndex?: number; selected?: string[]; replayUsed?: boolean }; choose: (symbol: string) => void; replay: () => void }) {
  const roundIndex = puzzle.roundIndex ?? 0;
  const sequence = config.rounds[roundIndex];
  const showing = puzzle.phase === 'showing';
  return <div className="puzzle-panel memory-panel">
    <div className="memory-meta"><span>Sequence {roundIndex + 1} of 3</span><span>{sequence.length} symbols</span></div>
    <div className={`memory-display ${showing ? 'showing' : 'recall'}`} aria-live="polite">
      {showing ? <strong>{sequence[puzzle.revealIndex ?? 0] ?? 'Remember'}</strong> : <strong>Your turn</strong>}
      <div>{sequence.map((_, index) => <span key={index} className={!showing && index < (puzzle.selected?.length ?? 0) ? 'filled' : showing && index === (puzzle.revealIndex ?? 0) ? 'current' : ''}>{!showing && index < (puzzle.selected?.length ?? 0) ? '✓' : index + 1}</span>)}</div>
    </div>
    <div className="choice-grid two-column memory-choices">{config.symbols.map((symbol) => <button key={symbol} disabled={showing} onClick={() => choose(symbol)}>{symbol}</button>)}</div>
    <button className="text-button replay-button" disabled={showing || puzzle.replayUsed} onClick={replay}>{puzzle.replayUsed ? 'Replay used' : 'Replay this sequence once'}</button>
  </div>;
}

function FinalePuzzle({ config, puzzle, choose, confirm, replay, tapRhythm }: { config: FinaleConfig; puzzle: Extract<ReturnType<typeof sessionSnapshot>['puzzle'], object> & { phase?: string; selected?: string[]; memoryPhase?: string; memoryRevealIndex?: number; replayUsed?: boolean; elapsedMs?: number; beatIndex?: number; errors?: number; physicsChoice?: number | null }; choose: (value: number | string) => void; confirm: () => void; replay: () => void; tapRhythm: () => void }) {
  const phase = puzzle.phase;
  if (phase === 'question') return <div className="puzzle-panel question-panel"><div className="eyebrow">Finale · Recall</div><h2>{config.question.prompt}</h2><div className="choice-grid single-column">{config.question.choices.map((choice, index) => <button key={choice} onClick={() => choose(index)}><span>{index + 1}</span>{choice}</button>)}</div></div>;
  if (phase === 'order') return <div className="puzzle-panel"><div className="eyebrow">Finale · Restore</div><h2>Place the three remembered signs in order.</h2><div className="logic-slots three">{Array.from({ length: 3 }, (_, index) => <div key={index}>{puzzle.selected?.[index] ?? index + 1}</div>)}</div><div className="choice-grid three-column">{config.orderTokens.map((token) => <button key={token} disabled={puzzle.selected?.includes(token)} onClick={() => choose(token)}>{token}</button>)}</div><button className="primary-button compact" disabled={puzzle.selected?.length !== 3} onClick={confirm}>Lock sequence</button></div>;
  if (phase === 'memory') {
    const showing = puzzle.memoryPhase === 'showing';
    return <div className="puzzle-panel memory-panel"><div className="eyebrow">Finale · Remember</div><div className={`memory-display ${showing ? 'showing' : 'recall'}`} aria-live="polite"><strong>{showing ? config.memorySequence[puzzle.memoryRevealIndex ?? 0] ?? 'Remember' : 'Repeat the engine code'}</strong><div>{config.memorySequence.map((_, index) => <span key={index} className={!showing && index < (puzzle.selected?.length ?? 0) ? 'filled' : showing && index === (puzzle.memoryRevealIndex ?? 0) ? 'current' : ''}>{!showing && index < (puzzle.selected?.length ?? 0) ? '✓' : index + 1}</span>)}</div></div><div className="choice-grid two-column memory-choices">{config.memorySymbols.map((symbol) => <button key={symbol} disabled={showing} onClick={() => choose(symbol)}>{symbol}</button>)}</div><button className="text-button replay-button" disabled={showing || puzzle.replayUsed} onClick={replay}>{puzzle.replayUsed ? 'Replay used' : 'Replay code once'}</button></div>;
  }
  if (phase === 'rhythm') {
    const beat = config.rhythmBeats[puzzle.beatIndex ?? 0];
    const active = beat !== undefined && Math.abs((puzzle.elapsedMs ?? 0) - beat) <= 360;
    return <div className="puzzle-panel rhythm-panel"><div className="eyebrow">Finale · Charge</div><div className={`cue-orb ${active ? 'active' : ''}`}>{active ? 'NOW' : 'WAIT'}</div><button className={`rhythm-button ${active ? 'active' : ''}`} onClick={tapRhythm}>CHARGE</button><p>{puzzle.beatIndex ?? 0}/4 pulses · {puzzle.errors ?? 0}/2 errors</p></div>;
  }
  return <div className="puzzle-panel physics-panel"><div className="eyebrow">Finale · Physics</div><h2>{config.physics.prompt}</h2><div className="choice-grid single-column">{config.physics.choices.map((choice, index) => <button className={puzzle.physicsChoice === index ? 'selected' : ''} key={choice} onClick={() => choose(index)}><span>{index + 1}</span>{choice}</button>)}</div><button className="primary-button compact" disabled={puzzle.physicsChoice == null} onClick={confirm}>Release mechanism</button></div>;
}

export function App() {
  const service = useMemo(() => createVentureService(), []);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof service.getProfile>>>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [page, setPage] = useState<HomePage>('home');
  const [modal, setModal] = useState<Modal>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [reviewAdventures, setReviewAdventures] = useState<DailyAdventure[]>([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduledMessage, setScheduledMessage] = useState('');
  const [todayAdventure, setTodayAdventure] = useState<DailyAdventure | null>(null);
  const manualTime = useRef(false);
  const finalizedAttempt = useRef<string | null>(null);
  const guestAttempts = useRef(new Map<string, number>());
  const audioContext = useRef<AudioContext | null>(null);
  const ambientNodes = useRef<{ gain: GainNode; oscillators: OscillatorNode[] } | null>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = localDateKey(new Date(), timeZone);
  const config = currentPuzzleConfig(session);

  useEffect(() => {
    service.getProfile().then((current) => {
      setProfile(current);
      if (current) setSettings(current.settings);
    }).catch(() => undefined);
  }, [service]);

  useEffect(() => {
    service.getAdventure(today, timeZone).then(setTodayAdventure).catch(() => setTodayAdventure(null));
  }, [service, timeZone, today]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (!manualTime.current && modal === null) dispatch({ type: 'TICK', ms: 50 }); }, 50);
    return () => window.clearInterval(interval);
  }, [modal]);

  useEffect(() => () => { ambientNodes.current?.oscillators.forEach((oscillator) => oscillator.stop()); void audioContext.current?.close(); }, []);

  useEffect(() => {
    if (page === 'lab') return;
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = (ms: number) => { manualTime.current = true; if (modal === null) dispatch({ type: 'TICK', ms }); };
    bridge.render_game_to_text = () => JSON.stringify(sessionSnapshot(session));
  }, [modal, page, session]);

  useEffect(() => {
    if (session.mode !== 'results' || session.isTesting || !profile || !session.attemptId || finalizedAttempt.current === session.attemptId || !session.finalOutcome) return;
    finalizedAttempt.current = session.attemptId;
    const before = profile.attempts.map((attempt) => ({ ...attempt, levelResults: [...attempt.levelResults] }));
    service.finishAttempt({ attemptId: session.attemptId, outcome: session.finalOutcome, activeMs: session.activeMs, levelResults: session.results }).then(async () => {
      const updated = await service.getProfile();
      if (updated) {
        const unlocked = newlyUnlocked(before, updated.attempts);
        setProfile(updated);
        dispatch({ type: 'SET_NEW_ACHIEVEMENTS', codes: unlocked });
      }
    }).catch((error) => setShareMessage(`Result is pending sync: ${String(error)}`));
  }, [profile, service, session.activeMs, session.attemptId, session.finalOutcome, session.isTesting, session.mode, session.results]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); return; }
      if (session.mode === 'intro' && event.key === 'Enter') dispatch({ type: 'SHOW_READY' });
      else if (session.mode === 'ready' && event.key === 'Enter') dispatch({ type: 'BEGIN_LEVEL' });
      else if (session.mode === 'puzzle' && event.key === ' ') { event.preventDefault(); dispatch({ type: 'RHYTHM_TAP' }); }
      else if (session.mode === 'puzzle' && event.key === 'Enter') dispatch({ type: 'CONFIRM' });
      else if (session.mode === 'puzzle' && ['1', '2', '3', '4'].includes(event.key)) dispatch({ type: 'CHOOSE', value: Number(event.key) - 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session.mode]);

  const stopAmbient = useCallback(() => {
    const nodes = ambientNodes.current;
    if (!nodes) return;
    nodes.gain.gain.cancelScheduledValues(0);
    nodes.gain.gain.setTargetAtTime(0.0001, audioContext.current?.currentTime ?? 0, 0.08);
    window.setTimeout(() => nodes.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch { /* Already stopped. */ } }), 350);
    ambientNodes.current = null;
  }, []);

  const startAmbient = useCallback((themeIndex: number, enabled = settings.music) => {
    if (!enabled || navigator.webdriver) return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      stopAmbient();
      const context = !audioContext.current || audioContext.current.state === 'closed' ? new AudioContextClass() : audioContext.current;
      audioContext.current = context;
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.009, context.currentTime + 1.4);
      gain.connect(context.destination);
      const roots = [110, 98, 123.47, 130.81, 92.5, 146.83, 164.81];
      const root = roots[themeIndex % roots.length];
      const oscillators = [root, root * 1.5].map((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = index === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index ? 4 : -4;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      ambientNodes.current = { gain, oscillators };
    } catch { /* Music remains optional on devices without a working audio renderer. */ }
  }, [settings.music, stopAmbient]);

  const openAdventure = useCallback(async (adventure: DailyAdventure, isArchive: boolean) => {
    startAmbient(adventure.weekIndex);
    let attemptId: string | null = null;
    let attemptNumber: number;
    if (profile) {
      const attempt = await service.startAttempt(adventure.id, isArchive, timeZone);
      attemptId = attempt.id;
      attemptNumber = attempt.attemptNumber;
    } else {
      attemptNumber = (guestAttempts.current.get(adventure.id) ?? 0) + 1;
      guestAttempts.current.set(adventure.id, attemptNumber);
    }
    finalizedAttempt.current = null;
    setShareMessage('');
    setPage('home');
    dispatch({ type: 'OPEN_INTRO', adventure, attemptNumber, attemptId, isArchive, authenticated: Boolean(profile), reviewer: profile?.role === 'reviewer', reducedMotion: settings.reducedMotion });
  }, [profile, service, settings.reducedMotion, startAmbient, timeZone]);

  const playToday = async () => {
    const item = todayAdventure ?? await service.getAdventure(today, timeZone);
    if (item) await openAdventure(item, false);
  };

  const enterReview = async () => {
    let current = profile;
    if (!current && service.mode === 'local-review') {
      current = await service.enterLocalReview();
      setProfile(current);
      setSettings(current.settings);
    }
    const items = await service.listReviewAdventures();
    setReviewAdventures(items);
    setPage('review');
  };

  const openArchive = async () => {
    setCalendar(await service.listCalendar(today.slice(0, 7), timeZone));
    setPage('archive');
  };

  const chooseCalendarDay = async (day: CalendarDay) => {
    if (!day.playable || !day.adventureId) return;
    const item = await service.getAdventure(day.date, timeZone);
    if (item) await openAdventure(item, day.date !== today);
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await service.signIn(loginEmail);
      if (result.profile) { setProfile(result.profile); setSettings(result.profile.settings); setLoginMessage('Local reviewer profile is ready.'); setModal(null); }
      else setLoginMessage('Check your email for the secure sign-in link.');
    } catch (error) { setLoginMessage(String(error)); }
  };

  const signOut = async () => {
    await service.signOut(); stopAmbient(); dispatch({ type: 'GO_HOME' }); setProfile(null); setSettings(DEFAULT_SETTINGS); setModal(null); setPage('home');
  };

  const changeSetting = async (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    if (key === 'music') { if (next.music && session.adventure) startAmbient(session.adventure.weekIndex, true); else stopAmbient(); }
    if (profile) { await service.updateSettings(next); setProfile({ ...profile, settings: next }); }
  };

  const schedule = async () => {
    if (!scheduleDate) return;
    try { await service.scheduleWeek(scheduleDate); setScheduledMessage(`Week 1 scheduled from ${formatDate(scheduleDate)}.`); setTodayAdventure(await service.getAdventure(today, timeZone)); }
    catch (error) { setScheduledMessage(String(error)); }
  };

  const feedbackPulse = () => {
    if (settings.vibration) navigator.vibrate?.(20);
    if (settings.sound && !navigator.webdriver) {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const context = audioContext.current ?? new AudioContextClass();
          audioContext.current = context;
          if (context.state === 'suspended') void context.resume();
          const oscillator = context.createOscillator(); const gain = context.createGain();
          oscillator.frequency.value = 440; gain.gain.value = 0.035; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.06);
        } catch { /* Sound is optional when a device has no audio renderer. */ }
      }
    }
    dispatch({ type: 'RHYTHM_TAP' });
  };

  const share = async () => {
    if (!profile || !session.authenticated || !session.adventure) return;
    const text = resultText(session.adventure, session.results.map((result) => result.success), session.activeMs, session.attemptNumber, session.isArchive, session.adventure.publishDate ?? today, session.newlyUnlocked);
    try {
      if (navigator.share) await navigator.share({ title: 'Daily Venture', text });
      else await navigator.clipboard.writeText(text);
      setShareMessage('Spoiler-free result ready to share.');
    } catch (error) { if ((error as Error).name !== 'AbortError') setShareMessage('Sharing was unavailable on this device.'); }
  };

  const retry = () => { if (session.adventure) void openAdventure(session.adventure, session.isArchive); };
  const goHome = () => { stopAmbient(); dispatch({ type: 'GO_HOME' }); setPage('home'); };

  const canvasView: CanvasView = {
    adventure: session.adventure,
    mode: session.mode,
    levelType: config?.type,
    levelIndex: session.levelIndex,
    puzzle: session.puzzle,
    resolutionOutcome: session.resolutionOutcome,
    resolutionElapsedMs: session.resolutionElapsedMs,
    reducedMotion: session.reducedMotion,
  };

  const homeCanvasView: CanvasView = { ...canvasView, adventure: null, mode: 'home' };
  const achievements = calculateAchievements(profile?.attempts ?? []);

  return <main className={`app ${settings.highContrast ? 'high-contrast' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="phone-stage">
      {!(session.mode === 'home' && page === 'lab') && <VentureCanvas view={session.mode === 'home' ? homeCanvasView : canvasView} />}

      {session.mode === 'home' && page === 'lab' && <BlockShiftLab onExit={() => setPage('home')} />}

      {session.mode === 'home' && page === 'home' && <section className="screen-overlay home-screen">
        <header className="home-toolbar">
          <button className="icon-button glass" onClick={() => setModal('help')} aria-label="About Daily Venture"><AppIcon>?</AppIcon></button>
          <button className="icon-button glass" onClick={() => setModal('achievements')} aria-label="Achievements"><AppIcon>♜</AppIcon></button>
          <button className="account-button glass" onClick={() => setModal(profile ? 'settings' : 'login')}>{profile ? 'PROFILE' : 'LOG IN'}</button>
        </header>
        <div className="home-title"><div className="eyebrow">ONE TRAIL · EVERY DAY</div><h1>DAILY<br />VENTURE</h1><p>Move through handcrafted puzzle worlds. One new venture every day.</p></div>
        <div className="home-actions">
          <button className="primary-button" onClick={playToday} disabled={!todayAdventure}>VENTURE <small>{todayAdventure ? todayAdventure.title : 'Awaiting launch date'}</small></button>
          <button className="secondary-button" onClick={openArchive}>PAST VENTURES</button>
          <button className="lab-preview-button" onClick={() => setPage('lab')}>PREVIEW TESTER GAME <span>Block Shift · Lab 01</span></button>
          <button className="review-button" onClick={enterReview}>PREVIEW WEEK 1 <span>Reviewer build</span></button>
        </div>
      </section>}

      {session.mode === 'home' && page === 'archive' && <section className="screen-overlay page-screen">
        <div className="page-header"><button className="icon-button" onClick={() => setPage('home')} aria-label="Back">←</button><div><div className="eyebrow">THE ARCHIVE</div><h1>Past Ventures</h1></div></div>
        <p className="page-copy">Published trails remain playable. Missing and future dates stay locked.</p>
        <div className="calendar-card"><div className="calendar-title">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())}</div><div className="calendar-weekdays">{'SMTWTFS'.split('').map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{calendar.map((day) => <button key={day.date} disabled={!day.playable} className={day.playable ? 'playable' : day.future ? 'future' : 'empty'} onClick={() => chooseCalendarDay(day)}><strong>{Number(day.date.slice(-2))}</strong>{day.playable && <span>◆</span>}</button>)}</div></div>
        <button className="secondary-button" onClick={() => setPage('home')}>BACK HOME</button>
      </section>}

      {session.mode === 'home' && page === 'review' && <section className="screen-overlay page-screen review-screen">
        <div className="page-header"><button className="icon-button" onClick={() => setPage('home')} aria-label="Back">←</button><div><div className="eyebrow">REVIEWER PREVIEW</div><h1>Week 1</h1></div></div>
        <p className="page-copy">All seven draft adventures are playable here before public scheduling.</p>
        <div className="review-list">{reviewAdventures.map((item) => <button key={item.id} onClick={() => openAdventure(item, false)}><span className="day-number">0{item.weekIndex + 1}</span><span><strong>{item.title}</strong><small>{item.subtitle} · {item.levelOrder.slice(0, 4).join(' → ')}</small></span><b>›</b></button>)}</div>
        <div className="schedule-card"><label htmlFor="launch-date">Schedule after approval</label><div><input id="launch-date" type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /><button onClick={schedule}>SET DATE</button></div>{scheduledMessage && <p>{scheduledMessage}</p>}</div>
      </section>}

      {session.mode !== 'home' && session.adventure && <>
        <header className="game-hud"><button className="icon-button glass" onClick={goHome} aria-label="Leave run">×</button><div><strong>{session.adventure.title}</strong><span>{session.isTesting ? 'ROOM TEST · NOT SAVED' : session.isArchive ? 'ARCHIVE' : session.reviewer ? 'REVIEW' : 'DAILY'} · ATTEMPT {session.attemptNumber}</span></div><button className="icon-button glass" onClick={() => setModal('settings')} aria-label="Settings">⚙</button></header>
        {session.mode !== 'intro' && session.mode !== 'results' && <ProgressDots adventure={session.adventure} levelIndex={session.levelIndex} results={session.results} />}
        {session.reviewer && session.mode !== 'results' && <button className="room-jump-button glass" onClick={() => setModal('rooms')}>ROOMS</button>}
      </>}

      {session.mode === 'intro' && session.adventure && <section className="screen-overlay intro-screen">
        <div className="intro-card"><div className="eyebrow">DAY {session.adventure.weekIndex + 1} · {session.adventure.estimatedMinutes}</div><h1>{session.adventure.title}</h1><h2>{session.adventure.subtitle}</h2><p>{session.adventure.synopsis}</p><div className="trail-preview">{session.adventure.levelOrder.map((type, index) => <span key={type}>{index + 1}<small>{type}</small></span>)}</div><button className="primary-button" onClick={() => dispatch({ type: 'SHOW_READY' })}>ENTER THE TRAIL</button></div>
      </section>}

      {session.mode === 'ready' && config && session.adventure && <section className="screen-overlay ready-screen"><div className="ready-card"><div className="eyebrow">ROOM {session.levelIndex + 1} OF 5 · {config.type}</div><h1>{config.title}</h1><p>{config.brief}</p>{config.type === 'rhythm' && <div className="rule-pill">30 SEC · ONE BUTTON · THREE STRIKES</div>}{config.type === 'memory' && <div className="rule-pill">WATCH · REPEAT · THREE SEQUENCES</div>}{config.type === 'logic' && <div className="rule-pill">READ EVERY CLUE · COMMIT ONCE</div>}{config.type === 'finale' && <div className="rule-pill">RECALL · MEMORY · RHYTHM · PHYSICS</div>}<button className="primary-button" onClick={() => dispatch({ type: 'BEGIN_LEVEL' })}>READY</button></div></section>}

      {session.mode === 'puzzle' && config && <section className="screen-overlay puzzle-screen">
        <div className="puzzle-heading"><div className="eyebrow">ROOM {session.levelIndex + 1} · {config.type}</div><h1>{config.title}</h1></div>
        {config.type === 'trivia' && session.puzzle.kind === 'trivia' && <TriviaPuzzle config={config as TriviaConfig} index={session.puzzle.questionIndex} choose={(value) => dispatch({ type: 'CHOOSE', value })} />}
        {config.type === 'logic' && session.puzzle.kind === 'logic' && <LogicPuzzle config={config as LogicConfig} selected={session.puzzle.selected} choice={session.puzzle.choice} choose={(value) => dispatch({ type: 'CHOOSE', value })} confirm={() => dispatch({ type: 'CONFIRM' })} />}
        {config.type === 'rhythm' && session.puzzle.kind === 'rhythm' && <RhythmPuzzle config={config as RhythmConfig} elapsedMs={session.puzzle.elapsedMs} beatIndex={session.puzzle.beatIndex} errors={session.puzzle.errors} tap={feedbackPulse} />}
        {config.type === 'memory' && session.puzzle.kind === 'memory' && <MemoryPuzzle config={config as MemoryConfig} puzzle={session.puzzle} choose={(value) => dispatch({ type: 'CHOOSE', value })} replay={() => dispatch({ type: 'MEMORY_REPLAY' })} />}
        {config.type === 'finale' && session.puzzle.kind === 'finale' && <FinalePuzzle config={config as FinaleConfig} puzzle={session.puzzle} choose={(value) => dispatch({ type: 'CHOOSE', value })} confirm={() => dispatch({ type: 'CONFIRM' })} replay={() => dispatch({ type: 'MEMORY_REPLAY' })} tapRhythm={feedbackPulse} />}
      </section>}

      {session.mode === 'resolution' && config && <section className="screen-overlay resolution-screen"><div className="resolution-card"><div className="eyebrow">{session.resolutionOutcome === 'success' ? 'TRAIL CLEARED' : 'RUN ENDED'}</div><h1>{session.resolutionOutcome === 'success' ? `${session.adventure?.art.artifact} recovered` : 'The Venture claims you'}</h1><p>{session.resolutionOutcome === 'success' ? 'The explorer crosses the obstacle and carries the relic onward.' : 'A stylized defeat closes this trail. Your result is waiting.'}</p><div className="resolution-meter"><span style={{ width: `${Math.min(100, session.resolutionElapsedMs / (session.reducedMotion ? 1200 : 4800) * 100)}%` }} /></div></div></section>}

      {session.mode === 'results' && session.adventure && <section className="screen-overlay results-screen"><div className="results-card"><div className="eyebrow">{session.finalOutcome === 'survived' ? 'VENTURE SURVIVED' : 'EXPEDITION ENDED'}</div><h1>{session.finalOutcome === 'survived' ? 'The trail opens' : `Room ${session.results.length} stopped you`}</h1><h2>{session.adventure.title}</h2><div className="result-tiles">{Array.from({ length: 5 }, (_, index) => <span key={index} className={session.results[index]?.success ? 'success' : session.results[index] ? 'failed' : ''}>{session.results[index]?.success ? '✓' : session.results[index] ? '×' : '·'}</span>)}</div><div className="result-stats"><div><strong>{session.results.filter((item) => item.success).length}/5</strong><small>cleared</small></div><div><strong>{formatDuration(session.activeMs)}</strong><small>active time</small></div><div><strong>{session.attemptNumber}</strong><small>attempt</small></div></div>{session.newlyUnlocked.length > 0 && <p className="achievement-toast">Achievement unlocked · {session.newlyUnlocked.join(', ')}</p>}<button className="primary-button" onClick={retry}>RETRY FULL TRAIL</button><button className="secondary-button" disabled={!profile || !session.authenticated} onClick={share}>{profile && session.authenticated ? 'SHARE RESULT' : 'LOG IN BEFORE PLAYING TO SHARE'}</button>{!session.authenticated && <p className="guest-note">Guest results are never saved or made shareable. Logging in now only applies to your next run.</p>}{shareMessage && <p className="share-message">{shareMessage}</p>}<button className="text-button" onClick={goHome}>Return home</button></div></section>}

      {modal === 'help' && <ModalFrame title="What is Daily Venture?" onClose={() => setModal(null)}><p>Every calendar day opens one themed trail of handcrafted, character-driven puzzle rooms.</p><p>Future ventures will let you guide the explorer through each environment, unlocking the next room only after solving the current obstacle.</p><p>Guests can play freely, but only signed-in explorers save stats, achievements, settings, and shareable results.</p><div className="modal-note">Puzzle Lab is where new game mechanics are built and refined before they receive a theme or enter a Daily Venture.</div></ModalFrame>}

      {modal === 'rooms' && session.adventure && <ModalFrame title="Test any room" onClose={() => setModal(null)}><p>Jump directly to a puzzle without completing the earlier rooms. Test-room outcomes are not saved.</p><div className="room-picker">{session.adventure.levelOrder.map((type, index) => <button key={`${type}-${index}`} onClick={() => { dispatch({ type: 'JUMP_TO_LEVEL', levelIndex: index }); setModal(null); }}><span>{index + 1}</span><strong>{session.adventure?.puzzles[type].title}</strong><small>{type}</small></button>)}</div></ModalFrame>}

      {modal === 'login' && <ModalFrame title="Save your expeditions" onClose={() => setModal(null)}><form className="login-form" onSubmit={submitLogin}><label htmlFor="email">Email address</label><input id="email" type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="explorer@example.com" /><button className="primary-button" type="submit">{service.mode === 'supabase' ? 'SEND MAGIC LINK' : 'CREATE LOCAL REVIEWER'}</button></form><p className="modal-note">{service.mode === 'supabase' ? 'A one-time secure link will be emailed to you.' : 'Supabase keys are not configured, so this creates a local reviewer profile for complete offline QA.'}</p>{loginMessage && <p>{loginMessage}</p>}</ModalFrame>}

      {modal === 'achievements' && <ModalFrame title="Achievements" onClose={() => setModal(null)}>{!profile && <p className="modal-note">Achievement goals are visible to everyone. Log in before a Venture to save progress.</p>}<div className="achievement-list">{achievements.map((item) => <div key={item.code} className={item.unlocked ? 'unlocked' : ''}><span>{item.unlocked ? '◆' : '◇'}</span><p><strong>{item.title}</strong><small>{item.description}</small></p><b>{item.current}/{item.target}</b></div>)}</div></ModalFrame>}

      {modal === 'settings' && <ModalFrame title={profile ? 'Profile & settings' : 'Run settings'} onClose={() => setModal(null)}>{profile && <div className="profile-summary"><span>{profile.email.slice(0, 1).toUpperCase()}</span><p><strong>{profile.email}</strong><small>{profile.role} · {profile.attempts.length} attempts</small></p></div>}<div className="settings-list">{([['sound', 'Sound effects'], ['music', 'Ambient music'], ['vibration', 'Touch vibration'], ['reducedMotion', 'Reduced motion'], ['highContrast', 'High contrast']] as Array<[keyof Settings, string]>).map(([key, label]) => <button key={key} onClick={() => changeSetting(key)}><span>{label}</span><b className={settings[key] ? 'on' : ''}>{settings[key] ? 'ON' : 'OFF'}</b></button>)}</div>{profile ? <button className="danger-button" onClick={signOut}>SIGN OUT</button> : <button className="primary-button" onClick={() => setModal('login')}>LOG IN</button>}</ModalFrame>}
    </div>
  </main>;
}
