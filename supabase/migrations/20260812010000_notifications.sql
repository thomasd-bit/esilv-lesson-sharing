create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  comment_id uuid references public.resource_comments(id) on delete cascade,
  type text not null check (type in ('like', 'comment')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_need_resource check (resource_id is not null),
  constraint notifications_no_self check (recipient_id <> actor_id)
);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create or replace function public.notify_resource_author_of_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resource_author_id uuid;
begin
  select author_id into resource_author_id
  from public.resources
  where id = new.resource_id;

  if resource_author_id is null or resource_author_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, resource_id, type)
  values (resource_author_id, new.user_id, new.resource_id, 'like');

  return new;
end;
$$;

create or replace function public.notify_resource_author_of_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resource_author_id uuid;
begin
  select author_id into resource_author_id
  from public.resources
  where id = new.resource_id;

  if resource_author_id is null or resource_author_id = new.author_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, resource_id, comment_id, type)
  values (resource_author_id, new.author_id, new.resource_id, new.id, 'comment');

  return new;
end;
$$;

drop trigger if exists resource_likes_create_notification on public.resource_likes;
create trigger resource_likes_create_notification
after insert on public.resource_likes
for each row execute function public.notify_resource_author_of_like();

drop trigger if exists resource_comments_create_notification on public.resource_comments;
create trigger resource_comments_create_notification
after insert on public.resource_comments
for each row execute function public.notify_resource_author_of_comment();

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
on public.notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Users can mark their notifications as read" on public.notifications;
create policy "Users can mark their notifications as read"
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
