-- Captured right before every backup (manifest.json inside the encrypted archive).
-- The weekly restore test compares the restored copy against these numbers.
select json_build_object(
  'taken_at', now(),
  'server_version_num', current_setting('server_version_num')::int,
  'counts', (
    select json_object_agg(table_schema || '.' || table_name,
      (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint)
    from information_schema.tables
    where table_schema in ('public', 'auth') and table_type = 'BASE TABLE'
  ),
  'latest', json_build_object(
    'candidates', (select max(created_at) from public.candidates),
    'applications', (select max(created_at) from public.applications),
    'auth_users', (select max(created_at) from auth.users)
  ),
  'functions', (
    select json_agg(p.proname order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  )
);
