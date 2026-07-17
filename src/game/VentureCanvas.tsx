import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { DailyAdventure, FinaleConfig, PuzzleType } from './types';
import type { PuzzleState, SessionState } from './session';

export interface CanvasView {
  adventure: DailyAdventure | null;
  mode: SessionState['mode'];
  levelType?: PuzzleType;
  levelIndex: number;
  puzzle: PuzzleState;
  resolutionOutcome: 'success' | 'failed' | null;
  resolutionElapsedMs: number;
  reducedMotion: boolean;
}

interface VentureScene extends Phaser.Scene {
  setView(view: CanvasView): void;
}

const BACKPLATES = ['home', 'temple', 'airship', 'library', 'forest', 'observatory', 'caravan', 'citadel'];

class DailyVentureScene extends Phaser.Scene implements VentureScene {
  private view: CanvasView = { adventure: null, mode: 'home', levelIndex: 0, puzzle: { kind: 'none' }, resolutionOutcome: null, resolutionElapsedMs: 0, reducedMotion: false };
  private art!: Phaser.GameObjects.Container;
  private matterBodies: MatterJS.BodyType[] = [];
  private physicsKind = '';

  constructor() { super('DailyVentureScene'); }

  preload() {
    const base = `${import.meta.env.BASE_URL}assets/backplates/`;
    BACKPLATES.forEach((key) => this.load.image(`backplate-${key}`, `${base}${key}.webp`));
  }

  create() {
    this.art = this.add.container(0, 0);
    this.renderView();
  }

  setView(view: CanvasView) {
    this.view = view;
    if (this.sys.isActive()) this.renderView();
  }

  private clearMatter() {
    this.matterBodies.forEach((body) => this.matter.world.remove(body));
    this.matterBodies = [];
    this.physicsKind = '';
  }

  private drawExplorer(x: number, y: number, pose: string) {
    const g = this.add.graphics();
    const failed = pose.startsWith('failed');
    const defeatVariant = failed ? Number(pose.split('-')[1] ?? 0) : 0;
    const time = this.time.now;
    const gait = pose === 'walk' ? Math.sin(time / 105) : 0;
    const breath = pose === 'idle' || ['study', 'think', 'focus', 'brace'].includes(pose) ? Math.sin(time / 520) : 0;
    const celebration = pose === 'celebrate' ? Math.sin(time / 150) : 0;
    const bounce = pose === 'celebrate' ? -Math.abs(celebration) * 11 : pose === 'walk' ? Math.abs(gait) * -3 : breath * 1.4;
    const lean = pose === 'think' ? -0.05 : pose === 'brace' ? 0.07 : gait * 0.025;
    y += bounce;

    g.fillStyle(0x07171b, 0.3); g.fillEllipse(x, y + 42, 56, 11);

    const leftKneeX = x - 11 + gait * 8;
    const rightKneeX = x + 11 - gait * 8;
    const leftFootX = x - 16 - gait * 11;
    const rightFootX = x + 16 + gait * 11;
    g.lineStyle(9, 0x684b3d); g.lineBetween(x - 10, y + 7, leftKneeX, y + 23); g.lineBetween(leftKneeX, y + 23, leftFootX, y + 39);
    g.lineBetween(x + 10, y + 7, rightKneeX, y + 23); g.lineBetween(rightKneeX, y + 23, rightFootX, y + 39);
    g.fillStyle(0x26343a); g.fillEllipse(leftFootX - 2, y + 41, 20, 8); g.fillEllipse(rightFootX + 2, y + 41, 20, 8);

    g.fillStyle(0x8b5a3c); g.fillRoundedRect(x - 26, y - 28, 13, 42, 6);
    g.fillStyle(0xc77a43); g.fillRoundedRect(x - 20, y - 32, 40, 48 + breath, 11);
    g.fillStyle(0xe4a14f); g.fillTriangle(x - 17, y - 30, x + 13, y + 12, x + 20, y - 27);
    g.lineStyle(3, 0x6f4937, 0.8); g.lineBetween(x + 5, y - 28, x + 5, y + 12);

    const armSwing = pose === 'walk' ? gait * 14 : pose === 'celebrate' ? 24 : pose === 'study' ? -6 : pose === 'think' ? -15 : 0;
    const leftHandY = pose === 'celebrate' ? y - 61 : pose === 'study' ? y - 4 : y + 8 + armSwing;
    const rightHandY = pose === 'celebrate' ? y - 59 : pose === 'think' ? y - 48 : y + 8 - armSwing;
    g.lineStyle(8, 0xc77a43); g.lineBetween(x - 16, y - 22, x - 29, leftHandY); g.lineBetween(x + 16, y - 22, x + 29, rightHandY);
    g.fillStyle(0xb96f4b); g.fillCircle(x - 29, leftHandY, 5); g.fillCircle(x + 29, rightHandY, 5);

    g.fillStyle(0xb96f4b); g.fillRect(x - 6, y - 41, 12, 12);
    g.fillStyle(0xd49469); g.fillEllipse(x + lean * 50, y - 53, 32, 39);
    g.fillStyle(0x513a32); g.fillEllipse(x - 4, y - 68, 31, 14); g.fillRoundedRect(x - 20, y - 69, 13, 24, 6);
    g.fillStyle(0x1a292f); g.fillCircle(x - 5, y - 55, 2.3); g.fillCircle(x + 7, y - 54, 2.3);
    g.lineStyle(2, 0x8f5947); g.lineBetween(x + 1, y - 49, x + 7, y - 48);
    g.fillStyle(0x7b4e36); g.fillRoundedRect(x - 24, y - 80, 49, 9, 4); g.fillRoundedRect(x - 14, y - 90, 29, 14, 5);

    const scarfLift = pose === 'walk' ? gait * 4 : pose === 'brace' ? 5 : breath;
    g.lineStyle(5, 0x4aa69c); g.lineBetween(x - 12, y - 40, x - 29, y - 43 - scarfLift); g.lineBetween(x - 29, y - 43 - scarfLift, x - 38, y - 36 - scarfLift * 1.5);
    if (failed) {
      const hazardColors = [0xe76f51, 0x7c8cff, 0x56cfe1, 0xb88bd4, 0xf1b45a];
      g.fillStyle(hazardColors[defeatVariant % hazardColors.length], 0.7);
      if (defeatVariant % 3 === 0) g.fillTriangle(x - 24, y + 22, x, y - 105, x + 24, y + 22);
      else if (defeatVariant % 3 === 1) g.fillRoundedRect(x - 44, y - 72, 88, 102, 20);
      else { g.lineStyle(12, hazardColors[defeatVariant % hazardColors.length], 0.75); g.strokeCircle(x, y - 22, 56); }
      g.setRotation((defeatVariant - 2) * 0.06);
    }
    this.art.add(g);
  }

