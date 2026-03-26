-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Users Table
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text,
  role text check (role in ('admin', 'trainer', 'student')) default 'student',
  status text check (status in ('pending', 'active', 'suspended')) default 'pending',
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
alter table public.resources enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;

-- Create policies (Simplified for demonstration - in production, make these more restrictive)
create policy "Allow public read access" on public.users for select using (true);
create policy "Allow users to update their own profile" on public.users for update using (auth.uid() = id);

create policy "Allow authenticated read access" on public.batches for select using (auth.role() = 'authenticated');
create policy "Allow trainers and admins to insert" on public.batches for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated read access" on public.batch_students for select using (auth.role() = 'authenticated');
create policy "Allow trainers and admins to insert" on public.batch_students for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated read access" on public.resources for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert" on public.resources for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated read access" on public.assignments for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert" on public.assignments for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated read access" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert" on public.attendance for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated read access" on public.announcements for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert" on public.announcements for insert with check (auth.role() = 'authenticated');

-- Trigger to automatically create a user profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unknown User'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    case when coalesce(new.raw_user_meta_data->>'role', 'student') = 'student' then 'active' else 'pending' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
