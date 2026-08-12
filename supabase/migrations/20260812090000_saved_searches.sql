create table if not exists public.saved_resource_searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  search text not null default '' check (char_length(trim(search)) <= 80),
  kind text not null default 'all' check (kind in ('all', 'course', 'exam', 'project', 'summary', 'other')),
  study_year text not null default 'all' check (study_year in ('all', '1A', '2A', '3A', '4A', '5A', 'Autre')),
  programme text not null default 'all' check (programme = 'all' or char_length(trim(programme)) between 2 and 80),
  sort text not null default 'recent' check (sort in ('recent', 'popular')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists saved_resource_searches_owner_name_idx
on public.saved_resource_searches (owner_id, lower(name));

create index if not exists saved_resource_searches_owner_created_at_idx
on public.saved_resource_searches (owner_id, created_at desc);

drop trigger if exists saved_resource_searches_set_updated_at on public.saved_resource_searches;
create trigger saved_resource_searches_set_updated_at
before update on public.saved_resource_searches
for each row execute function public.set_updated_at();

alter table public.saved_resource_searches enable row level security;

drop policy if exists "Users can read their saved searches" on public.saved_resource_searches;
create policy "Users can read their saved searches"
on public.saved_resource_searches for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can create their saved searches" on public.saved_resource_searches;
create policy "Users can create their saved searches"
on public.saved_resource_searches for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can edit their saved searches" on public.saved_resource_searches;
create policy "Users can edit their saved searches"
on public.saved_resource_searches for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete their saved searches" on public.saved_resource_searches;
create policy "Users can delete their saved searches"
on public.saved_resource_searches for delete to authenticated
using (owner_id = auth.uid());