  private drawRhythm() {
    const puzzle = this.view.puzzle.kind === 'rhythm' ? this.view.puzzle : this.view.puzzle.kind === 'finale' ? this.view.puzzle : null;
    if (!puzzle) return;
    const g = this.add.graphics();
    const elapsed = 'elapsedMs' in puzzle ? puzzle.elapsedMs : 0;
    const pulse = 1 + Math.sin(elapsed / 110) * 0.08;
    g.lineStyle(6, 0xffffff, 0.38); g.lineBetween(48, 460, 342, 460);
    g.fillStyle(0xf6c85f, 0.9); g.fillCircle(195, 460, 34 * pulse);
    g.lineStyle(4, 0xffffff, 0.8); g.strokeCircle(195, 460, 52);
    this.art.add(g);
  }

  private ensurePhysics(kind: string, selected: number | null) {
    const kinds = ['mirror', 'ballast', 'buoyancy', 'balance', 'dish', 'sandglass', 'orrery'];
    const variant = Math.max(0, kinds.indexOf(kind));
    const beamWidth = 188 + (variant % 3) * 18;
    if (this.physicsKind !== kind) {
      this.clearMatter();
      this.physicsKind = kind;
      const anchor = this.matter.add.rectangle(195, 326, 20, 20, { isStatic: true });
      const beam = this.matter.add.rectangle(195, 404, beamWidth, 18, { frictionAir: 0.08 });
      const left = this.matter.add.rectangle(120 + variant % 2 * 8, 360, 30 + variant % 3 * 4, 30 + variant % 3 * 4, { frictionAir: 0.06 });
      const right = this.matter.add.rectangle(270 - variant % 2 * 8, 360, 42 + (variant + 1) % 3 * 4, 42 + (variant + 1) % 3 * 4, { frictionAir: 0.06 });
      const pivot = this.matter.add.constraint(anchor, beam, 78, 0.92);
      const leftTether = this.matter.add.constraint(beam, left, 62 + variant % 2 * 8, 0.72);
      const rightTether = this.matter.add.constraint(beam, right, 62 + (variant + 1) % 2 * 8, 0.72);
      this.matterBodies = [anchor, beam, left, right, pivot as unknown as MatterJS.BodyType, leftTether as unknown as MatterJS.BodyType, rightTether as unknown as MatterJS.BodyType];
    }
    if (selected !== null && this.matterBodies[1]) {
      const direction = selected === 0 ? -0.0008 : selected === 1 ? 0 : 0.0008;
      this.matter.body.applyForce(this.matterBodies[1], this.matterBodies[1].position, { x: direction, y: 0 });
    }
    const g = this.add.graphics();
    const beam = this.matterBodies[1];
    if (beam) {
      g.save(); g.translateCanvas(beam.position.x, beam.position.y); g.rotateCanvas(beam.angle); g.fillStyle(0xf1b45a); g.fillRoundedRect(-beamWidth / 2, -9, beamWidth, 18, 8); g.restore();
      g.lineStyle(3, 0xffffff, 0.7); g.lineBetween(beam.position.x - beamWidth * 0.33, beam.position.y, this.matterBodies[2].position.x, this.matterBodies[2].position.y); g.lineBetween(beam.position.x + beamWidth * 0.33, beam.position.y, this.matterBodies[3].position.x, this.matterBodies[3].position.y);
      g.fillStyle(0x9fe8dc); g.fillCircle(this.matterBodies[2].position.x, this.matterBodies[2].position.y, 15 + variant % 3 * 2);
      g.fillStyle(0xe87955); g.fillCircle(this.matterBodies[3].position.x, this.matterBodies[3].position.y, 20 + (variant + 1) % 3 * 2);
    }
    this.art.add(g);
  }

