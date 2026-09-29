-- =============================================================================
-- 60dayfit — initial schema
-- =============================================================================
-- The program is walking-based: every day has a target distance that grows with
-- each session. From week 2 a squat/push-up round is added before and after the
-- walk. Weight and body photos are recorded at the start, at the end of every
-- week, and on the final day. Every meal is photographed.
--
-- Shared tables (exercises, program_days, program_day_exercises) hold the
-- template and are readable by everyone. Everything keyed by user_id is private
-- and guarded by row level security.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.day_type as enum ('walk', 'walk_strength', 'rest');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Where a strength round sits relative to the walk.
  create type public.phase_type as enum ('pre', 'post');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.goal_type as enum ('lose', 'build', 'maintain');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_type as enum ('kahvalti', 'ogle', 'aksam', 'ara');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.checkpoint_kind as enum ('start', 'week', 'end');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.photo_pose as enum ('front', 'side', 'back');
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
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  start_date     date not null default current_date,
  height_cm      numeric(5, 1) check (height_cm is null or height_cm between 80 and 250),
  goal           public.goal_type not null default 'lose',
  protein_target_g smallint check (protein_target_g is null or protein_target_g between 30 and 400),
  water_target_ml  integer not null default 2500 check (water_target_ml between 0 and 10000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
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
-- exercises — the small strength library the walk is wrapped in
-- -----------------------------------------------------------------------------
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  muscle_group text not null,
  instructions text,
  easier_variant text,
  harder_variant text
);

-- -----------------------------------------------------------------------------
-- program_days — the 60-day template
-- -----------------------------------------------------------------------------
create table if not exists public.program_days (
  day              smallint primary key check (day between 1 and 60),
  week             smallint generated always as ((((day - 1) / 7) + 1)::smallint) stored,
  title            text not null,
  day_type         public.day_type not null,
  walk_distance_km numeric(4, 1) not null check (walk_distance_km >= 0),
  target_minutes   smallint not null check (target_minutes >= 0),
  notes            text
);

create table if not exists public.program_day_exercises (
  id           uuid primary key default gen_random_uuid(),
  day          smallint not null references public.program_days (day) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  phase        public.phase_type not null,
  order_index  smallint not null check (order_index > 0),
  sets         smallint not null check (sets > 0),
  reps         smallint not null check (reps > 0),
  rest_seconds smallint not null default 60 check (rest_seconds >= 0),
  unique (day, phase, order_index)
);

create index if not exists program_day_exercises_day_idx
  on public.program_day_exercises (day, phase, order_index);

-- -----------------------------------------------------------------------------
-- daily_logs — one check-in per user per program day
-- -----------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  day              smallint not null references public.program_days (day) on delete cascade,
  logged_on        date not null default current_date,
  completed        boolean not null default false,
  walk_distance_km numeric(4, 1) check (walk_distance_km is null or walk_distance_km between 0 and 100),
  walk_minutes     smallint check (walk_minutes is null or walk_minutes between 0 and 600),
  steps            integer check (steps is null or steps between 0 and 200000),
  water_ml         integer check (water_ml is null or water_ml between 0 and 20000),
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
-- set_logs — per-exercise tick marks and achieved reps
-- -----------------------------------------------------------------------------
create table if not exists public.set_logs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  day                     smallint not null references public.program_days (day) on delete cascade,
  program_day_exercise_id uuid not null references public.program_day_exercises (id) on delete cascade,
  done                    boolean not null default false,
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
-- checkpoints — start, end-of-week and final weigh-in with body photos
-- -----------------------------------------------------------------------------
create table if not exists public.checkpoints (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         public.checkpoint_kind not null,
  -- 1..9 for weekly check-ins, 0 for the start and end records.
  week         smallint not null default 0 check (week between 0 and 9),
  recorded_on  date not null default current_date,
  weight_kg    numeric(5, 1) check (weight_kg is null or weight_kg between 20 and 400),
  height_cm    numeric(5, 1) check (height_cm is null or height_cm between 80 and 250),
  waist_cm     numeric(5, 1) check (waist_cm is null or waist_cm between 30 and 250),
  chest_cm     numeric(5, 1) check (chest_cm is null or chest_cm between 40 and 250),
  arm_cm       numeric(4, 1) check (arm_cm is null or arm_cm between 10 and 100),
  thigh_cm     numeric(5, 1) check (thigh_cm is null or thigh_cm between 20 and 150),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A weekly check-in is unique per week; start and end exist once (week 0).
  unique (user_id, kind, week),
  constraint checkpoints_week_matches_kind check (
    (kind = 'week' and week between 1 and 9) or (kind <> 'week' and week = 0)
  )
);

create index if not exists checkpoints_user_date_idx
  on public.checkpoints (user_id, recorded_on);

drop trigger if exists checkpoints_touch_updated_at on public.checkpoints;
create trigger checkpoints_touch_updated_at
  before update on public.checkpoints
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- checkpoint_photos — front / side / back shot for a checkpoint
-- -----------------------------------------------------------------------------
create table if not exists public.checkpoint_photos (
  id            uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references public.checkpoints (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  pose          public.photo_pose not null,
  -- Object path inside the private `progress-photos` storage bucket.
  storage_path  text not null,
  created_at    timestamptz not null default now(),
  unique (checkpoint_id, pose)
);

create index if not exists checkpoint_photos_user_idx on public.checkpoint_photos (user_id);

-- -----------------------------------------------------------------------------
-- meals — every meal, photographed
-- -----------------------------------------------------------------------------
create table if not exists public.meals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  eaten_on          date not null default current_date,
  eaten_at          timestamptz not null default now(),
  meal_type         public.meal_type not null,
  -- Object path inside the private `meal-photos` storage bucket.
  storage_path      text,
  description       text,
  protein_source    text,
  protein_g         smallint check (protein_g is null or protein_g between 0 and 300),
  has_sugar         boolean not null default false,
  has_refined_carbs boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists meals_user_date_idx on public.meals (user_id, eaten_on desc, eaten_at desc);

drop trigger if exists meals_touch_updated_at on public.meals;
create trigger meals_touch_updated_at
  before update on public.meals
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row level security
-- =============================================================================
alter table public.profiles              enable row level security;
alter table public.exercises             enable row level security;
alter table public.program_days          enable row level security;
alter table public.program_day_exercises enable row level security;
alter table public.daily_logs            enable row level security;
alter table public.set_logs              enable row level security;
alter table public.checkpoints           enable row level security;
alter table public.checkpoint_photos     enable row level security;
alter table public.meals                 enable row level security;

-- Shared template: readable by anyone, writable only via migrations.
do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'program_days', 'program_day_exercises'] loop
    execute format('drop policy if exists "template is readable" on public.%I', t);
    execute format('create policy "template is readable" on public.%I for select using (true)', t);
  end loop;
end $$;

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

-- Everything else keyed by user_id: full CRUD, owner only.
do $$
declare
  t text;
begin
  foreach t in array array['daily_logs', 'set_logs', 'checkpoints', 'checkpoint_photos', 'meals'] loop
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
