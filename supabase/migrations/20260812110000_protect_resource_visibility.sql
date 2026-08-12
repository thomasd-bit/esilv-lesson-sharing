create or replace function public.prevent_direct_resource_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and auth.uid() is not null then
    raise exception 'resource_visibility_managed_by_maintainer';
  end if;

  return new;
end;
$$;

drop trigger if exists resources_prevent_direct_visibility_change on public.resources;
create trigger resources_prevent_direct_visibility_change
before update on public.resources
for each row execute function public.prevent_direct_resource_visibility_change();

revoke all on function public.prevent_direct_resource_visibility_change() from public;
