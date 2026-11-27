-- DirhamLink: generate a unique internal reference when staff confirms payout completion.
-- This is an internal tracking reference, not a bank reference or proof of payment.

alter table public.transfers
  add column if not exists completion_reference text;

create unique index if not exists transfers_completion_reference_unique
  on public.transfers (completion_reference)
  where completion_reference is not null;

alter table public.transfer_status_events
  add column if not exists completion_reference text;

create unique index if not exists transfer_status_events_completion_reference_unique
  on public.transfer_status_events (completion_reference)
  where completion_reference is not null;

drop function if exists public.mark_dirhamlink_transfer_completed(uuid, text);

create function public.mark_dirhamlink_transfer_completed(
  p_transfer_id uuid,
  p_confirmation_reference text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
  v_role text;
  v_completion_reference text;
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

  v_completion_reference := 'DL-CMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  update public.transfers
  set status = 'payout_confirmed',
      completion_reference = v_completion_reference,
      updated_at = now()
  where id = p_transfer_id;

  insert into public.transfer_status_events (
    transfer_id, previous_status, new_status, confirmation_reference,
    completion_reference, changed_by
  ) values (
    p_transfer_id, v_previous_status, 'payout_confirmed',
    trim(p_confirmation_reference), v_completion_reference, auth.uid()
  );

  return v_completion_reference;
end;
$$;

revoke all on function public.mark_dirhamlink_transfer_completed(uuid, text) from public;
grant execute on function public.mark_dirhamlink_transfer_completed(uuid, text) to authenticated;
