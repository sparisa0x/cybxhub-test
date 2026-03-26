-- Run this once in Supabase SQL Editor for existing deployments.
-- Enforces: only super_admin approves accounts, pending users stay blocked,
-- and approved users can request batch joins.

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

  if role_udt = 'user_role' then
    alter type public.user_role add value if not exists 'super_admin';
  end if;

  if role_udt in ('text', 'varchar', 'bpchar') then
    alter table public.users drop constraint if exists users_role_check;
    alter table public.users
      add constraint users_role_check
      check (role in ('admin', 'super_admin', 'trainer', 'student'));
  end if;
end
$$;

create extension if not exists "uuid-ossp";

create table if not exists public.batch_join_requests (
  id uuid default uuid_generate_v4() primary key,
  batch_id uuid references public.batches(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (batch_id, student_id)
);

alter table public.batch_join_requests enable row level security;

drop policy if exists "Allow public read access" on public.users;
drop policy if exists "Allow users to update their own profile" on public.users;

drop policy if exists "Allow authenticated read access" on public.batches;
drop policy if exists "Allow trainers and admins to insert" on public.batches;

drop policy if exists "Allow authenticated read access" on public.batch_students;
drop policy if exists "Allow trainers and admins to insert" on public.batch_students;

drop policy if exists "Allow authenticated read access" on public.resources;
drop policy if exists "Allow authenticated insert" on public.resources;

drop policy if exists "Allow authenticated read access" on public.assignments;
drop policy if exists "Allow authenticated insert" on public.assignments;

drop policy if exists "Allow authenticated read access" on public.attendance;
drop policy if exists "Allow authenticated insert" on public.attendance;

drop policy if exists "Allow authenticated read access" on public.announcements;
drop policy if exists "Allow authenticated insert" on public.announcements;

drop policy if exists "Users can read own active profile" on public.users;
drop policy if exists "Super admins can read all users" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Super admins can approve all users" on public.users;

drop policy if exists "Active users can read batches" on public.batches;
drop policy if exists "Admins and trainers can create batches" on public.batches;

drop policy if exists "Active users can read batch enrollments" on public.batch_students;
drop policy if exists "Privileged roles can add batch enrollments" on public.batch_students;

drop policy if exists "Students can create own join requests" on public.batch_join_requests;
drop policy if exists "Active users can read join requests" on public.batch_join_requests;
drop policy if exists "Privileged roles can review join requests" on public.batch_join_requests;

drop policy if exists "Active users can read resources" on public.resources;
drop policy if exists "Active users can create resources" on public.resources;

drop policy if exists "Active users can read assignments" on public.assignments;
drop policy if exists "Active users can create assignments" on public.assignments;

drop policy if exists "Active users can read attendance" on public.attendance;
drop policy if exists "Active users can create attendance" on public.attendance;

drop policy if exists "Active users can read announcements" on public.announcements;
drop policy if exists "Active users can create announcements" on public.announcements;

create policy "Users can read own active profile" on public.users
  for select using (auth.uid() = id);

create policy "Super admins can read all users" on public.users
  for select using (
    exists (
      select 1
      from public.users su
      where su.id = auth.uid()
        and su.role = 'super_admin'
        and su.status = 'active'
    )
  );

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Super admins can approve all users" on public.users
  for update using (
    exists (
      select 1
      from public.users su
      where su.id = auth.uid()
        and su.role = 'super_admin'
        and su.status = 'active'
    )
  )
  with check (true);

create policy "Active users can read batches" on public.batches
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Admins and trainers can create batches" on public.batches
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'active'
        and u.role in ('admin', 'super_admin', 'trainer')
    )
  );

create policy "Active users can read batch enrollments" on public.batch_students
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Privileged roles can add batch enrollments" on public.batch_students
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'active'
        and u.role in ('admin', 'super_admin', 'trainer')
    )
  );

create policy "Students can create own join requests" on public.batch_join_requests
  for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'active'
        and u.role = 'student'
    )
  );

create policy "Active users can read join requests" on public.batch_join_requests
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Privileged roles can review join requests" on public.batch_join_requests
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'active'
        and u.role in ('admin', 'super_admin', 'trainer')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'active'
        and u.role in ('admin', 'super_admin', 'trainer')
    )
  );

create policy "Active users can read resources" on public.resources
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can create resources" on public.resources
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can read assignments" on public.assignments
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can create assignments" on public.assignments
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can read attendance" on public.attendance
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can create attendance" on public.attendance
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can read announcements" on public.announcements
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create policy "Active users can create announcements" on public.announcements
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.status = 'active'
    )
  );

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unknown User'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    case when coalesce(new.raw_user_meta_data->>'role', 'student') in ('admin', 'super_admin') then 'active' else 'pending' end
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

update public.users
set status = 'active'
where role::text in ('admin', 'super_admin');

update public.users
set status = 'pending'
where role::text in ('trainer', 'student')
  and status::text = 'active';
