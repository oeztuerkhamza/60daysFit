-- =============================================================================
-- 60dayfit — initial schema
-- =============================================================================
-- Global tables (exercises, program_days, program_day_exercises) hold the shared
-- 60-day template and are readable by everyone. Everything keyed by user_id is
-- private and guarded by row level security.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.focus_type as enum ('push', 'pull', 'legs', 'cardio', 'core', 'full', 'rest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.goal_type as enum ('lose', 'build', 'maintain');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Shared helper: keep updated_at honest
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — one row per auth user, created automatically on sign-up
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  start_date    date not null default current_date,
  height_cm     numeric(5, 1) check (height_cm is null or height_cm between 80 and 250),
  goal          public.goal_type not null default 'maintain',
  weekly_target smallint not null default 6 check (weekly_target between 1 and 7),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- exercises — shared library
-- -----------------------------------------------------------------------------
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  muscle_group text not null,
  equipment    text not null default 'vücut ağırlığı',
  instructions text
);

-- -----------------------------------------------------------------------------
-- program_days — the 60-day template
-- -----------------------------------------------------------------------------
create table if not exists public.program_days (
  day            smallint primary key check (day between 1 and 60),
  week           smallint generated always as ((((day - 1) / 7) + 1)::smallint) stored,
  title          text not null,
  focus          public.focus_type not null,
  target_minutes smallint not null default 40 check (target_minutes >= 0),
  notes          text
);

create table if not exists public.program_day_exercises (
  id           uuid primary key default gen_random_uuid(),
  day          smallint not null references public.program_days (day) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  order_index  smallint not null check (order_index > 0),
  sets         smallint not null check (sets > 0),
  reps         text not null,
  rest_seconds smallint not null default 60 check (rest_seconds >= 0),
  unique (day, order_index)
);

create index if not exists program_day_exercises_day_idx
  on public.program_day_exercises (day, order_index);

-- -----------------------------------------------------------------------------
-- daily_logs — one check-in per user per program day
-- -----------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  day              smallint not null references public.program_days (day) on delete cascade,
  logged_on        date not null default current_date,
  completed        boolean not null default false,
  duration_minutes smallint check (duration_minutes is null or duration_minutes between 0 and 600),
  water_ml         integer check (water_ml is null or water_ml between 0 and 20000),
  steps            integer check (steps is null or steps between 0 and 200000),
  energy           smallint check (energy is null or energy between 1 and 5),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists daily_logs_user_day_idx on public.daily_logs (user_id, day);

drop trigger if exists daily_logs_touch_updated_at on public.daily_logs;
create trigger daily_logs_touch_updated_at
  before update on public.daily_logs
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- set_logs — per-exercise tick marks, weights and achieved reps
-- -----------------------------------------------------------------------------
create table if not exists public.set_logs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  day                     smallint not null references public.program_days (day) on delete cascade,
  program_day_exercise_id uuid not null references public.program_day_exercises (id) on delete cascade,
  done                    boolean not null default false,
  weight_kg               numeric(5, 1) check (weight_kg is null or weight_kg between 0 and 500),
  reps_done               smallint check (reps_done is null or reps_done between 0 and 1000),
  updated_at              timestamptz not null default now(),
  unique (user_id, program_day_exercise_id)
);

create index if not exists set_logs_user_day_idx on public.set_logs (user_id, day);

drop trigger if exists set_logs_touch_updated_at on public.set_logs;
create trigger set_logs_touch_updated_at
  before update on public.set_logs
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- measurements — weight and tape measure history
-- -----------------------------------------------------------------------------
create table if not exists public.measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  measured_on  date not null default current_date,
  weight_kg    numeric(5, 1) check (weight_kg is null or weight_kg between 20 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct is null or body_fat_pct between 1 and 70),
  waist_cm     numeric(5, 1) check (waist_cm is null or waist_cm between 30 and 250),
  chest_cm     numeric(5, 1) check (chest_cm is null or chest_cm between 40 and 250),
  hip_cm       numeric(5, 1) check (hip_cm is null or hip_cm between 40 and 250),
  arm_cm       numeric(4, 1) check (arm_cm is null or arm_cm between 10 and 100),
  thigh_cm     numeric(5, 1) check (thigh_cm is null or thigh_cm between 20 and 150),
  note         text,
  created_at   timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index if not exists measurements_user_date_idx
  on public.measurements (user_id, measured_on desc);

-- =============================================================================
-- Row level security
-- =============================================================================
alter table public.profiles              enable row level security;
alter table public.exercises             enable row level security;
alter table public.program_days          enable row level security;
alter table public.program_day_exercises enable row level security;
alter table public.daily_logs            enable row level security;
alter table public.set_logs              enable row level security;
alter table public.measurements          enable row level security;

-- Shared template: readable by anyone, writable only via migrations / service role.
drop policy if exists "exercises are public" on public.exercises;
create policy "exercises are public" on public.exercises
  for select using (true);

drop policy if exists "program days are public" on public.program_days;
create policy "program days are public" on public.program_days
  for select using (true);

drop policy if exists "program day exercises are public" on public.program_day_exercises;
create policy "program day exercises are public" on public.program_day_exercises
  for select using (true);

-- profiles: owner only.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- daily_logs / set_logs / measurements: full CRUD, owner only.
do $$
declare
  t text;
begin
  foreach t in array array['daily_logs', 'set_logs', 'measurements'] loop
    execute format('drop policy if exists "own rows read" on public.%I', t);
    execute format('create policy "own rows read" on public.%I for select using (auth.uid() = user_id)', t);

    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
