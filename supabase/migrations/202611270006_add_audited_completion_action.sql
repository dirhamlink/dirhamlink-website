-- DirhamLink: audited manual confirmation of a completed payout.
-- This records a staff attestation only; it does not move money or call a payout provider.

create table if not exists public.transfer_status_events (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  confirmation_reference text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);

alter table public.transfer_status_events enable row level security;

drop policy if exists "Active team can view transfer status audit" on public.transfer_status_events;
create policy "Active team can view transfer status audit"
on public.transfer_status_events for select to authenticated
using (public.is_active_dirhamlink_team_member());

grant select on public.transfer_status_events to authenticated;

create or replace function public.mark_dirhamlink_transfer_completed(
  p_transfer_id uuid,
  p_confirmation_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
  v_role text;
begin
  select role into v_role
  from public.team_members
  where user_id = auth.uid() and active = true;

  if v_role is null or v_role not in ('owner', 'admin', 'staff') then
    raise exception 'You are not authorised to mark transfers completed.';
  end if;

  if p_confirmation_reference is null
     or char_length(trim(p_confirmation_reference)) < 3
     or char_length(trim(p_confirmation_reference)) > 200 then
    raise exception 'A valid payout confirmation reference is required.';
  end if;

  select status into v_previous_status
  from public.transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  if v_previous_status in ('payout_confirmed', 'rejected', 'cancelled') then
    raise exception 'This transaction is already in a final state.';
  end if;

  update public.transfers
  set status = 'payout_confirmed',
      updated_at = now()
  where id = p_transfer_id;

  insert into public.transfer_status_events (
    transfer_id, previous_status, new_status, confirmation_reference, changed_by
  ) values (
    p_transfer_id, v_previous_status, 'payout_confirmed',
    trim(p_confirmation_reference), auth.uid()
  );
end;
$$;

revoke all on function public.mark_dirhamlink_transfer_completed(uuid, text) from public;
grant execute on function public.mark_dirhamlink_transfer_completed(uuid, text) to authenticated;
