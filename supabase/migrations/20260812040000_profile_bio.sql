alter table public.profiles
  add column if not exists bio text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_bio_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_bio_length
      check (bio is null or char_length(trim(bio)) <= 280);
  end if;
end;
$$;
