-- DirhamLink customer transfer inquiries (not payment instructions).
create table if not exists public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  destination_country text not null check (destination_country in ('India','Pakistan','Nepal','Bangladesh','Egypt','Philippines','Sri Lanka')),
  send_amount_aed numeric(12,2) not null check (send_amount_aed > 0 and send_amount_aed <= 100000),
  recipient_full_name text not null check (char_length(trim(recipient_full_name)) between 2 and 120),
  payout_method text not null check (payout_method in ('Bank account','Cash pickup')),
  funding_method text not null check (funding_method in ('Bank CDM deposit','Office cash deposit','Cash pickup arrangement')),
  customer_note text check (char_length(coalesce(customer_note,'')) <= 500),
  status text not null default 'inquiry_received' check (status in ('inquiry_received','under_review','awaiting_customer_contact','cancelled','closed')),
  created_at timestamptz not null default now()
);

alter table public.transfer_requests enable row level security;

drop policy if exists "Customers can submit their own transfer inquiries" on public.transfer_requests;
create policy "Customers can submit their own transfer inquiries"
on public.transfer_requests for insert to authenticated
with check (customer_id = auth.uid());

drop policy if exists "Customers can view their own transfer inquiries" on public.transfer_requests;
create policy "Customers can view their own transfer inquiries"
on public.transfer_requests for select to authenticated
using (customer_id = auth.uid());

comment on table public.transfer_requests is 'Customer inquiries only. No funds are accepted or transfers executed by this table.';
