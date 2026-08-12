alter table public.resources
  add column if not exists download_count bigint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resources_download_count_non_negative'
      and conrelid = 'public.resources'::regclass
  ) then
    alter table public.resources
      add constraint resources_download_count_non_negative check (download_count >= 0);
  end if;
end;
$$;

update public.resources
set download_count = 0
where download_count is null;

create index if not exists resources_download_count_idx
  on public.resources (download_count desc, created_at desc);

create or replace function public.record_resource_download(target_resource_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.resources
  set download_count = download_count + 1
  where id = target_resource_id
    and status = 'published';
end;
$$;

revoke all on function public.record_resource_download(uuid) from public;
grant execute on function public.record_resource_download(uuid) to authenticated;
