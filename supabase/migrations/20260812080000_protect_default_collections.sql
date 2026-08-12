-- Keep the automatically created "À lire" collection available to its owner.
drop policy if exists "Users can edit their collections" on public.resource_collections;
create policy "Users can edit their collections"
on public.resource_collections for update to authenticated
using (
  owner_id = auth.uid()
  and is_default = false
)
with check (
  owner_id = auth.uid()
  and is_default = false
);

drop policy if exists "Users can delete their collections" on public.resource_collections;
create policy "Users can delete their collections"
on public.resource_collections for delete to authenticated
using (
  owner_id = auth.uid()
  and is_default = false
);