  private renderView() {
    this.art.removeAll(true);
    const adventure = this.view.adventure;
    const key = adventure?.art.key ?? 'home';
    const texture = `backplate-${key}`;
    if (this.textures.exists(texture)) {
      const image = this.add.image(195, 422, texture);
      const scale = Math.max(390 / image.width, 844 / image.height);
      image.setScale(scale).setAlpha(this.view.mode === 'home' ? 0.92 : 0.75);
      this.art.add(image);
    } else {
      const base = this.add.rectangle(195, 422, 390, 844, 0x17383a); this.art.add(base);
    }
    if (this.view.mode === 'home') {
      this.drawExplorer(195, 610, 'walk');
      return;
    }

    if (this.view.mode === 'intro') {
      this.drawExplorer(82, 690, 'idle');
      return;
    }

    if (this.view.mode === 'ready') {
      this.drawExplorer(75, 690, 'idle');
      return;
    }

    if (this.view.mode === 'puzzle') {
      if (this.view.levelType === 'rhythm' || (this.view.levelType === 'finale' && this.view.puzzle.kind === 'finale' && this.view.puzzle.phase === 'rhythm')) this.drawRhythm();
      if (this.view.levelType === 'finale' && this.view.puzzle.kind === 'finale' && this.view.puzzle.phase === 'physics') this.ensurePhysics((adventure?.puzzles.finale as FinaleConfig | undefined)?.physics.kind ?? 'mirror', this.view.puzzle.physicsChoice);
      else if (this.physicsKind) this.clearMatter();
      const pose = this.view.levelType === 'trivia' ? 'study'
        : this.view.levelType === 'logic' ? 'think'
          : this.view.levelType === 'memory' ? 'focus'
            : this.view.levelType === 'rhythm' ? 'brace'
              : 'brace';
      this.drawExplorer(326, 258, pose);
      return;
    }

    if (this.view.mode === 'resolution') {
      const progress = Math.min(1, this.view.resolutionElapsedMs / (this.view.reducedMotion ? 1200 : 4800));
      const x = this.view.resolutionOutcome === 'success' ? 72 + progress * 290 : 195;
      const traversal = this.view.levelIndex % 5;
      const arcs = [100, 45, 145, 72, 120];
      const drift = traversal === 1 ? progress * 45 : traversal === 3 ? -progress * 34 : 0;
      const y = this.view.resolutionOutcome === 'success' ? 690 - Math.sin(progress * Math.PI) * arcs[traversal] + drift : 690;
      this.drawExplorer(x, y, this.view.resolutionOutcome === 'success' ? (traversal === 4 ? 'celebrate' : 'walk') : `failed-${traversal}`);
      return;
    }

    if (this.view.mode === 'results') {
      this.drawExplorer(195, 415, this.view.resolutionOutcome === 'failed' ? 'failed' : 'celebrate');
    }
  }
}

export function VentureCanvas({ view }: { view: CanvasView }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<VentureScene | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    const scene = new DailyVentureScene();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 390,
      height: 844,
      parent: hostRef.current,
      transparent: true,
      antialias: true,
      render: { pixelArt: false, roundPixels: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
      physics: { default: 'matter', matter: { gravity: { x: 0, y: 0.35 }, enableSleeping: true, debug: false } },
      scene,
      audio: { disableWebAudio: false },
    });
    gameRef.current = game;
    sceneRef.current = scene;
    return () => { game.destroy(true); gameRef.current = null; sceneRef.current = null; };
  }, []);

  useEffect(() => { sceneRef.current?.setView(view); }, [view]);

  return <div className="game-canvas" ref={hostRef} aria-label="Daily Venture illustrated game world" />;
}
