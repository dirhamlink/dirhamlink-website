-- DirhamLink saved beneficiaries and auditable cash-deposit submissions.
-- Apply this migration in Supabase SQL Editor before using the new customer pages.

create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  destination_country text not null check (destination_country in ('India','Pakistan','Nepal','Bangladesh','Egypt','Philippines','Sri Lanka')),
  recipient_full_name text not null check (char_length(trim(recipient_full_name)) between 2 and 120),
  payout_method text not null check (payout_method in ('Bank account','Bank transfer','UPI transfer','Cash pickup')),
  bank_name text,
  account_name text,
  account_number text,
  ifsc text,
  bank_branch text,
  bank_city text,
  upi_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (payout_method = 'UPI transfer' and nullif(trim(upi_id),'') is not null)
    or (payout_method in ('Bank account','Bank transfer') and nullif(trim(bank_name),'') is not null and nullif(trim(account_name),'') is not null and nullif(trim(account_number),'') is not null)
    or payout_method = 'Cash pickup'
  )
);
create index if not exists beneficiaries_customer_idx on public.beneficiaries(customer_id, created_at desc);
alter table public.beneficiaries enable row level security;
drop policy if exists "Customers manage own beneficiaries" on public.beneficiaries;
create policy "Customers manage own beneficiaries" on public.beneficiaries
 for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "Team view beneficiaries" on public.beneficiaries;
create policy "Team view beneficiaries" on public.beneficiaries
 for select to authenticated using (public.is_active_dirhamlink_team_member());
grant select, insert, update, delete on public.beneficiaries to authenticated;

-- Match the payout labels used by the current transfer form.
alter table public.transfers drop constraint if exists transfers_payout_method_check;
alter table public.transfers add constraint transfers_payout_method_check
 check (payout_method in ('Bank account','Bank transfer','UPI transfer','Cash pickup'));

create table if not exists public.cash_deposit_submissions (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id) on delete restrict,
 transfer_id uuid not null references public.transfers(id) on delete restrict,
 amount_aed numeric(12,2) not null check (amount_aed > 0 and amount_aed <= 100000),
 deposit_method text not null check (deposit_method in ('CDM cash deposit','Bank branch cash deposit')),
 deposit_date date not null,
 bank_reference text check (char_length(coalesce(bank_reference,'')) <= 120),
 receipt_path text,
 customer_note text check (char_length(coalesce(customer_note,'')) <= 500),
 status text not null default 'submitted' check (status in ('submitted','under_review','verified','rejected')),
 staff_note text check (char_length(coalesce(staff_note,'')) <= 1000),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists cash_deposit_customer_idx on public.cash_deposit_submissions(customer_id, created_at desc);
create index if not exists cash_deposit_transfer_idx on public.cash_deposit_submissions(transfer_id);
alter table public.cash_deposit_submissions enable row level security;

drop policy if exists "Customers submit own cash deposits" on public.cash_deposit_submissions;
create policy "Customers submit own cash deposits" on public.cash_deposit_submissions
 for insert to authenticated with check (
  customer_id = auth.uid()
  and status = 'submitted'
  and reviewed_by is null and reviewed_at is null and staff_note is null
  and exists (select 1 from public.transfers t where t.id = transfer_id and t.customer_id = auth.uid())
 );
drop policy if exists "Customers view own cash deposits" on public.cash_deposit_submissions;
create policy "Customers view own cash deposits" on public.cash_deposit_submissions
 for select to authenticated using (customer_id = auth.uid());
drop policy if exists "Team review cash deposits" on public.cash_deposit_submissions;
drop policy if exists "Team view cash deposits" on public.cash_deposit_submissions;
create policy "Team view cash deposits" on public.cash_deposit_submissions
 for select to authenticated using (public.is_active_dirhamlink_team_member());
revoke all on public.cash_deposit_submissions from authenticated;
grant select, insert on public.cash_deposit_submissions to authenticated;

-- When authorised staff verify an actual deposit, advance only to funds received/pending checks.
create or replace function public.sync_verified_cash_deposit_to_transfer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
 if new.status = 'verified' and old.status is distinct from 'verified' then
   update public.transfers
      set status = 'funds_received_pending_checks', updated_at = now()
    where id = new.transfer_id
      and customer_id = new.customer_id
      and status not in ('payout_confirmed','rejected','cancelled');
 end if;
 new.updated_at := now();
 if new.status in ('verified','rejected') and old.status is distinct from new.status then
   new.reviewed_at := now();
   new.reviewed_by := auth.uid();
 end if;
 return new;
end;
$$;
drop trigger if exists cash_deposit_review_sync on public.cash_deposit_submissions;
create trigger cash_deposit_review_sync before update on public.cash_deposit_submissions
 for each row execute function public.sync_verified_cash_deposit_to_transfer();

-- Private receipt bucket. Object names must begin with the uploader's auth user UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cash-deposit-receipts','cash-deposit-receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
 allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Customers upload own deposit receipts" on storage.objects;
create policy "Customers upload own deposit receipts" on storage.objects
 for insert to authenticated with check (
  bucket_id = 'cash-deposit-receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Customers read own deposit receipts" on storage.objects;
create policy "Customers read own deposit receipts" on storage.objects
 for select to authenticated using (
  bucket_id = 'cash-deposit-receipts' and (
   (storage.foldername(name))[1] = auth.uid()::text
   or public.is_active_dirhamlink_team_member()
  )
);

-- Staff status changes must go through this checked RPC; customers cannot update status columns.
create or replace function public.review_dirhamlink_cash_deposit(
 p_deposit_id uuid, p_status text, p_staff_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
 if not public.is_active_dirhamlink_team_member() then
   raise exception 'Authorised DirhamLink team access required';
 end if;
 if p_status not in ('verified','rejected','under_review') then
   raise exception 'Invalid deposit review status';
 end if;
 update public.cash_deposit_submissions
    set status = p_status, staff_note = nullif(trim(coalesce(p_staff_note,'')), '')
  where id = p_deposit_id;
 if not found then raise exception 'Cash deposit submission not found'; end if;
end;
$$;
revoke all on function public.review_dirhamlink_cash_deposit(uuid,text,text) from public;
grant execute on function public.review_dirhamlink_cash_deposit(uuid,text,text) to authenticated;
