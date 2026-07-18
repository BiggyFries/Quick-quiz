import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { DEFAULT_CHARACTER, loadCharacterCustomization, normalizeCharacterCustomization, saveCharacterCustomization, type CharacterCustomization } from '../character/character';
import { WEEK_ONE } from '../content/week1';
import type { AttemptRecord, DailyAdventure, LevelResult, PlayerProfile, Settings } from '../game/types';
import { addDays, localDateKey } from './date';

const PROFILE_KEY = 'dailyVentureLocalReviewerProfile';
const LAUNCH_KEY = 'dailyVentureWeekOneLaunchDate';
const SETTINGS_VERSION_KEY = 'dailyVentureSettingsVersion';
const SETTINGS_VERSION = '2';
const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: true,
  reducedMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  highContrast: true,
  vibration: true,
};

export interface CalendarDay {
  date: string;
  adventureId: string | null;
  title?: string;
  playable: boolean;
  future: boolean;
}

export interface FinishAttemptInput {
  attemptId: string;
  outcome: 'failed' | 'survived';
  activeMs: number;
  levelResults: LevelResult[];
}

export interface VentureService {
  readonly mode: 'supabase' | 'local-review';
  getProfile(): Promise<PlayerProfile | null>;
  signIn(email: string): Promise<{ sent: boolean; profile?: PlayerProfile }>;
  signOut(): Promise<void>;
  enterLocalReview(): Promise<PlayerProfile>;
  getAdventure(date: string, timeZone: string, previewId?: string): Promise<DailyAdventure | null>;
  listCalendar(month: string, timeZone: string): Promise<CalendarDay[]>;
  listReviewAdventures(): Promise<DailyAdventure[]>;
  scheduleWeek(launchDate: string): Promise<void>;
  startAttempt(adventureId: string, isArchive: boolean, timeZone: string): Promise<AttemptRecord>;
  finishAttempt(input: FinishAttemptInput): Promise<AttemptRecord>;
  updateSettings(settings: Settings): Promise<void>;
  updateCharacter(character: CharacterCustomization): Promise<void>;
}

