import { adminClient, dateInZone, fail, json, preflight, requireReviewer } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { date, timeZone, previewId } = await req.json();
    const admin = adminClient();
    if (previewId) {
      await requireReviewer(req, admin);
      const { data, error } = await admin.from('adventures').select('content,publish_date,status').eq('id', previewId).single();
      if (error) throw error;
      return json({ ...data.content, publishDate: data.publish_date, status: data.status });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('INVALID_DATE');
    if (date > dateInZone(new Date(), timeZone)) return json(null);
    const { data, error } = await admin.from('adventures').select('content,publish_date,status').eq('publish_date', date).in('status', ['scheduled', 'published']).maybeSingle();
    if (error) throw error;
    return json(data ? { ...data.content, publishDate: data.publish_date, status: data.status } : null);
  } catch (error) { return fail(error); }
});
