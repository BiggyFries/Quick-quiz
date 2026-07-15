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
  setTapHandler(handler: (x: number, y: number) => void): void;
}

const BACKPLATES = ['home', 'temple', 'airship', 'library', 'forest', 'observatory', 'caravan', 'citadel'];

class DailyVentureScene extends Phaser.Scene implements VentureScene {
  private view: CanvasView = { adventure: null, mode: 'home', levelIndex: 0, puzzle: { kind: 'none' }, resolutionOutcome: null, resolutionElapsedMs: 0, reducedMotion: false };
  private tapHandler: (x: number, y: number) => void = () => undefined;
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
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.tapHandler(pointer.x, pointer.y));
    this.renderView();
  }

  setView(view: CanvasView) {
    this.view = view;
    if (this.sys.isActive()) this.renderView();
  }

  setTapHandler(handler: (x: number, y: number) => void) { this.tapHandler = handler; }

  private clearMatter() {
    this.matterBodies.forEach((body) => this.matter.world.remove(body));
    this.matterBodies = [];
    this.physicsKind = '';
  }

  private drawExplorer(x: number, y: number, pose: string) {
    const g = this.add.graphics();
    const failed = pose.startsWith('failed');
    const defeatVariant = failed ? Number(pose.split('-')[1] ?? 0) : 0;
    const bounce = pose === 'celebrate' ? -Math.abs(Math.sin(this.time.now / 180)) * 12 : pose === 'walk' ? Math.sin(this.time.now / 110) * 3 : 0;
    y += bounce;
    g.fillStyle(0x172b35, 0.25); g.fillEllipse(x, y + 38, 50, 12);
    g.lineStyle(9, 0xb8673e); g.lineBetween(x - 13, y + 8, x - 19, y + 35); g.lineBetween(x + 13, y + 8, x + 19, y + 35);
    g.lineStyle(8, 0xd67e46); g.lineBetween(x - 15, y - 12, x - 29, y + (pose === 'celebrate' ? -38 : 9)); g.lineBetween(x + 15, y - 12, x + 29, y + (pose === 'celebrate' ? -38 : 9));
    g.fillStyle(0xe08e4f); g.fillRoundedRect(x - 22, y - 30, 44, 50, 14);
    g.fillStyle(0xbd7145); g.fillCircle(x, y - 50, 18);
    g.fillStyle(0x8b563d); g.fillRoundedRect(x - 27, y - 70, 54, 10, 5); g.fillRoundedRect(x - 15, y - 80, 30, 14, 5);
    g.fillStyle(0x172b35); g.fillCircle(x - 6, y - 52, 2.5); g.fillCircle(x + 7, y - 52, 2.5);
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

  private drawFallbackLayers(accent: number, accent2: number, type?: PuzzleType) {
    const g = this.add.graphics();
    const seed = (this.view.adventure?.weekIndex ?? 0) * 5 + this.view.levelIndex;
    g.fillStyle(accent, 0.19); g.fillCircle(330, 135, 115); g.fillCircle(52, 365, 95);
    g.fillStyle(accent2, 0.34); g.fillTriangle(-40, 550, 130, 290, 250, 550); g.fillTriangle(170, 550, 330, 250, 455, 550);
    g.fillStyle(0x0c1f27, 0.62); g.fillRect(0, 560, 390, 284);
    for (let i = 0; i < 7; i += 1) {
      const offset = ((seed * 17 + i * 11) % 29) - 14;
      g.fillStyle(i % 2 ? accent : accent2, 0.55);
      g.fillRoundedRect(-15 + i * 68 + offset, 690 + ((i + seed) % 3) * 18, 45 + (seed + i) % 13, 154, 16);
    }
    if (type === 'trivia') {
      for (let i = 0; i < 3; i += 1) { g.fillStyle(i % 2 ? accent : accent2, 0.55); g.fillRoundedRect(52 + i * 103, 352 + ((seed + i) % 2) * 24, 74, 96, 10); }
    } else if (type === 'logic') {
      for (let i = 0; i < 4; i += 1) { g.lineStyle(5, i % 2 ? accent : accent2, 0.7); g.strokeCircle(60 + i * 90, 405 - ((seed + i) % 3) * 18, 23); }
    } else if (type === 'rhythm') {
      for (let i = 0; i < 5; i += 1) { const x = 30 + i * 82; g.fillStyle(i % 2 ? accent : accent2, 0.66); g.fillTriangle(x - 18, 560, x, 492 - ((seed + i) % 2) * 25, x + 18, 560); }
    } else if (type === 'finale') {
      g.lineStyle(9, accent, 0.7); g.strokeCircle(195, 390, 96); g.lineStyle(4, accent2, 0.75); g.strokeCircle(195, 390, 62); g.lineBetween(99, 390, 291, 390); g.lineBetween(195, 294, 195, 486);
    }
    if (type === 'spatial' || (type === 'finale' && this.view.puzzle.kind === 'finale' && this.view.puzzle.phase === 'scan')) {
      g.lineStyle(4, accent, 0.6); g.lineBetween(45, 260, 310, 430); g.lineBetween(350, 250, 92, 430);
      g.fillStyle(accent2, 0.45); g.fillCircle(195, 375, 20);
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
    const accent = Phaser.Display.Color.HexStringToColor(adventure?.art.accent ?? '#f2b544').color;
    const accent2 = Phaser.Display.Color.HexStringToColor(adventure?.art.accent2 ?? '#5bc0be').color;
    this.drawFallbackLayers(accent, accent2, this.view.levelType);

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
      this.drawExplorer(72, 690, this.view.levelType === 'rhythm' ? 'walk' : 'idle');
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

export function VentureCanvas({ view, onTap }: { view: CanvasView; onTap: (x: number, y: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<VentureScene | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

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
    scene.setTapHandler((x, y) => tapRef.current(x, y));
    return () => { game.destroy(true); gameRef.current = null; sceneRef.current = null; };
  }, []);

  useEffect(() => { sceneRef.current?.setView(view); }, [view]);

  return <div className="game-canvas" ref={hostRef} aria-label="The Daily Venture illustrated game world" />;
}
