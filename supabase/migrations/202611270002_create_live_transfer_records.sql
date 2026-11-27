-- DirhamLink customer-created transfer records.
-- These are real platform transaction records, but not payment instructions or proof of funds.
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  transaction_reference text not null unique default (
    'DL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  customer_id uuid not null references auth.users(id) on delete restrict,
  destination_country text not null check (destination_country in ('India','Pakistan','Nepal','Bangladesh','Egypt','Philippines','Sri Lanka')),
  destination_currency text not null check (destination_currency in ('INR','PKR','NPR','BDT','EGP','PHP','LKR')),
  send_amount_aed numeric(12,2) not null check (send_amount_aed >= 1 and send_amount_aed <= 100000),
  recipient_full_name text not null check (char_length(trim(recipient_full_name)) between 2 and 120),
  payout_method text not null check (payout_method in ('Bank account','Cash pickup')),
  funding_method text not null check (funding_method in ('Bank CDM deposit','Office cash deposit','Cash pickup arrangement')),
  reference_rate numeric(18,8),
  rate_source text,
  rate_captured_at timestamptz,
  rate_disclaimer text not null default 'Indicative market reference only; not a confirmed customer selling rate.',
  customer_note text check (char_length(coalesce(customer_note,'')) <= 500),
  status text not null default 'created' check (status in (
    'created','under_review','awaiting_customer_contact','awaiting_verified_funds',
    'funds_received_pending_checks','compliance_review','approved_for_processing',
    'processing_with_bank_or_partner','payout_confirmed','rejected','cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transfers_customer_created_idx
  on public.transfers(customer_id, created_at desc);

alter table public.transfers enable row level security;

drop policy if exists "Customers can create their own transfers" on public.transfers;
create policy "Customers can create their own transfers"
on public.transfers for insert to authenticated
with check (customer_id = auth.uid() and status = 'created');

drop policy if exists "Customers can view their own transfers" on public.transfers;
create policy "Customers can view their own transfers"
on public.transfers for select to authenticated
using (customer_id = auth.uid());

comment on table public.transfers is
'Customer-created transfer records and lifecycle tracking. Creation does not accept funds, lock a selling rate, approve compliance, or execute payout.';
