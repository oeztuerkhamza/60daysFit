-- Minimal stand-in for the pieces of Supabase that the migrations depend on.
-- Used by CI (and local `psql` runs) to check the schema against a plain
-- PostgreSQL instance. Never run this against a real Supabase project.
create extension if not exists pgcrypto;

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
