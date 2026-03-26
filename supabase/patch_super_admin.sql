-- Run this once in Supabase SQL Editor for existing deployments.

-- 1) Allow super_admin role in users table
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'super_admin', 'trainer', 'student'));

-- 2) Ensure admin and super_admin are not blocked by pending status
update public.users
set status = 'active'
where role in ('admin', 'super_admin')
  and status = 'pending';
