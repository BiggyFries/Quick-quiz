export type PuzzleType = 'trivia' | 'logic' | 'rhythm' | 'spatial' | 'finale';
export type AdventureStatus = 'draft' | 'approved' | 'scheduled' | 'published';

export interface TriviaQuestion {
  prompt: string;
  choices: [string, string, string, string];
  correct: number;
  fact: string;
}

export type LogicRule =
  | { kind: 'before'; left: string; right: string }
  | { kind: 'immediatelyBefore'; left: string; right: string }
  | { kind: 'position'; token: string; index: number }
  | { kind: 'notPosition'; token: string; indexes: number[] };

export interface LogicClue {
  text: string;
  rule: LogicRule;
}

export interface TriviaConfig {
  type: 'trivia';
  title: string;
  brief: string;
  questions: [TriviaQuestion, TriviaQuestion, TriviaQuestion];
}

export interface LogicConfig {
  type: 'logic';
  title: string;
  brief: string;
  tokens: [string, string, string, string];
  clues: [LogicClue, LogicClue, LogicClue, ...LogicClue[]];
  solution: [string, string, string, string];
}

export interface RhythmConfig {
  type: 'rhythm';
  title: string;
  brief: string;
  actionLabel: string;
  cueLabel: string;
  beatMap: number[];
  durationMs: number;
  windowMs: number;
  maxErrors: number;
}

export interface SpatialConfig {
  type: 'spatial';
  title: string;
  brief: string;
  clue: string;
  targetLabel: string;
  target: { x: number; y: number; radius: number };
  hints: [string, string];
  maxTaps: 3;
}

export type PhysicsKind = 'mirror' | 'ballast' | 'buoyancy' | 'balance' | 'dish' | 'sandglass' | 'orrery';

export interface FinaleConfig {
  type: 'finale';
  title: string;
  brief: string;
  question: TriviaQuestion;
  orderTokens: [string, string, string];
  orderSolution: [string, string, string];
  scanClue: string;
  scanTarget: { x: number; y: number; radius: number };
  rhythmBeats: [number, number, number, number];
  physics: {
    kind: PhysicsKind;
    prompt: string;
    choices: [string, string, string];
    correct: number;
    successText: string;
  };
}

export type PuzzleConfig = TriviaConfig | LogicConfig | RhythmConfig | SpatialConfig | FinaleConfig;

export interface ThemeArt {
  key: string;
  background: string;
  accent: string;
  accent2: string;
  ink: string;
  paper: string;
  atmosphere: string;
  artifact: string;
  motif: string;
}

export interface DailyAdventure {
  id: string;
  weekIndex: number;
  status: AdventureStatus;
  publishDate: string | null;
  title: string;
  subtitle: string;
  synopsis: string;
  estimatedMinutes: string;
  art: ThemeArt;
  levelOrder: [PuzzleType, PuzzleType, PuzzleType, PuzzleType, 'finale'];
  puzzles: Record<PuzzleType, PuzzleConfig>;
}

export type ScreenMode = 'home' | 'archive' | 'intro' | 'ready' | 'puzzle' | 'resolution' | 'results';
export type AttemptOutcome = 'active' | 'failed' | 'survived' | 'abandoned';

export interface LevelResult {
  type: PuzzleType;
  success: boolean;
  activeMs: number;
}

export interface AttemptRecord {
  id: string;
  adventureId: string;
  attemptNumber: number;
  isArchive: boolean;
  isPreview: boolean;
  releaseDate: string | null;
  startedAt: string;
  localDateAtStart: string;
  outcome: AttemptOutcome;
  activeMs: number;
  levelResults: LevelResult[];
  completedAt?: string;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  vibration: boolean;
}

export type AchievementCode = 'first-failure' | 'fail-10' | 'fail-100' | 'survive-1' | 'first-try' | 'survive-5' | 'survive-10';

export interface AchievementProgress {
  code: AchievementCode;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface PlayerProfile {
  id: string;
  email: string;
  role: 'player' | 'reviewer';
  settings: Settings;
  attempts: AttemptRecord[];
}

export interface GameSnapshot {
  coordinateSystem: string;
  mode: ScreenMode;
  adventureId?: string;
  adventureTitle?: string;
  levelIndex: number;
  levelType?: PuzzleType;
  attemptNumber: number;
  authenticated: boolean;
  reviewer: boolean;
  results: LevelResult[];
  activeMs: number;
  puzzle: Record<string, unknown>;
}
