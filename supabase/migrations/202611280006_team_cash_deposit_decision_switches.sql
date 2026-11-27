-- Staff decision for cash deposits: confirm funds received or cancel when not received.
-- "Funds received" advances only to funds_received_pending_checks; it does not execute a payout.
create or replace function public.decide_dirhamlink_cash_deposit(
  p_deposit_id uuid,
  p_decision text,
  p_staff_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit public.cash_deposit_submissions%rowtype;
begin
  if not public.is_active_dirhamlink_team_member() then
    raise exception 'Authorised DirhamLink team access required';
  end if;
  if p_decision not in ('received', 'not_received') then
    raise exception 'Choose received or not received';
  end if;

  select * into v_deposit
  from public.cash_deposit_submissions
  where id = p_deposit_id
  for update;
  if not found then raise exception 'Cash deposit submission not found'; end if;
  if v_deposit.status in ('verified', 'rejected') then
    raise exception 'This deposit has already been reviewed';
  end if;

  if p_decision = 'received' then
    update public.cash_deposit_submissions
       set status = 'verified',
           staff_note = nullif(trim(coalesce(p_staff_note, '')), '')
     where id = p_deposit_id;
  else
    update public.cash_deposit_submissions
       set status = 'rejected',
           staff_note = nullif(trim(coalesce(p_staff_note, '')), '')
     where id = p_deposit_id;
    update public.transfers
       set status = 'cancelled', updated_at = now()
     where id = v_deposit.transfer_id
       and customer_id = v_deposit.customer_id
       and status not in ('payout_confirmed', 'rejected', 'cancelled');
  end if;
end;
$$;
revoke all on function public.decide_dirhamlink_cash_deposit(uuid, text, text) from public;
grant execute on function public.decide_dirhamlink_cash_deposit(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
