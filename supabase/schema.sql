-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Users Table
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text not null default 'User',
  role text not null check (role in ('admin', 'super_admin', 'trainer', 'student')) default 'student',
  status text not null check (status in ('pending', 'active', 'suspended')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Batches Table
create table public.batches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  start_date date not null,
  trainer_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Batch Students (Enrollment)
create table public.batch_students (
  batch_id uuid references public.batches(id) on delete cascade,
  student_id uuid references public.users(id) on delete cascade,
  primary key (batch_id, student_id)
);

-- Create Batch Join Requests Table
create table public.batch_join_requests (
  id uuid default uuid_generate_v4() primary key,
  batch_id uuid references public.batches(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (batch_id, student_id)
);

-- Create Resources Table
create table public.resources (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  url text not null,
  category text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'beginner',
  tags text[] default '{}',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Assignments Table
create table public.assignments (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  deadline timestamp with time zone not null,
  max_score integer default 100,
  batch_id uuid references public.batches(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Attendance Table
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  student_id uuid references public.users(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  status text check (status in ('present', 'absent')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(date, student_id, batch_id)
);

-- Create Announcements Table
create table public.announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  batch_id uuid references public.batches(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.batches enable row level security;
alter table public.batch_students enable row level security;
alter table public.batch_join_requests enable row level security;
alter table public.resources enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;

-- Create status-aware policies
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

-- Trigger to automatically create a user profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
declare
  normalized_role text;
  derived_name text;
begin
  normalized_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if normalized_role not in ('admin', 'super_admin', 'trainer', 'student') then
    normalized_role := 'student';
  end if;

  derived_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );

  insert into public.users (id, email, name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    derived_name,
    normalized_role,
    case when normalized_role = 'super_admin' then 'active' else 'pending' end
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
