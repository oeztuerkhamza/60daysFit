-- =============================================================================
-- 60dayfit — private storage buckets for body and meal photos
-- =============================================================================
-- Both buckets are private; the app reads images through short-lived signed
-- URLs. Access is decided by the object path, whose first folder is the owner's
-- user id:
--   progress-photos/<user_id>/<kind>-<week>/<pose>-<timestamp>.jpg
--   meal-photos/<user_id>/<eaten_on>/<uuid>.jpg
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('progress-photos', 'progress-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('meal-photos',     'meal-photos',     false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owner-only access to both buckets, keyed on the first path segment.
do $$
declare
  bucket text;
  op     text;
  clause text;
begin
  foreach bucket in array array['progress-photos', 'meal-photos'] loop
    clause := format(
      'bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text',
      bucket
    );

    foreach op in array array['select', 'insert', 'update', 'delete'] loop
      execute format('drop policy if exists %I on storage.objects', bucket || ' own ' || op);
    end loop;

    execute format(
      'create policy %I on storage.objects for select to authenticated using (%s)',
      bucket || ' own select', clause
    );
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (%s)',
      bucket || ' own insert', clause
    );
    execute format(
      'create policy %I on storage.objects for update to authenticated using (%s) with check (%s)',
      bucket || ' own update', clause, clause
    );
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (%s)',
      bucket || ' own delete', clause
    );
  end loop;
end $$;
