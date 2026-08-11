create table if not exists public.allowed_email_domains (
  domain text primary key check (domain = lower(trim(domain)) and position('.' in domain) > 1),
  created_at timestamptz not null default now()
);

alter table public.allowed_email_domains enable row level security;

insert into public.allowed_email_domains (domain)
values ('devinci.fr'), ('edu.devinci.fr'), ('ext.devinci.fr'), ('esilv.fr')
on conflict (domain) do nothing;

create or replace function public.enforce_school_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  email_domain text;
begin
  email_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  if not exists (
    select 1
    from public.allowed_email_domains
    where domain = email_domain
  ) then
    raise exception 'Utilisez une adresse e-mail de l’école.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_school_email_before_user_insert on auth.users;
create trigger enforce_school_email_before_user_insert
before insert on auth.users
for each row execute function public.enforce_school_email();

