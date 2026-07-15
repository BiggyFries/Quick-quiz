create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'reviewer')),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sound boolean not null default true,
  music boolean not null default true,
  reduced_motion boolean not null default false,
  high_contrast boolean not null default false,
  vibration boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.adventures (
  id text primary key,
  week_index integer not null check (week_index between 0 and 6),
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'published')),
  publish_date date,
  title text not null,
  subtitle text not null,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists adventures_publish_date_unique on public.adventures(publish_date) where publish_date is not null;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  adventure_id text not null references public.adventures(id),
  attempt_number integer not null,
  is_archive boolean not null default false,
  is_preview boolean not null default false,
  release_date date,
  local_date_at_start date not null,
  timezone text not null,
  outcome text not null default 'active' check (outcome in ('active', 'failed', 'survived', 'abandoned')),
  active_ms integer not null default 0 check (active_ms >= 0),
  level_results jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, adventure_id, attempt_number)
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null check (code in ('first-failure', 'fail-10', 'fail-100', 'survive-1', 'first-try', 'survive-5', 'survive-10')),
  unlocked_at timestamptz not null default now(),
  attempt_id uuid references public.attempts(id),
  primary key (user_id, code)
);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.adventures enable row level security;
alter table public.attempts enable row level security;
alter table public.user_achievements enable row level security;
alter table public.app_settings enable row level security;

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "settings own" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempts read own" on public.attempts for select using (auth.uid() = user_id);
create policy "achievements read own" on public.user_achievements for select using (auth.uid() = user_id);
create policy "released adventures public" on public.adventures for select using (publish_date is not null and status in ('scheduled', 'published') and publish_date <= current_date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into public.user_settings(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_reviewer(user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = user_id and role = 'reviewer') $$;

insert into public.app_settings(key, value) values ('week1_launch_date', 'null'::jsonb) on conflict (key) do nothing;
