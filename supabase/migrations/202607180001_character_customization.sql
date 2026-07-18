alter table public.profiles
  add column if not exists character jsonb not null default '{"version":1,"name":"Ari","head":"oval","body":"trail-jacket","legs":"trail-boots","skinTone":"#d99b72","hairStyle":"short","hairColor":"#3e302b","eyeColor":"#315b63","accessory":"trail-hat"}'::jsonb;

update public.profiles
set display_name = coalesce(nullif(trim(display_name), ''), character->>'name', 'Ari');
