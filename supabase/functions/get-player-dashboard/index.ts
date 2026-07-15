import { adminClient, fail, json, preflight, requireUser } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const admin = adminClient(); const user = await requireUser(req, admin);
    const [{ data: profile }, { data: settings }, { data: attempts }, { data: achievements }] = await Promise.all([
      admin.from('profiles').select('id,role').eq('id', user.id).single(), admin.from('user_settings').select('*').eq('user_id', user.id).single(), admin.from('attempts').select('*').eq('user_id', user.id).order('started_at'), admin.from('user_achievements').select('code,unlocked_at,attempt_id').eq('user_id', user.id).order('unlocked_at'),
    ]);
    const history = (attempts ?? []).map((item) => ({ id: item.id, adventureId: item.adventure_id, attemptNumber: item.attempt_number, isArchive: item.is_archive, isPreview: item.is_preview, releaseDate: item.release_date, startedAt: item.started_at, localDateAtStart: item.local_date_at_start, outcome: item.outcome, activeMs: item.active_ms, levelResults: item.level_results, completedAt: item.completed_at }));
    const official = history.filter((item) => !item.isPreview);
    const survived = official.filter((item) => item.outcome === 'survived');
    const stats = { attempts: official.length, failures: official.filter((item) => item.outcome === 'failed').length, uniqueSurvivals: new Set(survived.map((item) => item.adventureId)).size, activeMs: official.reduce((total, item) => total + item.activeMs, 0) };
    return json({ profile: { id: profile.id, role: profile.role, settings: { sound: settings.sound, music: settings.music, reducedMotion: settings.reduced_motion, highContrast: settings.high_contrast, vibration: settings.vibration }, attempts: history }, stats, achievements: achievements ?? [], history });
  } catch (error) { return fail(error); }
});
