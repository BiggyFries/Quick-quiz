alter table public.profiles
  alter column character set default '{"version":2,"name":"Ari","head":"oval","body":"trail-jacket","legs":"trail-boots","frame":"standard","skinTone":"#d99b72","hairStyle":"short","hairColor":"#3e302b","eyeShape":"round","eyeColor":"#315b63","accessory":"trail-hat"}'::jsonb;
