import { adminClient, fail, json, preflight, requireReviewer } from '../_shared/http.ts';

function plusDays(key: string, days: number) { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { launchDate } = await req.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(launchDate)) throw new Error('INVALID_DATE');
    const admin = adminClient(); await requireReviewer(req, admin);
    const { data: adventures, error } = await admin.from('adventures').select('id,week_index').order('week_index'); if (error) throw error;
    for (const item of adventures ?? []) { const { error: updateError } = await admin.from('adventures').update({ status: 'scheduled', publish_date: plusDays(launchDate, item.week_index) }).eq('id', item.id); if (updateError) throw updateError; }
    await admin.from('app_settings').upsert({ key: 'week1_launch_date', value: launchDate });
    return json({ launchDate });
  } catch (error) { return fail(error); }
});
