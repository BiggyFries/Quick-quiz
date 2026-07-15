import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

export function preflight(req: Request) { return req.method === 'OPTIONS' ? new Response('ok', { headers: cors }) : null; }

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

export async function requireUser(req: Request, admin = adminClient()): Promise<User> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('AUTH_REQUIRED');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('AUTH_REQUIRED');
  return data.user;
}

export async function requireReviewer(req: Request, admin = adminClient()): Promise<User> {
  const user = await requireUser(req, admin);
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'reviewer') throw new Error('REVIEWER_REQUIRED');
  return user;
}

export function dateInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'AUTH_REQUIRED') return json({ error: message }, 401);
  if (message === 'REVIEWER_REQUIRED') return json({ error: message }, 403);
  return json({ error: message }, 400);
}
