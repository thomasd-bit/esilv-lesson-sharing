revoke insert on public.resources from authenticated;
grant insert (
  title,
  description,
  kind,
  subject,
  programme,
  study_year,
  link_url,
  file_path,
  author_id
) on public.resources to authenticated;

revoke update on public.resources from authenticated;
grant update (
  title,
  description,
  kind,
  subject,
  programme,
  study_year,
  link_url,
  file_path
) on public.resources to authenticated;
