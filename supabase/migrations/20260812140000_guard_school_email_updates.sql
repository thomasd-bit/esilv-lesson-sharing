drop trigger if exists enforce_school_email_before_user_insert on auth.users;
drop trigger if exists enforce_school_email_on_insert_or_change on auth.users;

create trigger enforce_school_email_on_insert_or_change
before insert or update of email on auth.users
for each row execute function public.enforce_school_email();
