-- Minimal stand-in for the pieces of Supabase that the migrations depend on.
-- Used by CI (and local `psql` runs) to check the schema against a plain
-- PostgreSQL instance. Never run this against a real Supabase project.
create extension if not exists pgcrypto;

-- ---------- auth ----------
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- ---------- storage ----------
create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text not null,
  owner     uuid
);

alter table storage.objects enable row level security;

-- Supabase splits an object path into its folder segments with this helper.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/')
$$;

do $$ begin
  create role authenticated;
exception when duplicate_object then null; end $$;
