drop policy if exists "Students can read resource files" on storage.objects;

create policy "Students can read published resource files"
on storage.objects for select to authenticated
using (
  bucket_id = 'resource-files'
  and exists (
    select 1
    from public.resources
    where resources.file_path = storage.objects.name
      and (resources.status = 'published' or resources.author_id = auth.uid())
  )
);
