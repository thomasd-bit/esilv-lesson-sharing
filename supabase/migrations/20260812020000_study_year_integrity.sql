do $$
begin
  alter table public.profiles
    add constraint profiles_study_year_check
    check (study_year is null or study_year in ('1A', '2A', '3A', '4A', '5A', 'Autre'))
    not valid;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.resources
    add constraint resources_study_year_check
    check (study_year in ('1A', '2A', '3A', '4A', '5A', 'Autre'))
    not valid;
exception
  when duplicate_object then null;
end;
$$;
