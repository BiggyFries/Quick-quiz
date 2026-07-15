import { adminClient, fail, json, preflight, requireUser } from '../_shared/http.ts';

const achievementRows = (attempts: any[], userId: string, attemptId: string) => {
  const official = attempts.filter((item) => !item.is_preview);
  const failures = official.filter((item) => item.outcome === 'failed').length;
  const survived = official.filter((item) => item.outcome === 'survived');
  const unique = new Set(survived.map((item) => item.adventure_id)).size;
  const firstTry = survived.some((item) => !item.is_archive && item.attempt_number === 1 && item.release_date === item.local_date_at_start);
  const rows: any[] = [];
  if (failures >= 1) rows.push('first-failure'); if (failures >= 10) rows.push('fail-10'); if (failures >= 100) rows.push('fail-100');
  if (unique >= 1) rows.push('survive-1'); if (firstTry) rows.push('first-try'); if (unique >= 5) rows.push('survive-5'); if (unique >= 10) rows.push('survive-10');
  return rows.map((code) => ({ user_id: userId, code, attempt_id: attemptId }));
};

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { attemptId, outcome, activeMs, levelResults } = await req.json();
    if (!['failed', 'survived'].includes(outcome)) throw new Error('INVALID_OUTCOME');
    const admin = adminClient(); const user = await requireUser(req, admin);
    const { data: existing, error } = await admin.from('attempts').select('*').eq('id', attemptId).eq('user_id', user.id).single(); if (error) throw error;
    let attempt = existing;
    if (existing.outcome === 'active') { const { data, error: updateError } = await admin.from('attempts').update({ outcome, active_ms: Math.max(0, Math.round(activeMs)), level_results: levelResults, completed_at: new Date().toISOString() }).eq('id', attemptId).eq('user_id', user.id).select().single(); if (updateError) throw updateError; attempt = data; }
    const { data: attempts } = await admin.from('attempts').select('*').eq('user_id', user.id);
    const rows = achievementRows(attempts ?? [], user.id, attemptId); if (rows.length) await admin.from('user_achievements').upsert(rows, { onConflict: 'user_id,code', ignoreDuplicates: true });
    return json({ id: attempt.id, adventureId: attempt.adventure_id, attemptNumber: attempt.attempt_number, isArchive: attempt.is_archive, isPreview: attempt.is_preview, releaseDate: attempt.release_date, startedAt: attempt.started_at, localDateAtStart: attempt.local_date_at_start, outcome: attempt.outcome, activeMs: attempt.active_ms, levelResults: attempt.level_results, completedAt: attempt.completed_at });
  } catch (error) { return fail(error); }
});
