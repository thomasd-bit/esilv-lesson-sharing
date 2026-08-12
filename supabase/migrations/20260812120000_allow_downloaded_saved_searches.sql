do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.saved_resource_searches'::regclass
      and conname = 'saved_resource_searches_sort_check'
  ) then
    alter table public.saved_resource_searches
      drop constraint saved_resource_searches_sort_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.saved_resource_searches'::regclass
      and conname = 'saved_resource_searches_sort_check'
  ) then
    alter table public.saved_resource_searches
      add constraint saved_resource_searches_sort_check
      check (sort in ('recent', 'popular', 'downloaded'));
  end if;
end;
$$;
