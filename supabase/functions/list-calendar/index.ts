import { adminClient, dateInZone, fail, json, preflight } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { month, timeZone } = await req.json();
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('INVALID_MONTH');
    const today = dateInZone(new Date(), timeZone);
    const [year, monthNumber] = month.split('-').map(Number);
    const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const admin = adminClient();
    const { data, error } = await admin.from('adventures').select('id,title,publish_date').gte('publish_date', `${month}-01`).lte('publish_date', `${month}-${String(total).padStart(2, '0')}`).lte('publish_date', today).in('status', ['scheduled', 'published']);
    if (error) throw error;
    const byDate = new Map((data ?? []).map((item) => [item.publish_date, item]));
    return json(Array.from({ length: total }, (_, index) => { const date = `${month}-${String(index + 1).padStart(2, '0')}`; const item = byDate.get(date); return { date, adventureId: item?.id ?? null, title: item?.title, playable: Boolean(item), future: date > today }; }));
  } catch (error) { return fail(error); }
});
