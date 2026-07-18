import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ClassicLab } from './ClassicLab';
import { CLASSIC_LABS, type ClassicLabId } from './classicLabs';

type LabSelection = ClassicLabId | null;

function drawHubExplorer(ctx: CanvasRenderingContext2D, time: number) {
  const bob = Math.sin(time / 380) * 2;
  const x = 195; const y = 218 + bob;
  ctx.fillStyle = '#06171b75'; ctx.beginPath(); ctx.ellipse(x, y + 31, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a3932'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x - 11, y + 29); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + 11, y + 29); ctx.stroke();
  ctx.strokeStyle = '#26343a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 17, y + 31); ctx.lineTo(x - 7, y + 31); ctx.moveTo(x + 7, y + 31); ctx.lineTo(x + 17, y + 31); ctx.stroke();
  ctx.fillStyle = '#c77743'; ctx.beginPath(); ctx.roundRect(x - 19, y - 31, 38, 42, 10); ctx.fill();
  ctx.fillStyle = '#f0b45b'; ctx.beginPath(); ctx.moveTo(x - 16, y - 30); ctx.lineTo(x + 13, y + 7); ctx.lineTo(x + 19, y - 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c77743'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 15, y - 19); ctx.lineTo(x - 28, y - 3); ctx.moveTo(x + 15, y - 19); ctx.lineTo(x + 28, y - 5); ctx.stroke();
  ctx.fillStyle = '#d99b72'; ctx.beginPath(); ctx.ellipse(x, y - 49, 15, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e302b'; ctx.beginPath(); ctx.ellipse(x - 2, y - 61, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17262b'; ctx.beginPath(); ctx.arc(x - 5, y - 50, 2, 0, Math.PI * 2); ctx.arc(x + 5, y - 50, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7b4e36'; ctx.beginPath(); ctx.roundRect(x - 22, y - 72, 44, 7, 4); ctx.fill(); ctx.beginPath(); ctx.roundRect(x - 12, y - 82, 26, 12, 5); ctx.fill();
  ctx.fillStyle = '#f6c85f'; ctx.beginPath(); ctx.roundRect(x - 12, y - 8, 24, 18, 5); ctx.fill();
  ctx.fillStyle = '#173338'; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('LAB', x, y + 4);
}

function drawHub(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, 0, 844); gradient.addColorStop(0, '#183d42'); gradient.addColorStop(.48, '#32686a'); gradient.addColorStop(1, '#0a2329');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 390, 844);
  const glow = ctx.createRadialGradient(195, 200, 12, 195, 200, 235); glow.addColorStop(0, '#f6c85f4a'); glow.addColorStop(1, '#f6c85f00');
  ctx.fillStyle = glow; ctx.fillRect(0, 60, 390, 390);
  ctx.fillStyle = '#0a222a80'; ctx.beginPath(); ctx.moveTo(0, 360); ctx.lineTo(0, 92); ctx.lineTo(102, 148); ctx.lineTo(90, 390); ctx.fill();
  ctx.beginPath(); ctx.moveTo(390, 360); ctx.lineTo(390, 92); ctx.lineTo(288, 148); ctx.lineTo(300, 390); ctx.fill();
  for (let index = 0; index < 4; index += 1) {
    const x = index % 2 ? 320 : 70; const y = 126 + Math.floor(index / 2) * 106; const pulse = (Math.sin(time / 520 + index) + 1) / 2;
    ctx.save(); ctx.shadowColor = index % 2 ? '#74dfd0' : '#f6c85f'; ctx.shadowBlur = 8 + pulse * 10;
    ctx.strokeStyle = index % 2 ? '#74dfd0aa' : '#f6c85faa'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 29, Math.PI, 0); ctx.lineTo(x + 29, y + 38); ctx.lineTo(x - 29, y + 38); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = '#9fe8dc'; ctx.font = '900 9px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText('ONE EXPLORER · MANY MECHANICS', 195, 112);
  drawHubExplorer(ctx, time);
}

export function LabHub({ onExit, openBlockShift, openMineTrail }: { onExit: () => void; openBlockShift: () => void; openMineTrail: () => void }) {
  const [selected, setSelected] = useState<LabSelection>(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('lab'));
    return requested >= 3 && requested <= 9 ? requested as ClassicLabId : null;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (selected !== null) return;
    const canvas = canvasRef.current; if (!canvas) return;
    let frame = 0;
    const render = () => { drawHub(canvas, performance.now()); frame = requestAnimationFrame(render); };
    render(); return () => cancelAnimationFrame(frame);
  }, [selected]);

  useEffect(() => {
    if (selected !== null) return;
    const bridge = window as typeof window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
    bridge.advanceTime = () => { if (canvasRef.current) drawHub(canvasRef.current, performance.now()); };
    bridge.render_game_to_text = () => JSON.stringify({
      mode: 'lab-corridor', coordinateSystem: 'portrait menu; cards ordered top-to-bottom',
      playableLabs: [1, 2, ...CLASSIC_LABS.map((lab) => lab.id)],
      objective: 'Choose a prototype lab to play. Every playable lab uses the same explorer and portal system.',
    });
    return () => { delete bridge.advanceTime; delete bridge.render_game_to_text; };
  }, [selected]);

  if (selected !== null) return <ClassicLab id={selected} onExit={() => setSelected(null)} />;

  return <section className="lab-hub-screen" aria-label="Prototype Lab corridor">
    <canvas ref={canvasRef} width="390" height="844" aria-label="Explorer standing in the prototype corridor" />
    <header className="lab-hub-header">
      <button className="icon-button glass" onClick={onExit} aria-label="Back to home">←</button>
      <div><span>DAILY VENTURE · TEST WING</span><h1>Prototype Corridor</h1></div>
      <div className="lab-count"><strong>9</strong><small>PLAYABLE</small></div>
    </header>
    <div className="lab-hub-intro">
      <strong>Choose the next field test</strong>
      <span>Every room keeps the same explorer, portal language, and mobile controls.</span>
    </div>
    <div className="lab-card-list">
      <button className="lab-card lab-card-featured" onClick={openBlockShift}>
        <span className="lab-card-number">01</span><span className="lab-card-copy"><strong>Block Shift</strong><small>Original sliding-block room · 2.5D explorer</small></span><b>PLAY ›</b>
      </button>
      <button className="lab-card lab-card-mine" onClick={openMineTrail}>
        <span className="lab-card-number">02</span><span className="lab-card-copy"><strong>Mine Trail</strong><small>Original hidden-tile path · 2.5D explorer</small></span><b>PLAY ›</b>
      </button>
      <div className="lab-list-divider"><span>CLASSIC MECHANIC STUDIES</span></div>
      {CLASSIC_LABS.map((lab) => <button key={lab.id} className="lab-card" style={{ '--lab-accent': lab.accent } as CSSProperties} onClick={() => setSelected(lab.id)}>
        <span className="lab-card-number">{String(lab.id).padStart(2, '0')}</span>
        <span className="lab-card-icon" aria-hidden="true">{lab.icon}</span>
        <span className="lab-card-copy"><strong>{lab.title}</strong><small>{lab.shortTitle} · {lab.inspiration}</small></span><b>PLAY ›</b>
      </button>)}
      <p className="lab-hub-footnote">Prototype rules and pacing are intentionally easy to revise before these mechanics enter a Daily Venture.</p>
    </div>
  </section>;
}
