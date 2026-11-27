-- Private staff-uploaded payout evidence visible only to the transfer's customer and authorised team.
create table if not exists public.transfer_payout_receipts (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  receipt_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  staff_note text check (char_length(coalesce(staff_note,'')) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists transfer_payout_receipts_customer_idx
  on public.transfer_payout_receipts(customer_id, created_at desc);
create index if not exists transfer_payout_receipts_transfer_idx
  on public.transfer_payout_receipts(transfer_id);

alter table public.transfer_payout_receipts enable row level security;

drop policy if exists "Customers view own confirmed payout receipts" on public.transfer_payout_receipts;
create policy "Customers view own confirmed payout receipts"
on public.transfer_payout_receipts for select to authenticated
using (
  customer_id = auth.uid()
  and exists (
    select 1 from public.transfers t
    where t.id = transfer_id and t.customer_id = auth.uid()
      and t.status = 'payout_confirmed'
  )
);

drop policy if exists "Team view payout receipts" on public.transfer_payout_receipts;
create policy "Team view payout receipts"
on public.transfer_payout_receipts for select to authenticated
using (public.is_active_dirhamlink_team_member());

drop policy if exists "Team attach payout receipts" on public.transfer_payout_receipts;
create policy "Team attach payout receipts"
on public.transfer_payout_receipts for insert to authenticated
with check (
  public.is_active_dirhamlink_team_member()
  and uploaded_by = auth.uid()
  and exists (
    select 1 from public.transfers t
    where t.id = transfer_id and t.customer_id = customer_id
      and t.status not in ('payout_confirmed','rejected','cancelled')
  )
);

grant select, insert on public.transfer_payout_receipts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payout-transfer-receipts','payout-transfer-receipts',false,5242880,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Team upload payout transfer receipts" on storage.objects;
create policy "Team upload payout transfer receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payout-transfer-receipts'
  and public.is_active_dirhamlink_team_member()
);

drop policy if exists "Customer and team read payout transfer receipts" on storage.objects;
create policy "Customer and team read payout transfer receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'payout-transfer-receipts'
  and (
    public.is_active_dirhamlink_team_member()
    or exists (
      select 1 from public.transfer_payout_receipts r
      join public.transfers t on t.id = r.transfer_id
      where r.receipt_path = name
        and r.customer_id = auth.uid()
        and t.customer_id = auth.uid()
        and t.status = 'payout_confirmed'
    )
  )
);

notify pgrst, 'reload schema';
