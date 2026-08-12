create table if not exists public.resource_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  description text not null default '' check (char_length(trim(description)) <= 160),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists resource_collections_owner_name_idx
on public.resource_collections (owner_id, lower(name));

create table if not exists public.resource_collection_items (
  collection_id uuid not null references public.resource_collections(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, resource_id)
);

create index if not exists resource_collection_items_resource_idx
on public.resource_collection_items (resource_id);

drop trigger if exists resource_collections_set_updated_at on public.resource_collections;
create trigger resource_collections_set_updated_at
before update on public.resource_collections
for each row execute function public.set_updated_at();

create or replace function public.handle_new_profile_collections()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.resource_collections (owner_id, name, description, is_default)
  values (new.id, 'À lire', 'Les ressources à garder sous la main.', true)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_collections on public.profiles;
create trigger on_profile_created_collections
after insert on public.profiles
for each row execute function public.handle_new_profile_collections();

insert into public.resource_collections (owner_id, name, description, is_default)
select p.id, 'À lire', 'Les ressources à garder sous la main.', true
from public.profiles as p
where not exists (
  select 1
  from public.resource_collections as c
  where c.owner_id = p.id
    and lower(c.name) = lower('À lire')
);

alter table public.resource_collections enable row level security;
alter table public.resource_collection_items enable row level security;

drop policy if exists "Users can read their collections" on public.resource_collections;
create policy "Users can read their collections"
on public.resource_collections for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can create their collections" on public.resource_collections;
create policy "Users can create their collections"
on public.resource_collections for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can edit their collections" on public.resource_collections;
create policy "Users can edit their collections"
on public.resource_collections for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete their collections" on public.resource_collections;
create policy "Users can delete their collections"
on public.resource_collections for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can read their collection items" on public.resource_collection_items;
create policy "Users can read their collection items"
on public.resource_collection_items for select to authenticated
using (
  exists (
    select 1
    from public.resource_collections as c
    where c.id = collection_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "Users can add saved resources to collections" on public.resource_collection_items;
create policy "Users can add saved resources to collections"
on public.resource_collection_items for insert to authenticated
with check (
  exists (
    select 1
    from public.resource_collections as c
    where c.id = collection_id
      and c.owner_id = auth.uid()
  )
  and exists (
    select 1
    from public.resource_saves as s
    where s.resource_id = public.resource_collection_items.resource_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Users can remove their collection items" on public.resource_collection_items;
create policy "Users can remove their collection items"
on public.resource_collection_items for delete to authenticated
using (
  exists (
    select 1
    from public.resource_collections as c
    where c.id = collection_id
      and c.owner_id = auth.uid()
  )
);
