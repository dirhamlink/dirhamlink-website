-- Debit customer wallet only when an authorised team member confirms successful payout.
-- The verified deposit credit remains in the wallet throughout review and processing.
create or replace function public.debit_wallet_on_successful_payout()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
 v_balance numeric(12,2);
 v_has_wallet_activity boolean;
begin
 if new.status='payout_confirmed' and old.status is distinct from 'payout_confirmed' then
   perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text,0));
   if exists(select 1 from public.wallet_ledger where transfer_id=new.id and entry_type='transfer_debit') then
     raise exception 'This transfer has already been debited from the wallet';
   end if;
   select exists(select 1 from public.wallet_ledger where customer_id=new.customer_id)
     into v_has_wallet_activity;
   -- Only wallet-funded customer accounts are debited. Legacy/manual-funding accounts
   -- without wallet entries continue to use the existing staff payout workflow.
   if v_has_wallet_activity then
     select coalesce(sum(case
       when entry_type in ('deposit_credit','refund_credit','adjustment_credit') then amount_aed
       else -amount_aed end),0)
       into v_balance
       from public.wallet_ledger where customer_id=new.customer_id;
     if v_balance < new.send_amount_aed then
       raise exception 'Insufficient wallet balance to complete this wallet-funded transfer';
     end if;
     insert into public.wallet_ledger(customer_id,entry_type,amount_aed,transfer_id,description,created_by)
     values(new.customer_id,'transfer_debit',new.send_amount_aed,new.id,
       'Wallet debit on successful payout — ' || new.transaction_reference,auth.uid());
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists wallet_debit_after_successful_payout on public.transfers;
create trigger wallet_debit_after_successful_payout
after update of status on public.transfers
for each row execute function public.debit_wallet_on_successful_payout();
notify pgrst,'reload schema';
