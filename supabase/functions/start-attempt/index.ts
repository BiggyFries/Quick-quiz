import { adminClient, dateInZone, fail, json, preflight, requireUser } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { adventureId, timeZone } = await req.json();
    const admin = adminClient(); const user = await requireUser(req, admin);
    const { data: adventure, error } = await admin.from('adventures').select('publish_date,status').eq('id', adventureId).single(); if (error) throw error;
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const today = dateInZone(new Date(), timeZone); const preview = adventure.publish_date === null;
    if (preview && profile?.role !== 'reviewer') throw new Error('REVIEWER_REQUIRED');
    if (!preview && (adventure.publish_date > today || !['scheduled', 'published'].includes(adventure.status))) throw new Error('ADVENTURE_LOCKED');
    const archive = !preview && adventure.publish_date < today;
    await admin.from('attempts').update({ outcome: 'abandoned', completed_at: new Date().toISOString() }).eq('user_id', user.id).eq('adventure_id', adventureId).eq('outcome', 'active');
    const { count } = await admin.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('adventure_id', adventureId);
    const payload = { user_id: user.id, adventure_id: adventureId, attempt_number: (count ?? 0) + 1, is_archive: archive, is_preview: preview, release_date: adventure.publish_date, local_date_at_start: today, timezone: timeZone };
    const { data, error: insertError } = await admin.from('attempts').insert(payload).select().single(); if (insertError) throw insertError;
    return json({ id: data.id, adventureId: data.adventure_id, attemptNumber: data.attempt_number, isArchive: data.is_archive, isPreview: data.is_preview, releaseDate: data.release_date, startedAt: data.started_at, localDateAtStart: data.local_date_at_start, outcome: data.outcome, activeMs: data.active_ms, levelResults: data.level_results });
  } catch (error) { return fail(error); }
});
