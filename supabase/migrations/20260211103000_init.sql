-- Create a table for public profiles (optional, but good practice)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Projects Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

create policy "Users can view own projects." on public.projects
  for select using (auth.uid() = user_id);

create policy "Users can insert own projects." on public.projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update own projects." on public.projects
  for update using (auth.uid() = user_id);

create policy "Users can delete own projects." on public.projects
  for delete using (auth.uid() = user_id);

-- Project Documents (Metadata for uploaded files)
create table public.project_documents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  file_name text not null,
  file_path text not null, -- Path in storage bucket
  file_size bigint,
  mime_type text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.project_documents enable row level security;

-- Policies for project documents (relying on project ownership)
-- A simpler approach for MVP: check if the user owns the project
create policy "Users can view docs of own projects." on public.project_documents
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = project_documents.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert docs to own projects." on public.project_documents
  for insert with check (
    exists (
      select 1 from public.projects
      where projects.id = project_documents.project_id
      and projects.user_id = auth.uid()
    )
  );
  
create policy "Users can delete docs of own projects." on public.project_documents
  for delete using (
    exists (
      select 1 from public.projects
      where projects.id = project_documents.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Requirement Docs (The editor content)
create table public.requirement_docs (
  id text not null, -- User defined ID or generated string, keeping as text to match existing FE
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  type text not null, -- 'BRS', 'URS', etc.
  content jsonb default '{}'::jsonb, -- JSON content for sections
  status text default 'draft',
  last_modified timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id, project_id)
);

alter table public.requirement_docs enable row level security;

create policy "Users can view req docs of own projects." on public.requirement_docs
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = requirement_docs.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert req docs to own projects." on public.requirement_docs
  for insert with check (
    exists (
      select 1 from public.projects
      where projects.id = requirement_docs.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update req docs of own projects." on public.requirement_docs
  for update using (
    exists (
      select 1 from public.projects
      where projects.id = requirement_docs.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Storage Bucket Setup
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Storage Policies
create policy "Users can upload project files." on storage.objects
  for insert with check (
    bucket_id = 'project-files' AND
    auth.uid() = owner
  );

create policy "Users can view own project files." on storage.objects
  for select using (
    bucket_id = 'project-files' AND
    auth.uid() = owner
  );
