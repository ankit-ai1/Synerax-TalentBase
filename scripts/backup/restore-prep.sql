-- Prepares a plain Postgres container so a Supabase dump restores cleanly (restore test / disaster recovery drill).
-- Supabase-specific roles and extensions that the public/auth/storage schemas refer to.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role', 'authenticator', 'supabase_admin', 'supabase_auth_admin', 'supabase_storage_admin', 'dashboard_user', 'pgbouncer'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
-- schema.sql creates these two in public (Supabase search_path: "$user", public, extensions)
create extension if not exists pg_trgm with schema public;
create extension if not exists unaccent with schema public;
alter database postgres set search_path = public, extensions;
