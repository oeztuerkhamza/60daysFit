-- =============================================================================
-- 60dayfit — lock down the two helper functions
-- =============================================================================
-- Both findings come from Supabase's database linter:
--   0011_function_search_path_mutable
--   0028/0029_*_security_definer_function_executable
-- =============================================================================

-- Pin the search_path so the body cannot be redirected to a caller-controlled
-- schema. The function only calls now(), which lives in pg_catalog and stays
-- reachable with an empty search_path.
alter function public.touch_updated_at() set search_path = '';

-- handle_new_user() is SECURITY DEFINER so the trigger on auth.users can write
-- into public.profiles. PostgREST exposes every executable function in the
-- public schema as an RPC (/rest/v1/rpc/handle_new_user), so drop the grants
-- that make it reachable over HTTP. The trigger keeps working — it runs as the
-- function owner, which retains EXECUTE.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
