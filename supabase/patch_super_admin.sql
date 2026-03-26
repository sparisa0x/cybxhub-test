-- Run this once in Supabase SQL Editor for existing deployments.
-- Supports both enum-based role columns and text/check-based role columns.

do $$
declare
  role_udt text;
begin
  select c.udt_name
  into role_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'users'
    and c.column_name = 'role';

  -- If role column is enum (e.g., user_role), add the new enum value first.
  if role_udt = 'user_role' then
    alter type public.user_role add value if not exists 'super_admin';
  end if;

  -- If role column is text-like, enforce allowed values via check constraint.
  if role_udt in ('text', 'varchar', 'bpchar') then
    alter table public.users drop constraint if exists users_role_check;
    alter table public.users
      add constraint users_role_check
      check (role in ('admin', 'super_admin', 'trainer', 'student'));
  end if;
end
$$;

-- Ensure admin/super_admin accounts are active (not blocked in pending).
update public.users
set status = 'active'
where role::text in ('admin', 'super_admin')
  and status::text = 'pending';
