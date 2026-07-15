import { adminClient, fail, json, preflight, requireUser } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { settings } = await req.json(); const admin = adminClient(); const user = await requireUser(req, admin);
    const payload = { user_id: user.id, sound: Boolean(settings.sound), music: Boolean(settings.music), reduced_motion: Boolean(settings.reducedMotion), high_contrast: Boolean(settings.highContrast), vibration: Boolean(settings.vibration), updated_at: new Date().toISOString() };
    const { error } = await admin.from('user_settings').upsert(payload); if (error) throw error; return json({ ok: true });
  } catch (error) { return fail(error); }
});
