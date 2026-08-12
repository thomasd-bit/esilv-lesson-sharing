alter table public.resources
  add column if not exists like_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resources_like_count_non_negative'
      and conrelid = 'public.resources'::regclass
  ) then
    alter table public.resources
      add constraint resources_like_count_non_negative check (like_count >= 0);
  end if;
end;
$$;

update public.resources
set like_count = 0;

update public.resources as resources
set like_count = counts.total
from (
  select resource_id, count(*)::integer as total
  from public.resource_likes
  group by resource_id
) as counts
where resources.id = counts.resource_id;

create index if not exists resources_like_count_idx
  on public.resources (like_count desc, created_at desc);

create or replace function public.sync_resource_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.resources
    set like_count = like_count + 1
    where id = new.resource_id;
  elsif tg_op = 'DELETE' then
    update public.resources
    set like_count = greatest(like_count - 1, 0)
    where id = old.resource_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists resource_likes_sync_count on public.resource_likes;
create trigger resource_likes_sync_count
after insert or delete on public.resource_likes
for each row execute function public.sync_resource_like_count();
