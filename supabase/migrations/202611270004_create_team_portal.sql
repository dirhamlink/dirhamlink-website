-- Secure team access and recipient payout details for DirhamLink.
-- Apply in Supabase SQL Editor. Team membership is provisioned manually by an owner.

create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','admin','staff','compliance')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "Team members can view their own membership" on public.team_members;
create policy "Team members can view their own membership"
on public.team_members for select to authenticated
using (user_id = auth.uid());

create or replace function public.is_active_dirhamlink_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where user_id = auth.uid() and active = true
  );
$$;

revoke all on function public.is_active_dirhamlink_team_member() from public;
grant execute on function public.is_active_dirhamlink_team_member() to authenticated;

drop policy if exists "Authorised team can view all transfers" on public.transfers;
create policy "Authorised team can view all transfers"
on public.transfers for select to authenticated
using (public.is_active_dirhamlink_team_member());

grant select on public.team_members to authenticated;
grant select on public.transfers to authenticated;

alter table public.transfers
  add column if not exists recipient_bank_name text,
  add column if not exists recipient_bank_account_name text,
  add column if not exists recipient_bank_account_number text,
  add column if not exists recipient_bank_ifsc text,
  add column if not exists recipient_upi_id text;

comment on column public.transfers.recipient_bank_account_number is
'Confidential beneficiary payout detail. Visible only to the customer who created the transfer and active DirhamLink team members under RLS.';
