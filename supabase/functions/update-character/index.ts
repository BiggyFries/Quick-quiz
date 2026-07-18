import { adminClient, fail, json, preflight, requireUser } from '../_shared/http.ts';

const defaults = {
  version: 2, name: 'Ari', head: 'oval', body: 'trail-jacket', legs: 'trail-boots', frame: 'standard', skinTone: '#d99b72',
  hairStyle: 'short', hairColor: '#3e302b', eyeShape: 'round', eyeColor: '#315b63', accessory: 'trail-hat',
};
const choices = {
  head: ['round', 'oval', 'angular', 'triangular'], body: ['trail-jacket', 'field-vest', 'storm-coat', 'heritage-tee'], legs: ['trail-boots', 'scout-pants', 'climbing-gear', 'jean-shorts'], frame: ['standard', 'sturdy', 'tall'],
  skinTone: ['#f2c7a5', '#e5ad83', '#d99b72', '#b97855', '#8c573f', '#5d382d'], hairStyle: ['short', 'waves', 'braids', 'mohawk', 'bun', 'bald'],
  hairColor: ['#201b1a', '#3e302b', '#75492f', '#d8b56b', '#c08b4f', '#b9513d', '#6d4b88'], eyeShape: ['round', 'almond'], eyeColor: ['#315b63', '#3f6f9d', '#4f7a4f', '#79583e', '#8d6e9f'],
  accessory: ['none', 'round-glasses', 'aviators', 'goggles', 'bandana', 'flower', 'trail-hat'],
} as const;

Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { character = {} } = await req.json(); const admin = adminClient(); const user = await requireUser(req, admin);
    const name = typeof character.name === 'string' ? character.name.trim().replace(/\s+/g, ' ').slice(0, 20) : '';
    const normalized: Record<string, string | number> = { ...defaults, name: name || defaults.name };
    for (const key of Object.keys(choices) as Array<keyof typeof choices>) {
      const candidate = character[key];
      if ((choices[key] as readonly unknown[]).includes(candidate)) normalized[key] = candidate;
    }
    const { error } = await admin.from('profiles').update({ display_name: normalized.name, character: normalized }).eq('id', user.id);
    if (error) throw error; return json({ character: normalized });
  } catch (error) { return fail(error); }
});
