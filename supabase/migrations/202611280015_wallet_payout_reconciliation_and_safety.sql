-- DirhamLink wallet safety repair:
-- 1) A transfer is wallet-funded only when it has a verified deposit linked to that exact transfer.
-- 2) Backfill debits for already-completed transfers that were completed before migration 013 was installed.
-- 3) Remove the older staff debit RPC so staff cannot debit before payout confirmation.

drop function if exists public.staff_debit_customer_wallet(uuid);

create or replace function public.debit_wallet_on_successful_payout()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
 v_balance numeric(12,2);
 v_wallet_funded boolean;
begin
 if new.status='payout_confirmed' and old.status is distinct from 'payout_confirmed' then
   select exists(
     select 1
       from public.cash_deposit_submissions d
      where d.transfer_id=new.id
        and d.customer_id=new.customer_id
        and d.status='verified'
   ) into v_wallet_funded;

   if v_wallet_funded then
     perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text,0));
     if not exists(select 1 from public.wallet_ledger where transfer_id=new.id and entry_type='transfer_debit') then
       select coalesce(sum(case
         when entry_type in ('deposit_credit','refund_credit','adjustment_credit') then amount_aed
         else -amount_aed end),0)
         into v_balance
         from public.wallet_ledger
        where customer_id=new.customer_id;

       if v_balance < new.send_amount_aed then
         raise exception 'Insufficient wallet balance to complete this wallet-funded transfer';
       end if;

       insert into public.wallet_ledger(customer_id,entry_type,amount_aed,transfer_id,description,created_by)
       values(new.customer_id,'transfer_debit',new.send_amount_aed,new.id,
         'Wallet debit on successful payout — ' || new.transaction_reference,auth.uid())
       on conflict (transfer_id) where entry_type='transfer_debit' do nothing;
     end if;
   end if;
 end if;
 return new;
end;
$$;

drop trigger if exists wallet_debit_after_successful_payout on public.transfers;
create trigger wallet_debit_after_successful_payout
after update of status on public.transfers
for each row execute function public.debit_wallet_on_successful_payout();

-- Repair historical completed transfers: debit only where a verified deposit is
-- explicitly linked to that same transfer. Do not debit unrelated customer transfers.
do $$
declare
 r record;
 v_balance numeric(12,2);
begin
 for r in
   select t.id,t.customer_id,t.send_amount_aed,t.transaction_reference
     from public.transfers t
    where t.status='payout_confirmed'
      and exists (
        select 1 from public.cash_deposit_submissions d
         where d.transfer_id=t.id
           and d.customer_id=t.customer_id
           and d.status='verified'
      )
      and not exists (
        select 1 from public.wallet_ledger w
         where w.transfer_id=t.id and w.entry_type='transfer_debit'
      )
    order by t.updated_at,t.id
 loop
   perform pg_advisory_xact_lock(hashtextextended(r.customer_id::text,0));

   select coalesce(sum(case
     when entry_type in ('deposit_credit','refund_credit','adjustment_credit') then amount_aed
     else -amount_aed end),0)
     into v_balance
     from public.wallet_ledger
    where customer_id=r.customer_id;

   if v_balance >= r.send_amount_aed then
     insert into public.wallet_ledger(customer_id,entry_type,amount_aed,transfer_id,description,created_at)
     values(r.customer_id,'transfer_debit',r.send_amount_aed,r.id,
       'Wallet debit backfill — completed payout ' || r.transaction_reference,now())
     on conflict (transfer_id) where entry_type='transfer_debit' do nothing;
   else
     raise notice 'Wallet debit needs manual review for completed transfer %: balance %, required %',
       r.transaction_reference,v_balance,r.send_amount_aed;
   end if;
 end loop;
end;
$$;

notify pgrst,'reload schema';