class LocalReviewService implements VentureService {
  readonly mode = 'local-review' as const;
  private profile: PlayerProfile | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      this.profile = saved ? JSON.parse(saved) as PlayerProfile : null;
      if (this.profile) {
        this.profile.character = saveCharacterCustomization(normalizeCharacterCustomization(this.profile.character ?? loadCharacterCustomization()));
        localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
      }
      if (this.profile && localStorage.getItem(SETTINGS_VERSION_KEY) !== SETTINGS_VERSION) {
        this.profile.settings = { ...this.profile.settings, highContrast: true };
        localStorage.setItem(SETTINGS_VERSION_KEY, SETTINGS_VERSION);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
      }
    } catch {
      this.profile = null;
    }
  }

  private persist() {
    if (this.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
    else localStorage.removeItem(PROFILE_KEY);
  }

  async getProfile() { return this.profile; }

  async signIn(email: string) {
    this.profile = { id: crypto.randomUUID(), email, role: 'reviewer', character: loadCharacterCustomization(), settings: DEFAULT_SETTINGS, attempts: [] };
    this.persist();
    return { sent: false, profile: this.profile };
  }

  async enterLocalReview() {
    if (!this.profile) this.profile = { id: crypto.randomUUID(), email: 'reviewer@local.preview', role: 'reviewer', character: loadCharacterCustomization(), settings: DEFAULT_SETTINGS, attempts: [] };
    this.persist();
    return this.profile;
  }

  async signOut() { this.profile = null; this.persist(); }

  async getAdventure(date: string, timeZone: string, previewId?: string) {
    if (previewId && this.profile?.role === 'reviewer') return WEEK_ONE.find((item) => item.id === previewId) ?? null;
    const launch = localStorage.getItem(LAUNCH_KEY);
    if (!launch) return null;
    const index = WEEK_ONE.findIndex((_, day) => addDays(launch, day) === date);
    if (index < 0 || date > localDateKey(new Date(), timeZone)) return null;
    return { ...WEEK_ONE[index], publishDate: date, status: 'published' as const };
  }

  async listCalendar(month: string, timeZone: string) {
    const launch = localStorage.getItem(LAUNCH_KEY);
    const today = localDateKey(new Date(), timeZone);
    const [year, monthNumber] = month.split('-').map(Number);
    const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return Array.from({ length: total }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`;
      const adventureIndex = launch ? WEEK_ONE.findIndex((_, day) => addDays(launch, day) === date) : -1;
      const item = adventureIndex >= 0 ? WEEK_ONE[adventureIndex] : null;
      return { date, adventureId: item?.id ?? null, title: date <= today ? item?.title : undefined, playable: Boolean(item && date <= today), future: date > today };
    });
  }

  async listReviewAdventures() {
    return this.profile?.role === 'reviewer' ? WEEK_ONE : [];
  }

  async scheduleWeek(launchDate: string) {
    if (this.profile?.role !== 'reviewer') throw new Error('Reviewer access required');
    localStorage.setItem(LAUNCH_KEY, launchDate);
  }

  async startAttempt(adventureId: string, isArchive: boolean, timeZone: string) {
    if (!this.profile) throw new Error('Authentication required');
    const adventure = WEEK_ONE.find((item) => item.id === adventureId);
    if (!adventure) throw new Error('Adventure not found');
    const today = localDateKey(new Date(), timeZone);
    const launch = localStorage.getItem(LAUNCH_KEY);
    const weekIndex = WEEK_ONE.findIndex((item) => item.id === adventureId);
    const releaseDate = launch && weekIndex >= 0 ? addDays(launch, weekIndex) : null;
    if (releaseDate === null && this.profile.role !== 'reviewer') throw new Error('Reviewer access required');
    if (releaseDate !== null && releaseDate > today) throw new Error('Adventure is not released yet');
    const archive = releaseDate !== null ? releaseDate < today : Boolean(isArchive);
    const completedAt = new Date().toISOString();
    this.profile.attempts
      .filter((attempt) => attempt.adventureId === adventureId && attempt.outcome === 'active')
      .forEach((attempt) => Object.assign(attempt, { outcome: 'abandoned' as const, completedAt }));
    const attemptNumber = this.profile.attempts.filter((attempt) => attempt.adventureId === adventureId).length + 1;
    const attempt: AttemptRecord = {
      id: crypto.randomUUID(), adventureId, attemptNumber, isArchive: archive, isPreview: releaseDate === null, releaseDate, startedAt: new Date().toISOString(), localDateAtStart: today, outcome: 'active', activeMs: 0, levelResults: [],
    };
    this.profile.attempts.push(attempt);
    this.persist();
    return attempt;
  }

  async finishAttempt(input: FinishAttemptInput) {
    if (!this.profile) throw new Error('Authentication required');
    const attempt = this.profile.attempts.find((candidate) => candidate.id === input.attemptId);
    if (!attempt) throw new Error('Attempt not found');
    if (attempt.outcome !== 'active') return attempt;
    Object.assign(attempt, input, { completedAt: new Date().toISOString() });
    this.persist();
    return attempt;
  }

  async updateSettings(settings: Settings) {
    if (!this.profile) throw new Error('Authentication required');
    this.profile.settings = settings;
    this.persist();
  }

  async updateCharacter(character: CharacterCustomization) {
    if (!this.profile) throw new Error('Authentication required');
    this.profile.character = saveCharacterCustomization(character);
    this.persist();
  }
}

class SupabaseVentureService implements VentureService {
  readonly mode = 'supabase' as const;
  constructor(private client: SupabaseClient) {}

  private async invoke<T>(name: string, body?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.functions.invoke(name, { body });
    if (error) throw error;
    return data as T;
  }

  async getProfile() {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return null;
    const dashboard = await this.invoke<{ profile: Omit<PlayerProfile, 'email'> }>('get-player-dashboard');
    return { ...dashboard.profile, email: user.email ?? 'player' };
  }

  async signIn(email: string) {
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split('#')[0] } });
    if (error) throw error;
    return { sent: true };
  }

  async enterLocalReview(): Promise<PlayerProfile> { throw new Error('Local reviewer mode is unavailable when Supabase is configured.'); }
  async signOut() { await this.client.auth.signOut(); }
  async getAdventure(date: string, timeZone: string, previewId?: string) { return this.invoke<DailyAdventure | null>('get-adventure', { date, timeZone, previewId }); }
  async listCalendar(month: string, timeZone: string) { return this.invoke<CalendarDay[]>('list-calendar', { month, timeZone }); }
  async listReviewAdventures() { return this.invoke<DailyAdventure[]>('list-review-adventures'); }
  async scheduleWeek(launchDate: string) { await this.invoke('schedule-week', { launchDate }); }
  async startAttempt(adventureId: string, isArchive: boolean, timeZone: string) { return this.invoke<AttemptRecord>('start-attempt', { adventureId, isArchive, timeZone }); }
  async finishAttempt(input: FinishAttemptInput) { return this.invoke<AttemptRecord>('finish-attempt', { ...input }); }
  async updateSettings(settings: Settings) { await this.invoke('update-settings', { settings }); }
  async updateCharacter(character: CharacterCustomization) { await this.invoke('update-character', { character: normalizeCharacterCustomization(character) }); }
}

export function createVentureService(): VentureService {
  const env = import.meta.env ?? {};
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) return new SupabaseVentureService(createClient(url, key));
  return new LocalReviewService();
}

export function profileFromSupabaseUser(user: User, settings = DEFAULT_SETTINGS): PlayerProfile {
  return { id: user.id, email: user.email ?? 'player', role: 'player', character: { ...DEFAULT_CHARACTER }, settings, attempts: [] };
}

export { DEFAULT_SETTINGS };
