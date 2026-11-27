-- Strict customer isolation for saved beneficiaries.
-- Remove every existing policy so no older permissive policy can OR-bypass ownership.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'beneficiaries'
  loop
    execute format('drop policy if exists %I on public.beneficiaries', p.policyname);
  end loop;
end $$;

alter table public.beneficiaries enable row level security;

-- A signed-in customer may access only rows owned by their auth user ID.
create policy "beneficiaries_customer_owns_row"
on public.beneficiaries
for all
to authenticated
using (customer_id = (select auth.uid()))
with check (customer_id = (select auth.uid()));

grant select, insert, update, delete on public.beneficiaries to authenticated;

-- Keep PostgREST's schema cache current.
notify pgrst, 'reload schema';
