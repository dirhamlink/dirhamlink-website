-- Return only the signed-in customer's own wallet summary.
-- The ledger remains shared as a table, but balances are calculated per customer_id.
create or replace function public.get_my_wallet_summary()
returns table (
  balance_aed numeric(14,2),
  deposit_credits bigint,
  transfer_debits bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(
      case
        when entry_type in ('deposit_credit','refund_credit','adjustment_credit') then amount_aed
        else -amount_aed
      end
    ), 0)::numeric(14,2) as balance_aed,
    count(*) filter (where entry_type = 'deposit_credit') as deposit_credits,
    count(*) filter (where entry_type = 'transfer_debit') as transfer_debits
  from public.wallet_ledger
  where customer_id = auth.uid()
    and auth.uid() is not null;
$$;

revoke all on function public.get_my_wallet_summary() from public;
grant execute on function public.get_my_wallet_summary() to authenticated;

notify pgrst, 'reload schema';
