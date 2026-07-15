import { adminClient, fail, json, preflight, requireReviewer } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try { const admin = adminClient(); await requireReviewer(req, admin); const { data, error } = await admin.from('adventures').select('content,publish_date,status').order('week_index'); if (error) throw error; return json((data ?? []).map((item) => ({ ...item.content, publishDate: item.publish_date, status: item.status }))); }
  catch (error) { return fail(error); }
});
