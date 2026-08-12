create table if not exists public.resource_moderation_events (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  maintainer_id uuid references public.profiles(id) on delete set null,
  previous_status text not null check (previous_status in ('published', 'hidden')),
  current_status text not null check (current_status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create index if not exists resource_moderation_events_resource_idx
  on public.resource_moderation_events (resource_id, created_at desc);

alter table public.resource_moderation_events enable row level security;

create or replace function public.moderate_resource_visibility(
  target_resource_id uuid,
  target_status text,
  actor_id uuid
)
returns table (resource_id uuid, previous_status text, current_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_resource_status text;
begin
  if target_status not in ('published', 'hidden') then
    raise exception 'invalid_resource_status';
  end if;

  select status
  into previous_resource_status
  from public.resources
  where id = target_resource_id
  for update;

  if not found then
    raise exception 'resource_not_found';
  end if;

  update public.resources
  set status = target_status
  where id = target_resource_id;

  if previous_resource_status <> target_status then
    insert into public.resource_moderation_events (
      resource_id,
      maintainer_id,
      previous_status,
      current_status
    )
    values (
      target_resource_id,
      actor_id,
      previous_resource_status,
      target_status
    );
  end if;

  return query
  select target_resource_id, previous_resource_status, target_status;
end;
$$;

revoke all on function public.moderate_resource_visibility(uuid, text, uuid) from public;
revoke all on function public.moderate_resource_visibility(uuid, text, uuid) from anon, authenticated;
grant execute on function public.moderate_resource_visibility(uuid, text, uuid) to service_role;
