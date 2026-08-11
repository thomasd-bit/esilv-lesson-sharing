create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),
  programme text,
  study_year text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 5 and 120),
  description text not null check (char_length(trim(description)) between 20 and 2000),
  kind text not null check (kind in ('course', 'exam', 'project', 'summary', 'other')),
  subject text not null check (char_length(trim(subject)) between 2 and 80),
  programme text not null check (char_length(trim(programme)) between 2 and 80),
  study_year text not null,
  link_url text,
  file_path text,
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_need_a_source check (nullif(trim(link_url), '') is not null or file_path is not null)
);

create table if not exists public.resource_likes (
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);

create table if not exists public.resource_saves (
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);

create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists resources_created_at_idx on public.resources (created_at desc);
create index if not exists resources_kind_idx on public.resources (kind);
create index if not exists resources_study_year_idx on public.resources (study_year);
create index if not exists resources_subject_idx on public.resources (subject);
create index if not exists resource_comments_resource_id_idx on public.resource_comments (resource_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

drop trigger if exists resource_comments_set_updated_at on public.resource_comments;
create trigger resource_comments_set_updated_at
before update on public.resource_comments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, programme, study_year)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'étudiant'), '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'programme'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'study_year'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.resource_likes enable row level security;
alter table public.resource_saves enable row level security;
alter table public.resource_comments enable row level security;
alter table public.resource_reports enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Published resources are visible to students" on public.resources;
create policy "Published resources are visible to students"
on public.resources for select to authenticated
using (status = 'published' or author_id = auth.uid());

drop policy if exists "Students can publish their own resources" on public.resources;
create policy "Students can publish their own resources"
on public.resources for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "Students can edit their own resources" on public.resources;
create policy "Students can edit their own resources"
on public.resources for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "Students can delete their own resources" on public.resources;
create policy "Students can delete their own resources"
on public.resources for delete to authenticated
using (author_id = auth.uid());

drop policy if exists "Authenticated users can read likes" on public.resource_likes;
create policy "Authenticated users can read likes"
on public.resource_likes for select to authenticated
using (true);

drop policy if exists "Users can like resources" on public.resource_likes;
create policy "Users can like resources"
on public.resource_likes for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can remove their likes" on public.resource_likes;
create policy "Users can remove their likes"
on public.resource_likes for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their saves" on public.resource_saves;
create policy "Users can read their saves"
on public.resource_saves for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can save resources" on public.resource_saves;
create policy "Users can save resources"
on public.resource_saves for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can remove their saves" on public.resource_saves;
create policy "Users can remove their saves"
on public.resource_saves for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Authenticated users can read comments" on public.resource_comments;
create policy "Authenticated users can read comments"
on public.resource_comments for select to authenticated
using (true);

drop policy if exists "Users can comment as themselves" on public.resource_comments;
create policy "Users can comment as themselves"
on public.resource_comments for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "Users can edit their comments" on public.resource_comments;
create policy "Users can edit their comments"
on public.resource_comments for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "Users can delete their comments" on public.resource_comments;
create policy "Users can delete their comments"
on public.resource_comments for delete to authenticated
using (author_id = auth.uid());

drop policy if exists "Users can report resources" on public.resource_reports;
create policy "Users can report resources"
on public.resource_reports for insert to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Users can read their own reports" on public.resource_reports;
create policy "Users can read their own reports"
on public.resource_reports for select to authenticated
using (reporter_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('resource-files', 'resource-files', false)
on conflict (id) do update set public = false;

drop policy if exists "Students can upload their own files" on storage.objects;
create policy "Students can upload their own files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'resource-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Students can read resource files" on storage.objects;
create policy "Students can read resource files"
on storage.objects for select to authenticated
using (bucket_id = 'resource-files');

drop policy if exists "Students can delete their own files" on storage.objects;
create policy "Students can delete their own files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'resource-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

